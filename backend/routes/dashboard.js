const express = require('express');
const Book = require('../models/Book');
const Member = require('../models/Member');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');
const { asyncHandler, calcFine } = require('../utils/helpers');

const router = express.Router();
router.use(protect);

// GET /api/dashboard
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const now = new Date();

    const [totalTitles, copyAgg, totalMembers, activeMembers, issuedCount, overdueCount, finesAgg] =
      await Promise.all([
        Book.countDocuments(),
        Book.aggregate([
          { $group: { _id: null, total: { $sum: '$totalCopies' }, available: { $sum: '$availableCopies' } } },
        ]),
        Member.countDocuments(),
        Member.countDocuments({ status: 'active' }),
        Transaction.countDocuments({ status: 'issued' }),
        Transaction.countDocuments({ status: 'issued', dueDate: { $lt: now } }),
        Transaction.aggregate([{ $match: { status: 'returned' } }, { $group: { _id: null, total: { $sum: '$fine' } } }]),
      ]);

    const recent = await Transaction.find()
      .populate('book', 'title')
      .populate('member', 'name memberId')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    const overdue = await Transaction.find({ status: 'issued', dueDate: { $lt: now } })
      .populate('book', 'title')
      .populate('member', 'name memberId')
      .sort({ dueDate: 1 })
      .limit(6)
      .lean();
    overdue.forEach((t) => {
      t.currentFine = calcFine(t.dueDate);
    });

    res.json({
      stats: {
        totalTitles,
        totalCopies: copyAgg[0]?.total || 0,
        availableCopies: copyAgg[0]?.available || 0,
        totalMembers,
        activeMembers,
        issuedCount,
        overdueCount,
        finesCollected: finesAgg[0]?.total || 0,
      },
      recent,
      overdue,
    });
  })
);

module.exports = router;
