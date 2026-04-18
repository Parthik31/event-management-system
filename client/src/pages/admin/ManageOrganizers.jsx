import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../utils/Axios';
import { useLiveAnalytics } from '../../hooks/useLiveAnalytics';

const statusStyles = {
  Pending: 'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  'Needs Review': 'bg-rose-50 text-rose-700',
  Rejected: 'bg-rose-50 text-rose-700',
  New: 'bg-slate-100 text-slate-700'
};

const ManageOrganizers = () => {
  const navigate = useNavigate();
  const { data, loading: statsLoading, forceRefresh } = useLiveAnalytics('/admin/stats', 30000);
  const [organizerAccounts, setOrganizerAccounts] = useState([]);
  const [multiplexes, setMultiplexes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [processingKey, setProcessingKey] = useState('');

  useEffect(() => {
    const fetchOrganizerControls = async () => {
      try {
        setLoading(true);
        const [usersResponse, multiplexResponse] = await Promise.all([
          api.get('/admin/users'),
          api.get('/multiplexes/admin/list')
        ]);

        setOrganizerAccounts((Array.isArray(usersResponse.data.data) ? usersResponse.data.data : []).filter((user) => user.role === 'organizer'));
        setMultiplexes(Array.isArray(multiplexResponse.data.data) ? multiplexResponse.data.data : []);
      } catch {
        toast.error('Failed to load organizer controls.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizerControls();
  }, []);

  const organizerInsights = Array.isArray(data?.organizers) ? data.organizers : [];

  const organizerRows = useMemo(() => {
    return organizerInsights.filter((organizer) => {
      const searchTarget = `${organizer.name || ''} ${organizer.email || ''} ${organizer.type || ''}`.toLowerCase();
      return searchTarget.includes(searchQuery.trim().toLowerCase());
    });
  }, [organizerInsights, searchQuery]);

  const multiplexRows = useMemo(() => {
    return multiplexes.filter((multiplex) => {
      const searchTarget = `${multiplex.multiplexName || ''} ${multiplex.city || ''} ${multiplex.owner?.companyName || multiplex.owner?.name || ''}`.toLowerCase();
      return searchTarget.includes(searchQuery.trim().toLowerCase());
    });
  }, [multiplexes, searchQuery]);

  const handleDeleteOrganizer = async (userId) => {
    if (!window.confirm('Deleting an organizer can orphan existing content. Continue?')) {
      return;
    }

    setDeletingId(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('Organizer deleted successfully.');
      setOrganizerAccounts((current) => current.filter((user) => user._id !== userId));
      forceRefresh();
    } catch {
      toast.error('Failed to delete organizer.');
    } finally {
      setDeletingId('');
    }
  };

  const handleMultiplexStatus = async (multiplexId, status) => {
    const actionKey = `${multiplexId}-${status}`;
    setProcessingKey(actionKey);
    try {
      await api.put(`/multiplexes/admin/${multiplexId}/status`, { status });
      toast.success(`Multiplex ${status.toLowerCase()} successfully.`);
      const response = await api.get('/multiplexes/admin/list');
      setMultiplexes(Array.isArray(response.data.data) ? response.data.data : []);
      forceRefresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update multiplex status.');
    } finally {
      setProcessingKey('');
    }
  };

  const combinedLoading = loading || statsLoading;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fffaf5_100%)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_20px_60px_rgba(249,115,22,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <button type="button" onClick={() => navigate('/admin/dashboard')} className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 transition hover:text-orange-800">
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </button>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Organizer controls</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                  Manage organizer accounts, review organizer activity, and approve or reject multiplex integrations from one control surface.
                </p>
              </div>
            </div>

            <button type="button" onClick={forceRefresh} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600">
              <RefreshCw className={`h-4 w-4 ${combinedLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Organizer directory</h2>
              <p className="mt-1 text-sm text-slate-500">Type, status, and activity are synced from the live admin analytics endpoint.</p>
            </div>
            <div className="relative min-w-65">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search organizer, type, or multiplex"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white"
              />
            </div>
          </div>

          {combinedLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : organizerRows.length ? (
            <div className="mt-6 hidden overflow-hidden rounded-3xl border border-slate-200 lg:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    <th className="px-5 py-4">Organizer</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Activity</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {organizerRows.map((organizer) => {
                    const matchingAccount = organizerAccounts.find((account) => account.email === organizer.email);

                    return (
                      <tr key={organizer.id} className="transition hover:bg-orange-50/40">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{organizer.name}</div>
                          <div className="mt-1 text-sm text-slate-500">{organizer.email}</div>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">{organizer.type}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${statusStyles[organizer.status] || 'bg-slate-100 text-slate-700'}`}>{organizer.status}</span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{organizer.activity}</td>
                        <td className="px-5 py-4 text-right">
                          {matchingAccount ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteOrganizer(matchingAccount._id)}
                              disabled={deletingId === matchingAccount._id}
                              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId === matchingAccount._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              Delete
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 px-6 py-14 text-center">
              <p className="text-lg font-semibold text-slate-900">No matching organizers</p>
              <p className="mt-2 text-sm text-slate-500">There are no organizer accounts matching the current search.</p>
            </div>
          )}
        </section>
        
      </div>
    </div>
  );
};

export default ManageOrganizers;
