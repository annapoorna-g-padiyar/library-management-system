const express = require('express');
const Book = require('../models/Book');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');
const { asyncHandler, escapeRegex } = require('../utils/helpers');

const router = express.Router();
router.use(protect);

// GET /api/books?q=search&category=Fiction&available=true
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, category, available } = req.query;
    const filter = {};

    if (q && q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [{ title: rx }, { author: rx }, { isbn: rx }, { category: rx }];
    }
    if (category && category !== 'all') filter.category = category;
    if (available === 'true') filter.availableCopies = { $gt: 0 };

    const books = await Book.find(filter).sort({ createdAt: -1 });
    res.json(books);
  })
);

// GET /api/books/categories
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const categories = await Book.distinct('category');
    res.json(categories.sort());
  })
);

// POST /api/books
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, author, isbn, category, publisher, year, location, totalCopies } = req.body;
    const copies = Number(totalCopies) || 1;
    const book = await Book.create({
      title,
      author,
      isbn,
      category,
      publisher,
      year: year || undefined,
      location,
      totalCopies: copies,
      availableCopies: copies,
    });
    res.status(201).json(book);
  })
);

// PUT /api/books/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });

    const { title, author, isbn, category, publisher, year, location, totalCopies } = req.body;

    if (totalCopies !== undefined && totalCopies !== '') {
      const newTotal = Number(totalCopies);
      const issuedNow = book.totalCopies - book.availableCopies;
      if (newTotal < issuedNow) {
        return res
          .status(400)
          .json({ message: `Cannot reduce copies below ${issuedNow} (currently issued to members)` });
      }
      book.totalCopies = newTotal;
      book.availableCopies = newTotal - issuedNow;
    }

    if (title !== undefined) book.title = title;
    if (author !== undefined) book.author = author;
    if (isbn !== undefined) book.isbn = isbn;
    if (category !== undefined) book.category = category;
    if (publisher !== undefined) book.publisher = publisher;
    if (location !== undefined) book.location = location;
    if (year !== undefined) book.year = year || undefined;

    await book.save();
    res.json(book);
  })
);

// DELETE /api/books/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });

    const activeLoans = await Transaction.countDocuments({ book: book._id, status: 'issued' });
    if (activeLoans > 0) {
      return res.status(400).json({ message: 'Cannot delete: this book is currently issued to a member' });
    }
    await book.deleteOne();
    res.json({ message: 'Book deleted' });
  })
);

module.exports = router;
