import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarDays, Edit3, Loader2, MapPin, Plus, Search, Ticket, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api, { resolveMediaUrl } from '../../../utils/Axios';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat('en-IN');

const formatCurrency = (value = 0) => currencyFormatter.format(Number(value || 0));
const formatNumber = (value = 0) => numberFormatter.format(Number(value || 0));

const statusStyles = {
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  Cancelled: 'bg-slate-100 text-slate-600 border-slate-200'
};

const MyEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyEvents = async () => {
      try {
        setLoading(true);
        const response = await api.get('/events/organizer/my');
        setEvents(Array.isArray(response.data.data) ? response.data.data : []);
      } catch {
        toast.error('Failed to load your event catalog.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesStatus = statusFilter === 'All' || event.status === statusFilter;
      const searchTarget = `${event.title || ''} ${event.location || ''}`.toLowerCase();
      const matchesSearch = searchTarget.includes(searchQuery.trim().toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [events, searchQuery, statusFilter]);

  const totals = useMemo(() => {
    return events.reduce(
      (accumulator, event) => {
        accumulator.revenue += Number(event.grossRevenue || 0);
        accumulator.tickets += Number(event.ticketsSold || 0);
        return accumulator;
      },
      { revenue: 0, tickets: 0 }
    );
  }, [events]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fffaf5_100%)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_20px_60px_rgba(249,115,22,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
                <Ticket className="h-3.5 w-3.5" />
                Event Catalog
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">My Events</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  Review all approved, pending, and rejected listings with live sales numbers and quick editing access.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                  <Wallet className="h-3.5 w-3.5 text-orange-500" />
                  {formatCurrency(totals.revenue)} total revenue
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                  <Ticket className="h-3.5 w-3.5 text-orange-500" />
                  {formatNumber(totals.tickets)} tickets sold
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/organizer/event/finance')}
                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
              >
                <Wallet className="h-4 w-4" />
                Finance Ledger
              </button>
              <button
                type="button"
                onClick={() => navigate('/organizer/create-event')}
                className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f97316,#ea580c)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                Create Event
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Live Event List</h2>
              <p className="mt-1 text-sm text-slate-500">Search your catalog and edit listings without leaving the workflow.</p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-60">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search title or venue"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {['All', 'Approved', 'Pending', 'Rejected'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      statusFilter === status
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-700'
                    }`}
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
          ) : filteredEvents.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 px-6 py-14 text-center">
              <p className="text-lg font-semibold text-slate-900">No matching events</p>
              <p className="mt-2 text-sm text-slate-500">Try another search term or create your next listing.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((event) => (
                <article
                  key={event._id}
                  className="group overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(249,115,22,0.12)]"
                >
                  <div className="relative h-52 overflow-hidden bg-orange-50">
                    {event.image ? (
                      <img
                        src={resolveMediaUrl(event.image)}
                        alt={event.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-orange-500">
                        <Ticket className="h-8 w-8" />
                      </div>
                    )}
                    <div className="absolute left-4 top-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${statusStyles[event.status] || statusStyles.Pending}`}>
                        {event.status || 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <h3 className="line-clamp-1 text-lg font-bold text-slate-900">{event.title}</h3>
                      <div className="mt-3 space-y-2 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-orange-500" />
                          <span>{event.date || 'TBA'} {event.time ? `at ${event.time}` : ''}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-orange-500" />
                          <span className="line-clamp-1">{event.location || 'Venue to be announced'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <StatCard label="Tickets" value={formatNumber(event.ticketsSold)} />
                      <StatCard label="Revenue" value={formatCurrency(event.grossRevenue)} />
                      <StatCard label="Users" value={formatNumber(event.totalUsers)} />
                      <StatCard label="Sell Through" value={`${event.totalCapacity ? Math.min(100, Math.round((Number(event.ticketsSold || 0) / Number(event.totalCapacity || 1)) * 100)) : 0}%`} />
                    </div>

                    {event.status === 'Rejected' && event.adminFeedback ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                          <p className="text-sm leading-6 text-rose-700">{event.adminFeedback}</p>
                        </div>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => navigate(`/organizer/events/edit/${event._id}`)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit Event
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div className="rounded-2xl bg-slate-50 px-3 py-3">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
  </div>
);

export default MyEvents;
