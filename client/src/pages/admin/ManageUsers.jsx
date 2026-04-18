import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, Trash2, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../utils/Axios';

const ManageUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/admin/users');
        setUsers((Array.isArray(data.data) ? data.data : []).filter((user) => user.role === 'user'));
      } catch {
        toast.error('Failed to load user accounts.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchTarget = `${user.name || ''} ${user.email || ''}`.toLowerCase();
      return searchTarget.includes(searchQuery.trim().toLowerCase());
    });
  }, [users, searchQuery]);

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user account?')) {
      return;
    }

    setDeletingId(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User deleted successfully.');
      setUsers((current) => current.filter((user) => user._id !== userId));
    } catch {
      toast.error('Failed to delete user.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fffaf5_100%)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_20px_60px_rgba(249,115,22,0.08)]">
          <div className="space-y-3">
            <button type="button" onClick={() => navigate('/admin/dashboard')} className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 transition hover:text-orange-800">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Manage users</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                Search and manage standard customer accounts without affecting organizer or admin access flows.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Customer directory</h2>
              <p className="mt-1 text-sm text-slate-500">All customer accounts synced from the live user store.</p>
            </div>
            <div className="relative min-w-65">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name or email"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : filteredUsers.length ? (
            <div className="mt-6 hidden overflow-hidden rounded-3xl border border-slate-200 lg:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    <th className="px-5 py-4">User</th>
                    <th className="px-5 py-4">Joined</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="transition hover:bg-orange-50/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{user.name}</p>
                            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{new Date(user.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(user._id)}
                          disabled={deletingId === user._id}
                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === user._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 px-6 py-14 text-center">
              <p className="text-lg font-semibold text-slate-900">No matching users</p>
              <p className="mt-2 text-sm text-slate-500">There are no customer accounts matching the current search.</p>
            </div>
          )}

          {!loading && filteredUsers.length ? (
            <div className="mt-6 grid gap-4 lg:hidden">
              {filteredUsers.map((user) => (
                <div key={user._id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="font-semibold text-slate-900">{user.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-500">{new Date(user.createdAt).toLocaleDateString('en-IN')}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(user._id)}
                      disabled={deletingId === user._id}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === user._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default ManageUsers;
