import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ChevronDown,
  Loader2,
  MapPin,
  MonitorPlay,
  Plus,
  Save,
  Ticket,
  Wallet
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../utils/Axios';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const formatCurrency = (value = 0) => currencyFormatter.format(Number(value || 0));

const ManageMultiplexes = () => {
  const [multiplexes, setMultiplexes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMultiplex, setShowAddMultiplex] = useState(false);
  const [submittingMulti, setSubmittingMulti] = useState(false);
  const [activeMultiId, setActiveMultiId] = useState(null);
  const [submittingScreen, setSubmittingScreen] = useState(false);
  const [editingMultiplexId, setEditingMultiplexId] = useState(null);
  const [editingScreenId, setEditingScreenId] = useState(null);

  const [multiForm, setMultiForm] = useState({
    multiplexName: '',
    city: '',
    address: '',
    amenities: ''
  });

  const [screenForm, setScreenForm] = useState({
    screenName: '',
    screenType: '2D',
    rows: 10,
    cols: 15
  });

  useEffect(() => {
    fetchMultiplexes();
  }, []);

  const fetchMultiplexes = async () => {
    try {
      const response = await api.get('/multiplexes/my');
      setMultiplexes(Array.isArray(response.data.data) ? response.data.data : []);
    } catch {
      toast.error('Failed to load your multiplex properties.');
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(
    () => ({
      multiplexes: multiplexes.length,
      screens: multiplexes.reduce((total, multiplex) => total + Number(multiplex.totalScreens || multiplex.screens?.length || 0), 0),
      ticketsSold: multiplexes.reduce((total, multiplex) => total + Number(multiplex.ticketsSold || 0), 0),
      grossRevenue: multiplexes.reduce((total, multiplex) => total + Number(multiplex.grossRevenue || 0), 0)
    }),
    [multiplexes]
  );

  const handleAddMultiplex = async (event) => {
    event.preventDefault();

    if (!multiForm.multiplexName.trim() || !multiForm.city.trim() || !multiForm.address.trim()) {
      toast.error('Please complete multiplex name, city, and address.');
      return;
    }

    setSubmittingMulti(true);
    try {
      const amenities = multiForm.amenities
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      await api.post('/multiplexes', {
        ...multiForm,
        amenities
      });

      toast.success('Multiplex property registered successfully.');
      setShowAddMultiplex(false);
      setMultiForm({ multiplexName: '', city: '', address: '', amenities: '' });
      fetchMultiplexes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add multiplex property.');
    } finally {
      setSubmittingMulti(false);
    }
  };

  const handleEditMultiplex = async (event, multiplexId) => {
    event.preventDefault();

    if (!multiForm.multiplexName.trim() || !multiForm.city.trim() || !multiForm.address.trim()) {
      toast.error('Please complete multiplex name, city, and address.');
      return;
    }

    setSubmittingMulti(true);
    try {
      const amenities = multiForm.amenities
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      await api.put(`/multiplexes/${multiplexId}`, {
        ...multiForm,
        amenities
      });

      toast.success('Multiplex updated successfully.');
      setEditingMultiplexId(null);
      setShowAddMultiplex(false);
      setMultiForm({ multiplexName: '', city: '', address: '', amenities: '' });
      fetchMultiplexes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update multiplex property.');
    } finally {
      setSubmittingMulti(false);
    }
  };

  const handleAddScreen = async (event, multiplexId) => {
    event.preventDefault();

    if (!screenForm.screenName.trim() || Number(screenForm.rows) < 1 || Number(screenForm.cols) < 1) {
      toast.error('Please enter a valid screen name, rows, and seat columns.');
      return;
    }

    setSubmittingScreen(true);
    try {
      await api.post(`/multiplexes/${multiplexId}/screens`, {
        screenName: screenForm.screenName,
        screenType: screenForm.screenType,
        rows: Number(screenForm.rows),
        cols: Number(screenForm.cols)
      });

      toast.success('Screen added successfully.');
      setActiveMultiId(null);
      setScreenForm({ screenName: '', screenType: '2D', rows: 10, cols: 15 });
      fetchMultiplexes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add screen.');
    } finally {
      setSubmittingScreen(false);
    }
  };

  const handleEditScreen = async (event, multiplexId, screenId) => {
    event.preventDefault();

    if (!screenForm.screenName.trim() || Number(screenForm.rows) < 1 || Number(screenForm.cols) < 1) {
      toast.error('Please enter a valid screen name, rows, and seat columns.');
      return;
    }

    setSubmittingScreen(true);
    try {
      await api.put(`/multiplexes/${multiplexId}/screens/${screenId}`, {
        screenName: screenForm.screenName,
        screenType: screenForm.screenType,
        rows: Number(screenForm.rows),
        cols: Number(screenForm.cols)
      });

      toast.success('Screen updated successfully.');
      setEditingScreenId(null);
      setActiveMultiId(null);
      setScreenForm({ screenName: '', screenType: '2D', rows: 10, cols: 15 });
      fetchMultiplexes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update screen.');
    } finally {
      setSubmittingScreen(false);
    }
  };

  const openMultiplexEditor = (multiplex) => {
    setEditingMultiplexId(multiplex._id);
    setShowAddMultiplex(true);
    setMultiForm({
      multiplexName: multiplex.multiplexName || '',
      city: multiplex.city || '',
      address: multiplex.address || '',
      amenities: Array.isArray(multiplex.amenities) ? multiplex.amenities.join(', ') : ''
    });
  };

  const openScreenEditor = (multiplexId, screen) => {
    const nextRows = Number(screen.layout?.rows || 10);
    setActiveMultiId(multiplexId);
    setEditingScreenId(screen._id);
    setScreenForm({
      screenName: screen.screenName || '',
      screenType: screen.screenType || '2D',
      rows: nextRows,
      cols: Number(screen.layout?.cols || 15)
    });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fffaf5_100%)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_20px_60px_rgba(249,115,22,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
                <Building2 className="h-3.5 w-3.5" />
                Multiplex Operations
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Manage multiplexes</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  Register your cinema properties, manage screens, and keep screen inventory tightly synced with the rest of the organizer workflow.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddMultiplex((current) => !current)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f97316,#ea580c)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5"
            >
              {showAddMultiplex ? <ChevronDown className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showAddMultiplex ? 'Hide Form' : 'Register Multiplex'}
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Properties" value={summary.multiplexes} icon={<Building2 className="h-5 w-5" />} />
            <SummaryCard label="Total Screens" value={summary.screens} icon={<MonitorPlay className="h-5 w-5" />} />
            <SummaryCard label="Tickets Sold" value={summary.ticketsSold} icon={<Ticket className="h-5 w-5" />} />
            <SummaryCard label="Gross Revenue" value={formatCurrency(summary.grossRevenue)} icon={<Wallet className="h-5 w-5" />} accent />
          </div>
        </section>

        {showAddMultiplex ? (
          <section className="rounded-[28px] border border-orange-200 bg-white p-6 shadow-[0_16px_48px_rgba(249,115,22,0.08)]">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Register new property</h2>
              <p className="mt-1 text-sm text-slate-500">Add a multiplex location and optional amenities without changing the current creation flow.</p>
            </div>

            <form onSubmit={(event) => (editingMultiplexId ? handleEditMultiplex(event, editingMultiplexId) : handleAddMultiplex(event))} className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Multiplex name</label>
                <input
                  required
                  type="text"
                  value={multiForm.multiplexName}
                  onChange={(event) => setMultiForm((current) => ({ ...current, multiplexName: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white"
                  placeholder="e.g. INOX Metro"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">City</label>
                <input
                  required
                  type="text"
                  value={multiForm.city}
                  onChange={(event) => setMultiForm((current) => ({ ...current, city: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white"
                  placeholder="e.g. Mumbai"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Full address</label>
                <input
                  required
                  type="text"
                  value={multiForm.address}
                  onChange={(event) => setMultiForm((current) => ({ ...current, address: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white"
                  placeholder="e.g. MG Road, Junction Mall, 4th Floor"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Amenities</label>
                <input
                  type="text"
                  value={multiForm.amenities}
                  onChange={(event) => setMultiForm((current) => ({ ...current, amenities: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white"
                  placeholder="Parking, Food Court, Recliners"
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submittingMulti}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f97316,#ea580c)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submittingMulti ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingMultiplexId ? 'Update Property' : 'Save Property'}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {loading ? (
          <div className="flex min-h-65 items-center justify-center rounded-[28px] border border-orange-100 bg-white">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          </div>
        ) : multiplexes.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-orange-200 bg-white px-6 py-16 text-center shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-orange-500">
              <Building2 className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-900">No multiplexes added yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Register your first multiplex property to start assigning movies, creating screens, and receiving multiplex booking analytics.
            </p>
          </section>
        ) : (
          <div className="grid gap-6">
            {multiplexes.map((multiplex) => (
              <section key={multiplex._id} className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
                <div className="border-b border-orange-100 bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900">{multiplex.multiplexName}</h2>
                        <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                          <MapPin className="h-4 w-4 text-orange-500" />
                          {multiplex.address}, {multiplex.city}
                        </p>
                      </div>

                      {Array.isArray(multiplex.amenities) && multiplex.amenities.length ? (
                        <div className="flex flex-wrap gap-2">
                          {multiplex.amenities.map((amenity, index) => (
                            <span key={`${multiplex._id}-${amenity}-${index}`} className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                              {amenity}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 lg:min-w-[320px]">
                      <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Screens" value={multiplex.totalScreens || multiplex.screens?.length || 0} />
                        <StatCard label="Active Shows" value={multiplex.activeShows || 0} />
                        <StatCard label="Tickets Sold" value={multiplex.ticketsSold || 0} />
                        <StatCard label="Revenue" value={formatCurrency(multiplex.grossRevenue || 0)} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveMultiId((current) => (current === multiplex._id ? null : multiplex._id))}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
                      >
                        <Plus className="h-4 w-4" />
                        {activeMultiId === multiplex._id ? 'Close Screen Form' : 'Add Screen'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openMultiplexEditor(multiplex)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                      >
                        Edit Multiplex
                      </button>
                    </div>
                  </div>
                </div>

                {activeMultiId === multiplex._id ? (
                  <div className="border-b border-orange-100 bg-orange-50/40 p-6">
                    <div className="mb-5">
                      <h3 className="text-lg font-bold text-slate-900">Add screen to {multiplex.multiplexName}</h3>
                      <p className="mt-1 text-sm text-slate-500">Create a new audi or screen while keeping the current multiplex structure untouched.</p>
                    </div>

                    <form onSubmit={(event) => (editingScreenId ? handleEditScreen(event, multiplex._id, editingScreenId) : handleAddScreen(event, multiplex._id))} className="grid gap-4 md:grid-cols-5">
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Screen name</label>
                        <input
                          required
                          type="text"
                          value={screenForm.screenName}
                          onChange={(event) => setScreenForm((current) => ({ ...current, screenName: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300"
                          placeholder="e.g. Audi 1"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Format</label>
                        <select
                          value={screenForm.screenType}
                          onChange={(event) => setScreenForm((current) => ({ ...current, screenType: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300"
                        >
                          <option value="2D">2D</option>
                          <option value="3D">3D</option>
                          <option value="IMAX">IMAX</option>
                          <option value="4DX">4DX</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Rows</label>
                        <input
                          required
                          min="1"
                          type="number"
                          value={screenForm.rows}
                          onChange={(event) => setScreenForm((current) => ({ ...current, rows: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Seats / row</label>
                        <input
                          required
                          min="1"
                          type="number"
                          value={screenForm.cols}
                          onChange={(event) => setScreenForm((current) => ({ ...current, cols: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300"
                        />
                      </div>

                      <div className="md:col-span-5 rounded-3xl border border-slate-200 bg-white p-4">
                        <h4 className="text-sm font-semibold text-slate-900">Seat category note</h4>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Screen setup now only stores size and format. Seat category names, prices, and row distribution are managed later in `Manage Show Timings` for each show wave.
                        </p>
                      </div>

                      <div className="md:col-span-5 flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingScreen}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {submittingScreen ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {editingScreenId ? 'Update Screen' : 'Save Screen'}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}

                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Configured screens</h3>
                      <p className="mt-1 text-sm text-slate-500">All active audis and formats mapped to this multiplex property.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                      {multiplex.screens?.length || 0} screens
                    </span>
                  </div>

                  {multiplex.screens?.length ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {multiplex.screens.map((screen) => (
                        <div key={screen._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-orange-200 hover:bg-orange-50/60">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                            <MonitorPlay className="h-5 w-5" />
                          </div>
                          <h4 className="mt-4 text-base font-bold text-slate-900">{screen.screenName}</h4>
                          <p className="mt-2 text-sm text-slate-500">{screen.screenType}</p>
                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            {screen.totalSeats || screen.layout?.rows * screen.layout?.cols || 0} seats
                          </p>
                          <button
                            type="button"
                            onClick={() => openScreenEditor(multiplex._id, screen)}
                            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
                          >
                            Edit Screen
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/40 px-6 py-12 text-center">
                      <p className="text-lg font-semibold text-slate-900">No screens configured yet</p>
                      <p className="mt-2 text-sm text-slate-500">Add the first screen here to unlock show scheduling and live multiplex analytics.</p>
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, icon, accent }) => (
  <div className={`rounded-3xl border p-5 shadow-sm ${accent ? 'border-orange-200 bg-orange-50' : 'border-slate-200 bg-slate-50'}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="mt-3 text-2xl font-black tracking-tight text-slate-900">{value}</p>
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent ? 'bg-white text-orange-600' : 'bg-white text-slate-600'}`}>
        {icon}
      </div>
    </div>
  </div>
);

const StatCard = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
  </div>
);

export default ManageMultiplexes;
