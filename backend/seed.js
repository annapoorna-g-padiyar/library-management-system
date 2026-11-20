// Run with:  npm run seed   (from the backend folder)
// WARNING: this DELETES all existing users, books, members and transactions, then inserts demo data.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Book = require('./models/Book');
const Member = require('./models/Member');
const Transaction = require('./models/Transaction');

const DAY = 24 * 60 * 60 * 1000;

const books = [
  { title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', category: 'Programming', publisher: 'Prentice Hall', year: 2008, location: 'A1', totalCopies: 3 },
  { title: 'The Pragmatic Programmer', author: 'Andrew Hunt, David Thomas', isbn: '9780135957059', category: 'Programming', publisher: 'Addison-Wesley', year: 2019, location: 'A1', totalCopies: 2 },
  { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '9780262046305', category: 'Computer Science', publisher: 'MIT Press', year: 2022, location: 'A2', totalCopies: 4 },
  { title: 'Database System Concepts', author: 'Abraham Silberschatz', isbn: '9780078022159', category: 'Computer Science', publisher: 'McGraw-Hill', year: 2019, location: 'A2', totalCopies: 2 },
  { title: 'Eloquent JavaScript', author: 'Marijn Haverbeke', isbn: '9781593279509', category: 'Programming', publisher: 'No Starch Press', year: 2018, location: 'A3', totalCopies: 3 },
  { title: 'Wings of Fire', author: 'A. P. J. Abdul Kalam', isbn: '9788173711466', category: 'Biography', publisher: 'Universities Press', year: 1999, location: 'B1', totalCopies: 5 },
  { title: 'The Guide', author: 'R. K. Narayan', isbn: '9780226568966', category: 'Fiction', publisher: 'Viking Press', year: 1958, location: 'C1', totalCopies: 2 },
  { title: 'Malgudi Days', author: 'R. K. Narayan', isbn: '9780143039655', category: 'Fiction', publisher: 'Penguin India', year: 2006, location: 'C1', totalCopies: 3 },
  { title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '9780553380163', category: 'Science', publisher: 'Bantam', year: 1998, location: 'D1', totalCopies: 2 },
  { title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '9780062316110', category: 'History', publisher: 'Harper', year: 2015, location: 'E1', totalCopies: 3 },
  { title: 'Atomic Habits', author: 'James Clear', isbn: '9780735211292', category: 'Self-Help', publisher: 'Avery', year: 2018, location: 'F1', totalCopies: 4 },
  { title: 'Discrete Mathematics and Its Applications', author: 'Kenneth H. Rosen', isbn: '9781259676512', category: 'Mathematics', publisher: 'McGraw-Hill', year: 2018, location: 'D2', totalCopies: 2 },
].map((b) => ({ ...b, availableCopies: b.totalCopies }));

const members = [
  { name: 'Ananya Rao', email: 'ananya@example.com', phone: '9876543210', type: 'student' },
  { name: 'Rahul Gowda', email: 'rahul@example.com', phone: '9876501234', type: 'student' },
  { name: 'Dr. Meera Iyer', email: 'meera@example.com', phone: '9845012345', type: 'faculty' },
  { name: 'Karthik Shetty', email: 'karthik@example.com', phone: '9900112233', type: 'student' },
  { name: 'Sneha Patil', email: 'sneha@example.com', phone: '9731122334', type: 'staff' },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Clearing old data...');
  await Promise.all([User.deleteMany(), Book.deleteMany(), Member.deleteMany(), Transaction.deleteMany()]);

  const admin = await User.create({
    name: 'Library Admin',
    email: 'admin@library.com',
    password: 'admin123',
    role: 'admin',
  });

  const createdBooks = await Book.insertMany(books);

  // Members are created one by one so the LIB-000X ids are generated in order
  const createdMembers = [];
  for (const m of members) createdMembers.push(await Member.create(m));

  const issue = async (book, member, issuedDaysAgo, loanDays, returnedDaysAgo = null) => {
    const issueDate = new Date(Date.now() - issuedDaysAgo * DAY);
    const dueDate = new Date(issueDate.getTime() + loanDays * DAY);
    const tx = { book: book._id, member: member._id, issueDate, dueDate, issuedBy: admin._id };
    if (returnedDaysAgo !== null) {
      tx.status = 'returned';
      tx.returnDate = new Date(Date.now() - returnedDaysAgo * DAY);
      const late = Math.ceil((tx.returnDate - dueDate) / DAY);
      tx.fine = late > 0 ? late * (Number(process.env.FINE_PER_DAY) || 5) : 0;
    } else {
      await Book.findByIdAndUpdate(book._id, { $inc: { availableCopies: -1 } });
    }
    await Transaction.create(tx);
  };

  await issue(createdBooks[0], createdMembers[0], 3, 14); // on time
  await issue(createdBooks[2], createdMembers[1], 20, 14); // overdue by ~6 days
  await issue(createdBooks[5], createdMembers[3], 18, 14); // overdue by ~4 days
  await issue(createdBooks[9], createdMembers[2], 5, 21); // on time
  await issue(createdBooks[4], createdMembers[0], 30, 14, 12); // returned late, fine applied
  await issue(createdBooks[10], createdMembers[4], 10, 14, 6); // returned on time

  console.log('\nSeed complete!');
  console.log('Login ->  admin@library.com  /  admin123\n');
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
