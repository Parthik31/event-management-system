import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Zap, Clock, CheckCircle2,
  Tag, X, ChevronRight, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../utils/Axios';

// ─────────────────────────────────────────────
// CONSTANTS & PURE HELPERS
// ─────────────────────────────────────────────

const MAX_SEATS = 10;
const LOCK_DURATION_SECONDS = 5 * 60; // 5 min
const POLL_INTERVAL_MS = 5000;

const CATEGORY_ACCENT_CLASSES = [
  'border-sky-200 bg-sky-50 text-sky-700',
  'border-orange-200 bg-orange-50 text-orange-700',
  'border-violet-200 bg-violet-50 text-violet-700',
  'border-emerald-200 bg-emerald-50 text-emerald-700',
  'border-rose-200 bg-rose-50 text-rose-700',
  'border-amber-200 bg-amber-50 text-amber-700',
  'border-cyan-200 bg-cyan-50 text-cyan-700',
];

const getCategoryAccentClass = (category, categoryNames = []) => {
  const index = Math.max(0, categoryNames.indexOf(category));
  return CATEGORY_ACCENT_CLASSES[index % CATEGORY_ACCENT_CLASSES.length];
};

const getSeatPricingMeta = (show, seatId) => {
  const rowLabel = String(seatId).replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase() || 'A';
  const seatCategories = show?.pricingPreview?.seatCategories || [];
  const category =
    seatCategories.find((item) => item.rowLabel === rowLabel)?.category || 'Standard';
  const price = Number(
    show?.pricingPreview?.categoryPreview?.[category] || show?.basePrice || 0
  );
  return { seatId, rowLabel, category, price };
};

const getSeatPartitions = (cols, requestedParts) => {
  const totalSeats = Math.max(Number(cols || 0), 0);
  const parts = Math.min(4, Math.max(1, Number(requestedParts || 2)));
  const baseSize = Math.floor(totalSeats / parts);
  const remainder = totalSeats % parts;
  const partitionSizes = Array.from({ length: parts }).fill(baseSize);

  const distributionOrder = [];
  if (parts % 2 === 1) {
    const center = Math.floor(parts / 2);
    distributionOrder.push(center);
    for (let d = 1; distributionOrder.length < parts; d++) {
      if (center + d < parts) distributionOrder.push(center + d);
      if (center - d >= 0) distributionOrder.push(center - d);
    }
  } else {
    const rc = parts / 2, lc = rc - 1;
    distributionOrder.push(rc, lc);
    for (let d = 1; distributionOrder.length < parts; d++) {
      if (rc + d < parts) distributionOrder.push(rc + d);
      if (lc - d >= 0) distributionOrder.push(lc - d);
    }
  }
  for (let i = 0; i < remainder; i++) partitionSizes[distributionOrder[i]] += 1;

  return partitionSizes
    .filter((s) => s > 0)
    .map((size, idx, arr) => ({
      key: `${idx}-${size}`,
      size,
      startSeat: arr.slice(0, idx).reduce((s, v) => s + v, 0),
    }));
};

const calculateCharges = (subtotal) => {
  const adminCommission = Math.round(subtotal * 0.05);
  const gatewayCharge = Math.round(subtotal * 0.18);
  return {
    subtotal,
    adminCommission,
    gatewayCharge,
    totalAmount: subtotal + adminCommission + gatewayCharge,
  };
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// ─────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────

const STEPS = ['Select Seats', 'Review Order', 'Confirm Payment'];

const StepIndicator = ({ currentStep }) => (
  <div className="flex items-center gap-2">
    {STEPS.map((label, idx) => (
      <React.Fragment key={label}>
        <div className="flex items-center gap-1.5">
          <div
            className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
              idx < currentStep
                ? 'bg-green-500 text-white'
                : idx === currentStep
                ? 'bg-red-500 text-white'
                : 'bg-slate-200 text-slate-400'
            }`}
          >
            {idx < currentStep ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
          </div>
          <span
            className={`hidden md:block text-xs font-bold ${
              idx === currentStep ? 'text-red-600' : 'text-slate-400'
            }`}
          >
            {label}
          </span>
        </div>
        {idx < STEPS.length - 1 && (
          <div
            className={`h-0.5 w-8 md:w-16 rounded-full transition-all ${
              idx < currentStep ? 'bg-green-400' : 'bg-slate-200'
            }`}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ─────────────────────────────────────────────
// PAYMENT MODAL
// ─────────────────────────────────────────────

const PaymentModal = ({ show, selectedSeats, seatDetails, onClose, onConfirm, isProcessing, lockExpiresAt }) => {
  const [promoCode, setPromoCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(LOCK_DURATION_SECONDS);

  useEffect(() => {
    if (!lockExpiresAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((lockExpiresAt - Date.now()) / 1000));
      setTimeLeft(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockExpiresAt]);

  const subtotal = seatDetails.reduce((s, d) => s + d.price, 0);
  const charges = calculateCharges(subtotal);
  const categoryNames = Object.keys(show?.pricingPreview?.categoryPreview || {});

  return (
    <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-900">Review Your Order</h3>
            <p className="text-xs text-slate-500 mt-0.5">{show?.movie?.title} · {show?.multiplex?.multiplexName}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-orange-50 text-orange-700'}`}>
              <Clock className="h-3 w-3" />
              {formatTime(timeLeft)} left
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3">
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Show Details</p>
              <p className="font-black text-slate-900 mt-0.5">{show?.date} · {show?.startTime}</p>
              <p className="text-sm text-slate-500">{show?.screen?.screenName} · {show?.format}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Seats</p>
            <div className="space-y-2">
              {seatDetails.map((seat) => (
                <div key={seat.seatId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900">{seat.seatId}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getCategoryAccentClass(seat.category, categoryNames)}`}>
                      {seat.category}
                    </span>
                  </div>
                  <span className="font-bold text-slate-700">₹{seat.price}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Promo Code
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter code (optional)"
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:border-red-400"
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal ({selectedSeats.length} seats)</span>
              <span className="font-bold">₹{charges.subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Convenience Fee (5%)</span>
              <span className="font-bold">₹{charges.adminCommission}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">GST (18%)</span>
              <span className="font-bold">₹{charges.gatewayCharge}</span>
            </div>
            <div className="h-px bg-slate-200 my-1" />
            <div className="flex justify-between font-black text-lg">
              <span>Total Payable</span>
              <span className="text-red-600">₹{charges.totalAmount}</span>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100">
          <button
            onClick={() => onConfirm(promoCode)}
            disabled={isProcessing || timeLeft === 0}
            className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-red-500 to-red-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
            ) : timeLeft === 0 ? (
              <><AlertCircle className="h-5 w-5" /> Lock Expired — Go Back</>
            ) : (
              <>Pay ₹{charges.totalAmount} <ChevronRight className="h-5 w-5" /></>
            )}
          </button>
          <p className="text-center text-xs text-slate-400 mt-2">
            Simulated payment · No real charges
          </p>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

const MovieSeatLayout = () => {
  const { showId } = useParams();
  const navigate = useNavigate();

  const [show, setShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [step, setStep] = useState(0);

  // Tracks our own locked seats so we don't auto-evict ourselves!
  const [myLockedSeats, setMyLockedSeats] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [lockExpiresAt, setLockExpiresAt] = useState(null);

  // Clear our local lock state when the timer runs out
  useEffect(() => {
    if (!lockExpiresAt) return;
    const timeRemaining = lockExpiresAt - Date.now();
    if (timeRemaining <= 0) {
      setMyLockedSeats([]);
      return;
    }
    const timeout = setTimeout(() => setMyLockedSeats([]), timeRemaining);
    return () => clearTimeout(timeout);
  }, [lockExpiresAt]);

  // ── INITIAL DATA FETCH ──
  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get(`/movies/shows/${showId}`);
        if (data.success) setShow(data.data);
      } catch {
        toast.error('Failed to load seating arrangement.');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [showId, navigate]);

  // ── REAL-TIME SEAT SYNC & AUTO-EVICTION ──
  const pollRef = useRef(null);
  const syncSeats = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;
    try {
      const { data } = await api.get(`/movies/shows/${showId}`);
      if (!data.success || !data.data) return;
      
      const liveUnavailable = data.data.unavailableSeats || data.data.bookedSeats || [];
      setShow((prev) => prev ? { ...prev, bookedSeats: data.data.bookedSeats, unavailableSeats: liveUnavailable } : prev);
      
      setSelectedSeats((prev) => {
        // Ignore seats that are locked by us!
        const trueUnavailable = liveUnavailable.filter(seat => !myLockedSeats.includes(seat));
        const stolen = prev.filter((s) => trueUnavailable.includes(s));
        
        if (stolen.length > 0) {
          toast.error(`⚠️ ${stolen.join(', ')} just got taken! Removed from your selection.`, { duration: 4000 });
          return prev.filter((s) => !trueUnavailable.includes(s));
        }
        return prev;
      });
    } catch {/* silent */}
  }, [showId, myLockedSeats]);

  useEffect(() => {
    pollRef.current = setInterval(syncSeats, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [syncSeats]);

  const toggleSeat = (seatId) => {
    if (navigator.vibrate) navigator.vibrate(40);
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats((prev) => prev.filter((s) => s !== seatId));
      return;
    }
    if (selectedSeats.length >= MAX_SEATS) {
      toast.error(`Max ${MAX_SEATS} seats per booking.`);
      return;
    }
    setSelectedSeats((prev) => [...prev, seatId]);
  };

  const handleLockAndReview = async () => {
    if (!selectedSeats.length) return toast.error('Select at least one seat');
    setIsLocking(true);
    try {
      const { data } = await api.post('/bookings/lock', {
        itemType: 'Movie',
        showId,
        seats: selectedSeats,
      });
      if (data.success) {
        setLockExpiresAt(Date.now() + LOCK_DURATION_SECONDS * 1000);
        setMyLockedSeats(selectedSeats); // Mark seats as owned by us
        setStep(1);
        setShowModal(true);
        toast.success('Seats held for 5 minutes!');
      }
    } catch (err) {
      setSelectedSeats([]);
    } finally {
      setIsLocking(false);
    }
  };

  const handleConfirmBooking = async (promoCode) => {
    setIsBooking(true);
    try {
      const seatDets = selectedSeats.map((id) => getSeatPricingMeta(show, id));
      const subtotal = seatDets.reduce((s, d) => s + d.price, 0);

      const payload = {
        itemType: 'Movie',
        showId,
        quantity: selectedSeats.length,
        seats: selectedSeats,
        ...(promoCode ? { promoCode } : {}),
      };

      const { data } = await api.post('/bookings', payload);
      if (data.success) {
        setShowModal(false);
        setStep(2);
        toast.success('🎉 Booking confirmed!');
        setTimeout(() => navigate('/my-tickets'), 2000);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Booking failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsBooking(false);
    }
  };

  if (loading || !show) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fffaf5_100%)]">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-red-500" />
        <p className="font-medium text-slate-700 animate-pulse">Loading seating layout...</p>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fffaf5_100%)]">
        <CheckCircle2 className="h-20 w-20 text-green-500 mb-4" />
        <h2 className="text-2xl font-black text-slate-900">Booking Confirmed!</h2>
        <p className="text-slate-500 mt-2">Redirecting to your tickets…</p>
      </div>
    );
  }

  const { screen, basePrice, pricingPreview, unavailableSeats, bookedSeats } = show;
  const dynamicallyUnavailable = unavailableSeats || bookedSeats || [];
  const rows = screen?.layout?.rows || 10;
  const cols = screen?.layout?.cols || 15;
  const seatPartitions = getSeatPartitions(cols, show?.seatRowPartitions || 2);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const selectedSeatDetails = selectedSeats.map((id) => getSeatPricingMeta(show, id));
  const subtotal = selectedSeatDetails.reduce((s, d) => s + d.price, 0);
  const categoryNames = Object.keys(pricingPreview?.categoryPreview || {});
  const capacity = screen?.totalSeats || rows * cols;
  const fillRate = capacity > 0 ? Math.round((dynamicallyUnavailable.length / capacity) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#fffaf5_100%)] text-slate-900">
      {showModal && (
        <PaymentModal
          show={show}
          selectedSeats={selectedSeats}
          seatDetails={selectedSeatDetails}
          lockExpiresAt={lockExpiresAt}
          onClose={() => { setShowModal(false); setStep(0); }}
          onConfirm={handleConfirmBooking}
          isProcessing={isBooking}
        />
      )}

      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-orange-100 bg-white/95 p-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="cursor-pointer rounded-full bg-orange-50 p-2 text-orange-700 transition-colors hover:bg-orange-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900">{show.movie?.title}</h2>
            <p className="text-sm font-medium text-slate-500">
              {show.multiplex?.multiplexName} · {show.date} · {show.startTime}
            </p>
          </div>
        </div>
        <StepIndicator currentStep={step} />
      </div>

      {(show.isSurgeActive || fillRate > 60) && (
        <div className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold ${
          fillRate >= 80 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
        }`}>
          <Zap className="h-3.5 w-3.5 fill-current" />
          {fillRate >= 80
            ? `🔥 Almost full! Only ${capacity - dynamicallyUnavailable.length} seats left`
            : `${fillRate}% filled — prices may increase as seats fill up`}
        </div>
      )}

      <div className="flex flex-1 flex-col items-center overflow-auto p-4 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
          {Object.entries(pricingPreview?.categoryPreview || {}).map(([category, price]) => (
            <div
              key={category}
              className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] ${getCategoryAccentClass(category, categoryNames)}`}
            >
              {category}: ₹{price}
            </div>
          ))}
        </div>

        <div className="inline-block rounded-3xl border border-orange-100 bg-white p-4 md:p-8 shadow-[0_24px_60px_rgba(249,115,22,0.10)] overflow-x-auto">
          {Array.from({ length: rows }).map((_, rIndex) => {
            const rowLabel = alphabet[rIndex % 26];
            const rowCategory = pricingPreview?.seatCategories?.find((item) => item.rowLabel === rowLabel)?.category || 'Standard';
            const rowCategoryPrice = pricingPreview?.categoryPreview?.[rowCategory] || basePrice;

            return (
              <div key={rowLabel} className="mb-2.5 flex items-center justify-center gap-2">
                <div className="w-24 md:w-28 text-right shrink-0">
                  <span className="block text-xs font-bold text-slate-400">{rowLabel}</span>
                  <span className={`mt-0.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${getCategoryAccentClass(rowCategory, categoryNames)}`}>
                    {rowCategory} ₹{rowCategoryPrice}
                  </span>
                </div>

                <div className="flex gap-4 md:gap-6">
                  {seatPartitions.map((partition) => (
                    <div key={`${rowLabel}-${partition.key}`} className="flex gap-1.5 md:gap-2">
                      {Array.from({ length: partition.size }).map((_, seatOffset) => {
                        const seatNumber = partition.startSeat + seatOffset + 1;
                        const seatId = `${rowLabel}${seatNumber}`;
                        const isUnavailable = dynamicallyUnavailable.includes(seatId);
                        const isSelected = selectedSeats.includes(seatId);

                        return (
                          <button
                            key={seatId}
                            disabled={isUnavailable}
                            onClick={() => toggleSeat(seatId)}
                            title={`${getSeatPricingMeta(show, seatId).category} · ₹${getSeatPricingMeta(show, seatId).price}`}
                            className={`h-7 w-7 md:h-8 md:w-8 rounded-t-lg rounded-b-sm text-[9px] md:text-[10px] font-bold transition-all duration-150 ${
                              isUnavailable
                                ? 'cursor-not-allowed border border-slate-200 bg-slate-200 text-slate-400'
                                : isSelected
                                ? 'scale-110 border-none bg-red-500 text-white shadow-lg shadow-red-200'
                                : 'border-2 border-slate-300 bg-white text-slate-500 hover:border-red-400 hover:text-red-500'
                            }`}
                          >
                            {seatNumber}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <span className="w-5 text-center text-xs font-bold text-slate-400 shrink-0">{rowLabel}</span>
              </div>
            );
          })}
        </div>

        <div className="relative mt-10 w-full max-w-3xl text-center">
          <div className="h-8 w-full rounded-t-[50%] border-t-4 border-orange-300 opacity-80 shadow-[0_-20px_40px_rgba(249,115,22,0.10)]" />
          <div className="mt-2 text-xs font-bold uppercase tracking-[0.5em] text-slate-500">All eyes this way</div>
        </div>

        <div className="mt-8 flex justify-center gap-8">
          {[
            { color: 'border-2 border-slate-300 bg-white', label: 'Available' },
            { color: 'bg-red-500 shadow-md', label: 'Selected' },
            { color: 'bg-slate-200 border border-slate-200', label: 'Unavailable' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded-t-sm ${color}`} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedSeats.length > 0 && (
        <div className="z-50 flex animate-in slide-in-from-bottom-10 flex-col items-center justify-between gap-4 border-t border-orange-100 bg-white p-4 md:p-6 text-slate-900 shadow-[0_-10px_40px_rgba(249,115,22,0.10)] md:flex-row">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Selected Seats</p>
            <p className="text-base font-black">{selectedSeats.join(', ')}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {selectedSeatDetails.map((s) => `${s.seatId} (${s.category} ₹${s.price})`).join(', ')}
            </p>
          </div>

          <div className="flex w-full items-center gap-4 md:w-auto">
            <div className="hidden text-right md:block">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Subtotal</p>
              <p className="text-2xl font-black">₹{subtotal}</p>
              <p className="text-[10px] text-slate-400">+ fees at checkout</p>
            </div>

            <button
              onClick={handleLockAndReview}
              disabled={isLocking || selectedSeats.length === 0}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-red-500 to-red-700 px-8 py-4 font-black text-white shadow-xl shadow-red-500/30 transition-all duration-300 hover:shadow-red-500/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
            >
              {isLocking ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Holding Seats...</>
              ) : (
                <>Proceed to Pay <ChevronRight className="h-5 w-5" /></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieSeatLayout;
