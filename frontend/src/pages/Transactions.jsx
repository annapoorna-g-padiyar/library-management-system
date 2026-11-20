import { useCallback, useEffect, useState } from 'react';
import api, { errMsg, fmtDate } from '../api';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'issued', label: 'Issued' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'returned', label: 'Returned' },
];

export default function Transactions() {
  const [txs, setTxs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ bookId: '', memberId: '', days: 14 });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

  const loadTxs = useCallback(async () => {
    try {
      const { data } = await api.get('/transactions', { params: { status: filter } });
      setTxs(data);
    } catch (e) {
      setError(errMsg(e));
    }
  }, [filter]);

  const loadOptions = useCallback(async () => {
    try {
      const [b, m] = await Promise.all([
        api.get('/books', { params: { available: 'true' } }),
        api.get('/members', { params: { status: 'active' } }),
      ]);
      setBooks(b.data);
      setMembers(m.data);
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useEffect(() => {
    loadTxs();
  }, [loadTxs]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const issue = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/transactions/issue', form);
      flash(`Issued "${data.book.title}" to ${data.member.name}. Due ${fmtDate(data.dueDate)}.`);
      setForm({ bookId: '', memberId: '', days: 14 });
      loadTxs();
      loadOptions();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const returnBook = async (t) => {
    const fineText = t.currentFine > 0 ? `\n\nOverdue fine to collect: ₹${t.currentFine}` : '';
    if (!window.confirm(`Mark "${t.book?.title}" as returned by ${t.member?.name}?${fineText}`)) return;
    setError('');
    try {
      const { data } = await api.put(`/transactions/${t._id}/return`);
      flash(data.fine > 0 ? `Returned. Fine collected: ₹${data.fine}` : 'Book returned. No fine.');
      loadTxs();
      loadOptions();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Issue / Return</h1>
          <p className="muted">Lend books to members and record returns</p>
        </div>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <section className="panel">
        <h3>Issue a book</h3>
        <form className="issue-form" onSubmit={issue}>
          <div>
            <label>Book</label>
            <select required value={form.bookId} onChange={(e) => setForm({ ...form, bookId: e.target.value })}>
              <option value="">Select a book...</option>
              {books.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.title} — {b.author} ({b.availableCopies} left)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Member</label>
            <select required value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
              <option value="">Select a member...</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.memberId} — {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Loan days</label>
            <input type="number" min="1" max="90" required value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
          </div>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Issuing...' : 'Issue book'}</button>
        </form>
      </section>

      <div className="tabs">
        {FILTERS.map((f) => (
          <button key={f.key} className={filter === f.key ? 'tab active' : 'tab'} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <section className="panel table-wrap">
        {txs.length === 0 ? (
          <p className="muted">No transactions in this view.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Book</th><th>Member</th><th>Issued</th><th>Due</th><th>Returned</th><th>Fine</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t._id}>
                  <td><strong>{t.book?.title || '(deleted book)'}</strong></td>
                  <td>{t.member ? `${t.member.name} (${t.member.memberId})` : '(deleted member)'}</td>
                  <td>{fmtDate(t.issueDate)}</td>
                  <td>{fmtDate(t.dueDate)}</td>
                  <td>{fmtDate(t.returnDate)}</td>
                  <td>{t.currentFine > 0 ? <span className="badge badge-red">₹{t.currentFine}</span> : '-'}</td>
                  <td>
                    {t.status === 'returned' ? (
                      <span className="badge badge-green">returned</span>
                    ) : t.isOverdue ? (
                      <span className="badge badge-red">overdue</span>
                    ) : (
                      <span className="badge badge-amber">issued</span>
                    )}
                  </td>
                  <td className="actions">
                    {t.status === 'issued' && (
                      <button className="btn btn-small btn-primary" onClick={() => returnBook(t)}>Return</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
