const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    author: { type: String, required: [true, 'Author is required'], trim: true },
    isbn: { type: String, required: [true, 'ISBN is required'], unique: true, trim: true },
    category: { type: String, default: 'General', trim: true },
    publisher: { type: String, trim: true, default: '' },
    year: { type: Number, min: 0, max: 2100 },
    location: { type: String, trim: true, default: '' }, // shelf / rack
    totalCopies: { type: Number, required: true, min: [1, 'At least 1 copy is required'], default: 1 },
    availableCopies: { type: Number, required: true, min: 0, default: 1 },
  },
  { timestamps: true }
);

bookSchema.index({ title: 'text', author: 'text', isbn: 'text', category: 'text' });

module.exports = mongoose.model('Book', bookSchema);
