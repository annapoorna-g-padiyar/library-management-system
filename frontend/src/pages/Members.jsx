import { useCallback, useEffect, useState } from 'react';
import api, { errMsg, fmtDate } from '../api';
import Modal from '../components/Modal.jsx';

const emptyForm = { name: '', email: '', phone: '', type: 'student', status: 'active', address: '' };

export default function Members() {
  const [members, setMembers] = useState([]);
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
      const { data } = await api.get('/members', { params: { q } });
      setMembers(data);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q]);

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

  const openEdit = (m) => {
    setEditId(m._id);
    setForm({
      name: m.name,
      email: m.email,
      phone: m.phone || '',
      type: m.type,
      status: m.status,
      address: m.address || '',
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
        await api.put(`/members/${editId}`, form);
        flash('Member updated');
      } else {
        await api.post('/members', form);
        flash('Member added');
      }
      setShowModal(false);
      load();
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m) => {
    if (!window.confirm(`Delete member "${m.name}"?`)) return;
    try {
      await api.delete(`/members/${m._id}`);
      flash('Member deleted');
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
          <h1>Members</h1>
          <p className="muted">{members.length} registered members</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add member</button>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <input className="search" placeholder="Search by name, email, member ID or phone..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <section className="panel table-wrap">
        {loading ? (
          <p className="muted">Loading...</p>
        ) : members.length === 0 ? (
          <p className="muted">No members found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Type</th><th>Books out</th><th>Status</th><th>Joined</th><th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m._id}>
                  <td className="mono">{m.memberId}</td>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.email}</td>
                  <td>{m.phone || '-'}</td>
                  <td className="cap">{m.type}</td>
                  <td>{m.booksIssued}</td>
                  <td><span className={`badge ${m.status === 'active' ? 'badge-green' : 'badge-slate'}`}>{m.status}</span></td>
                  <td>{fmtDate(m.createdAt)}</td>
                  <td className="actions">
                    <button className="btn btn-small" onClick={() => openEdit(m)}>Edit</button>
                    <button className="btn btn-small btn-danger" onClick={() => remove(m)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showModal && (
        <Modal title={editId ? 'Edit member' : 'Add new member'} onClose={() => setShowModal(false)}>
          <form onSubmit={save} className="form-grid">
            {formError && <div className="alert alert-error full">{formError}</div>}

            <div>
              <label>Full name *</label>
              <input required value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label>Email *</label>
              <input type="email" required value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label>Phone</label>
              <input value={form.phone} onChange={set('phone')} />
            </div>
            <div>
              <label>Member type</label>
              <select value={form.type} onChange={set('type')}>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="staff">Staff</option>
                <option value="public">Public</option>
              </select>
            </div>
            <div>
              <label>Status</label>
              <select value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="full">
              <label>Address</label>
              <input value={form.address} onChange={set('address')} />
            </div>

            <div className="full modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save member'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
