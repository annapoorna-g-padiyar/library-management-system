const express = require('express');
const Book = require('../models/Book');
const Member = require('../models/Member');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');
const { asyncHandler, calcFine, DAY_MS } = require('../utils/helpers');

const router = express.Router();
router.use(protect);

// Adds isOverdue + current fine to a transaction object
const decorate = (tx) => {
  const obj = tx.toObject ? tx.toObject() : tx;
  if (obj.status === 'issued') {
    obj.currentFine = calcFine(obj.dueDate);
    obj.isOverdue = obj.currentFine > 0;
  } else {
    obj.currentFine = obj.fine;
    obj.isOverdue = false;
  }
  return obj;
};

// GET /api/transactions?status=issued|returned|overdue|all
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = {};
    if (status === 'issued') filter.status = 'issued';
    if (status === 'returned') filter.status = 'returned';
    if (status === 'overdue') {
      filter.status = 'issued';
      filter.dueDate = { $lt: new Date() };
    }

    const txs = await Transaction.find(filter)
      .populate('book', 'title author isbn')
      .populate('member', 'name memberId email')
      .sort({ createdAt: -1 });

    res.json(txs.map(decorate));
  })
);

// POST /api/transactions/issue   { bookId, memberId, days }
router.post(
  '/issue',
  asyncHandler(async (req, res) => {
    const { bookId, memberId } = req.body;
    const days = Number(req.body.days) || Number(process.env.DEFAULT_LOAN_DAYS) || 14;
    const maxBooks = Number(process.env.MAX_BOOKS_PER_MEMBER) || 3;

    if (!bookId || !memberId) return res.status(400).json({ message: 'Select both a book and a member' });
    if (days < 1 || days > 90) return res.status(400).json({ message: 'Loan period must be 1-90 days' });

    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if (member.status !== 'active') return res.status(400).json({ message: 'This member is inactive' });

    const activeLoans = await Transaction.countDocuments({ member: memberId, status: 'issued' });
    if (activeLoans >= maxBooks) {
      return res.status(400).json({ message: `Member has reached the limit of ${maxBooks} books` });
    }

    const duplicate = await Transaction.findOne({ member: memberId, book: bookId, status: 'issued' });
    if (duplicate) return res.status(400).json({ message: 'Member already has a copy of this book' });

    // Atomically take one copy (prevents two people borrowing the last copy)
    const book = await Book.findOneAndUpdate(
      { _id: bookId, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { new: true }
    );
    if (!book) {
      const exists = await Book.exists({ _id: bookId });
      return res
        .status(exists ? 400 : 404)
        .json({ message: exists ? 'No copies of this book are available' : 'Book not found' });
    }

    try {
      const tx = await Transaction.create({
        book: bookId,
        member: memberId,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + days * DAY_MS),
        issuedBy: req.user._id,
      });
      await tx.populate([
        { path: 'book', select: 'title author isbn' },
        { path: 'member', select: 'name memberId email' },
      ]);
      res.status(201).json(decorate(tx));
    } catch (err) {
      await Book.findByIdAndUpdate(bookId, { $inc: { availableCopies: 1 } }); // roll back
      throw err;
    }
  })
);

// PUT /api/transactions/:id/return
router.put(
  '/:id/return',
  asyncHandler(async (req, res) => {
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    if (tx.status === 'returned') return res.status(400).json({ message: 'Book already returned' });

    tx.returnDate = new Date();
    tx.fine = calcFine(tx.dueDate, tx.returnDate);
    tx.status = 'returned';
    await tx.save();

    await Book.findByIdAndUpdate(tx.book, { $inc: { availableCopies: 1 } });

    await tx.populate([
      { path: 'book', select: 'title author isbn' },
      { path: 'member', select: 'name memberId email' },
    ]);
    res.json(decorate(tx));
  })
);

module.exports = router;
