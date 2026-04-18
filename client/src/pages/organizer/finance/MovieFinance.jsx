import React, { useState } from 'react';
import {
  Download,
  Film,
  Loader2,
  RefreshCw,
  Ticket,
  TrendingUp,
  Users,
  Wallet
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
import { useLiveAnalytics } from '../../../hooks/useLiveAnalytics';
import { downloadCsv } from '../../../utils/csv';
import { formatCurrency, formatDate, formatLastUpdated, formatNumber } from '../../../utils/formatters';

const breakdownColors = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#f59e0b', '#fb7185', '#fda4af', '#fcd34d'];

const MovieFinance = () => {
  const { data, loading, error, lastUpdated, forceRefresh } = useLiveAnalytics('/finance/organizer/movie/stats', 30000);
  const [isExporting, setIsExporting] = useState(false);

  const summary = data?.summary || {};
  const chartData = Array.isArray(data?.chart) ? [...data.chart].sort((a, b) => new Date(a.date) - new Date(b.date)) : [];
  const breakdown = Array.isArray(data?.breakdownByEvent) ? data.breakdownByEvent : [];
  const ledgerRows = Array.isArray(data?.reports) ? data.reports : [];

  const exportCsv = () => {
    setIsExporting(true);

    const header = ['User Email', 'Movie Name', 'Tickets Purchased', 'Total Amount', 'Date', 'Status'];
    const rows = ledgerRows.map((row) => [
      row.userEmail || 'Guest',
      row.movieName || 'Movie',
      row.ticketsPurchased || 0,
      row.totalAmount || 0,
      formatDate(row.date),
      row.status || 'Pending'
    ]);

    downloadCsv('movie-finance-ledger.csv', [header, ...rows]);
    setTimeout(() => setIsExporting(false), 300);
  };

  if (loading && !data) {
    return <FinanceSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fffaf5_100%)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_20px_60px_rgba(249,115,22,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
                <Wallet className="h-3.5 w-3.5" />
                Movie Finance
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Movie revenue ledger</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  Track total collections, daily movement, weekly performance, and every booking driving your movie organizer revenue.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                  <RefreshCw className="h-3.5 w-3.5 text-orange-500" />
                  Last synced {formatLastUpdated(lastUpdated)}
                </span>
                {error ? <span className="rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-600">Live sync retrying in background</span> : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={forceRefresh} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button type="button" onClick={exportCsv} disabled={isExporting || !ledgerRows.length} className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f97316,#ea580c)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export CSV
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FinanceCard title="Total Revenue" value={formatCurrency(summary.totalRevenue)} subtitle="All confirmed movie booking revenue" icon={<Wallet className="h-5 w-5" />} accent="from-orange-500 to-orange-600" />
          <FinanceCard title="Today" value={formatCurrency(summary.todayRevenue)} subtitle="Confirmed revenue booked today" icon={<TrendingUp className="h-5 w-5" />} />
          <FinanceCard title="Producer Net Earnings" value={formatCurrency(summary.payouts)} subtitle="Your cut after platform & gateway fees" icon={<Film className="h-5 w-5" />} accent="from-rose-500 to-pink-600" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Revenue trend</h2>
                <p className="mt-1 text-sm text-slate-500">Confirmed movie booking value for the last 14 days</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MiniInsight label="Tickets" value={formatNumber(summary.ticketsSold)} icon={<Ticket className="h-4 w-4" />} />
                <MiniInsight label="Users" value={formatNumber(summary.totalUsers)} icon={<Users className="h-4 w-4" />} />
              </div>
            </div>

            <div className="h-80">
              {chartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#fed7aa" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => formatCurrency(value).replace('.00', '')} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 5, fill: '#ea580c' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="Revenue points will appear here once movie bookings start flowing in." />
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Movie-wise breakdown</h2>
                <p className="mt-1 text-sm text-slate-500">Revenue contribution by movie title</p>
              </div>
              <Film className="h-5 w-5 text-orange-500" />
            </div>

            <div className="h-80">
              {breakdown.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdown} layout="vertical" margin={{ top: 10, right: 10, left: 18, bottom: 0 }}>
                    <CartesianGrid stroke="#ffedd5" strokeDasharray="4 4" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="revenue" radius={[0, 12, 12, 0]}>
                      {breakdown.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={breakdownColors[index % breakdownColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="Movie-wise breakdown will appear as soon as bookings are confirmed." />
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Detailed Ledger</h2>
              <p className="mt-1 text-sm text-slate-500">Every movie booking feeding your finance numbers in real time.</p>
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 lg:block">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                  <th className="px-6 py-4">User Email</th>
                  <th className="px-6 py-4">Movie Name</th>
                  <th className="px-6 py-4 text-right">Tickets Purchased</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {ledgerRows.length ? (
                  ledgerRows.map((row) => (
                    <tr key={row.id} className="transition hover:bg-orange-50/40">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{row.userEmail || 'Guest'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{row.movieName || 'Movie'}</td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-slate-700">{formatNumber(row.ticketsPurchased)}</td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900">{formatCurrency(row.totalAmount)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div>{formatDate(row.date)}</div>
                        <div className="mt-1">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${row.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{row.status || 'Pending'}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center">
                      <div className="mx-auto max-w-md">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                          <Wallet className="h-5 w-5" />
                        </div>
                        <p className="text-lg font-semibold text-slate-900">No finance entries yet</p>
                        <p className="mt-2 text-sm text-slate-500">Once movie bookings start, this ledger will fill automatically in real time.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:hidden">
            {ledgerRows.length ? ledgerRows.map((row) => (
              <div key={row.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">User Email</p>
                    <p className="mt-1 font-semibold text-slate-900">{row.userEmail || 'Guest'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Movie Name</p>
                    <p className="mt-1 font-semibold text-slate-900">{row.movieName || 'Movie'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <MobileStat label="Tickets" value={formatNumber(row.ticketsPurchased)} />
                    <MobileStat label="Amount" value={formatCurrency(row.totalAmount)} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">{formatDate(row.date)}</p>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${row.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{row.status || 'Pending'}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 px-6 py-12 text-center">
                <p className="text-lg font-semibold text-slate-900">No finance entries yet</p>
                <p className="mt-2 text-sm text-slate-500">Once bookings start, your ledger appears here automatically.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const FinanceCard = ({ title, value, subtitle, icon, accent }) => (
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

const FinanceSkeleton = () => (
  <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fffaf5_100%)] px-4 py-6 md:px-8 md:py-8">
    <div className="mx-auto flex max-w-7xl animate-pulse flex-col gap-6">
      <div className="rounded-[28px] border border-orange-100 bg-white p-6">
        <div className="h-6 w-40 rounded-full bg-orange-100" />
        <div className="mt-4 h-10 w-72 rounded-2xl bg-slate-100" />
        <div className="mt-3 h-5 w-lg max-w-full rounded-xl bg-slate-100" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...Array(3)].map((_, index) => (
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
      <div className="h-120 rounded-[28px] border border-orange-100 bg-white" />
    </div>
  </div>
);

export default MovieFinance;
