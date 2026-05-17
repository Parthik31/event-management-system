import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Film,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
  XCircle
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { toast } from 'react-hot-toast';
import api from '../../utils/Axios';
import { useLiveAnalytics } from '../../hooks/useLiveAnalytics';
import { prepareChartData, formatChartDate } from '../../../../server/utils/chartUtils';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat('en-IN');

const formatCurrency = (value = 0) => currencyFormatter.format(Number(value || 0));
const formatNumber = (value = 0) => numberFormatter.format(Number(value || 0));
const formatDateTime = (value) =>
  new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

const categoryColors = ['#f97316', '#fb923c', '#fdba74'];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data, loading, error, lastUpdated, forceRefresh } = useLiveAnalytics('/admin/stats', 30000);
  const [approvalTab, setApprovalTab] = useState('events');
  const [processingKey, setProcessingKey] = useState('');
  const [feedbackByItem, setFeedbackByItem] = useState({});

  const kpis = data?.kpis || {};
  const chartData = prepareChartData(data?.chart, 30);
  const categoryBookings = Array.isArray(data?.categoryBookings) ? data.categoryBookings : [];
  const recentBookings = Array.isArray(data?.recentBookings) ? data.recentBookings : [];
  const organizers = Array.isArray(data?.organizers) ? data.organizers : [];
  const approvals = data?.approvals || {};
  const pendingCounts = data?.pendingCounts || {};

  const approvalItems = useMemo(
    () => ({
      events: Array.isArray(approvals.events) ? approvals.events : [],
      movies: Array.isArray(approvals.movies) ? approvals.movies : [],
      multiplexes: Array.isArray(approvals.multiplexes) ? approvals.multiplexes : []
    }),
    [approvals]
  );

  const handleApprovalAction = async (moduleKey, itemId, status) => {
    const actionKey = `${moduleKey}-${itemId}-${status}`;
    setProcessingKey(actionKey);

    try {
      if (moduleKey === 'events') {
        await api.put(`/events/${itemId}/status`, {
          status,
          adminFeedback: status === 'Rejected' ? feedbackByItem[itemId] || '' : ''
        });
      } else if (moduleKey === 'movies') {
        await api.put(`/movies/admin/${itemId}/status`, { status });
      } else {
        await api.put(`/multiplexes/admin/${itemId}/status`, {
          status,
          adminFeedback: status === 'Rejected' ? feedbackByItem[itemId] || '' : ''
        });
      }

      toast.success(`${moduleKey.slice(0, -1)} ${status.toLowerCase()} successfully.`);
      setFeedbackByItem((current) => ({ ...current, [itemId]: '' }));
      forceRefresh();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Failed to update approval status.');
    } finally {
      setProcessingKey('');
    }
  };

  if (loading && !data) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_20%,#fffaf5_100%)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_20px_60px_rgba(249,115,22,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Command Center
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Platform admin dashboard</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                  Monitor platform revenue, bookings, users, organizers, and live approval queues across events, movies, and multiplex integrations from one synced workspace.
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
              <button type="button" onClick={() => navigate('/admin/finance')} className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
                <Wallet className="h-4 w-4" />
                Finance Ledger
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total Revenue" value={formatCurrency(kpis.totalRevenue)} subtitle="Overall confirmed platform revenue" icon={<Wallet className="h-5 w-5" />} accent="from-orange-500 to-orange-600" />
          <MetricCard title="Total Bookings" value={formatNumber(kpis.totalBookings)} subtitle="Confirmed transactions across modules" icon={<Ticket className="h-5 w-5" />} />
          <MetricCard title="Total Users" value={formatNumber(kpis.totalUsers)} subtitle="Registered customer accounts" icon={<Users className="h-5 w-5" />} />
          <MetricCard title="Total Organizers" value={formatNumber(kpis.totalOrganizers)} subtitle="Event, movie, and multiplex organizers" icon={<Building2 className="h-5 w-5" />} />
        </section>

        {/* 🚀 NEW CHART SECTION START */}
        <section className="mt-2 grid gap-6 xl:grid-cols-[2fr_1fr]">
          {/* Monthly Revenue Trend Graph */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-bold text-slate-900">30-Day Revenue Trend</h2>
            <div className="h-75 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} tickFormatter={formatChartDate} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'transparent' }} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={4} dot={false} activeDot={{ r: 8, fill: '#f97316', stroke: '#fff', strokeWidth: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Breakdown by Module */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-bold text-slate-900">Revenue by Module</h2>
            <div className="h-75 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBookings} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 600, fill: '#334155' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} content={<ChartTooltip />} />
                  <Bar dataKey="revenue" radius={[0, 8, 8, 0]} barSize={32}>
                    {categoryBookings.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
          <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Approval Management</h2>
                <p className="mt-1 text-sm text-slate-500">Approve or reject incoming event, movie, and multiplex submissions in real time.</p>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-3">
              <ApprovalCount label="Events" value={pendingCounts.events || 0} />
              <ApprovalCount label="Movies" value={pendingCounts.movies || 0} />
              <ApprovalCount label="Multiplexes" value={pendingCounts.multiplexes || 0} />
            </div>

            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              {[
                { key: 'events', label: 'Events' },
                { key: 'movies', label: 'Movies' },
                { key: 'multiplexes', label: 'Multiplexes' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setApprovalTab(tab.key)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    approvalTab === tab.key ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-orange-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4">
              {approvalItems[approvalTab]?.length ? (
                approvalItems[approvalTab].map((item) => (
                  <ApprovalCard
                    key={item.id}
                    item={item}
                    moduleKey={approvalTab}
                    feedback={feedbackByItem[item.id] || ''}
                    setFeedback={(value) => setFeedbackByItem((current) => ({ ...current, [item.id]: value }))}
                    processingKey={processingKey}
                    onAction={handleApprovalAction}
                  />
                ))
              ) : (
                <EmptyStateCard message={`No pending ${approvalTab} approvals right now.`} compact />
              )}
            </div>

            <div className="mt-5 flex justify-end gap-4">
              <QuickLink onClick={() => navigate('/admin/events')} label="Review Events" />
              <QuickLink onClick={() => navigate('/admin/movies')} label="Review Movies" />
              <QuickLink onClick={() => navigate('/admin/multiplexes')} label="Review Multiplexes" />
              <QuickLink onClick={() => navigate('/admin/organizers')} label="Review Organizers" />
            </div>
          </div>

          <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-900">Organizer List</h2>
              <p className="mt-1 text-sm text-slate-500">Organizer type, approval posture, and recent activity across the full platform.</p>
            </div>

            <div className="hidden overflow-hidden rounded-3xl border border-slate-200 lg:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    <th className="px-5 py-4">Organizer</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {organizers.slice(0, 8).map((organizer) => (
                    <tr key={organizer.id} className="transition hover:bg-orange-50/40">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{organizer.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{organizer.email}</div>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">{organizer.type}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={organizer.status} />
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{organizer.activity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-4 lg:hidden">
              {organizers.slice(0, 4).map((organizer) => (
                <div key={organizer.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="font-semibold text-slate-900">{organizer.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{organizer.type}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <StatusBadge status={organizer.status} />
                    <span className="text-sm text-slate-500">{organizer.activity}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => navigate('/admin/organizers')} className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 transition hover:text-orange-800">
                Open organizer controls
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
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

const MiniInsight = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
      {icon}
      {label}
    </div>
    <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
  </div>
);

const ApprovalCount = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
  </div>
);

const ApprovalCard = ({ item, moduleKey, feedback, setFeedback, processingKey, onAction }) => {
  const currentRejectKey = `${moduleKey}-${item.id}-Rejected`;
  const currentApproveKey = `${moduleKey}-${item.id}-Approved`;

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-bold text-slate-900">{item.title}</p>
            <StatusBadge status={item.status || 'Pending'} />
          </div>
          <p className="mt-2 text-sm text-slate-500">{item.organizerName}</p>
          <p className="mt-1 text-sm text-slate-500">{item.location || item.city || (item.releaseDate ? new Date(item.releaseDate).toLocaleDateString('en-IN') : item.date || '')}</p>
        </div>

        {(moduleKey === 'events' || moduleKey === 'multiplexes') ? (
          <input
            type="text"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Optional rejection reason"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300"
          />
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onAction(moduleKey, item.id, 'Rejected')}
            disabled={processingKey === currentRejectKey || processingKey === currentApproveKey}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processingKey === currentRejectKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Reject
          </button>
          <button
            type="button"
            onClick={() => onAction(moduleKey, item.id, 'Approved')}
            disabled={processingKey === currentRejectKey || processingKey === currentApproveKey}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f97316,#ea580c)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.20)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processingKey === currentApproveKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    Pending: 'bg-amber-50 text-amber-700',
    Approved: 'bg-emerald-50 text-emerald-700',
    'Needs Review': 'bg-rose-50 text-rose-700',
    Rejected: 'bg-rose-50 text-rose-700',
    New: 'bg-slate-100 text-slate-700'
  };

  return <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${styles[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;
};

const QuickLink = ({ onClick, label }) => (
  <button type="button" onClick={onClick} className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 transition hover:text-orange-800">
    {label}
    <ArrowRight className="h-4 w-4" />
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
          {entry.dataKey === 'revenue' || entry.dataKey === 'commission' ? formatCurrency(entry.value) : formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
};

const EmptyStateCard = ({ message, compact = false }) => (
  <div className={`flex items-center justify-center rounded-3xl border border-dashed border-orange-200 bg-orange-50/40 px-6 text-center ${compact ? 'py-10' : 'h-full'}`}>
    <p className="max-w-sm text-sm font-medium leading-6 text-slate-500">{message}</p>
  </div>
);

const AdminDashboardSkeleton = () => (
  <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_20%,#fffaf5_100%)] px-4 py-6 md:px-8 md:py-8">
    <div className="mx-auto flex max-w-7xl animate-pulse flex-col gap-6">
      <div className="rounded-[28px] border border-orange-100 bg-white p-6">
        <div className="h-6 w-44 rounded-full bg-orange-100" />
        <div className="mt-4 h-10 w-80 rounded-2xl bg-slate-100" />
        <div className="mt-3 h-5 w-xl max-w-full rounded-xl bg-slate-100" />
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
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
        <div className="h-130 rounded-[28px] border border-orange-100 bg-white" />
        <div className="h-130 rounded-[28px] border border-orange-100 bg-white" />
      </div>
    </div>
  </div>
);

export default AdminDashboard;
