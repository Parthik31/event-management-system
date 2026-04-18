import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Ticket,
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

const AdminEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingKey, setProcessingKey] = useState('');
  const [feedbackByEvent, setFeedbackByEvent] = useState({});

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/events/admin/list?status=${filter}`);
      setEvents(Array.isArray(data.data) ? data.data : []);
    } catch {
      toast.error('Failed to load event approvals.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const searchTarget = `${event.title || ''} ${event.location || ''} ${event.organizer?.companyName || event.organizer?.name || ''}`.toLowerCase();
      return searchTarget.includes(searchQuery.trim().toLowerCase());
    });
  }, [events, searchQuery]);

  const handleAction = async (eventId, status) => {
    const actionKey = `${eventId}-${status}`;
    setProcessingKey(actionKey);

    try {
      await api.put(`/events/${eventId}/status`, {
        status,
        adminFeedback: status === 'Rejected' ? feedbackByEvent[eventId] || '' : ''
      });

      toast.success(`Event ${status.toLowerCase()} successfully.`);
      setFeedbackByEvent((current) => ({ ...current, [eventId]: '' }));
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update event status.');
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
                <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Event approvals</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  Review pending, approved, and rejected event listings with fast moderation actions and organizer context.
                </p>
              </div>
            </div>

            <button type="button" onClick={fetchEvents} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Approval queue</h2>
              <p className="mt-1 text-sm text-slate-500">Moderate submitted event listings without changing the workflow.</p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-60">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search title, organizer, or venue"
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
          ) : filteredEvents.length ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((event) => (
                <article key={event._id} className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                  <div className="relative h-52 bg-orange-50">
                    {event.image ? (
                      <img src={resolveMediaUrl(event.image)} alt={event.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-orange-500">
                        <Ticket className="h-8 w-8" />
                      </div>
                    )}
                    <div className="absolute left-4 top-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${statusStyles[event.status] || statusStyles.Pending}`}>{event.status || 'Pending'}</span>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <h3 className="line-clamp-1 text-lg font-bold text-slate-900">{event.title}</h3>
                      <p className="mt-2 text-sm text-slate-500">{event.organizer?.companyName || event.organizer?.name || 'Organizer'}</p>
                    </div>

                    <div className="space-y-2 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-orange-500" />
                        <span>{event.date} | {event.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-orange-500" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    </div>

                    {filter === 'Pending' ? (
                      <div className="space-y-3 border-t border-slate-100 pt-4">
                        <input
                          type="text"
                          value={feedbackByEvent[event._id] || ''}
                          onChange={(item) => setFeedbackByEvent((current) => ({ ...current, [event._id]: item.target.value }))}
                          placeholder="Optional rejection reason"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white"
                        />
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => handleAction(event._id, 'Rejected')}
                            disabled={processingKey === `${event._id}-Rejected` || processingKey === `${event._id}-Approved`}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {processingKey === `${event._id}-Rejected` ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAction(event._id, 'Approved')}
                            disabled={processingKey === `${event._id}-Rejected` || processingKey === `${event._id}-Approved`}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f97316,#ea580c)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.20)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {processingKey === `${event._id}-Approved` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Approve
                          </button>
                        </div>
                      </div>
                    ) : event.adminFeedback ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{event.adminFeedback}</div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 px-6 py-14 text-center">
              <p className="text-lg font-semibold text-slate-900">No matching events</p>
              <p className="mt-2 text-sm text-slate-500">There are no {filter.toLowerCase()} events matching the current filter.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminEvents;
