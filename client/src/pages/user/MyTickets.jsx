import React, { useEffect, useState, useCallback } from 'react';
import {
  Download, Share2, Scissors, QrCode, Loader2, X,
  Network, Save, Send, ChevronLeft, ChevronRight, CheckCircle2
} from 'lucide-react';
import api, { resolveMediaUrl } from '../../utils/Axios';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';
import { toast } from 'react-hot-toast';

// ─── HELPERS ────────────────────────────────────────────────────────────────

/**
 * ROOT CAUSE FIX (QR URL):
 * Old code always generated `http://${ip}:5173/verify/${id}`.
 * In Netlify production, port 5173 doesn't exist — all QR codes were dead links.
 *
 * Fix: use window.location.origin in production (HTTPS + correct domain).
 * Only use the saved local network IP on localhost (cross-device dev testing).
 */
const buildVerifyUrl = (ticketId, networkIp) => {
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (isLocalhost && networkIp) {
    return `http://${networkIp}:5173/verify/${ticketId}`;
  }
  return `${window.location.origin}/verify/${ticketId}`;
};

// ─── COMPONENT ──────────────────────────────────────────────────────────────

const MyTickets = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // ── Individual ticket navigation (multi-ticket QR view) ──────────────────
  const [activeSubTicketIndex, setActiveSubTicketIndex] = useState(0);

  // ── Split / share states ─────────────────────────────────────────────────
  const [splitMode, setSplitMode] = useState(false);
  // Per-ticket sharing: which subTicketId is currently being shared
  const [sharingSubTicketId, setSharingSubTicketId] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [isSplitting, setIsSplitting] = useState(false);

  // ── Legacy quantity-based split (for old bookings without individualTickets) ─
  const [legacyTargetEmail, setLegacyTargetEmail] = useState('');
  const [legacySplitQuantity, setLegacySplitQuantity] = useState(1);

  // ── Local network IP (only relevant for localhost dev) ───────────────────
  const autoIp = window.location.hostname !== 'localhost' ? window.location.hostname : '';
  const [networkIp, setNetworkIp] = useState(
    localStorage.getItem('eventbook_ip_v3') ||
    localStorage.getItem('eventbook_ip_v2') ||
    autoIp
  );
  const [tempIp, setTempIp] = useState(autoIp);

  // ── Derived helpers ──────────────────────────────────────────────────────
  const getTicketTitle  = useCallback((b) => b.event?.title || b.movie?.title || b.show?.movie?.title || 'Ticket', []);
  const getTicketImage  = useCallback((b) => b.event?.image || b.movie?.poster || b.show?.movie?.poster || '', []);
  const getTicketDate   = useCallback((b) => b.event?.date || b.show?.date || b.movie?.releaseDate || 'NA', []);
  const getTicketTime   = useCallback((b) => b.event?.time || b.show?.startTime || 'NA', []);

  // ── Open modal ───────────────────────────────────────────────────────────
  const openTicketModal = (booking) => {
    setSelectedTicket(booking);
    setActiveSubTicketIndex(0);
    setSplitMode(false);
    setSharingSubTicketId(null);
    setShareEmail('');
    setLegacyTargetEmail('');
    setLegacySplitQuantity(1);
  };

  // ── Individual ticket data ───────────────────────────────────────────────
  // If booking has individualTickets (new bookings), use those.
  // Old bookings without individualTickets fall back to the single main ticketId.
  const getIndividualTickets = (booking) => {
    if (!booking) return [];
    const ind = booking.individualTickets;
    if (Array.isArray(ind) && ind.length > 0) return ind;
    return []; // old booking — handled by fallback path
  };

  // Which QR value should the current active view show
  const getActiveQrValue = useCallback(() => {
    if (!selectedTicket) return '';
    const individual = getIndividualTickets(selectedTicket);
    const activeId = individual.length > 0
      ? individual[activeSubTicketIndex]?.subTicketId
      : selectedTicket.ticketId;
    return buildVerifyUrl(activeId || selectedTicket.ticketId, networkIp);
  }, [selectedTicket, activeSubTicketIndex, networkIp]);

  const getActiveTicketId = useCallback(() => {
    if (!selectedTicket) return '';
    const individual = getIndividualTickets(selectedTicket);
    return individual.length > 0
      ? individual[activeSubTicketIndex]?.subTicketId || selectedTicket.ticketId
      : selectedTicket.ticketId;
  }, [selectedTicket, activeSubTicketIndex]);

  // ── Fetch bookings ───────────────────────────────────────────────────────
  const fetchBookings = async () => {
    try {
      const { data } = await api.get('/bookings/my');
      if (data.success) setBookings(data.data);
    } catch {
      toast.error('Could not load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  // ── IP save/reset (localhost dev only) ───────────────────────────────────
  const handleSaveIp = () => {
    if (!tempIp.trim()) return toast.error('Please enter a valid IP');
    setNetworkIp(tempIp.trim());
    localStorage.setItem('eventbook_ip_v3', tempIp.trim());
    localStorage.setItem('eventbook_ip_v2', tempIp.trim());
    toast.success('IP Saved! QR Code Generated.');
  };

  const handleResetIp = () => {
    setNetworkIp('');
    localStorage.removeItem('eventbook_ip_v3');
    localStorage.removeItem('eventbook_ip_v2');
    setTempIp('');
  };

  // ────────────────────────────────────────────────────────────────────────────
  // PDF GENERATOR
  // ROOT CAUSE FIX (PDF):
  // Old code used btoa(xml) which fails on mobile/Safari when SVG contains
  // special characters or Unicode. Now uses Blob URL approach which is
  // universally compatible. Also targets the correct QR wrapper by index.
  // ────────────────────────────────────────────────────────────────────────────
  const downloadPDF = async () => {
    const toastId = toast.loading('Generating VIP Ticket...');
    try {
      const ticketWidth = 220;
      const ticketHeight = 80;
      const doc = new jsPDF('l', 'mm', [ticketWidth, ticketHeight]);
      const stubX = 160;

      // Background
      doc.setFillColor(3, 7, 18);
      doc.rect(0, 0, ticketWidth, ticketHeight, 'F');
      doc.setFillColor(249, 115, 22);
      doc.rect(0, 0, 8, ticketHeight, 'F');

      // Header
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('EVENTBOOK VERIFIED', 15, 14);

      // Stub divider
      doc.setDrawColor(55, 65, 81);
      doc.setLineDashPattern([2, 3], 0);
      doc.line(stubX, 5, stubX, ticketHeight - 5);
      doc.setLineDashPattern([], 0);

      // Event title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      const splitTitle = doc.splitTextToSize(getTicketTitle(selectedTicket), 135);
      doc.text(splitTitle, 15, 28);

      const detailStartY = 28 + splitTitle.length * 7;
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.setFont('helvetica', 'normal');
      doc.text(`DATE  :  ${getTicketDate(selectedTicket)}`, 15, detailStartY);
      doc.text(`TIME  :  ${getTicketTime(selectedTicket)}`, 15, detailStartY + 6);

      const venueStr = selectedTicket.itemType === 'Movie'
        ? (selectedTicket.show?.multiplex?.multiplexName || selectedTicket.movie?.title)
        : (selectedTicket.event?.location || 'TBA');

      if (venueStr) {
        const splitLoc = doc.splitTextToSize(`VENUE :  ${venueStr}`, 135);
        doc.text(splitLoc, 15, detailStartY + 14);
      }

      // Admit badge
      doc.setFillColor(31, 41, 55);
      doc.roundedRect(15, ticketHeight - 16, 30, 9, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      // If showing a specific sub-ticket, admit is 1 person
      const admitCount = getIndividualTickets(selectedTicket).length > 0 ? 1 : selectedTicket.quantity;
      doc.text(`ADMIT: ${admitCount}`, 18, ticketHeight - 9.5);

      // ── QR Code embedding (mobile-safe Blob URL approach) ─────────────────
      // Target the currently active QR wrapper in the DOM
      const wrapperId = getIndividualTickets(selectedTicket).length > 0
        ? `qr-wrapper-${activeSubTicketIndex}`
        : 'qr-wrapper-main';
      const wrapper = document.getElementById(wrapperId);
      const svg = wrapper ? wrapper.querySelector('svg') : null;

      if (svg) {
        const xml = new XMLSerializer().serializeToString(svg);

        // Blob URL: works everywhere including iOS Safari (btoa fails on non-ASCII SVG)
        const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        await new Promise((resolve, reject) => {
          const img = new Image();
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          img.onload = () => {
            canvas.width = img.naturalWidth || 140;
            canvas.height = img.naturalHeight || 140;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(svgUrl); // cleanup

            doc.setFillColor(255, 255, 255);
            doc.roundedRect(stubX + 13, 12, 34, 34, 2, 2, 'F');
            doc.addImage(canvas.toDataURL('image/png'), 'PNG', stubX + 15, 14, 30, 30);
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(svgUrl);
            reject(new Error('QR render failed'));
          };
          img.src = svgUrl;
        });
      }

      // Ticket ID on stub
      const pdfTicketId = getActiveTicketId();
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.setFont('helvetica', 'normal');
      doc.text('TICKET ID', stubX + 30, 55, { align: 'center' });
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(pdfTicketId, stubX + 30, 62, { align: 'center' });

      doc.save(`EventBook-${pdfTicketId}.pdf`);
      toast.success('VIP Ticket Downloaded!', { id: toastId });
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('PDF generation failed. Try again.', { id: toastId });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SHARE
  // ────────────────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    const url = getActiveQrValue();
    if (navigator.share) {
      try { await navigator.share({ title: 'Event Ticket', url }); } catch { /* user dismissed */ }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link Copied to clipboard!');
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SPLIT — share a specific individual sub-ticket to someone's account
  // ROOT CAUSE FIX (Split):
  // Old code showed the split button always and had one email + one quantity input.
  // Required: show split only when qty > 1; show individual ticket QRs; allow
  // per-ticket sharing so each person gets their own unique QR.
  // ────────────────────────────────────────────────────────────────────────────
  const handleShareSpecificTicket = async (subTicketId) => {
    if (!shareEmail.trim()) return toast.error("Enter your friend's email.");
    setIsSplitting(true);
    try {
      const { data } = await api.post(`/bookings/${selectedTicket._id}/split`, {
        targetEmail: shareEmail.trim(),
        subTicketId,          // New: transfer exactly this sub-ticket
        splitQuantity: 1      // Always 1 when using per-ticket share
      });

      if (data.success) {
        toast.success(data.message);
        setSharingSubTicketId(null);
        setShareEmail('');

        // Optimistic update: mark sub-ticket as transferred in local state
        setSelectedTicket(prev => ({
          ...prev,
          quantity: prev.quantity - 1,
          individualTickets: prev.individualTickets.map(t =>
            t.subTicketId === subTicketId
              ? { ...t, isTransferred: true, transferredToEmail: shareEmail.trim() }
              : t
          )
        }));
        setBookings(prev => prev.map(b =>
          b._id === selectedTicket._id ? { ...b, quantity: b.quantity - 1 } : b
        ));

        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transfer failed.');
    } finally {
      setIsSplitting(false);
    }
  };

  // Legacy split for old bookings without individualTickets
  const handleLegacySplit = async () => {
    if (!legacyTargetEmail.trim()) return toast.error("Enter your friend's email.");
    const qty = Number(legacySplitQuantity);
    if (qty >= selectedTicket.quantity || qty < 1) return toast.error('Invalid transfer quantity.');
    setIsSplitting(true);
    try {
      const { data } = await api.post(`/bookings/${selectedTicket._id}/split`, {
        targetEmail: legacyTargetEmail.trim(),
        splitQuantity: qty
      });
      if (data.success) {
        toast.success(data.message);
        setSplitMode(false);
        setSelectedTicket(prev => ({ ...prev, quantity: prev.quantity - qty }));
        setBookings(prev => prev.map(b =>
          b._id === selectedTicket._id ? { ...b, quantity: b.quantity - qty } : b
        ));
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transfer failed.');
    } finally {
      setIsSplitting(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Tickets</h1>

        {bookings.length > 0 ? (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div key={booking._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow">
                <div className="w-full md:w-56 h-48 shrink-0 bg-gray-100 relative">
                  <img src={resolveMediaUrl(getTicketImage(booking))} alt={getTicketTitle(booking)} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{getTicketTitle(booking)}</h3>
                    <p className="text-sm text-gray-500">{getTicketDate(booking)} • {getTicketTime(booking)}</p>
                    {booking.isTransferred && (
                      <span className="inline-block mt-2 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Transferred
                      </span>
                    )}
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-gray-50 pt-4">
                    <span className="font-bold text-gray-900">{booking.quantity} Ticket{booking.quantity !== 1 ? 's' : ''}</span>
                    <button
                      onClick={() => openTicketModal(booking)}
                      className="px-5 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" /> View Ticket
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200">
            No tickets found. Book an event to see them here!
          </div>
        )}

        {/* ── TICKET MODAL ────────────────────────────────────────────────── */}
        {selectedTicket && (() => {
          const individual = getIndividualTickets(selectedTicket);
          const hasIndividual = individual.length > 0;
          const safeIndex = Math.min(activeSubTicketIndex, Math.max(0, individual.length - 1));
          const activeSubTicket = hasIndividual ? individual[safeIndex] : null;
          const isOnlyLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
          const needsIpSetup = isOnlyLocalhost && !networkIp;

          // Split button: only show if qty > 1
          const canSplit = selectedTicket.quantity > 1;

          // For split mode: untransferred individual tickets
          const untransferredTickets = hasIndividual
            ? individual.filter(t => !t.isTransferred)
            : [];

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">

                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50 shrink-0">
                  <h3 className="font-bold text-gray-700">Digital Ticket</h3>
                  <button onClick={() => setSelectedTicket(null)} className="cursor-pointer hover:bg-gray-200 p-1 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50">

                  {/* ── IP Setup (localhost dev only) ──────────────────────── */}
                  {needsIpSetup ? (
                    <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl text-center mb-6">
                      <Network className="w-10 h-10 text-orange-500 mx-auto mb-3" />
                      <h3 className="font-bold text-gray-900 mb-2">Network Setup Required</h3>
                      <p className="text-sm text-gray-600 mb-4">Enter your local IP for cross-device QR scanning.</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tempIp}
                          onChange={(e) => setTempIp(e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                        <button onClick={handleSaveIp} className="px-6 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 flex items-center gap-2 cursor-pointer transition-colors">
                          <Save className="w-4 h-4" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col mx-auto w-full max-w-md">

                      {/* ── PREMIUM DIGITAL WALLET CARD ─────────────────────── */}
                      <div className="relative mb-6 overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-2xl">
                        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl"></div>

                        {/* Title + Admits */}
                        <div className="mb-6 flex items-start justify-between border-b border-white/10 pb-6 relative z-10">
                          <div className="pr-4">
                            <div className="mb-2 inline-block rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-400">
                              {selectedTicket.itemType === 'Movie' ? 'Cinema Admission' : 'Event Entry'}
                            </div>
                            <h3 className="text-2xl font-black leading-tight text-white">
                              {getTicketTitle(selectedTicket)}
                            </h3>
                          </div>
                          <div className="shrink-0 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-md border border-white/5">
                            <span className="block text-center text-[10px] font-bold uppercase tracking-widest text-white/50">Admits</span>
                            <span className="block text-center text-3xl font-black text-white">{selectedTicket.quantity}</span>
                          </div>
                        </div>

                        {/* Venue & Timing */}
                        <div className="mb-6 grid grid-cols-2 gap-4 relative z-10">
                          <div>
                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/40">Date & Time</span>
                            <p className="text-sm font-bold text-white">{getTicketDate(selectedTicket)}</p>
                            <p className="text-sm font-medium text-orange-300">{getTicketTime(selectedTicket)}</p>
                          </div>
                          <div>
                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/40">Venue</span>
                            <p className="text-sm font-bold text-white line-clamp-1">
                              {selectedTicket.itemType === 'Movie'
                                ? (selectedTicket.show?.multiplex?.multiplexName || 'Local Cinema')
                                : (selectedTicket.event?.location || 'Venue TBA')}
                            </p>
                          </div>
                        </div>

                        {/* Movie Seat Grid */}
                        {selectedTicket.itemType === 'Movie' && selectedTicket.seats?.length > 0 && (
                          <div className="mb-6 rounded-2xl bg-black/40 p-4 border border-white/5 relative z-10">
                            <span className="mb-3 block text-[10px] font-bold uppercase tracking-wider text-orange-400">Seat Assignments</span>
                            <div className="flex flex-wrap gap-2">
                              {selectedTicket.seats.map((seatId, idx) => {
                                const rowChar = String(seatId).replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase() || '-';
                                const seatNum = String(seatId).replace(/[^0-9]/g, '') || '-';
                                const seatDetail = selectedTicket.seatDetails?.find(s => s.seatId === seatId);
                                const category = seatDetail?.category || selectedTicket.categoryName || 'Standard';
                                return (
                                  <div key={idx} className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                                    <span className="mb-0.5 text-[8px] font-black uppercase tracking-widest text-white/50">{category}</span>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-lg font-black text-orange-400">{rowChar}</span>
                                      <span className="text-lg font-black text-white">{seatNum}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* ── INDIVIDUAL TICKET NAVIGATOR ───────────────────── */}
                        {/* Only shown when booking has multiple individual sub-tickets */}
                        {hasIndividual && individual.length > 1 && !splitMode && (
                          <div className="mb-4 relative z-10">
                            <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2 border border-white/10">
                              <button
                                onClick={() => setActiveSubTicketIndex(Math.max(0, safeIndex - 1))}
                                disabled={safeIndex === 0}
                                className="p-1 rounded-lg hover:bg-white/20 disabled:opacity-30 transition-colors cursor-pointer"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <div className="text-center">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block">Viewing</span>
                                <span className="text-sm font-black text-white">
                                  Ticket {safeIndex + 1} of {individual.length}
                                </span>
                                {activeSubTicket?.isTransferred && (
                                  <span className="block text-[10px] text-orange-400 font-bold">Transferred</span>
                                )}
                                {activeSubTicket?.isCheckedIn && (
                                  <span className="block text-[10px] text-green-400 font-bold">✓ Checked In</span>
                                )}
                              </div>
                              <button
                                onClick={() => setActiveSubTicketIndex(Math.min(individual.length - 1, safeIndex + 1))}
                                disabled={safeIndex === individual.length - 1}
                                className="p-1 rounded-lg hover:bg-white/20 disabled:opacity-30 transition-colors cursor-pointer"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ── QR Code Area ──────────────────────────────────── */}
                        {!splitMode && (
                          <div className="mt-2 flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-white p-6 relative z-10">
                            <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-slate-900"></div>
                            <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-slate-900"></div>

                            {/* QR renders with correct ID for PDF capture */}
                            <div id={hasIndividual ? `qr-wrapper-${safeIndex}` : 'qr-wrapper-main'}>
                              <QRCode
                                value={getActiveQrValue()}
                                size={140}
                                level="H"
                                className="mb-3"
                              />
                            </div>
                            <span className="text-sm font-black tracking-[0.15em] text-slate-900 text-center break-all">
                              {getActiveTicketId()}
                            </span>
                            <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Scan at Entrance</span>
                          </div>
                        )}
                      </div>

                      {/* ── ACTION BUTTONS ─────────────────────────────────── */}
                      <div className="space-y-3">

                        {!splitMode && (
                          <div className="flex gap-3">
                            <button onClick={downloadPDF} className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 cursor-pointer transition-colors">
                              <Download className="w-4 h-4" /> Save PDF
                            </button>
                            <button onClick={handleShare} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 cursor-pointer transition-colors">
                              <Share2 className="w-4 h-4" /> Share
                            </button>
                          </div>
                        )}

                        {/* ── SPLIT TICKET SECTION ─────────────────────────── */}
                        {/* ROOT CAUSE FIX (Split):
                            - Button hidden when quantity === 1 (was always visible before)
                            - New mode shows individual tickets with per-ticket share buttons
                            - Legacy mode (old bookings) shows quantity-based form */}
                        {canSplit && (
                          <div className="mt-4 border-t border-gray-200 pt-4">
                            {!splitMode ? (
                              <button
                                onClick={() => setSplitMode(true)}
                                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-200 py-3 font-bold text-orange-600 transition-all active:scale-[0.98] hover:bg-orange-50"
                              >
                                <Scissors className="h-4 w-4" /> Split & Distribute Tickets
                              </button>
                            ) : (
                              <div className="animate-slide-up rounded-2xl border border-orange-100 bg-orange-50/50 p-4">

                                {/* Split mode header */}
                                <div className="mb-4 flex items-center justify-between">
                                  <h4 className="text-sm font-bold text-slate-900">
                                    {hasIndividual ? 'Share Individual Tickets' : 'Transfer Tickets'}
                                  </h4>
                                  <button onClick={() => { setSplitMode(false); setSharingSubTicketId(null); }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>

                                {/* ── Mode A: Per-ticket sharing (new bookings with individualTickets) */}
                                {hasIndividual ? (
                                  <div className="space-y-3">
                                    <p className="text-xs text-gray-500 font-medium mb-3">
                                      Each ticket has its own unique QR. Share a specific ticket to a friend's EventBook account.
                                    </p>
                                    {individual.map((subTicket, idx) => (
                                      <div key={subTicket.subTicketId} className="bg-white rounded-xl border border-gray-200 p-3">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <span className="text-sm font-bold text-gray-900">Ticket #{idx + 1}</span>
                                            <span className="block text-[10px] font-mono text-gray-400 mt-0.5">
                                              {subTicket.subTicketId}
                                            </span>
                                          </div>
                                          <div>
                                            {subTicket.isTransferred ? (
                                              <div className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                                                <CheckCircle2 className="w-3 h-3" /> Transferred
                                              </div>
                                            ) : subTicket.isCheckedIn ? (
                                              <div className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                                                <CheckCircle2 className="w-3 h-3" /> Used
                                              </div>
                                            ) : sharingSubTicketId === subTicket.subTicketId ? null : (
                                              <button
                                                onClick={() => { setSharingSubTicketId(subTicket.subTicketId); setShareEmail(''); }}
                                                className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                                              >
                                                <Send className="w-3 h-3" /> Share
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {/* Inline email form for this ticket */}
                                        {sharingSubTicketId === subTicket.subTicketId && (
                                          <div className="mt-3 space-y-2">
                                            <input
                                              type="email"
                                              value={shareEmail}
                                              onChange={(e) => setShareEmail(e.target.value)}
                                              placeholder="friend@example.com"
                                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-gray-50"
                                            />
                                            <div className="flex gap-2">
                                              <button
                                                onClick={() => handleShareSpecificTicket(subTicket.subTicketId)}
                                                disabled={isSplitting}
                                                className="flex-1 flex items-center justify-center gap-2 bg-orange-600 text-white text-sm font-bold py-2 rounded-lg cursor-pointer hover:bg-orange-700 disabled:opacity-70 transition-colors"
                                              >
                                                {isSplitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                Transfer
                                              </button>
                                              <button
                                                onClick={() => setSharingSubTicketId(null)}
                                                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer border border-gray-200 rounded-lg"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  /* ── Mode B: Legacy quantity split (old bookings) */
                                  <div className="space-y-3">
                                    <div>
                                      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Friend's Email</label>
                                      <input
                                        type="email"
                                        value={legacyTargetEmail}
                                        onChange={(e) => setLegacyTargetEmail(e.target.value)}
                                        placeholder="friend@example.com"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Tickets to Transfer (Max {selectedTicket.quantity - 1})
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        max={selectedTicket.quantity - 1}
                                        value={legacySplitQuantity}
                                        onChange={(e) => setLegacySplitQuantity(Number(e.target.value))}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                                      />
                                    </div>
                                    <button
                                      onClick={handleLegacySplit}
                                      disabled={isSplitting}
                                      className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 font-bold text-white shadow-md transition-all active:scale-[0.95] hover:bg-orange-700 disabled:opacity-70"
                                    >
                                      {isSplitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                      Transfer Now
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* IP info (localhost only) */}
                        {!splitMode && isOnlyLocalhost && networkIp && (
                          <div className="mt-4 flex flex-col items-center gap-1">
                            <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                              <Network className="w-3 h-3" /> Dev IP: {networkIp}
                            </p>
                            <button onClick={handleResetIp} className="text-[10px] text-gray-400 hover:text-red-500 underline cursor-pointer transition-colors">
                              Change IP Address
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default MyTickets;
