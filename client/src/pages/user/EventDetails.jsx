import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, MapPin, Clock, User, Ticket, 
  ArrowLeft, Loader2, Info, Receipt, Minus, Plus, X, CheckCircle, Tag, Heart, Share2, BellRing, Star, Sparkles
} from 'lucide-react';
import api, { getCachedApi, resolveMediaUrl } from '../../utils/Axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import ReviewSection from '../../components/ReviewSection';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [showBillModal, setShowBillModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [similarEvents, setSimilarEvents] = useState([]);

  // --- Promo Code States ---
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);

  useEffect(() => {
    let isActive = true;

    const fetchEventData = async () => {
      try {
        // 1. Fetch Main Event Details (Must succeed)
        const res = await getCachedApi(`/events/${id}`, {}, { cacheTTL: 60000 });
        const fetchedEvent = res.data?.data;
        if (!isActive) return;
        setEvent(fetchedEvent);

        // 🚀 PHASE 1: Fetch "Users who booked this also liked..."
        const [similarResult, couponResult] = await Promise.allSettled([
          getCachedApi(
            `/events/search?category=${encodeURIComponent(fetchedEvent?.category || '')}`,
            {},
            { cacheTTL: 30000 }
          ),
          getCachedApi(`/coupons/event/${id}`, {}, { cacheTTL: 30000, preferCacheOnError: false })
        ]);

        if (!isActive) return;

        if (similarResult.status === 'fulfilled') {
          const similarData = similarResult.value.data?.data || [];
          setSimilarEvents(similarData.filter((item) => item?._id !== fetchedEvent?._id).slice(0, 3));
        } else {
          console.error('Failed to load recommendations', similarResult.reason);
          setSimilarEvents([]);
        }

        if (couponResult.status === 'fulfilled') {
          setAvailableCoupons(couponResult.value.data?.data || []);
        } else {
          console.error('No coupons found or coupon API failed', couponResult.reason);
          setAvailableCoupons([]);
        }

      } catch {
        if (isActive) {
          toast.error('Failed to load event details');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };
    
    fetchEventData();

    return () => {
      isActive = false;
    };
  }, [id]);

  // Prevent background scrolling when checkout modal is open
  useEffect(() => {
    if (showBillModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showBillModal]);

  // --- Pricing & Math ---
  const ticketPrice = event?.price || 0;
  const subtotal = ticketPrice * quantity;
  
  // Calculate Discount
  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountType === 'flat') {
      discountAmount = appliedPromo.discountValue;
    } else if (appliedPromo.discountType === 'percentage') {
      discountAmount = Math.round(subtotal * (appliedPromo.discountValue / 100));
    }
    // Prevent discount from being more than the subtotal
    if (discountAmount > subtotal) discountAmount = subtotal; 
  }

  const discountedSubtotal = subtotal - discountAmount;
  const platformFee = Math.round(discountedSubtotal * 0.05); 
  const gst = Math.round(discountedSubtotal * 0.18); 
  const grandTotal = discountedSubtotal + platformFee + gst;

  // --- Handlers ---
  const handleOpenBill = () => {
    if (!isAuthenticated) {
      toast.error("Please log in to book tickets");
      navigate('/login');
      return;
    }
    setShowBillModal(true);
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    try {
      const { data } = await api.post('/coupons/validate', {
        code: promoCode,
        eventId: event._id
      });
      setAppliedPromo(data.data);
      toast.success("Promo code applied successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid code");
      setAppliedPromo(null);
    } finally {
      setValidatingPromo(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
  };

  const confirmBooking = async () => {
    // A slightly longer vibration for a major action
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 50, 30]); 
    }
    setIsBooking(true);
    
    try {
      // Direct booking (No payment gateway)
      const { data } = await api.post('/bookings', { 
        eventId: event._id, 
        quantity: quantity,
        promoCode: appliedPromo?.code
      });
      
      if (data.success) {
        toast.success("Booking Confirmed! Tickets Generated.");
        setShowBillModal(false);
        navigate('/my-tickets'); 
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Booking failed. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  const toggleSaveEvent = async () => {
    if (!isAuthenticated) return toast.error("Please log in to save events.");
    try {
      const { data } = await api.post(`/interactions/save/${id}`);
      setIsSaved(data.isSaved);
      toast.success(data.message);
    } catch {
      toast.error("Failed to update wishlist");
    }
  };

  const joinWaitlist = async () => {
    if (!isAuthenticated) return toast.error("Please log in to join the waitlist.");
    setIsJoiningWaitlist(true);
    try {
      const { data } = await api.post(`/interactions/waitlist/${id}`);
      toast.success(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to join waitlist");
    } finally {
      setIsJoiningWaitlist(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out ${event.title} on EventBook!`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading event details...</p>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-4 md:pt-6">
      
      {/* 1. CINEMATIC HERO BANNER */}
      <div className="relative w-full h-[40vh] md:h-[55vh] min-h-100 bg-gray-900">
        <img 
          src={resolveMediaUrl(event.banner || event.image)} 
          alt={event.title} 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-linear-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
        
        {/* Top Back Button */}
        <div className="absolute top-6 left-6 z-20">
          <button onClick={() => navigate(-1)} className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="text-white max-w-3xl">
              <span className="inline-block px-3 py-1 mb-4 bg-orange-500 text-white text-xs font-bold uppercase tracking-wider rounded-md">
                {event.category}
              </span>
              <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-gray-300">
                <span className="flex items-center gap-2"><Calendar className="w-5 h-5 text-orange-400"/> {event.date}</span>
                <span className="flex items-center gap-2"><Clock className="w-5 h-5 text-orange-400"/> {event.time}</span>
                <span className="flex items-center gap-2"><MapPin className="w-5 h-5 text-orange-400"/> {event.location}</span>
              </div>
            </div>

            {/* Action Buttons (Share & Wishlist) */}
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={handleShare} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer">
                <Share2 className="w-5 h-5" />
              </button>
              <button onClick={toggleSaveEvent} className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${isSaved ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* LEFT COLUMN: Details & Organizer */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* About Section */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-6 h-6 text-orange-500" /> About the Event
              </h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-lg">
                {event.description}
              </p>
            </section>

            {/* Organizer Profile */}
            <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xl shrink-0">
                {event.organizer?.name?.charAt(0) || 'O'}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Organized By</p>
                <h3 className="text-xl font-bold text-gray-900">{event.organizer?.name || 'Verified Partner'}</h3>
                <p className="text-sm text-gray-500 mt-1">Host on EventBook</p>
              </div>
            </section>

            {/* Terms & Conditions */}
            {event.terms && (
              <section className="bg-gray-100 p-6 rounded-2xl">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5 text-gray-500"/> Terms & Conditions
                </h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{event.terms}</p>
              </section>
            )}

            {/* Fan Reviews Component */}
            <ReviewSection eventId={id} />
          </div>

          {/* RIGHT COLUMN: Sticky Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/50">
              <h3 className="text-2xl font-black text-gray-900 mb-6">Book Tickets</h3>
              
              {/* Ticket Tier Selection */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-4 border border-orange-200 bg-orange-50 rounded-xl">
                  <div>
                    <h4 className="font-bold text-gray-900">General Entry</h4>
                    <p className="text-sm text-gray-500">{event.price === 0 ? 'Free' : `₹${event.price}`}</p>
                  </div>
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-1">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                      className="p-1 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4"/>
                    </button>
                    <span className="font-bold w-4 text-center">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(Math.min(10, quantity + 1))} 
                      className="p-1 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              </div>

              {/* Available Promos Display */}
              {availableCoupons && availableCoupons.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                  <h4 className="text-emerald-800 font-bold text-sm mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Available Offers
                  </h4>
                  <div className="space-y-2">
                    {availableCoupons.map((coupon, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                        <div>
                          <span className="bg-emerald-100 text-emerald-800 font-black px-2 py-1 rounded text-xs tracking-wider border border-emerald-200">
                            {coupon?.code}
                          </span>
                          <p className="text-xs text-gray-600 font-medium mt-1">
                            Get {coupon?.discountType === 'flat' ? `₹${coupon?.discountValue}` : `${coupon?.discountValue}%`} OFF!
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            if(coupon?.code) {
                              navigator.clipboard.writeText(coupon.code);
                              toast.success("Code Copied! Paste at checkout.");
                            }
                          }}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtotal Display */}
              <div className="border-t border-gray-100 pt-6 space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-bold text-gray-900">₹{subtotal.toLocaleString()}</span>
                </div>
              </div>

              {/* CTA Buttons */}
              {event.isSoldOut ? (
                <button 
                  onClick={joinWaitlist}
                  disabled={isJoiningWaitlist}
                  className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isJoiningWaitlist ? <Loader2 className="w-5 h-5 animate-spin" /> : <BellRing className="w-5 h-5" />}
                  Join Waitlist
                </button>
              ) : (
                <button 
                  onClick={handleOpenBill}
                  className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Proceed to Checkout
                </button>
              )}

              <p className="text-center text-xs text-gray-400 mt-4 font-medium flex items-center justify-center gap-1">
                 <CheckCircle className="w-3.5 h-3.5 text-green-500" /> 100% Secure Checkout
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 🚀 PHASE 1: SMART RECOMMENDATIONS */}
      {similarEvents.length > 0 && (
        <div className="mt-12 pt-12 border-t border-slate-200">
          <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-500" />
            Users who booked this also liked
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {similarEvents.map(sim => (
              <div key={sim._id} onClick={() => navigate(`/events/${sim._id}`)} className="cursor-pointer group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all">
                <img src={resolveMediaUrl(sim.image) || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80'} alt={sim.title} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="p-4">
                  <h3 className="font-bold text-slate-900 line-clamp-1">{sim.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> {sim.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- CHECKOUT / BILL MODAL --- */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            
            <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-orange-400 to-orange-600"></div>
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-500" /> Booking Summary
              </h2>
              {/* Final Confirm Button */}
              <button 
                onClick={confirmBooking}
                disabled={isBooking}
                className="w-full py-4 bg-linear-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : "Confirm & Book Securely"}
              </button>
            </div>

            <div className="p-6">
              
              <div className="mb-6 pb-6 border-b border-dashed border-gray-200">
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{event.title}</h3>
                <p className="text-sm text-gray-500 mb-4">{event.date} • {event.time}</p>
                
                <div className="flex items-center justify-between bg-orange-50 p-3 rounded-xl border border-orange-100">
                  <span className="font-bold text-orange-900">Quantity</span>
                  <span className="font-black text-lg w-16 text-center text-orange-900">{quantity} Tickets</span>
                </div>
              </div>

              {/* Promo Code Input System inside Checkout */}
              <div className="mb-6">
                {!appliedPromo ? (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Have a promo code?" 
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none uppercase font-bold text-gray-700 tracking-wide"
                    />
                    <button 
                      onClick={handleApplyPromo}
                      disabled={validatingPromo || !promoCode}
                      className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-70 cursor-pointer"
                    >
                      {validatingPromo ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center bg-green-50 border border-green-200 p-3 rounded-xl">
                    <div>
                      <span className="flex items-center gap-2 text-green-700 font-bold text-sm">
                        <CheckCircle className="w-4 h-4" /> Code '{appliedPromo.code}' Applied
                      </span>
                      <span className="text-xs text-green-600 block mt-0.5">
                        You saved ₹{discountAmount.toLocaleString()}!
                      </span>
                    </div>
                    <button onClick={removePromo} className="text-red-500 p-2 hover:bg-red-50 rounded-lg cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Detailed Math Breakdown */}
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Ticket Subtotal</span>
                  <span className="font-bold text-gray-900">₹{subtotal.toLocaleString()}</span>
                </div>
                
                {appliedPromo && (
                  <div className="flex justify-between items-center text-green-600 font-bold">
                    <span>Discount Applied</span>
                    <span>- ₹{discountAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-gray-600">
                  <span>Platform Fee & GST (23%)</span>
                  <span className="font-medium text-gray-900">₹{(platformFee + gst).toLocaleString()}</span>
                </div>
              </div>

              {/* --- PHASE 5: GLASSMORPHIC FLOATING BOTTOM BAR --- */}
              {/* We add a spacer div so content doesn't get hidden behind the fixed bar */}
              <div className="h-40 w-full"></div> 

              <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/20 bg-white/80 pb-safe pt-4 px-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] backdrop-blur-xl md:px-8">
                <div className="mx-auto max-w-7xl">
                  {/* Grand Total Bar */}
                  <div className="mb-4 flex items-center justify-between overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-inner relative">
                    <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
                    <span className="relative z-10 text-xs font-bold uppercase tracking-wider text-slate-300">Grand Total</span>
                    <span className="relative z-10 text-3xl font-black">₹{grandTotal.toLocaleString()}</span>
                  </div>

                  {/* Final Confirm Button with Phase 1 Squish Physics */}
                  <button 
                    onClick={confirmBooking}
                    disabled={isBooking}
                    className="mb-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-600 py-4 font-bold text-white shadow-lg shadow-orange-500/30 transition-all duration-300 ease-out hover:bg-orange-500 hover:shadow-orange-500/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isBooking ? <Loader2 className="h-6 w-6 animate-spin" /> : "Confirm & Book Securely"}
                  </button>
                  
                  <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    100% Secure Encrypted Booking
                  </p>
                </div>
              </div>  
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default EventDetails;
