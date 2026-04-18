import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Ticket, Calendar, MapPin, Loader2, Sparkles, TrendingUp, Film } from 'lucide-react';
import api from '../../utils/Axios'; 
import { useAuth } from '../../context/AuthContext';

const HERO_SLIDES = [
  { id: 1, image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070", title: "Experience the Magic Live" },
];

// 🚀 IMAGE OPTIMIZER: Compresses massive Pexels/Unsplash images automatically
const optimizeImage = (url) => {
  if (!url) return '';
  if (url.includes('pexels.com') && !url.includes('?')) {
    return `${url}?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1`; 
  }
  if (url.includes('unsplash.com') && !url.includes('w=')) {
    return `${url}&auto=format&fit=crop&w=600&q=80`;
  }
  return url;
};

const Home = () => {
  const { userCity, isAuthenticated, user } = useAuth(); 
  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Independent fallback states to ensure accurate UI messaging
  const [isEventFallbackActive, setIsEventFallbackActive] = useState(false);
  const [isMovieFallbackActive, setIsMovieFallbackActive] = useState(false);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch AI Recommendations (Backend automatically handles Guest vs Logged In)
        try {
          const recRes = await api.get('/events/recommended');
          if (recRes.data.success) {
            setRecommendedEvents(recRes.data.data);
          }
        } catch (recError) {
          console.error("Failed to fetch recommendations", recError);
        }

        // 2. Fetch Trending Movies
        try {
          setIsMovieFallbackActive(false);
          const movieEndpoint = (userCity && userCity !== 'All Cities') 
            ? `/movies?status=Approved&city=${encodeURIComponent(userCity)}` 
            : '/movies?status=Approved';
            
          const moviesRes = await api.get(movieEndpoint);
          let fetchedMovies = moviesRes.data?.data || [];
          
          // Fallback LOGIC: If no movies in city, fetch global movies instead
          if (fetchedMovies.length === 0 && userCity && userCity !== 'All Cities') {
            setIsMovieFallbackActive(true);
            const fallbackRes = await api.get('/movies?status=Approved');
            fetchedMovies = fallbackRes.data?.data || [];
          }

          if (fetchedMovies.length > 0) {
            setTrendingMovies(fetchedMovies.slice(0, 8)); // Grab top 8
          } else {
            setTrendingMovies([]);
          }
        } catch (movieError) {
          console.error("Failed to fetch trending movies", movieError);
        }

        // 3. Fetch General Trending Events (Strictly Filtered by User's City)
        try {
          setIsEventFallbackActive(false); 
          const endpoint = (userCity && userCity !== 'All Cities') 
            ? `/events/search?q=${encodeURIComponent(userCity)}` 
            : '/events?status=Approved';
            
          const trendingRes = await api.get(endpoint);
          let fetchedEvents = trendingRes.data?.data || [];
          
          // Fallback LOGIC: If no events in city, fetch global events instead
          if (fetchedEvents.length === 0 && userCity && userCity !== 'All Cities') {
            setIsEventFallbackActive(true);
            const fallbackRes = await api.get('/events?status=Approved');
            fetchedEvents = fallbackRes.data?.data || [];
          }

          if (fetchedEvents.length > 0) {
            // Sort by ticketsSold to get true "Trending" (Fallback if no tickets sold yet)
            const sortedTrending = fetchedEvents.sort((a, b) => (b.ticketsSold || 0) - (a.ticketsSold || 0));
            setTrendingEvents(sortedTrending.slice(0, 8)); // Grab top 8
          } else {
            setTrendingEvents([]); 
          }
        } catch (trendError) {
          console.error("Failed to fetch trending events", trendError);
        }

      } catch (error) {
        console.error("Failed to fetch home data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [userCity]); // Re-run whenever the user changes their city in the Navbar

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
    
      {/* HERO SECTION */}
      <section className="mt-8 relative h-[60vh] min-h-125 w-full bg-gray-900 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={optimizeImage(HERO_SLIDES[0].image)} 
            alt="Hero" 
            className="w-full h-full object-cover opacity-40"
            style={{ objectPosition: 'center 20%' }} 
          />
          <div className="absolute inset-0 bg-linear-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
        </div>
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center text-center">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight drop-shadow-lg">
            {HERO_SLIDES[0].title}
          </h1>
          <p className="text-lg md:text-2xl text-gray-300 mb-10 max-w-2xl font-medium">
            Discover the best movies, concerts, and live experiences happening in {userCity !== 'All Cities' ? <span className="text-orange-400 font-bold">{userCity}</span> : 'your city'}.
          </p>
          <div className="flex gap-4">
            <Link to="/events" className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2">
              Explore Now <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* AI RECOMMENDED SECTION */}
      {recommendedEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-orange-500" /> 
                {isAuthenticated ? `Recommended for ${user?.name?.split(' ')[0]}` : 'Top Picks For You'}
              </h2>
              <p className="text-gray-500 mt-2 font-medium">Based on your interests and past bookings</p>
            </div>
            <Link to="/events" className="hidden sm:flex items-center text-orange-600 font-bold hover:text-orange-700 transition-colors">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendedEvents.map(event => (
              <EventCard key={event._id} event={event} colorTheme="orange" />
            ))}
          </div>
        </section>
      )}

      {/* MOVIES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <Film className="w-8 h-8 text-purple-500" /> 
              {isMovieFallbackActive || userCity === 'All Cities' ? 'Now Showing' : `Now Showing in ${userCity}`}
            </h2>
            <p className="text-gray-500 mt-2 font-medium">
              {isMovieFallbackActive 
                ? `No movies currently scheduled in ${userCity}. Showing popular movies globally.` 
                : 'Catch the latest blockbusters in theatres near you.'}
            </p>
          </div>
          <Link to="/movies" className="hidden sm:flex items-center text-purple-600 font-bold hover:text-purple-700 transition-colors">
            View All Movies <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {trendingMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {trendingMovies.map(movie => (
              <MovieCard key={movie._id} movie={movie} colorTheme="purple" />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm">
            <Film className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900">No movies found in {userCity}</h3>
            <p className="text-gray-500 mt-1">Try changing your city or check back later.</p>
          </div>
        )}
      </section>

      {/* TRENDING NOW SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-500" /> 
              {isEventFallbackActive || userCity === 'All Cities' ? 'Trending Events' : `Trending in ${userCity}`}
            </h2>
            <p className="text-gray-500 mt-2 font-medium">
              {isEventFallbackActive 
                ? `No events found in ${userCity} yet. Showing popular events globally.` 
                : 'The most popular live events happening right now.'}
            </p>
          </div>
          <Link to="/events" className="hidden sm:flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors">
            View All Events <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {trendingEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingEvents.map(event => (
              <EventCard key={event._id} event={event} colorTheme="blue" />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm">
            <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900">No events found in {userCity}</h3>
            <p className="text-gray-500 mt-1">Try changing your city or check back later.</p>
          </div>
        )}
      </section>

    </div>
  );
};

// Reusable Movie Card Component (Vertical Poster Aspect Ratio)
const MovieCard = ({ movie, colorTheme = 'purple' }) => {
  const themeStyles = {
    orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white',
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
  };

  return (
    <Link to={`/movies/${movie._id}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
        {/* Movie Poster Container (Taller Aspect Ratio) */}
        <div className="relative aspect-2/3 overflow-hidden bg-gray-100">
          <img 
            src={optimizeImage(movie.poster) || 'https://via.placeholder.com/400x600?text=No+Poster'} 
            alt={movie.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          {movie.certificate && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-black text-gray-900 shadow-sm">
              {movie.certificate}
            </div>
          )}
        </div>

        {/* Content Container */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-black text-lg text-gray-900 mb-1 line-clamp-1 group-hover:text-primary-hover transition-colors">
            {movie.title}
          </h3>
          <p className="text-xs font-bold text-gray-500 truncate mb-3">
            {Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre}
          </p>
          
          <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
            <div>
              <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wide">Language</span>
              <span className="font-bold text-xs text-gray-900 truncate max-w-20 block">
                {Array.isArray(movie.language) ? movie.language[0] : movie.language || 'Multiple'}
              </span>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${themeStyles[colorTheme]}`}>
              BOOK NOW
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

// Reusable Event Card Component (Horizontal Aspect Ratio)
const EventCard = ({ event, colorTheme = 'orange' }) => {
  const themeStyles = {
    orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white',
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
  };

  return (
    <Link to={`/events/${event._id}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
        {/* Image Container */}
        <div className="relative aspect-4/3 overflow-hidden bg-gray-100">
          <img 
            src={optimizeImage(event.image) || 'https://via.placeholder.com/600x400?text=No+Image'} 
            alt={event.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-black text-gray-900 shadow-sm">
            {event.category}
          </div>
        </div>

        {/* Content Container */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-black text-lg text-gray-900 mb-3 line-clamp-2 group-hover:text-primary-hover transition-colors">
            {event.title}
          </h3>
          
          <div className="mt-auto space-y-2 mb-4">
            <div className="flex items-center text-xs font-bold text-gray-500">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" /> 
              {event.date}
            </div>
            <div className="flex items-center text-xs font-bold text-gray-500">
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400" /> 
              <span className="truncate">{event.location}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
            <div>
              <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wide">Starting from</span>
              <span className="font-black text-gray-900">{event.price === 0 ? 'Free' : `₹${event.price}`}</span>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${themeStyles[colorTheme]}`}>
              BOOK NOW
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Home;
