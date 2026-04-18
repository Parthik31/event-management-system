import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Clapperboard,
  Edit3,
  Film,
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
  Tag
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useLiveAnalytics } from '../../../hooks/useLiveAnalytics';
import { resolveMediaUrl } from '../../../utils/Axios';
import { formatCurrency, formatNumber, formatDate, formatLastUpdated } from '../../../utils/formatters';

const statusStyles = {
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200'
};

const MovieDashboard = () => {
  const navigate = useNavigate();
  const { data, loading, error, lastUpdated, forceRefresh } = useLiveAnalytics('/finance/organizer/movie/dashboard', 30000);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const kpis = data?.kpis || {};
  const chartData = Array.isArray(data?.chart) ? data.chart : [];
  const reports = Array.isArray(data?.reports) ? data.reports : [];
  const topMovies = Array.isArray(data?.topMovies) ? data.topMovies : [];

  const filteredMovies = useMemo(() => {
    return reports.filter((movie) => {
      const matchesStatus = statusFilter === 'All' || movie.status === statusFilter;
      const searchTarget = `${movie.title || ''} ${(movie.languages || []).join(' ')}`.toLowerCase();
      const matchesSearch = searchTarget.includes(searchQuery.trim().toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [reports, searchQuery, statusFilter]);

  const statusSummary = useMemo(() => {
    return reports.reduce(
      (accumulator, movie) => {
        const status = movie.status || 'Pending';
        accumulator[status] = (accumulator[status] || 0) + 1;
        return accumulator;
      },
      { Approved: 0, Pending: 0, Rejected: 0 }
    );
  }, [reports]);

  if (loading && !data) {
    return <MovieDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fffaf5_100%)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_20px_60px_rgba(249,115,22,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
                <Clapperboard className="h-3.5 w-3.5" />
                Movie Organizer Console
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Movie dashboard</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  Monitor live movie ticket revenue, active theatrical performance, and your studio release pipeline from one premium workspace.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                  <RefreshCw className="h-3.5 w-3.5 text-orange-500" />
                  Last synced {new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {error ? (
                  <span className="rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-600">
                    Live sync retrying in background
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={forceRefresh}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => navigate('/organizer/movie/finance')}
                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
              >
                <Wallet className="h-4 w-4" />
                Finance Ledger
              </button>
              <button
                onClick={() => navigate('/organizer/coupons')}
                className="flex items-center gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 cursor-pointer"
              >
                <Tag className="h-4 w-4" />
                Manage Coupons
              </button>
              <button
                type="button"
                onClick={() => navigate('/organizer/create-movie')}
                className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f97316,#ea580c)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                Create Movie
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Gross Revenue" value={formatCurrency(kpis.grossRevenue)} subtitle="Live movie ticket collections" icon={<Wallet className="h-5 w-5" />} accent="from-orange-500 to-orange-600" />
          <MetricCard title="Active Movies" value={formatNumber(kpis.activeMovies)} subtitle="Approved and currently running movies" icon={<LayoutGrid className="h-5 w-5" />} />
          <MetricCard title="Tickets Sold" value={formatNumber(kpis.ticketsSold)} subtitle="Confirmed movie admissions sold" icon={<Ticket className="h-5 w-5" />} />
          <MetricCard title="Total Users" value={formatNumber(kpis.totalUsers)} subtitle="Unique users who booked movie tickets" icon={<Users className="h-5 w-5" />} />
        </section>

        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">My Movies</h2>
              <p className="mt-1 text-sm text-slate-500">Review approved, pending, and rejected movies with live release performance and edit access.</p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-60">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search title or language" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white" />
              </div>
              <div className="flex flex-wrap gap-2">
                {['All', 'Approved', 'Pending', 'Rejected'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${statusFilter === status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-700'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 hidden overflow-hidden rounded-3xl border border-slate-200 lg:block">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                  <th className="px-6 py-4">Movie</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Release</th>
                  <th className="px-6 py-4 text-right">Shows</th>
                  <th className="px-6 py-4 text-right">Tickets Sold</th>
                  <th className="px-6 py-4 text-right">Revenue</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredMovies.length ? (
                  filteredMovies.map((movie) => (
                    <tr key={movie.id} className="transition hover:bg-orange-50/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 overflow-hidden rounded-2xl bg-orange-50">
                            {movie.poster ? (
                              <img src={resolveMediaUrl(movie.poster)} alt={movie.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-orange-500">
                                <Film className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{movie.title}</p>
                            <p className="mt-1 text-sm text-slate-500">{movie.languages?.join(', ') || 'Language pending'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[movie.status] || statusStyles.Pending}`}>{movie.status || 'Pending'}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString('en-IN') : 'TBA'}</td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-slate-700">{formatNumber(movie.shows)}</td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-slate-700">{formatNumber(movie.ticketsSold)}</td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900">{formatCurrency(movie.grossRevenue)}</td>
                      <td className="px-6 py-4 text-right">
                        <button type="button" onClick={() => navigate(`/organizer/movies/edit/${movie.id}`)} className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-20 text-center">
                      <div className="mx-auto max-w-md">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                          <Search className="h-5 w-5" />
                        </div>
                        <p className="text-lg font-semibold text-slate-900">No matching movies</p>
                        <p className="mt-2 text-sm text-slate-500">Try another search term or change the status filter.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 lg:hidden">
            {filteredMovies.length ? (
              filteredMovies.map((movie) => (
                <div key={movie.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl bg-orange-50">
                      {movie.poster ? (
                        <img src={resolveMediaUrl(movie.poster)} alt={movie.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-orange-500">
                          <Film className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="line-clamp-1 font-semibold text-slate-900">{movie.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{movie.languages?.join(', ') || 'Language pending'}</p>
                        </div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${statusStyles[movie.status] || statusStyles.Pending}`}>{movie.status || 'Pending'}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <MobileStat label="Release" value={movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString('en-IN') : 'TBA'} />
                        <MobileStat label="Shows" value={formatNumber(movie.shows)} />
                        <MobileStat label="Tickets" value={formatNumber(movie.ticketsSold)} />
                        <MobileStat label="Revenue" value={formatCurrency(movie.grossRevenue)} />
                      </div>
                      <button type="button" onClick={() => navigate(`/organizer/movies/edit/${movie.id}`)} className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
                        <Edit3 className="h-4 w-4" />
                        Edit Movie
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 px-6 py-12 text-center">
                <p className="text-lg font-semibold text-slate-900">No matching movies</p>
                <p className="mt-2 text-sm text-slate-500">Try a different filter or add a new movie listing.</p>
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => navigate('/organizer/my-movies')} className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 transition hover:text-orange-800">
              Open full My Movies page
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, icon, accent }) => (
  <div className="overflow-hidden rounded-[26px] border border-orange-100 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br ${accent || 'from-orange-100 to-orange-200'} ${accent ? 'text-white' : 'text-orange-600'} shadow-sm`}>
        {icon}
      </div>
    </div>
  </div>
);

const StatusChip = ({ label, value, tone }) => {
  const toneStyles = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <div className={`rounded-2xl border px-3 py-3 text-center ${toneStyles[tone] || toneStyles.amber}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em]">{label}</p>
      <p className="mt-2 text-xl font-black">{formatNumber(value)}</p>
    </div>
  );
};

const MobileStat = ({ label, value }) => (
  <div className="rounded-2xl bg-slate-50 px-3 py-2">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
  </div>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="mt-2 text-sm font-semibold text-slate-700">
          {entry.dataKey === 'revenue' ? formatCurrency(entry.value) : `${formatNumber(entry.value)} tickets`}
        </p>
      ))}
    </div>
  );
};

const EmptyChartState = ({ message }) => (
  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-orange-200 bg-orange-50/40 px-8 text-center">
    <p className="max-w-sm text-sm font-medium leading-6 text-slate-500">{message}</p>
  </div>
);

const MovieDashboardSkeleton = () => (
  <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fffaf5_100%)] px-4 py-6 md:px-8 md:py-8">
    <div className="mx-auto flex max-w-7xl animate-pulse flex-col gap-6">
      <div className="rounded-[28px] border border-orange-100 bg-white p-6">
        <div className="h-6 w-48 rounded-full bg-orange-100" />
        <div className="mt-4 h-10 w-72 rounded-2xl bg-slate-100" />
        <div className="mt-3 h-5 w-lg max-w-full rounded-xl bg-slate-100" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="rounded-[26px] border border-orange-100 bg-white p-5">
            <div className="h-4 w-28 rounded bg-slate-100" />
            <div className="mt-4 h-10 w-36 rounded bg-slate-100" />
            <div className="mt-4 h-4 w-full rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="h-105 rounded-[28px] border border-orange-100 bg-white" />
        <div className="h-105 rounded-[28px] border border-orange-100 bg-white" />
      </div>
      <div className="h-115 rounded-[28px] border border-orange-100 bg-white" />
    </div>
  </div>
);

export default MovieDashboard;
