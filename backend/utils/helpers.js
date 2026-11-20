// Wraps async route handlers so errors reach the Express error handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const DAY_MS = 24 * 60 * 60 * 1000;

// Fine = number of days late x FINE_PER_DAY
const calcFine = (dueDate, returnDate = new Date()) => {
  const perDay = Number(process.env.FINE_PER_DAY) || 5;
  const lateDays = Math.ceil((new Date(returnDate) - new Date(dueDate)) / DAY_MS);
  return lateDays > 0 ? lateDays * perDay : 0;
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { asyncHandler, calcFine, escapeRegex, DAY_MS };
