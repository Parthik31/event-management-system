import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Calendar, MapPin, Ticket } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/Axios';
import { useAuth } from '../../context/AuthContext';
import { useCategorizedEvents } from '../../hooks/useCategorizedEvents';
import { optimizeCatalogImage } from '../../utils/catalog';

const Events = () => {
  const { userCity } = useAuth();
  const { items: events, loading } = useCategorizedEvents({
    category: 'Events',
    userCity,
    errorMessage: 'Failed to load events.'
  });

  return (
    <div className="min-h-screen bg-blue-50/50 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
          Discover Events <span className="text-blue-600 text-xs font-bold bg-blue-100 px-3 py-1.5 rounded-full border border-blue-200 uppercase tracking-wider">Live Shows</span>
        </h1>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {events.map((event) => (
              <Link to={`/events/${event._id}`} key={event._id} className="group block h-full">
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col h-full">
                  <div className="relative h-48 overflow-hidden bg-gray-200 shrink-0">
                    <img src={optimizeCatalogImage(resolveMediaUrl(event.image))} alt={event.title} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-5 flex flex-col grow">
                    <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-1">{event.title}</h3>
                    <div className="mt-auto space-y-2 mb-4">
                      <div className="flex items-center text-xs font-bold text-gray-500">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" /> {event.date}
                      </div>
                      <div className="flex items-center text-xs font-bold text-gray-500">
                        <MapPin className="w-3.5 h-3.5 mr-2 text-blue-400" /> <span className="truncate">{event.location}</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
                      <div>
                        <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wide">Starting from</span>
                        <span className="font-black text-gray-900">₹{event.price}</span>
                      </div>
                      <span className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm uppercase tracking-wide">
                        BOOK NOW
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-blue-200 shadow-sm">
            <Ticket className="w-16 h-16 text-blue-200 mb-4" />
            <h3 className="text-xl font-bold text-gray-900">No events found</h3>
            <p className="text-gray-500 mt-1">Check back soon for upcoming live shows.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
