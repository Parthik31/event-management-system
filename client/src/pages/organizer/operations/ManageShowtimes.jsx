import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar as CalendarIcon,
  Clock,
  Film,
  Loader2,
  MonitorPlay,
  Plus,
  Save
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../utils/Axios';

const today = new Date().toISOString().split('T')[0];
const DEFAULT_STAGGER_MINUTES = 15;

const addMinutesToTime = (time, minutesToAdd = 0) => {
  const [hours = '0', minutes = '0'] = String(time || '00:00').split(':');
  const totalMinutes = Number(hours) * 60 + Number(minutes) + Number(minutesToAdd || 0);
  const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const nextHours = String(Math.floor(normalized / 60)).padStart(2, '0');
  const nextMinutes = String(normalized % 60).padStart(2, '0');
  return `${nextHours}:${nextMinutes}`;
};

const getCategoryPricingEntries = (value) => {
  if (Array.isArray(value)) return value;
  if (value instanceof Map) return Array.from(value.entries()).map(([name, price]) => ({ name, price }));
  return Object.entries(value || {}).map(([name, price]) => ({ name, price }));
};

const getDefaultFormData = () => ({
  movieId: '',
  multiplexIds: [],
  screenIds: [],
  dates: [''],
  startTimes: [''],
  staggerMinutes: 15,
  seatRowPartitions: 2,
  language: 'Hindi',
  format: '2D',
  basePrice: 250,
  seatCategoryPricing: [{ name: 'Standard', price: 250 }],
  showSlotPricing: {
    morning: 0,
    afternoon: 40,
    night: 80
  }
});

const openNativePicker = (event) => {
  if (typeof event.target.showPicker === 'function') {
    event.target.showPicker();
  }
};

const ManageShowtimes = () => {
  const [movies, setMovies] = useState([]);
  const [myMultiplexes, setMyMultiplexes] = useState([]);
  const [availableScreens, setAvailableScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [editingShowId, setEditingShowId] = useState(null);
  const [selectedWaveIds, setSelectedWaveIds] = useState([]);

  const [formData, setFormData] = useState(getDefaultFormData);

  useEffect(() => {
    const fetchPrerequisites = async () => {
      try {
        const [movieRes, multiRes] = await Promise.all([
          api.get('/movies?status=Approved'),
          api.get('/multiplexes/my')
        ]);

        setMovies(Array.isArray(movieRes.data.data) ? movieRes.data.data : []);
        setMyMultiplexes(Array.isArray(multiRes.data.data) ? multiRes.data.data : []);
      } catch {
        toast.error('Failed to load required scheduling data.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrerequisites();
  }, []);

  useEffect(() => {
    if (!formData.multiplexIds.length) {
      setAvailableScreens([]);
      setFormData((current) => ({ ...current, screenIds: [] }));
      return;
    }

    const nextScreens = myMultiplexes
      .filter((multiplex) => formData.multiplexIds.includes(multiplex._id))
      .flatMap((multiplex) =>
        (Array.isArray(multiplex.screens) ? multiplex.screens : []).map((screen) => ({
          ...screen,
          multiplexId: multiplex._id,
          multiplexName: multiplex.multiplexName,
          city: multiplex.city
        }))
      );

    setAvailableScreens(nextScreens);
    setFormData((current) => ({
      ...current,
      screenIds: current.screenIds.filter((screenId) => nextScreens.some((screen) => screen._id === screenId))
    }));
  }, [formData.multiplexIds, myMultiplexes]);

  const selectedMovie = useMemo(
    () => movies.find((movie) => movie._id === formData.movieId),
    [movies, formData.movieId]
  );

  const selectedMultiplexes = useMemo(
    () => myMultiplexes.filter((multiplex) => formData.multiplexIds.includes(multiplex._id)),
    [myMultiplexes, formData.multiplexIds]
  );

  const selectedScreens = useMemo(
    () => availableScreens.filter((screen) => formData.screenIds.includes(screen._id)),
    [availableScreens, formData.screenIds]
  );

  const existingShows = useMemo(
    () => myMultiplexes.flatMap((multiplex) =>
      (Array.isArray(multiplex.shows) ? multiplex.shows : []).map((show) => ({
        ...show,
        multiplexName: multiplex.multiplexName,
        multiplexCity: multiplex.city
      }))
    ),
    [myMultiplexes]
  );

  // --- MASSIVE BUG FIX: Intelligent Time Clustering algorithm instead of flawed screenIndex math ---
  const existingShowWaves = useMemo(() => {
    const buckets = new Map();

    // 1. Group all shows purely by Movie, Multiplex, and Date first
    existingShows.forEach((show) => {
      const multiplexId = typeof show.multiplex === 'object' ? show.multiplex?._id : show.multiplex;
      const bucketKey = `${show.movie?._id || show.movie}-${multiplexId}-${show.date}`;
      if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
      buckets.get(bucketKey).push(show);
    });

    const waves = [];
    
    // Helper to calculate minutes for clustering diffs
    const getMins = (time) => {
      if (!time) return 0;
      const [h, m] = String(time).split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const createWaveObj = (show, multiplexId, screenId, screenName) => ({
      id: show._id,
      waveGroupId: show.waveGroupId,
      movie: show.movie,
      multiplexName: show.multiplexName,
      multiplexCity: show.multiplexCity,
      date: show.date,
      baseStartTime: show.baseStartTime || show.startTime, // Accurately lock base time
      language: show.language,
      format: show.format,
      basePrice: show.basePrice,
      seatRowPartitions: show.seatRowPartitions,
      seatCategoryPricing: show.seatCategoryPricing,
      showSlotPricing: show.showSlotPricing,
      staggerMinutes: show.staggerMinutes,
      multiplexIds: multiplexId ? [multiplexId] : [],
      multiplexNames: show.multiplexName ? [show.multiplexName] : [],
      screenIds: screenId ? [screenId] : [],
      screens: [screenName],
      showTimes: show.startTime ? [show.startTime] : [],
      totalShows: 1
    });

    buckets.forEach((showsInBucket) => {
      // Sort shows chronically so we can cluster them as they naturally occur
      showsInBucket.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
      let currentWave = null;

      showsInBucket.forEach((show) => {
        const multiplexId = typeof show.multiplex === 'object' ? show.multiplex?._id : show.multiplex;
        const screenId = typeof show.screen === 'object' ? show.screen?._id : show.screen;
        const screenName = show.screen?.screenName || 'Screen pending';

        if (!currentWave) {
          // Start a new cluster wave
          currentWave = createWaveObj(show, multiplexId, screenId, screenName);
        } else {
          // If the next show is within 90 minutes of the wave's base time, it belongs to this wave!
          const isSameWaveGroup = show.waveGroupId && currentWave.waveGroupId === show.waveGroupId;
          const isSameBaseTime = show.baseStartTime && currentWave.baseStartTime === show.baseStartTime;
          const diffMins = getMins(show.startTime) - getMins(currentWave.baseStartTime);
          const isWithinTimeCluster = !show.waveGroupId && !show.baseStartTime && diffMins >= 0 && diffMins <= 90;

          if (isSameWaveGroup || isSameBaseTime || isWithinTimeCluster) {
            if (multiplexId && !currentWave.multiplexIds.includes(multiplexId)) currentWave.multiplexIds.push(multiplexId);
            if (show.multiplexName && !currentWave.multiplexNames.includes(show.multiplexName)) currentWave.multiplexNames.push(show.multiplexName);
            if (screenId && !currentWave.screenIds.includes(screenId)) currentWave.screenIds.push(screenId);
            currentWave.screens.push(screenName);
            if (show.startTime && !currentWave.showTimes.includes(show.startTime)) currentWave.showTimes.push(show.startTime);
            currentWave.totalShows += 1;
          } else {
            // Threshold exceeded. Push the completed wave and start a new one for later shows.
            currentWave.showTimes.sort();
            currentWave.screens = Array.from(new Set(currentWave.screens));
            if (currentWave.staggerMinutes === undefined || currentWave.staggerMinutes === null) {
              currentWave.staggerMinutes = currentWave.showTimes.length > 1
                ? getMins(currentWave.showTimes[1]) - getMins(currentWave.showTimes[0])
                : DEFAULT_STAGGER_MINUTES;
            }
            currentWave.groupKey = `${currentWave.movie?._id || currentWave.movie}-${currentWave.multiplexIds[0]}-${currentWave.date}-${currentWave.baseStartTime}`;
            waves.push(currentWave);
            currentWave = createWaveObj(show, multiplexId, screenId, screenName);
          }
        }
      });

      // Push final trailing wave
      if (currentWave) {
        currentWave.showTimes.sort();
        currentWave.screens = Array.from(new Set(currentWave.screens));
        if (currentWave.staggerMinutes === undefined || currentWave.staggerMinutes === null) {
          currentWave.staggerMinutes = currentWave.showTimes.length > 1
            ? getMins(currentWave.showTimes[1]) - getMins(currentWave.showTimes[0])
            : DEFAULT_STAGGER_MINUTES;
        }
        currentWave.groupKey = `${currentWave.movie?._id || currentWave.movie}-${currentWave.multiplexIds[0]}-${currentWave.date}-${currentWave.baseStartTime}`;
        waves.push(currentWave);
      }
    });

    return waves;
  }, [existingShows]);

  const stats = useMemo(
    () => ({
      approvedMovies: movies.length,
      multiplexes: myMultiplexes.length,
      screens: myMultiplexes.reduce((total, multiplex) => total + Number(multiplex.totalScreens || multiplex.screens?.length || 0), 0)
    }),
    [movies, myMultiplexes]
  );

  const setFieldValue = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
    setValidationErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const validateForm = () => {
    const nextErrors = {};
    const categoryEntries = getCategoryPricingEntries(formData.seatCategoryPricing)
      .map((item) => ({
        name: String(item?.name || '').trim(),
        price: Number(item?.price || 0)
      }))
      .filter((item) => item.name);
    const uniqueCategoryNames = new Set(categoryEntries.map((item) => item.name.toLowerCase()));
    const minimumSelectedRows = Math.min(...selectedScreens.map((screen) => Number(screen.layout?.rows || 0)).filter(Boolean), Number.POSITIVE_INFINITY);

    if (!formData.movieId) nextErrors.movieId = 'Select an approved movie before scheduling.';
    if (!formData.multiplexIds.length) nextErrors.multiplexIds = 'Select one or more multiplexes where the show will run.';
    if (!formData.screenIds.length) nextErrors.screenIds = 'Choose one or more screens assigned to this show.';
    if (!formData.dates.some((item) => item)) nextErrors.dates = 'Choose at least one show date.';
    if (!formData.startTimes.some((item) => item)) nextErrors.startTimes = 'Add at least one base show time.';
    if (Number(formData.basePrice) < 50) nextErrors.basePrice = 'Base price should be at least INR 50.';
    if (categoryEntries.length < 1 || categoryEntries.length > 7) {
      nextErrors.seatCategoryPricing = 'Please keep between 1 and 7 seat categories.';
    } else if (uniqueCategoryNames.size !== categoryEntries.length) {
      nextErrors.seatCategoryPricing = 'Seat category names must be unique.';
    } else if (categoryEntries.some((item) => item.price < 50)) {
      nextErrors.seatCategoryPricing = 'Each seat category price should be at least INR 50.';
    } else if (minimumSelectedRows !== Number.POSITIVE_INFINITY && categoryEntries.length > minimumSelectedRows) {
      nextErrors.seatCategoryPricing = 'Seat category count cannot be more than the row count of the selected screens.';
    }

    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const toggleArraySelection = (field, value) => {
    setFormData((current) => {
      const currentValues = Array.isArray(current[field]) ? current[field] : [];
      const exists = currentValues.includes(value);
      return {
        ...current,
        [field]: exists ? currentValues.filter((item) => item !== value) : [...currentValues, value]
      };
    });
    setValidationErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updateDate = (index, value) => {
    setFormData((current) => ({
      ...current,
      dates: current.dates.map((item, itemIndex) => (itemIndex === index ? value : item))
    }));
    setValidationErrors((current) => {
      if (!current.dates) return current;
      const next = { ...current };
      delete next.dates;
      return next;
    });
  };

  const addDate = () => {
    setFormData((current) => ({
      ...current,
      dates: [...current.dates, '']
    }));
  };

  const removeDate = (index) => {
    setFormData((current) => ({
      ...current,
      dates: current.dates.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const updateStartTime = (index, value) => {
    setFormData((current) => ({
      ...current,
      startTimes: current.startTimes.map((item, itemIndex) => (itemIndex === index ? value : item))
    }));
    setValidationErrors((current) => {
      if (!current.startTimes) return current;
      const next = { ...current };
      delete next.startTimes;
      return next;
    });
  };

  const addStartTime = () => {
    setFormData((current) => ({
      ...current,
      startTimes: [...current.startTimes, '']
    }));
  };

  const removeStartTime = (index) => {
    setFormData((current) => ({
      ...current,
      startTimes: current.startTimes.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const updateNestedPrice = (group, key, value) => {
    setFormData((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [key]: value
      }
    }));
    setValidationErrors((current) => {
      if (!current[group]) return current;
      const next = { ...current };
      delete next[group];
      return next;
    });
  };

  const updateCategoryPrice = (index, value) => {
    setFormData((current) => ({
      ...current,
      seatCategoryPricing: getCategoryPricingEntries(current.seatCategoryPricing).map((item, itemIndex) => (
        itemIndex === index ? { ...item, price: value } : item
      ))
    }));
    setValidationErrors((current) => {
      if (!current.seatCategoryPricing) return current;
      const next = { ...current };
      delete next.seatCategoryPricing;
      return next;
    });
  };

  const updateCategoryName = (index, value) => {
    setFormData((current) => ({
      ...current,
      seatCategoryPricing: getCategoryPricingEntries(current.seatCategoryPricing).map((item, itemIndex) => (
        itemIndex === index ? { ...item, name: value } : item
      ))
    }));
    setValidationErrors((current) => {
      if (!current.seatCategoryPricing) return current;
      const next = { ...current };
      delete next.seatCategoryPricing;
      return next;
    });
  };

  const addCategory = () => {
    setFormData((current) => {
      const existingEntries = getCategoryPricingEntries(current.seatCategoryPricing);
      if (existingEntries.length >= 7) {
        return current;
      }

      return {
        ...current,
        seatCategoryPricing: [
          ...existingEntries,
          { name: `Category ${existingEntries.length + 1}`, price: Number(current.basePrice || 250) }
        ]
      };
    });
    setValidationErrors((current) => {
      if (!current.seatCategoryPricing) return current;
      const next = { ...current };
      delete next.seatCategoryPricing;
      return next;
    });
  };

  const removeCategory = (index) => {
    setFormData((current) => {
      const existingEntries = getCategoryPricingEntries(current.seatCategoryPricing);
      if (existingEntries.length <= 1) {
        return current;
      }

      return {
        ...current,
        seatCategoryPricing: existingEntries.filter((_, itemIndex) => itemIndex !== index)
      };
    });
    setValidationErrors((current) => {
      if (!current.seatCategoryPricing) return current;
      const next = { ...current };
      delete next.seatCategoryPricing;
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error('Please review the highlighted scheduling fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingShowId) {
        await api.put(`/movies/shows/${editingShowId}/wave`, {
          movieId: formData.movieId,
          multiplexIds: formData.multiplexIds,
          screenIds: formData.screenIds,
          date: formData.dates.filter(Boolean)[0],
          baseStartTime: formData.startTimes.filter(Boolean)[0],
          staggerMinutes: Number(formData.staggerMinutes || DEFAULT_STAGGER_MINUTES),
          language: formData.language,
          format: formData.format,
          basePrice: Number(formData.basePrice),
          seatRowPartitions: Number(formData.seatRowPartitions || 2),
          seatCategoryPricing: Object.fromEntries(
            getCategoryPricingEntries(formData.seatCategoryPricing).map((item) => [item.name, Number(item.price)])
          ),
          showSlotPricing: Object.fromEntries(
            Object.entries(formData.showSlotPricing).map(([key, value]) => [key, Number(value)])
          )
        });
        toast.success('Showtime updated successfully.');
      } else {
        await api.post(`/movies/${formData.movieId}/shows`, {
          multiplexIds: formData.multiplexIds,
          screenIds: formData.screenIds,
          dates: formData.dates.filter(Boolean),
          startTimes: formData.startTimes.filter(Boolean),
          staggerMinutes: Number(formData.staggerMinutes || 15),
          seatRowPartitions: Number(formData.seatRowPartitions || 2),
          language: formData.language,
          format: formData.format,
          basePrice: Number(formData.basePrice),
          seatCategoryPricing: Object.fromEntries(
            getCategoryPricingEntries(formData.seatCategoryPricing).map((item) => [item.name, Number(item.price)])
          ),
          showSlotPricing: Object.fromEntries(
            Object.entries(formData.showSlotPricing).map(([key, value]) => [key, Number(value)])
          )
        });

        const totalShows = formData.screenIds.length * formData.startTimes.filter(Boolean).length * formData.dates.filter(Boolean).length;
        toast.success(`${totalShows} showtime${totalShows > 1 ? 's' : ''} scheduled successfully.`);
      }

      setFormData(getDefaultFormData());
      setEditingShowId(null);
      const multiRes = await api.get('/multiplexes/my');
      setMyMultiplexes(Array.isArray(multiRes.data.data) ? multiRes.data.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to schedule showtime.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditingShow = (show) => {
      setEditingShowId(show.id);
      setFormData((current) => ({
        ...current,
        movieId: show.movie?._id || '',
        multiplexIds: show.multiplexIds || [],
        screenIds: show.screenIds || [],
        dates: [show.date || ''],
        startTimes: [show.baseStartTime || ''],
        staggerMinutes: Number(show.staggerMinutes || DEFAULT_STAGGER_MINUTES),
        seatRowPartitions: Number(show.seatRowPartitions || 2),
        language: show.language || 'Hindi',
        format: show.format || '2D',
        basePrice: Number(show.basePrice || 250),
        seatCategoryPricing: getCategoryPricingEntries(show.seatCategoryPricing).length
          ? getCategoryPricingEntries(show.seatCategoryPricing).map((item) => ({
              name: item.name,
              price: Number(item.price || show.basePrice || 250)
            }))
          : [{ name: 'Standard', price: Number(show.basePrice || 250) }],
        showSlotPricing: {
          morning: Number(show.showSlotPricing?.morning ?? current.showSlotPricing.morning),
          afternoon: Number(show.showSlotPricing?.afternoon ?? current.showSlotPricing.afternoon),
          night: Number(show.showSlotPricing?.night ?? current.showSlotPricing.night)
        }
      }));
  };

  const handleDeleteWave = async (show) => {
    const confirmed = window.confirm(
      `Remove the ${show.baseStartTime} wave on ${show.date} for ${show.movie?.title || 'this movie'}? This will delete all related staggered shows for that base time.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const { data } = await api.delete(`/movies/shows/${show.id}/wave`);
      if (data.success) {
        toast.success(data.message || 'Show wave removed successfully.');
        if (editingShowId === show.id) {
          setEditingShowId(null);
        }
        const multiRes = await api.get('/multiplexes/my');
        setMyMultiplexes(Array.isArray(multiRes.data.data) ? multiRes.data.data : []);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove show wave.');
    }
  };

  const handleBulkDeleteWaves = async () => {
    if (!selectedWaveIds.length) {
      toast.error('Select at least one show wave to remove.');
      return;
    }

    const confirmed = window.confirm(`Remove ${selectedWaveIds.length} selected show wave(s)? This will delete all related staggered shows in those waves.`);
    if (!confirmed) {
      return;
    }

    try {
      await Promise.all(selectedWaveIds.map((waveId) => api.delete(`/movies/shows/${waveId}/wave`)));
      toast.success(`${selectedWaveIds.length} show wave(s) removed successfully.`);
      setSelectedWaveIds([]);
      const multiRes = await api.get('/multiplexes/my');
      setMyMultiplexes(Array.isArray(multiRes.data.data) ? multiRes.data.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove selected show waves.');
    }
  };

  const inputClass = (field) =>
    `w-full rounded-2xl border px-4 py-3.5 text-sm text-slate-700 outline-none transition ${
      validationErrors[field]
        ? 'border-rose-300 bg-rose-50 focus:border-rose-400'
        : 'border-slate-200 bg-slate-50 focus:border-orange-300 focus:bg-white'
    }`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fffaf5_100%)]">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_22%,#fffaf5_100%)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_20px_60px_rgba(249,115,22,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
                <Clock className="h-3.5 w-3.5" />
                Show Scheduling
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Manage show timings</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  Assign approved movies to your screens, keep show timings organized, and schedule new runs without changing the existing workflow.
                </p>
                {editingShowId ? (
                  <p className="mt-3 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
                    Editing existing show
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MetricChip label="Approved Movies" value={stats.approvedMovies} icon={<Film className="h-4 w-4" />} />
              <MetricChip label="Multiplexes" value={stats.multiplexes} icon={<Building2 className="h-4 w-4" />} />
              <MetricChip label="Screens" value={stats.screens} icon={<MonitorPlay className="h-4 w-4" />} />
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <Film className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">1. Select movie</h2>
                <p className="text-sm text-slate-500">Only admin-approved movies are available for scheduling.</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Approved movie</label>
                <div className="relative">
                  <Film className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    name="movieId"
                    value={formData.movieId}
                    onChange={(event) => setFieldValue('movieId', event.target.value)}
                    disabled={Boolean(editingShowId)}
                    className={`${inputClass('movieId')} appearance-none pl-11`}
                  >
                    <option value="">Select an approved movie</option>
                    {movies.map((movie) => (
                      <option key={movie._id} value={movie._id}>
                        {movie.title}
                      </option>
                    ))}
                  </select>
                </div>
                {validationErrors.movieId ? <p className="mt-2 text-sm font-medium text-rose-600">{validationErrors.movieId}</p> : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Selected movie</p>
                {selectedMovie ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-lg font-bold text-slate-900">{selectedMovie.title}</p>
                    <p className="text-sm text-slate-500">
                      {(Array.isArray(selectedMovie.language) ? selectedMovie.language.join(', ') : selectedMovie.language) || 'Language pending'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {selectedMovie.releaseDate ? new Date(selectedMovie.releaseDate).toLocaleDateString('en-IN') : 'Release date pending'}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-slate-500">Pick a movie to see quick context before you assign it to a screen.</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">2. Assign screen</h2>
                <p className="text-sm text-slate-500">Choose the multiplex property and the exact screen where this show will run.</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Multiplexes</label>
                <div className="grid gap-3">
                  {myMultiplexes.map((multiplex) => {
                    const checked = formData.multiplexIds.includes(multiplex._id);
                    return (
                      <label key={multiplex._id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${checked ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-slate-50 hover:border-orange-200'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleArraySelection('multiplexIds', multiplex._id)}
                          disabled={Boolean(editingShowId)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">{multiplex.multiplexName}</p>
                          <p className="mt-1 text-sm text-slate-500">{multiplex.city} | {multiplex.address}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {validationErrors.multiplexIds ? <p className="mt-2 text-sm font-medium text-rose-600">{validationErrors.multiplexIds}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Screens / audis</label>
                <div className="grid gap-3">
                  {availableScreens.length ? availableScreens.map((screen) => {
                    const checked = formData.screenIds.includes(screen._id);
                    return (
                      <label key={screen._id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${checked ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-slate-50 hover:border-orange-200'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleArraySelection('screenIds', screen._id)}
                          disabled={Boolean(editingShowId)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">{screen.screenName}</p>
                          <p className="mt-1 text-sm text-slate-500">{screen.multiplexName} | {screen.screenType} | {screen.totalSeats || screen.layout?.rows * screen.layout?.cols || 0} seats</p>
                        </div>
                      </label>
                    );
                  }) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      Select one or more multiplexes to unlock their screens.
                    </div>
                  )}
                </div>
                {validationErrors.screenIds ? <p className="mt-2 text-sm font-medium text-rose-600">{validationErrors.screenIds}</p> : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <SelectionCard
                label="Selected Multiplexes"
                title={selectedMultiplexes.length ? `${selectedMultiplexes.length} selected` : 'No multiplex selected'}
                description={selectedMultiplexes.length ? selectedMultiplexes.map((multiplex) => `${multiplex.multiplexName} (${multiplex.city})`).join(', ') : 'Pick one or more multiplexes to unlock their available screens.'}
              />
              <SelectionCard
                label="Selected Screens"
                title={selectedScreens.length ? `${selectedScreens.length} selected` : 'No screen selected'}
                description={selectedScreens.length ? selectedScreens.map((screen) => `${screen.screenName} - ${screen.multiplexName}`).join(', ') : 'Choose one or more screens where this show will play.'}
              />
            </div>
          </section>

          <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">3. Timing and pricing</h2>
                <p className="text-sm text-slate-500">Set one or more dates, show start time, presentation format, and base ticket price.</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 md:col-span-1">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Show dates</label>
                    <p className="mt-1 text-xs text-slate-500">Add one or more dates for the selected multiplex screens.</p>
                  </div>
                  <button type="button" disabled={Boolean(editingShowId)} onClick={addDate} className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-50">
                    <Plus className="h-4 w-4" />
                    Add Date
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.dates.map((date, index) => (
                    <div key={`${index}-${date}`} className="flex items-center gap-3">
                      {/* FIX: Normal React onChange ensures picker stays open! */}
                      <input
                        type="date"
                        min={today}
                        value={date}
                        onClick={openNativePicker}
                        onChange={(event) => updateDate(index, event.target.value)}
                        className={inputClass('dates')}
                      />
                      {formData.dates.length > 1 ? (
                        <button type="button" disabled={Boolean(editingShowId)} onClick={() => removeDate(index)} className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50">
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                {validationErrors.dates ? <p className="mt-2 text-sm font-medium text-rose-600">{validationErrors.dates}</p> : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 md:col-span-1">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Show waves</label>
                    <p className="mt-1 text-xs text-slate-500">Add base times like 09:00, 12:00, 15:00, 18:00, 21:00.</p>
                  </div>
                  <button type="button" disabled={Boolean(editingShowId)} onClick={addStartTime} className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-50">
                    <Plus className="h-4 w-4" />
                    Add Time
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.startTimes.map((time, index) => (
                    <div key={`${index}-${time}`} className="flex items-center gap-3">
                      {/* FIX: Normal React onChange ensures picker stays open! */}
                      <input
                        type="time"
                        value={time}
                        step="900"
                        onClick={openNativePicker}
                        onChange={(event) => updateStartTime(index, event.target.value)}
                        className={inputClass('startTimes')}
                      />
                      {formData.startTimes.length > 1 ? (
                        <button type="button" disabled={Boolean(editingShowId)} onClick={() => removeStartTime(index)} className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50">
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                {validationErrors.startTimes ? <p className="mt-2 text-sm font-medium text-rose-600">{validationErrors.startTimes}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Language</label>
                <select value={formData.language} onChange={(event) => setFieldValue('language', event.target.value)} className={`${inputClass('language')} appearance-none`}>
                  <option value="Hindi">Hindi</option>
                  <option value="English">English</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                </select>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Format</label>
                  <select value={formData.format} onChange={(event) => setFieldValue('format', event.target.value)} className={`${inputClass('format')} appearance-none`}>
                    <option value="2D">Standard 2D</option>
                    <option value="3D">Digital 3D</option>
                    <option value="IMAX">IMAX</option>
                    <option value="4DX">4DX</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Stagger gap (minutes)</label>
                  <input type="number" min="0" step="5" value={formData.staggerMinutes} onChange={(event) => setFieldValue('staggerMinutes', event.target.value)} className={inputClass('staggerMinutes')} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Seat row parts</label>
                  <select value={formData.seatRowPartitions} onChange={(event) => setFieldValue('seatRowPartitions', event.target.value)} className={`${inputClass('seatRowPartitions')} appearance-none`}>
                    <option value="1">1 part</option>
                    <option value="2">2 parts</option>
                    <option value="3">3 parts</option>
                    <option value="4">4 parts</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Base price (INR)</label>
                  <input type="number" min="50" value={formData.basePrice} onChange={(event) => setFieldValue('basePrice', event.target.value)} className={inputClass('basePrice')} />
                  {validationErrors.basePrice ? <p className="mt-2 text-sm font-medium text-rose-600">{validationErrors.basePrice}</p> : null}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Seat category pricing</p>
                    <p className="mt-1 text-xs text-slate-500">Create 1 to 7 category names here. The highest-priced category automatically gets row A, and the remaining rows are divided across the other categories.</p>
                  </div>
                  {getCategoryPricingEntries(formData.seatCategoryPricing).length < 7 ? (
                    <button type="button" onClick={addCategory} className="rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100">
                      Add Category
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-4">
                  {getCategoryPricingEntries(formData.seatCategoryPricing).map((item, index) => (
                    <div key={`category-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1.1fr_0.9fr_auto]">
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Category Name</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(event) => updateCategoryName(index, event.target.value)}
                          className={inputClass('seatCategoryPricing')}
                          placeholder={`Category ${index + 1}`}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Price (INR)</label>
                        <input
                          type="number"
                          min="50"
                          value={item.price}
                          onChange={(event) => updateCategoryPrice(index, event.target.value)}
                          className={inputClass('seatCategoryPricing')}
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          disabled={getCategoryPricingEntries(formData.seatCategoryPricing).length <= 1}
                          onClick={() => removeCategory(index)}
                          className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3 text-xs leading-5 text-orange-800">
                  Example rule:
                  Highest priced category gets row A only. Remaining rows are split as evenly as possible across the other categories.
                </div>
                {validationErrors.seatCategoryPricing ? <p className="mt-2 text-sm font-medium text-rose-600">{validationErrors.seatCategoryPricing}</p> : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">Time slot pricing adjustment</p>
                <p className="mt-1 text-xs text-slate-500">Add extra pricing for morning, afternoon, and night shows.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {Object.entries(formData.showSlotPricing).map(([label, value]) => (
                    <div key={label}>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</label>
                      <input
                        type="number"
                        min="0"
                        value={value}
                        onChange={(event) => updateNestedPrice('showSlotPricing', label, event.target.value)}
                        className={inputClass('showSlotPricing')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-col justify-end gap-3 md:flex-row">
            {editingShowId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingShowId(null);
                  setFormData(getDefaultFormData());
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700 md:w-auto"
              >
                Cancel Edit
              </button>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f97316,#ea580c)] px-6 py-4 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {editingShowId ? 'Update Show' : 'Schedule Showtimes'}
            </button>
          </div>
        </form>

        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Existing assigned show waves</h2>
              <p className="mt-1 text-sm text-slate-500">Review base-time waves and edit all related staggered screen shows in one action.</p>
            </div>

            {/* FIX: New "Select All" Feature added here! */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={existingShowWaves.length > 0 && selectedWaveIds.length === existingShowWaves.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedWaveIds(existingShowWaves.map(show => show.id));
                    } else {
                      setSelectedWaveIds([]);
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                Select All
              </label>

              {selectedWaveIds.length ? (
                <button
                  type="button"
                  onClick={handleBulkDeleteWaves}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Remove ({selectedWaveIds.length})
                </button>
              ) : null}
              <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">{existingShowWaves.length} waves</span>
            </div>
          </div>

          {existingShowWaves.length ? (
            <div className="grid gap-4">
              {existingShowWaves
                .sort((left, right) => `${left.date} ${left.baseStartTime}`.localeCompare(`${right.date} ${right.baseStartTime}`))
                .map((show) => (
                  <div key={show.groupKey} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedWaveIds.includes(show.id)}
                          onChange={() => setSelectedWaveIds((current) => (
                            current.includes(show.id)
                              ? current.filter((item) => item !== show.id)
                              : [...current, show.id]
                          ))}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        <div>
                        <p className="text-lg font-bold text-slate-900">{show.movie?.title || 'Untitled movie'}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {show.multiplexName} | {show.date} | Base Time {show.baseStartTime}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {show.language} | {show.format} | Base Rs {show.basePrice} | {show.totalShows} related shows
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Screens: {Array.from(new Set(show.screens)).join(', ')}
                        </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => startEditingShow(show)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
                        >
                          Edit Show
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWave(show)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Remove Wave
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/40 px-6 py-12 text-center text-sm text-slate-500">
              No assigned show waves yet. Once you schedule shows, their base-time waves will appear here for bulk editing.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const MetricChip = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
    <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
      {icon}
      {label}
    </div>
    <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
  </div>
);

const SelectionCard = ({ label, title, description }) => (
  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
    <p className="mt-3 text-base font-bold text-slate-900">{title}</p>
    <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
  </div>
);

export default ManageShowtimes;
