import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, Film, Loader2, MapPin,
  PlayCircle, Star, Info, ShieldCheck, Zap, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api, { resolveMediaUrl } from '../../utils/Axios';
import { useAuth } from '../../context/AuthContext';

const formatLocalDate = (value) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const generateDates = (anchorDate) => {
  const dates = [];
  const start = anchorDate ? new Date(anchorDate) : new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push({
      fullDate: formatLocalDate(d),
      dayName: i === 0 ? 'DAY 1' : i === 1 ? 'DAY 2' : d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      dateNum: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' })
    });
  }
  return dates;
};

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userCity, isAuthenticated } = useAuth();

  const [movie, setMovie] = useState(null);
  const [showGroups, setShowGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvedCity, setResolvedCity] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const dateList = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (movie?.releaseDate) {
      const releaseDate = new Date(movie.releaseDate);
      releaseDate.setHours(0, 0, 0, 0);
      const anchorDate = releaseDate > today ? releaseDate : today;
      return generateDates(anchorDate);
    }
    return generateDates(today);
  }, [movie?.releaseDate]);

  useEffect(() => {
    if (!dateList.length) return;
    if (!selectedDate || !dateList.some((item) => item.fullDate === selectedDate)) {
      setSelectedDate(dateList[0].fullDate);
    }
  }, [dateList, selectedDate]);

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        setLoading(true);
        const movieRes = await api.get(`/movies/${id}`);
        if (movieRes.data.success) setMovie(movieRes.data.data);
      } catch {
        toast.error('Failed to load movie details.');
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  useEffect(() => {
    if (!movie || !selectedDate) return;

    const fetchShows = async () => {
      try {
        setLoading(true);
        const cityQuery = userCity && userCity !== 'All Cities' ? `city=${encodeURIComponent(userCity)}&` : '';
        let showsRes = await api.get(`/movies/${id}/shows?${cityQuery}date=${selectedDate}`);

        if (showsRes.data.success && (!showsRes.data.data?.length) && userCity && userCity !== 'All Cities') {
          showsRes = await api.get(`/movies/${id}/shows?date=${selectedDate}`);
          setResolvedCity('All Cities');
        } else {
          setResolvedCity(userCity || 'All Cities');
        }

        if (showsRes.data.success) {
          const shows = showsRes.data.data || [];
          const grouped = shows.reduce((acc, show) => {
            const mName = show.multiplex?.multiplexName || 'Unknown Cinema';
            if (!acc[mName]) acc[mName] = { multiplex: show.multiplex, shows: [] };
            acc[mName].shows.push(show);
            return acc;
          }, {});
          setShowGroups(Object.values(grouped));
        }
      } catch {
        toast.error('Failed to load showtimes.');
      } finally {
        setLoading(false);
      }
    };

    fetchShows();
  }, [id, movie, selectedDate, userCity]);

  if (loading && !movie) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-4 md:pt-6">
      <section className="relative w-full h-[60vh] min-h-125 bg-black">
        <div className="absolute inset-0">
          <img
            src={resolveMediaUrl(movie.banner)}
            alt={movie.title}
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-linear-to-t from-gray-900 via-gray-900/80 to-transparent" />
        </div>
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-8 left-4 sm:left-8 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col md:flex-row gap-8 items-end">
            <img
              src={resolveMediaUrl(movie.poster)}
              alt={movie.title}
              className="w-48 h-72 object-cover rounded-2xl shadow-2xl border-4 border-white/10 hidden md:block"
            />
            <div className="text-white flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-black tracking-widest">{movie.certificate}</span>
                <span className="bg-red-600 px-3 py-1 rounded-lg text-xs font-black tracking-widest flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current" /> {movie.rating || 'New'}
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-2">{movie.title}</h1>
              <p className="text-gray-300 font-medium mb-4 flex items-center gap-4 text-sm md:text-base">
                <span>{movie.duration} min</span> •
                <span>{movie.genre?.join(', ')}</span> •
                <span>{movie.language?.join(', ')}</span>
              </p>
              <p className="text-gray-400 max-w-2xl line-clamp-2 md:line-clamp-3 mb-6">{movie.description}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex gap-4 overflow-x-auto no-scrollbar">
          {dateList.map((dt) => (
            <button
              key={dt.fullDate}
              onClick={() => setSelectedDate(dt.fullDate)}
              className={`flex flex-col items-center justify-center min-w-17.5 py-2 px-4 rounded-xl transition-all cursor-pointer ${
                selectedDate === dt.fullDate
                  ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider">{dt.dayName}</span>
              <span className="text-xl font-black">{dt.dateNum}</span>
              <span className="text-[10px] font-bold uppercase">{dt.month}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-900">
            Theatres in {resolvedCity || userCity}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          </div>
        ) : showGroups.length > 0 ? (
          <div className="space-y-6">
            {showGroups.map((group, idx) => (
              <div
                key={idx}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-green-500" />
                      {group.multiplex.multiplexName}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" /> {group.multiplex.address}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs font-bold text-gray-400">
                    <span className="px-3 py-1 bg-gray-50 rounded-lg">M-Ticket</span>
                    <span className="px-3 py-1 bg-gray-50 rounded-lg">Food & Beverage</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-50">
                  {group.shows.map((show) => {
                    const isSoldOut = show.isSoldOut || false;
                    const isFillingFast = show.isFillingFast || false;
                    const availableSeats = show.availableSeats ?? null;

                    return (
                      <button
                        key={show._id}
                        disabled={isSoldOut}
                        onClick={() => {
                          if (!isAuthenticated) return toast.error('Please login to book tickets');
                          navigate(`/movies/${movie._id}/shows/${show._id}/seats`);
                        }}
                        className={`relative px-6 py-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                          isSoldOut
                            ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                            : isFillingFast
                            ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 hover:border-amber-400 hover:shadow-lg'
                            : 'bg-white border-green-200 text-green-700 hover:bg-green-50 hover:border-green-400 hover:shadow-lg'
                        }`}
                      >
                        <span className="text-sm font-black">{show.startTime}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">{show.format}</span>

                        {!isSoldOut && availableSeats !== null && (
                          <span className={`text-[10px] font-bold mt-1 ${isFillingFast ? 'text-amber-600' : 'text-green-500'}`}>
                            {availableSeats} left
                          </span>
                        )}

                        {isSoldOut && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                            Sold Out
                          </span>
                        )}

                        {isFillingFast && !isSoldOut && (
                          <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5 fill-current" /> Fast
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <Film className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900">No shows available</h3>
            <p className="text-gray-500 mt-1">
              There are no shows for this movie on the selected date in {resolvedCity || userCity}.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default MovieDetails;
