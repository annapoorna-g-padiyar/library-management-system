import { useEffect, useState } from 'react';
import api, { errMsg, fmtDate } from '../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard')
      .then((res) => setData(res.data))
      .catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <p className="muted">Loading dashboard...</p>;

  const { stats, recent, overdue } = data;
  const cards = [
    { label: 'Book titles', value: stats.totalTitles, sub: `${stats.totalCopies} total copies`, tone: 'blue' },
    { label: 'Available copies', value: stats.availableCopies, sub: 'ready to borrow', tone: 'green' },
    { label: 'Currently issued', value: stats.issuedCount, sub: 'books out on loan', tone: 'amber' },
    { label: 'Overdue', value: stats.overdueCount, sub: 'need follow-up', tone: 'red' },
    { label: 'Members', value: stats.totalMembers, sub: `${stats.activeMembers} active`, tone: 'violet' },
    { label: 'Fines collected', value: `₹${stats.finesCollected}`, sub: 'from returned books', tone: 'slate' },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Overview of your library today</p>
        </div>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className={`stat-card tone-${c.tone}`}>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <section className="panel">
          <h3>Overdue books</h3>
          {overdue.length === 0 ? (
            <p className="muted">Nothing overdue. 🎉</p>
          ) : (
            <table>
              <thead>
                <tr><th>Book</th><th>Member</th><th>Due</th><th>Fine</th></tr>
              </thead>
              <tbody>
                {overdue.map((t) => (
                  <tr key={t._id}>
                    <td>{t.book?.title}</td>
                    <td>{t.member?.name}</td>
                    <td>{fmtDate(t.dueDate)}</td>
                    <td><span className="badge badge-red">₹{t.currentFine}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <h3>Recent activity</h3>
          {recent.length === 0 ? (
            <p className="muted">No transactions yet.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Book</th><th>Member</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t._id}>
                    <td>{t.book?.title}</td>
                    <td>{t.member?.name}</td>
                    <td>{fmtDate(t.status === 'returned' ? t.returnDate : t.issueDate)}</td>
                    <td>
                      <span className={`badge ${t.status === 'returned' ? 'badge-green' : 'badge-amber'}`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
