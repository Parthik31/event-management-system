import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, Loader2, Film, ChevronRight, Calendar, Ticket } from 'lucide-react';
import { getCachedApi, resolveMediaUrl } from '../../utils/Axios';
import { useAuth } from '../../context/AuthContext';

const Movies = () => {
  const { userCity } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Real system states
  const [carouselMovies, setCarouselMovies] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [nowShowing, setNowShowing] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);

  useEffect(() => {
    let isActive = true;

    const fetchRealMovies = async () => {
      if (isActive) {
        setLoading(true);
      }

      try {
        const primaryEndpoint =
          userCity && userCity !== 'All Cities'
            ? `/movies?status=Approved&city=${encodeURIComponent(userCity)}`
            : '/movies?status=Approved';
        let response = await getCachedApi(primaryEndpoint, {}, { cacheTTL: 30000 });

        if (
          response.data.success &&
          (!response.data.data?.length) &&
          userCity &&
          userCity !== 'All Cities'
        ) {
          response = await getCachedApi('/movies?status=Approved', {}, { cacheTTL: 30000 });
        }

        if (response.data.success && isActive) {
          const movies = response.data.data || [];
          setCarouselMovies(movies);
          setNowShowing(movies.filter((movie) => !movie?.isUpcoming));
          setComingSoon(movies.filter((movie) => movie?.isUpcoming));
        }
      } catch (error) {
        console.error("Error fetching live movies:", error);
        if (isActive) {
          setCarouselMovies([]);
          setNowShowing([]);
          setComingSoon([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };
    fetchRealMovies();

    return () => {
      isActive = false;
    };
  }, [userCity]);

  // Carousel auto-slide effect
  useEffect(() => {
    if (carouselMovies.length <= 1) return; // Don't slide if 1 or 0 movies
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselMovies.length);
    }, 5000); // Changes every 5 seconds
    
    return () => clearInterval(interval);
  }, [carouselMovies.length]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-red-600" />
        <p className="text-gray-500 font-bold uppercase tracking-wider text-sm">Building District...</p>
      </div>
    );
  }

  const featuredMovie = carouselMovies[currentSlide];

  return (
    <div className="min-h-screen bg-white pb-24">
      
      {/* --- 1. HERO SECTION (CAROUSEL) --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="w-full h-[50vh] md:h-[65vh] bg-gray-900 rounded-3xl relative overflow-hidden flex items-end p-8 md:p-16 shadow-2xl transition-all duration-700">
          
          {/* Background Images with smooth fade transition */}
          {carouselMovies.map((movie, index) => (
            <div 
              key={movie._id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-50 z-0' : 'opacity-0 -z-10'}`}
            >
              {movie.banner ? (
                <img src={resolveMediaUrl(movie.banner)} alt={movie.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <Film className="w-24 h-24 text-gray-700 opacity-30" />
                </div>
              )}
            </div>
          ))}

          {/* Fallback if no movies exist */}
          {carouselMovies.length === 0 && (
             <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
               <Film className="w-24 h-24 text-gray-700 opacity-30" />
             </div>
          )}
          
          <div className="absolute inset-0 bg-linear-to-t from-gray-900 via-gray-900/60 to-transparent z-0"></div>

          {/* Active Movie Details */}
          <div className="relative z-10 w-full max-w-3xl">
            <span className="inline-block px-3 py-1 mb-4 bg-red-600 text-white text-xs font-black uppercase tracking-wider rounded-md">
              Featured Premiere
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight transition-all duration-500">
              {featuredMovie?.title || "No Featured Movies Yet"}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-300 mb-8">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-red-500"/> {featuredMovie ? new Date(featuredMovie.releaseDate).getFullYear() : 'YYYY'}</span>
              <span>•</span>
              <span>{featuredMovie?.genre?.join(' / ') || 'Genre / Genre'}</span>
              <span>•</span>
              <span className="px-2 py-0.5 border border-gray-600 rounded text-xs font-bold">{featuredMovie?.certificate || 'UA'}</span>
            </div>
            
            <div className="flex items-center gap-4">
              {featuredMovie ? (
                <Link 
                  to={`/movies/${featuredMovie._id}`} 
                  className="px-8 py-4 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30 flex items-center gap-2"
                >
                  <Ticket className="w-5 h-5" /> Book Tickets
                </Link>
              ) : (
                <button disabled className="px-8 py-4 bg-gray-600 text-white font-black rounded-xl opacity-50 cursor-not-allowed flex items-center gap-2">
                  <Ticket className="w-5 h-5" /> Unavailable
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- 2. STICKY FILTER BAR (DISTRICT STYLE) --- */}
      <div className="sticky top-17 md:top-18 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 py-4 mt-8 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <a href="#now-showing" className="px-6 py-2 rounded-full text-sm font-black transition-all whitespace-nowrap bg-black text-white shadow-md">
              Now Showing
            </a>
            <a href="#coming-soon" className="px-6 py-2 rounded-full text-sm font-black transition-all whitespace-nowrap bg-gray-100 text-gray-600 hover:bg-gray-200">
              Coming Soon
            </a>
          </div>
          <h2 className="hidden md:flex items-center gap-2 text-sm font-bold text-gray-400">
            <Film className="w-4 h-4" /> Cinemas in <span className="text-black font-black">{userCity || 'your city'}</span>
          </h2>
        </div>
      </div>

      {/* --- 3. GRID: NOW SHOWING --- */}
      <div id="now-showing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Now Showing</h2>
          <button className="text-sm font-bold text-red-600 hover:text-red-700 flex items-center gap-1">Explore All <ChevronRight className="w-4 h-4"/></button>
        </div>

        {nowShowing.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">
            {/* PASSING INDEX FOR STAGGERED DELAY */}
            {nowShowing.map((movie, index) => <MovieCard key={movie._id} movie={movie} index={index} />)}
          </div>
        ) : (
          <EmptyGridState message="No live movies. Waiting for Organizers to list events." />
        )}
      </div>

      {/* --- 4. GRID: COMING SOON --- */}
      <div id="coming-soon" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Coming Soon</h2>
          <button className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1">View Calendar <ChevronRight className="w-4 h-4"/></button>
        </div>

        {comingSoon.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">
            {/* PASSING INDEX FOR STAGGERED DELAY */}
            {comingSoon.map((movie, index) => <MovieCard key={movie._id} movie={movie} index={index} />)}
          </div>
        ) : (
          <EmptyGridState message="No upcoming premieres scheduled at the moment." />
        )}
      </div>

    </div>
  );
};

// --- PHASE 6: ANIMATED MOVIE CARD ---
const MovieCard = ({ movie, index = 0 }) => (
  <Link 
    to={`/movies/${movie._id}`} 
    // PHASE 6 CLASSES: animate-slide-up, opacity-0, active squish
    className="group flex flex-col cursor-pointer animate-slide-up opacity-0 transition-all duration-300 ease-out active:scale-[0.96]"
    // INLINE DELAY FOR CASCADING EFFECT
    style={{ animationDelay: `${index * 50}ms` }}
  >
    <div className="relative aspect-2/3 rounded-2xl overflow-hidden mb-4 shadow-sm group-hover:shadow-xl transition-all duration-500 bg-gray-100 border border-gray-200 flex items-center justify-center">
      {movie.poster ? (
        <img src={resolveMediaUrl(movie.poster)} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
      ) : (
        <Film className="w-12 h-12 text-gray-300" />
      )}
      
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm border border-gray-100">
        <Star className="w-3.5 h-3.5 text-black fill-current" />
        <span className="text-gray-900 text-xs font-black tracking-wide">{movie.rating || 0}/10</span>
      </div>
    </div>

    <div className="flex-1 flex flex-col px-1">
      <h3 className="font-black text-gray-900 text-lg group-hover:text-red-600 transition-colors line-clamp-1">{movie.title || "Movie Title"}</h3>
      <p className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-wider line-clamp-1">{movie.genre?.join(' • ') || 'GENRE'}</p>
    </div>
  </Link>
);

// --- RAW STRUCTURE: EMPTY STATE ---
const EmptyGridState = ({ message }) => (
  <div className="w-full aspect-21/9 md:aspect-32/9 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-6">
    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100">
      <Film className="w-6 h-6 text-gray-400" />
    </div>
    <h3 className="text-lg font-black text-gray-900 mb-1">Grid Empty</h3>
    <p className="text-sm font-medium text-gray-500 max-w-sm">{message}</p>
  </div>
);

export default Movies;
