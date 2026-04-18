import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, Film, MonitorPlay, Clock, 
  MapPin, Building2, Save, ArrowLeft, CheckCircle2 
} from 'lucide-react';
import api from '../../../utils/Axios';
import { toast } from 'react-hot-toast';

const CreateMultiplex = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [myMultiplexes, setMyMultiplexes] = useState([]);
  const [availableScreens, setAvailableScreens] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    movieId: '',
    multiplexId: '',
    screenId: '',
    date: '',
    startTime: '',
    language: 'Hindi',
    format: '2D',
    basePrice: 250
  });

  useEffect(() => {
    const fetchPrerequisites = async () => {
      try {
        // 1. Fetch only Approved Movies for scheduling
        const movieRes = await api.get('/movies?status=Approved');
        setMovies(Array.isArray(movieRes.data.data) ? movieRes.data.data : []);

        // 2. Fetch the logged-in Theatre Owner's multiplexes
        const multiRes = await api.get('/multiplexes/my');
        setMyMultiplexes(Array.isArray(multiRes.data.data) ? multiRes.data.data : []);
      } catch {
        toast.error("Failed to load required scheduling data.");
      } finally {
        setLoading(false);
      }
    };
    fetchPrerequisites();
  }, []);

  // Cascading Dropdown Logic: When multiplex changes, load its specific screens
  useEffect(() => {
    if (formData.multiplexId) {
      const selectedMulti = myMultiplexes.find(m => m._id === formData.multiplexId);
      if (selectedMulti && Array.isArray(selectedMulti.screens)) {
        setAvailableScreens(selectedMulti.screens);
        // Auto-select first screen if available to save clicks
        if (selectedMulti.screens.length > 0) {
          setFormData(prev => ({ ...prev, screenId: selectedMulti.screens[0]._id }));
        } else {
          setFormData(prev => ({ ...prev, screenId: '' }));
        }
      } else {
        setAvailableScreens([]);
        setFormData(prev => ({ ...prev, screenId: '' }));
      }
    } else {
      setAvailableScreens([]);
      setFormData(prev => ({ ...prev, screenId: '' }));
    }
  }, [formData.multiplexId, myMultiplexes]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.movieId || !formData.multiplexId || !formData.screenId) {
      return toast.error("Please select a Movie, Multiplex, and Screen.");
    }

    setIsSubmitting(true);
    try {
      // API call expects /movies/:id/shows
      await api.post(`/movies/${formData.movieId}/shows`, {
        multiplexId: formData.multiplexId,
        screenId: formData.screenId,
        date: formData.date,
        startTime: formData.startTime,
        language: formData.language,
        format: formData.format,
        basePrice: Number(formData.basePrice)
      });
      
      toast.success('Movie successfully integrated to Multiplex screen!');
      // Reset time but keep location data for rapid scheduling of subsequent shows
      setFormData({ ...formData, startTime: '', date: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Integration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-300 pb-24">
      
      {/* Premium Hero Header */}
      <div className="bg-linear-to-r from-teal-900 to-teal-800 pt-16 pb-24 border-b border-teal-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-teal-200 hover:text-white font-bold mb-8 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <MonitorPlay className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Integrate Movie to Multiplex</h1>
              <p className="text-teal-200 font-medium mt-2 text-lg">Map approved theatrical releases to your physical cinema screens.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Step 1: Select Movie */}
          <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500"></div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Film className="w-5 h-5 text-teal-500" /> 1. Select Film
            </h2>
            <div className="relative">
              <Film className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select 
                name="movieId" 
                value={formData.movieId} 
                onChange={handleChange} 
                required 
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none dark:text-white appearance-none cursor-pointer font-medium"
              >
                <option value="" disabled>-- Select an Approved Movie --</option>
                {movies.map(m => (
                  <option key={m._id} value={m._id}>{m.title} ({m.language?.join ? m.language[0] : m.language})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 2: Select Location */}
          <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500"></div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-500" /> 2. Target Location & Audi
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Multiplex Property</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select 
                    name="multiplexId" 
                    value={formData.multiplexId} 
                    onChange={handleChange} 
                    required 
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none dark:text-white appearance-none cursor-pointer font-medium"
                  >
                    <option value="" disabled>-- Select Multiplex --</option>
                    {myMultiplexes.map(multi => (
                      <option key={multi._id} value={multi._id}>{multi.multiplexName} ({multi.city})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Screen / Audi</label>
                <div className="relative">
                  <MonitorPlay className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select 
                    name="screenId" 
                    value={formData.screenId} 
                    onChange={handleChange} 
                    required 
                    disabled={!formData.multiplexId || availableScreens.length === 0} 
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none dark:text-white appearance-none cursor-pointer disabled:opacity-50 font-medium"
                  >
                    {availableScreens.length === 0 ? (
                      <option value="" disabled>No screens found</option>
                    ) : (
                      <>
                        <option value="" disabled>-- Select Screen --</option>
                        {availableScreens.map(s => (
                          <option key={s._id} value={s._id}>{s.screenName} ({s.screenType} - {s.totalSeats} seats)</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Timing & Pricing */}
          <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500"></div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-500" /> 3. Schedule & Pricing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Show Date</label>
                <input 
                  type="date" 
                  name="date" 
                  required 
                  value={formData.date} 
                  onChange={handleChange} 
                  min={new Date().toISOString().split('T')[0]} 
                  className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none dark:text-white font-medium" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Start Time</label>
                <input 
                  type="time" 
                  name="startTime" 
                  required 
                  value={formData.startTime} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none dark:text-white font-medium" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Language Format</label>
                <select 
                  name="language" 
                  value={formData.language} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none dark:text-white font-medium"
                >
                  <option value="Hindi">Hindi</option>
                  <option value="English">English</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Screening Format</label>
                  <select 
                    name="format" 
                    value={formData.format} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none dark:text-white font-medium"
                  >
                    <option value="2D">Standard 2D</option>
                    <option value="3D">Digital 3D</option>
                    <option value="IMAX">IMAX</option>
                    <option value="4DX">4DX</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Base Price (₹)</label>
                  <input 
                    type="number" 
                    name="basePrice" 
                    min="50" 
                    required 
                    value={formData.basePrice} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none dark:text-white font-bold" 
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Sticky Submit Actions (Matches CreateEvent / CreateMovie) */}
          <div className="flex items-center gap-4 pt-6 pb-12 sticky bottom-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 p-4 -mx-4 sm:mx-0 sm:px-0 sm:border-t-0 sm:bg-transparent sm:backdrop-blur-none z-50">
            <button 
              type="button" 
              onClick={() => navigate(-1)} 
              className="flex-1 sm:flex-none px-6 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="flex-2 sm:flex-1 py-4 bg-gray-900 dark:bg-white hover:bg-teal-600 dark:hover:bg-teal-500 text-white dark:text-gray-900 hover:text-white font-black rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Integrating...</>
              ) : (
                <><CheckCircle2 className="w-5 h-5" /> Integrate & Schedule</>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateMultiplex;
