import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import Modal from '../components/Modal.jsx';

const emptyForm = {
  title: '',
  author: '',
  isbn: '',
  category: 'General',
  publisher: '',
  year: '',
  location: '',
  totalCopies: 1,
};

export default function Books() {
  const [books, setBooks] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/books', { params: { q } });
      setBooks(data);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditId(b._id);
    setForm({
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      category: b.category || '',
      publisher: b.publisher || '',
      year: b.year || '',
      location: b.location || '',
      totalCopies: b.totalCopies,
    });
    setFormError('');
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editId) {
        await api.put(`/books/${editId}`, form);
        flash('Book updated');
      } else {
        await api.post('/books', form);
        flash('Book added');
      }
      setShowModal(false);
      load();
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b) => {
    if (!window.confirm(`Delete "${b.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/books/${b._id}`);
      flash('Book deleted');
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Books</h1>
          <p className="muted">{books.length} titles in the catalogue</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add book</button>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <input className="search" placeholder="Search by title, author, ISBN or category..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <section className="panel table-wrap">
        {loading ? (
          <p className="muted">Loading...</p>
        ) : books.length === 0 ? (
          <p className="muted">No books found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th><th>Author</th><th>ISBN</th><th>Category</th><th>Shelf</th><th>Copies</th><th></th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b._id}>
                  <td><strong>{b.title}</strong></td>
                  <td>{b.author}</td>
                  <td className="mono">{b.isbn}</td>
                  <td><span className="badge badge-blue">{b.category}</span></td>
                  <td>{b.location || '-'}</td>
                  <td>
                    <span className={`badge ${b.availableCopies > 0 ? 'badge-green' : 'badge-red'}`}>
                      {b.availableCopies} / {b.totalCopies}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn btn-small" onClick={() => openEdit(b)}>Edit</button>
                    <button className="btn btn-small btn-danger" onClick={() => remove(b)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showModal && (
        <Modal title={editId ? 'Edit book' : 'Add new book'} onClose={() => setShowModal(false)}>
          <form onSubmit={save} className="form-grid">
            {formError && <div className="alert alert-error full">{formError}</div>}

            <div className="full">
              <label>Title *</label>
              <input required value={form.title} onChange={set('title')} />
            </div>
            <div>
              <label>Author *</label>
              <input required value={form.author} onChange={set('author')} />
            </div>
            <div>
              <label>ISBN *</label>
              <input required value={form.isbn} onChange={set('isbn')} />
            </div>
            <div>
              <label>Category</label>
              <input value={form.category} onChange={set('category')} placeholder="e.g. Fiction" />
            </div>
            <div>
              <label>Publisher</label>
              <input value={form.publisher} onChange={set('publisher')} />
            </div>
            <div>
              <label>Year</label>
              <input type="number" min="0" max="2100" value={form.year} onChange={set('year')} />
            </div>
            <div>
              <label>Shelf / location</label>
              <input value={form.location} onChange={set('location')} placeholder="e.g. A2" />
            </div>
            <div>
              <label>Total copies *</label>
              <input type="number" min="1" required value={form.totalCopies} onChange={set('totalCopies')} />
            </div>

            <div className="full modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save book'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
