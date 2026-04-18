import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Calendar, MapPin, Filter, X, SlidersHorizontal } from 'lucide-react';
import api from '../../utils/Axios';
import { buildEventSearchParams } from '../../utils/search';

const SearchEvents = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // --- Filter States ---
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState('All');
  const [priceFilter, setPriceFilter] = useState('All'); 
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const fetchSearchResults = async () => {
      setLoading(true);
      try {
        const queryString = buildEventSearchParams({
          query,
          category,
          priceFilter,
          dateFilter
        });
        const { data } = await api.get(`/events/search?${queryString}`);
        setEvents(data.data);
      } catch (error) {
        console.error(error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce to prevent excessive API calls while typing
    const delayDebounceFn = setTimeout(() => {
      fetchSearchResults();
      // Update URL silently
      if (query) setSearchParams({ q: query });
      else setSearchParams({});
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query, category, priceFilter, dateFilter, setSearchParams]);

  const clearFilters = () => {
    setCategory('All');
    setPriceFilter('All');
    setDateFilter('');
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-8 px-4 pb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">Explore Events</h1>
          <button 
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold shadow-sm cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* --- SIDEBAR FILTERS --- */}
          <div className={`fixed inset-0 z-50 lg:z-0 lg:static lg:block bg-white lg:bg-transparent lg:border-none p-6 lg:p-0 transition-transform duration-300 ${showMobileFilters ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
            <div className="flex justify-between items-center lg:hidden mb-6">
              <h2 className="text-xl font-bold">Filters</h2>
              <button onClick={() => setShowMobileFilters(false)} className="cursor-pointer"><X className="w-6 h-6" /></button>
            </div>

            <div className="bg-white rounded-2xl lg:border lg:border-gray-100 lg:shadow-sm p-6 space-y-8 h-full overflow-y-auto lg:h-auto">
              
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-orange-500" /> Filters
                </h3>
                <button onClick={clearFilters} className="text-xs font-bold text-orange-600 hover:underline cursor-pointer">Clear All</button>
              </div>

              {/* Category Filter */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Category</h4>
                <div className="space-y-2">
                  {['All', 'Events', 'Plays', 'Activities'].map((cat) => (
                    <label key={cat} onClick={() => setCategory(cat)} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${category === cat ? 'border-orange-500 bg-orange-50' : 'border-gray-300 group-hover:border-orange-500'}`}>
                        {category === cat && <div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div>}
                      </div>
                      <span className={`text-sm ${category === cat ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Filter */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Date</h4>
                <div className="flex flex-wrap gap-2">
                  {['Today', 'Tomorrow'].map((date) => (
                    <button 
                      key={date}
                      onClick={() => setDateFilter(dateFilter === date ? '' : date)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${dateFilter === date ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Price</h4>
                <div className="space-y-2">
                  {[
                    { id: 'All', label: 'All Prices' },
                    { id: 'Free', label: 'Free' },
                    { id: 'Under500', label: 'Under ₹500' },
                    { id: '500-2000', label: '₹500 - ₹2000' },
                    { id: 'Above2000', label: 'Above ₹2000' }
                  ].map((price) => (
                    <label key={price.id} onClick={() => setPriceFilter(price.id)} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${priceFilter === price.id ? 'border-orange-500 bg-orange-50' : 'border-gray-300 group-hover:border-orange-500'}`}>
                        {priceFilter === price.id && <div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div>}
                      </div>
                      <span className={`text-sm ${priceFilter === price.id ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{price.label}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* --- MAIN CONTENT (RESULTS) --- */}
          <div className="lg:col-span-3">
            
            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for events, plays, activities..." 
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 font-medium"
              />
            </div>

            {/* Results Header */}
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {query ? `Results for "${query}"` : 'Discover Experiences'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Showing {events.length} results</p>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900">No events found</h3>
                <p className="text-gray-500 mt-2">Adjust your filters or try a different search term.</p>
                <button onClick={clearFilters} className="mt-4 px-6 py-2 bg-orange-50 text-orange-600 font-bold rounded-lg hover:bg-orange-100 transition-colors cursor-pointer">
                  Clear Filters
                </button>
              </div>
            ) : (
              /* Results Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <Link key={event._id} to={`/events/${event._id}`} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full">
                    
                    <div className="relative aspect-2/3 overflow-hidden bg-gray-100">
                      <img 
                        src={event.image} 
                        alt={event.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-orange-600 shadow-sm">
                        {event.category}
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-lg font-black text-gray-900 mb-1 leading-tight group-hover:text-orange-600 transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium mb-4">{event.language} • {event.ageLimit}</p>

                      <div className="mt-auto space-y-2">
                        <div className="flex items-center text-xs font-bold text-gray-500">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {event.date}
                        </div>
                        <div className="flex items-center text-xs font-bold text-gray-500">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                        <div>
                          <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wide">Starting from</span>
                          <span className="text-lg font-black text-gray-900">{event.price === 0 ? 'Free' : `₹${event.price}`}</span>
                        </div>
                        <div className="px-4 py-2 rounded-lg bg-orange-50 text-orange-600 text-xs font-bold group-hover:bg-orange-600 group-hover:text-white transition-colors">
                          BOOK
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchEvents;
