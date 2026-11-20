# Library Management System (MERN)

A full-stack library management web app built with **MongoDB, Express, React (Vite) and Node.js**.

## Features

- Login / register with JWT authentication (first registered user becomes **admin**)
- **Dashboard**: total titles, available copies, books on loan, overdue count, members, fines collected, recent activity
- **Books**: add, edit, delete, search by title / author / ISBN / category, copy tracking
- **Members**: add, edit, delete, search, auto-generated member IDs (LIB-0001...), active/inactive status
- **Issue / Return**: issue a book with a loan period, return it, automatic **fine calculation** for late returns
- Business rules: no issuing when no copies are left, max 3 books per member, no duplicate copy per member, cannot delete a book/member that has active loans

## Tech stack

| Layer    | Tools                                              |
| -------- | -------------------------------------------------- |
| Frontend | React 18, React Router 6, Axios, Vite              |
| Backend  | Node.js, Express 4, Mongoose 8, JWT, bcryptjs      |
| Database | MongoDB (works with MongoDB Compass)               |

## Prerequisites

1. **Node.js 18+**  (https://nodejs.org)
2. **MongoDB Community Server** running locally (https://www.mongodb.com/try/download/community)
3. **MongoDB Compass** (installed together with MongoDB, or separately)
4. **VS Code**

## How to run (step by step)

### 1. Open the project
VS Code -> **File -> Open Folder** -> select the `library-management` folder.
Open the integrated terminal with **Ctrl + `**.

### 2. Make sure MongoDB is running
Open **MongoDB Compass** and connect to:

```
mongodb://127.0.0.1:27017
```

If it connects, MongoDB is running. (On Windows the MongoDB service starts automatically after install.)

### 3. Install dependencies (one command)

```bash
npm run install-all
```

### 4. Add demo data (optional but recommended)

```bash
npm run seed
```

This creates a demo admin, 12 books, 5 members and some transactions (including overdue ones).
**Demo login:** `admin@library.com` / `admin123`

> Warning: the seed script wipes existing data in the `library_management` database. Run it only on a fresh setup.

### 5. Start the app

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api/health

### 6. See the data in MongoDB Compass
Refresh Compass -> you will see the **library_management** database with the collections `users`, `books`, `members` and `transactions`.

## Running backend and frontend separately

Use two VS Code terminals:

```bash
# Terminal 1
cd backend
npm install
npm run dev

# Terminal 2
cd frontend
npm install
npm run dev
```

## Configuration (`backend/.env`)

| Variable               | Default                                             | Meaning                         |
| ---------------------- | --------------------------------------------------- | ------------------------------- |
| `PORT`                 | `5000`                                              | API port                        |
| `MONGO_URI`            | `mongodb://127.0.0.1:27017/library_management`      | MongoDB connection string       |
| `JWT_SECRET`           | (change it)                                         | Secret used to sign tokens      |
| `FINE_PER_DAY`         | `5`                                                 | Fine in Rs. per overdue day     |
| `MAX_BOOKS_PER_MEMBER` | `3`                                                 | Loan limit per member           |
| `DEFAULT_LOAN_DAYS`    | `14`                                                | Default loan period             |

## Project structure

```
library-management/
├── package.json              # root scripts (install-all, dev, seed)
├── backend/
│   ├── server.js             # Express app entry
│   ├── seed.js               # demo data
│   ├── .env                  # configuration
│   ├── config/db.js          # MongoDB connection
│   ├── models/               # User, Book, Member, Transaction
│   ├── middleware/auth.js    # JWT protection
│   ├── routes/               # auth, books, members, transactions, dashboard
│   └── utils/helpers.js      # fine calculation, async wrapper
└── frontend/
    ├── vite.config.js        # dev server + /api proxy
    └── src/
        ├── main.jsx, App.jsx, api.js, index.css
        ├── context/AuthContext.jsx
        ├── components/       # Layout, Modal
        └── pages/            # Login, Register, Dashboard, Books, Members, Transactions
```

## REST API summary

| Method | Endpoint                          | Description                    |
| ------ | --------------------------------- | ------------------------------ |
| POST   | `/api/auth/register`              | Create account                 |
| POST   | `/api/auth/login`                 | Login, returns JWT             |
| GET    | `/api/auth/me`                    | Current user                   |
| GET    | `/api/dashboard`                  | Stats, recent & overdue        |
| GET/POST | `/api/books`                    | List (`?q=`) / add             |
| PUT/DELETE | `/api/books/:id`              | Update / delete                |
| GET/POST | `/api/members`                  | List (`?q=`) / add             |
| PUT/DELETE | `/api/members/:id`            | Update / delete                |
| GET    | `/api/transactions?status=`       | `all`, `issued`, `overdue`, `returned` |
| POST   | `/api/transactions/issue`         | Issue a book                   |
| PUT    | `/api/transactions/:id/return`    | Return a book (+ fine)         |

All routes except `/api/auth/*` need the header `Authorization: Bearer <token>`.

## Troubleshooting

- **`MongoDB connection failed`**: MongoDB is not running. Start the MongoDB service (Windows: Services -> MongoDB Server -> Start) and confirm Compass can connect.
- **Port 5000 already in use** (common on macOS): change `PORT` in `backend/.env` **and** the proxy target in `frontend/vite.config.js`.
- **Blank page / network error in the browser**: make sure both servers are running and open `http://localhost:5173` (not 5000).
- **`npm run dev` says concurrently not found**: run `npm run install-all` from the root folder first.

## Ideas for extending the project

- Role-based screens (student login to view their own loans)
- Book cover upload, barcode/QR scanning
- Email reminders for due dates
- Reports export (CSV / PDF)
- Reservations / waiting list
