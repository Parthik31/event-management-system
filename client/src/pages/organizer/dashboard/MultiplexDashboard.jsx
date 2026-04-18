import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  LayoutGrid,
  MonitorPlay,
  RefreshCw,
  Search,
  Ticket,
  TrendingUp,
  Wallet,
  Tag,
  Users
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
import { toast } from 'react-hot-toast';
import { useLiveAnalytics } from '../../../hooks/useLiveAnalytics';
import api from '../../../utils/Axios';
import { formatCurrency, formatNumber, formatDate, formatLastUpdated } from '../../../utils/formatters';

const MultiplexDashboard = () => {
  const navigate = useNavigate();
  const { data, loading, error, lastUpdated, forceRefresh } = useLiveAnalytics('/finance/organizer/multiplex/dashboard', 30000);
  const [multiplexes, setMultiplexes] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchMultiplexes = async () => {
      try {
        setCatalogLoading(true);
        const response = await api.get('/multiplexes/my');
        setMultiplexes(Array.isArray(response.data.data) ? response.data.data : []);
      } catch {
        toast.error('Failed to load multiplex management data.');
      } finally {
        setCatalogLoading(false);
      }
    };

    fetchMultiplexes();
  }, []);

  const kpis = data?.kpis || {};
  const chartData = Array.isArray(data?.chart) ? data.chart : [];
  const topMovies = Array.isArray(data?.topMovies) ? data.topMovies : [];
  const reports = Array.isArray(data?.reports) ? data.reports : [];
  const management = data?.management || {};

  const filteredMultiplexes = useMemo(() => {
    return multiplexes.filter((multiplex) => {
      const searchTarget = `${multiplex.multiplexName || ''} ${multiplex.city || ''}`.toLowerCase();
      return searchTarget.includes(searchQuery.trim().toLowerCase());
    });
  }, [multiplexes, searchQuery]);

  if (loading && !data) {
    return <MultiplexDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fffaf5_100%)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_20px_60px_rgba(249,115,22,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
                <Building2 className="h-3.5 w-3.5" />
                Multiplex Organizer Console
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Multiplex dashboard</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  Track screens, active shows, booking momentum, and property revenue while keeping movie scheduling and show timing workflows one click away.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                  <RefreshCw className="h-3.5 w-3.5 text-orange-500" />
                  Last synced {new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {error ? <span className="rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-600">Live sync retrying in background</span> : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={forceRefresh} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button type="button" onClick={() => navigate('/organizer/multiplex/finance')} className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
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
              <button type="button" onClick={() => navigate('/organizer/multiplexes')} className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f97316,#ea580c)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5">
                <LayoutGrid className="h-4 w-4" />
                Manage Multiplex
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total Revenue" value={formatCurrency(kpis.grossRevenue)} subtitle="Gross revenue from multiplex bookings" icon={<Wallet className="h-5 w-5" />} accent="from-orange-500 to-orange-600" />
          <MetricCard title="Total Users" value={formatNumber(kpis.totalUsers)} subtitle="Unique ticket buyers" icon={<Users className="h-5 w-5" />} accent="from-amber-500 to-yellow-600" />
          <MetricCard title="Active Shows" value={formatNumber(kpis.activeShows)} subtitle="Running or upcoming shows across screens" icon={<CalendarClock className="h-5 w-5" />} />
          <MetricCard title="Tickets Sold" value={formatNumber(kpis.ticketsSold)} subtitle="Confirmed tickets from multiplex bookings" icon={<Ticket className="h-5 w-5" />} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
          <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-900">Multiplex Control</h2>
              <p className="mt-1 text-sm text-slate-500">Keep movie assignment, screen management, and show scheduling in the same workflow.</p>
            </div>
            <div className="grid gap-3">
              <ActionCard title="Manage Properties" description="Register multiplexes, add screens, and review current inventory." action="Open multiplex manager" onClick={() => navigate('/organizer/multiplexes')} />
              <ActionCard title="Assign Movies To Screens" description="Map approved movies to available screens and keep schedules accurate." action="Open show scheduler" onClick={() => navigate('/organizer/manage-shows')} />
              <ActionCard title="Review Finance" description="Inspect real-time ledger, screen revenue, and movie-level payout performance." action="Open finance ledger" onClick={() => navigate('/organizer/multiplex/finance')} />
            </div>
          </div>

          <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">My Multiplexes</h2>
                <p className="mt-1 text-sm text-slate-500">Live property snapshot with screens, active shows, bookings, and quick workflow access.</p>
              </div>
              <div className="relative min-w-60">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search multiplex or city" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white" />
              </div>
            </div>

            {catalogLoading ? (
              <div className="flex h-64 items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : filteredMultiplexes.length ? (
              <div className="mt-6 grid gap-4">
                {filteredMultiplexes.map((multiplex) => (
                  <div key={multiplex._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{multiplex.multiplexName}</h3>
                        <p className="mt-1 text-sm text-slate-500">{multiplex.city} | {multiplex.address}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 lg:min-w-[320px]">
                        <StatCard label="Screens" value={formatNumber(multiplex.totalScreens || multiplex.screens?.length || 0)} />
                        <StatCard label="Shows" value={formatNumber(multiplex.activeShows || 0)} />
                        <StatCard label="Tickets" value={formatNumber(multiplex.ticketsSold || 0)} />
                        <StatCard label="Revenue" value={formatCurrency(multiplex.grossRevenue || 0)} />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button type="button" onClick={() => navigate('/organizer/multiplexes')} className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
                        <LayoutGrid className="h-4 w-4" />
                        Manage Screens
                      </button>
                      <button type="button" onClick={() => navigate('/organizer/multiplexes')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700">
                        <Building2 className="h-4 w-4" />
                        Edit Multiplex
                      </button>
                      <button type="button" onClick={() => navigate('/organizer/manage-shows')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700">
                        <CalendarClock className="h-4 w-4" />
                        Manage Show Timings
                      </button>
                      <button type="button" onClick={() => navigate('/organizer/manage-shows')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700">
                        <CalendarClock className="h-4 w-4" />
                        Edit Assigned Shows
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 px-6 py-12 text-center">
                <p className="text-lg font-semibold text-slate-900">No multiplexes found</p>
                <p className="mt-2 text-sm text-slate-500">Add your first multiplex property to start assigning movies and managing show timings.</p>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => navigate('/organizer/multiplexes')} className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 transition hover:text-orange-800">
                Open multiplex manager
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Real-Time Booking Stats</h2>
            <p className="mt-1 text-sm text-slate-500">Property-level booking performance synced with live booking data.</p>
          </div>
          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 lg:block">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                  <th className="px-6 py-4">Property</th>
                  <th className="px-6 py-4 text-right">Screens</th>
                  <th className="px-6 py-4 text-right">Active Shows</th>
                  <th className="px-6 py-4 text-right">Tickets Sold</th>
                  <th className="px-6 py-4 text-right">Gross Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {reports.length ? reports.map((row) => (
                  <tr key={row.id} className="transition hover:bg-orange-50/40">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{row.title}</div>
                      <div className="mt-1 text-sm text-slate-500">{row.city || 'City pending'}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-700">{formatNumber(row.screens)}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-700">{formatNumber(row.activeShows)}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-700">{formatNumber(row.ticketsSold)}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900">{formatCurrency(row.grossRevenue)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center text-sm text-slate-500">Real-time multiplex booking stats will appear here once bookings start landing.</td>
                  </tr>
                )}
              </tbody>
            </table>
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

const MiniInsight = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
  </div>
);

const StatCard = ({ label, value }) => (
  <div className="rounded-2xl bg-slate-50 px-3 py-3">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
  </div>
);

const ActionCard = ({ title, description, action, onClick }) => (
  <button type="button" onClick={onClick} className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-left transition hover:border-orange-200 hover:bg-orange-50">
    <p className="text-base font-semibold text-slate-900">{title}</p>
    <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-orange-700">
      {action}
      <ArrowRight className="h-4 w-4" />
    </span>
  </button>
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
          {entry.dataKey === 'revenue' ? formatCurrency(entry.value) : formatNumber(entry.value)}
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

const MultiplexDashboardSkeleton = () => (
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
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="h-105 rounded-[28px] border border-orange-100 bg-white" />
        <div className="h-105 rounded-[28px] border border-orange-100 bg-white" />
      </div>
      <div className="h-105 rounded-[28px] border border-orange-100 bg-white" />
    </div>
  </div>
);

export default MultiplexDashboard;
