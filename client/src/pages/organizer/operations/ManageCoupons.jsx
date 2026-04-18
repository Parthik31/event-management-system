import React, { useState, useEffect } from 'react';
import { Tag, Plus, Loader2, Calendar, Users, Percent, MapPin, Film, CheckCircle } from 'lucide-react';
import api from '../../../utils/Axios';
import { toast } from 'react-hot-toast';

const ManageCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [events, setEvents] = useState([]); 
  const [movies, setMovies] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    usageLimit: 100,
    expiryDate: '',
    targetType: 'event', // 🚀 New: 'event' or 'movie'
    targetId: '' 
  });

  const fetchData = async () => {
    try {
      const [couponsRes, eventsRes, moviesRes] = await Promise.all([
        api.get('/coupons/organizer'),
        api.get('/events/organizer/my'),
        api.get('/movies/organizer/my')
      ]);
      setCoupons(couponsRes.data.data);
      setEvents(eventsRes.data.data);
      setMovies(moviesRes.data.data);
    } catch {
      toast.error('Data synchronization failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 🚀 PHASE 4: Complete Coupon Creation Logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.discountValue) return toast.error('Code and Discount Value are required');

    setIsSubmitting(true);
    try {
      const { data } = await api.post('/coupons', formData);
      if (data.success) {
        toast.success('Coupon activated successfully!');
        setCoupons([data.data, ...coupons]);
        // Reset form
        setFormData({ ...formData, code: '', discountValue: '', targetId: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create coupon');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col lg:flex-row gap-12 pb-32">
      
      {/* FORM */}
      <div className="w-full lg:w-2/5">
        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm sticky top-24">
          <h2 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-3">
            <Plus className="text-orange-500 w-8 h-8" /> Promo Studio
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Voucher Code</label>
              <input 
                type="text" required placeholder="E.G. MOVIE50"
                value={formData.code} 
                onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none uppercase font-black text-lg text-gray-900" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Target Module</label>
                <select 
                  value={formData.targetType} 
                  onChange={(e) => setFormData({...formData, targetType: e.target.value, targetId: ''})}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-700 outline-none"
                >
                  <option value="event">Standard Events</option>
                  <option value="movie">Cinema Listings</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Selection</label>
                <select 
                  value={formData.targetId} required
                  onChange={(e) => setFormData({...formData, targetId: e.target.value})}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-700 outline-none"
                >
                  <option value="">Apply to All</option>
                  {formData.targetType === 'event' ? 
                    events.map(ev => <option key={ev._id} value={ev._id}>{ev.title}</option>) :
                    movies.map(mv => <option key={mv._id} value={mv._id}>{mv.title}</option>)
                  }
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Type</label>
                <select 
                  value={formData.discountType} 
                  onChange={(e) => setFormData({...formData, discountType: e.target.value})}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none"
                >
                  <option value="percentage">Percentage %</option>
                  <option value="flat">Flat Amount ₹</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Value</label>
                <input 
                  type="number" required min="1" placeholder="Value"
                  value={formData.discountValue} 
                  onChange={(e) => setFormData({...formData, discountValue: e.target.value})}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-black" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Limit</label>
                <input 
                  type="number" required min="1"
                  value={formData.usageLimit} 
                  onChange={(e) => setFormData({...formData, usageLimit: e.target.value})}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold" 
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Expiry</label>
                <input 
                  type="date" required 
                  value={formData.expiryDate} 
                  onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold" 
                />
              </div>
            </div>

            {/* Submit Button inside the Coupon Form */}
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-4 mt-6 bg-linear-to-r from-orange-500 to-red-600 text-white font-black rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Activate Promo Code"}
            </button>
          </form>
        </div>
      </div>

      {/* LIST */}
      <div className="w-full lg:w-3/5 space-y-8">
        <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
          <Tag className="text-orange-500 w-8 h-8" /> Deployment History
        </h2>

        {loading ? <Loader2 className="animate-spin text-orange-500 w-10 h-10 mx-auto" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {coupons.map((coupon) => (
                <div key={coupon._id} className="bg-white p-8 rounded-4xl border border-gray-100 shadow-sm relative group overflow-hidden flex flex-col justify-between h-72">
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[4rem] -z-10 opacity-10 group-hover:scale-150 transition-transform ${coupon.movie ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                  
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <span className="bg-white border-2 border-gray-100 text-gray-900 font-black px-4 py-2 rounded-xl text-xl tracking-widest">
                        {coupon.code}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-gray-900 font-black text-sm flex items-center gap-3">
                        <Percent className="w-4 h-4 text-orange-500" />
                        {coupon.discountType === 'flat' ? `₹${coupon.discountValue} OFF` : `${coupon.discountValue}% OFF`}
                      </p>
                      <p className="text-gray-500 font-bold text-xs flex items-center gap-3">
                        <Users className="w-4 h-4" /> Usage: {coupon.usageCount} / {coupon.usageLimit}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-50">
                    <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-gray-400">
                      {coupon.movie ? <Film className="w-3.5 h-3.5 text-red-500" /> : <Calendar className="w-3.5 h-3.5 text-orange-500" />}
                      {coupon.movie ? 'Cinema Exclusive' : 'Event Exclusive'}
                    </p>
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default ManageCoupons;
