import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Film,
  Loader2,
  RefreshCw,
  Search,
  XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../utils/Axios';
import { resolveMediaUrl } from '../../utils/Axios';

const statusStyles = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200'
};

const AdminMovies = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingKey, setProcessingKey] = useState('');

  const fetchMovies = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/movies/admin/list?status=${filter}`);
      setMovies(Array.isArray(data.data) ? data.data : []);
    } catch {
      toast.error('Failed to load movie approvals.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const searchTarget = `${movie.title || ''} ${movie.organizer?.companyName || movie.organizer?.name || ''}`.toLowerCase();
      return searchTarget.includes(searchQuery.trim().toLowerCase());
    });
  }, [movies, searchQuery]);

  const handleAction = async (movieId, status) => {
    const actionKey = `${movieId}-${status}`;
    setProcessingKey(actionKey);

    try {
      await api.put(`/movies/admin/${movieId}/status`, { status });
      toast.success(`Movie ${status.toLowerCase()} successfully.`);
      fetchMovies();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update movie status.');
    } finally {
      setProcessingKey('');
    }
  };

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
                <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Movie approvals</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  Review submitted movie listings, approve theatrical releases, or reject incomplete entries without breaking the movie workflow.
                </p>
              </div>
            </div>

            <button type="button" onClick={fetchMovies} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Movie moderation</h2>
              <p className="mt-1 text-sm text-slate-500">Review pending, approved, and rejected movie submissions in real time.</p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-60">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search title or organizer"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {['Pending', 'Approved', 'Rejected'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilter(status)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-700'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : filteredMovies.length ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredMovies.map((movie) => (
                <article key={movie._id} className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                  <div className="relative h-64 bg-orange-50">
                    {movie.poster ? (
                      <img src={resolveMediaUrl(movie.poster)} alt={movie.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-orange-500">
                        <Film className="h-8 w-8" />
                      </div>
                    )}
                    <div className="absolute left-4 top-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${statusStyles[movie.status] || statusStyles.Pending}`}>{movie.status || 'Pending'}</span>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <h3 className="line-clamp-1 text-lg font-bold text-slate-900">{movie.title}</h3>
                      <p className="mt-2 text-sm text-slate-500">{movie.organizer?.companyName || movie.organizer?.name || 'Organizer'}</p>
                    </div>

                    <div className="space-y-2 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-orange-500" />
                        <span>{movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString('en-IN') : 'Release date pending'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Film className="h-4 w-4 text-orange-500" />
                        <span>{Array.isArray(movie.genre) ? movie.genre.join(', ') : 'Genre pending'}</span>
                      </div>
                    </div>

                    {filter === 'Pending' ? (
                      <div className="flex gap-3 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => handleAction(movie._id, 'Rejected')}
                          disabled={processingKey === `${movie._id}-Rejected` || processingKey === `${movie._id}-Approved`}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {processingKey === `${movie._id}-Rejected` ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(movie._id, 'Approved')}
                          disabled={processingKey === `${movie._id}-Rejected` || processingKey === `${movie._id}-Approved`}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f97316,#ea580c)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.20)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {processingKey === `${movie._id}-Approved` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Approve
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 px-6 py-14 text-center">
              <p className="text-lg font-semibold text-slate-900">No matching movies</p>
              <p className="mt-2 text-sm text-slate-500">There are no {filter.toLowerCase()} movies matching the current filter.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminMovies;
