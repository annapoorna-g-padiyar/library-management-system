const express = require('express');
const Member = require('../models/Member');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');
const { asyncHandler, escapeRegex } = require('../utils/helpers');

const router = express.Router();
router.use(protect);

// GET /api/members?q=search&status=active
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, status } = req.query;
    const filter = {};

    if (q && q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { memberId: rx }, { phone: rx }];
    }
    if (status && status !== 'all') filter.status = status;

    const members = await Member.find(filter).sort({ createdAt: -1 }).lean();

    // Attach the number of books each member currently holds
    const loans = await Transaction.aggregate([
      { $match: { status: 'issued' } },
      { $group: { _id: '$member', count: { $sum: 1 } } },
    ]);
    const loanMap = Object.fromEntries(loans.map((l) => [String(l._id), l.count]));
    members.forEach((m) => {
      m.booksIssued = loanMap[String(m._id)] || 0;
    });

    res.json(members);
  })
);

// POST /api/members
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, email, phone, type, status, address } = req.body;
    const member = await Member.create({ name, email, phone, type, status, address });
    res.status(201).json(member);
  })
);

// PUT /api/members/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    ['name', 'email', 'phone', 'type', 'status', 'address'].forEach((field) => {
      if (req.body[field] !== undefined) member[field] = req.body[field];
    });
    await member.save();
    res.json(member);
  })
);

// DELETE /api/members/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const activeLoans = await Transaction.countDocuments({ member: member._id, status: 'issued' });
    if (activeLoans > 0) {
      return res.status(400).json({ message: 'Cannot delete: member still has books to return' });
    }
    await member.deleteOne();
    res.json({ message: 'Member deleted' });
  })
);

module.exports = router;
