import React, { useEffect, useState, useCallback } from 'react';
import {
  Download, Share2, Scissors, QrCode, Loader2, X, Send, CheckCircle2, Copy, ChevronLeft, ChevronRight
} from 'lucide-react';
import api, { resolveMediaUrl } from '../../utils/Axios';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';
import { toast } from 'react-hot-toast';

// ─── HELPERS ────────────────────────────────────────────────────────────────

// Always use the real origin — works correctly on both localhost and production.
const buildVerifyUrl = (ticketId) =>
  `${window.location.origin}/verify/${ticketId || ''}`;

// ─── COMPONENT ──────────────────────────────────────────────────────────────

const MyTickets = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // ── Split / share states ─────────────────────────────────────────────────
  const [splitMode, setSplitMode] = useState(false);
  const [sharingSubTicketId, setSharingSubTicketId] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [isSplitting, setIsSplitting] = useState(false);

  // ── Derived helpers ──────────────────────────────────────────────────────
  const getTicketTitle  = useCallback((b) => b.event?.title || b.movie?.title || b.show?.movie?.title || 'Ticket', []);
  const getTicketImage  = useCallback((b) => b.event?.image || b.movie?.poster || b.show?.movie?.poster || '', []);
  const getTicketDate   = useCallback((b) => b.event?.date || b.show?.date || b.movie?.releaseDate || 'NA', []);
  const getTicketTime   = useCallback((b) => b.event?.time || b.show?.startTime || 'NA', []);

  // ── Open modal ───────────────────────────────────────────────────────────
  const openTicketModal = (booking) => {
    setSelectedTicket(booking);
    setSplitMode(false);
    setSharingSubTicketId(null);
    setShareEmail('');
  };

  // ── Individual ticket data (Bulletproof Fallbacks) ───────────────────────
  const getIndividualTickets = (booking) => {
    if (!booking) return [];
    
    if (Array.isArray(booking.individualTickets) && booking.individualTickets.length > 0) {
      return booking.individualTickets.filter(t => t && t.subTicketId);
    }
    
    if (booking.quantity > 1) {
      return Array.from({ length: booking.quantity }, (_, i) => ({
        subTicketId: `${booking.ticketId || 'TKT'}-SPLIT-${i + 1}`,
        isCheckedIn: Boolean(booking.isCheckedIn),
        isTransferred: Boolean(booking.isTransferred)
      }));
    }
    return []; 
  };

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

  // ────────────────────────────────────────────────────────────────────────────
  // PDF GENERATOR (MOBILE SAFE)
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
      doc.text(`ADMIT: ${selectedTicket.quantity}`, 18, ticketHeight - 9.5);

      // QR Code embedding (Always uses the main group QR)
      const wrapper = document.getElementById('qr-wrapper-main');
      const svg = wrapper ? wrapper.querySelector('svg') : null;

      if (svg) {
        let xml = new XMLSerializer().serializeToString(svg);
        if (!xml.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
          xml = xml.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }

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
            URL.revokeObjectURL(svgUrl); 

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

      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.setFont('helvetica', 'normal');
      doc.text('TICKET ID', stubX + 30, 55, { align: 'center' });
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(selectedTicket.ticketId || 'TKT', stubX + 30, 62, { align: 'center' });

      // MOBILE FIX: Use a secure Blob download instead of base64
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `EventBook-${selectedTicket.ticketId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);

      toast.success('VIP Ticket Downloaded!', { id: toastId });
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('PDF generation failed. Try again.', { id: toastId });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SHARE LINKS
  // ────────────────────────────────────────────────────────────────────────────
  
  const handleShareMain = async () => {
    const url = buildVerifyUrl(selectedTicket?.ticketId);
    if (navigator.share) {
      try { await navigator.share({ title: 'Event Ticket', url }); } catch { /* user dismissed */ }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Ticket Link Copied!');
    }
  };

  const shareSubTicketLink = async (subTicketId) => {
    const url = buildVerifyUrl(subTicketId);
    if (navigator.share) {
      try { await navigator.share({ title: 'Your Event Ticket', url }); } catch { /* user dismissed */ }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link Copied to clipboard!');
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // SPLIT — Email exactly one specific individual sub-ticket
  // ────────────────────────────────────────────────────────────────────────────
  const handleShareSpecificTicket = async (subTicketId) => {
    if (String(subTicketId).includes('-SPLIT-')) {
      return toast.error("This is a legacy booking. Please make a new booking to use individual ticket splitting.");
    }
    if (!shareEmail.trim()) return toast.error("Enter your friend's email.");
    
    setIsSplitting(true);
    try {
      const { data } = await api.post(`/bookings/${selectedTicket._id}/split`, {
        targetEmail: shareEmail.trim(),
        subTicketId: String(subTicketId)
      });

      if (data.success) {
        toast.success(data.message);
        setSharingSubTicketId(null);
        setShareEmail('');

        // Update local UI immediately
        setSelectedTicket(prev => ({
          ...prev,
          quantity: Math.max(1, prev.quantity - 1),
          individualTickets: prev.individualTickets.map(t =>
            t.subTicketId === subTicketId
              ? { ...t, isTransferred: true, transferredToEmail: shareEmail.trim() }
              : t
          )
        }));
        setBookings(prev => prev.map(b =>
          b._id === selectedTicket._id ? { ...b, quantity: Math.max(1, b.quantity - 1) } : b
        ));

        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transfer failed.');
    } finally {
      setIsSplitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex items-baseline mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
        </div>

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
          // Wrap everything in safe derivation to prevent crashing
          const individual = getIndividualTickets(selectedTicket);
          const hasIndividual = individual.length > 0;
          const canSplit = selectedTicket.quantity > 1;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">

                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50 shrink-0">
                  <h3 className="font-bold text-gray-700">Digital Ticket</h3>
                  <button onClick={() => setSelectedTicket(null)} className="cursor-pointer hover:bg-gray-200 p-1 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50">
                  <div className="flex flex-col mx-auto w-full max-w-md">

                    {/* ── VIEW A: MULTIPLE DIVIDED QRs (SPLIT MODE) ────────── */}
                    {splitMode ? (
                      <div className="animate-fade-in">
                        <div className="mb-6 flex items-center justify-between">
                          <h4 className="text-lg font-black text-slate-900">Distribute Tickets</h4>
                          <button onClick={() => { setSplitMode(false); setSharingSubTicketId(null); }} className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer">
                            <ChevronLeft className="w-4 h-4"/> Back
                          </button>
                        </div>
                        
                        <p className="text-sm text-gray-500 font-medium mb-4">
                          Your order has been split. Each ticket below has a unique QR code. You can share a direct link or transfer ownership via email.
                        </p>

                        <div className="space-y-4">
                          {/* Defensive rendering: only render valid elements */}
                          {individual.filter(t => t && t.subTicketId).map((subTicket, idx) => (
                            <div key={subTicket.subTicketId} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center sm:items-start relative overflow-hidden">
                              
                              {/* Unique Small QR Code for this specific ticket */}
                              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 shrink-0 relative">
                                <QRCode value={buildVerifyUrl(String(subTicket.subTicketId))} size={90} level="H" />
                              </div>

                              <div className="flex-1 w-full text-center sm:text-left">
                                <h5 className="font-black text-gray-900 text-lg">Ticket #{idx + 1}</h5>
                                <p className="text-xs text-gray-400 font-mono mb-3 bg-gray-50 inline-block px-2 py-0.5 rounded border border-gray-100 break-all">
                                  {subTicket.subTicketId}
                                </p>

                                {/* States: Transferred / Used / Share Actions */}
                                {subTicket.isTransferred ? (
                                  <div className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg w-full sm:w-auto justify-center">
                                    <CheckCircle2 className="w-4 h-4" /> Transferred
                                  </div>
                                ) : subTicket.isCheckedIn ? (
                                  <div className="inline-flex items-center gap-1.5 text-sm font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg w-full sm:w-auto justify-center">
                                    <CheckCircle2 className="w-4 h-4" /> Used at Entry
                                  </div>
                                ) : sharingSubTicketId === subTicket.subTicketId ? (
                                  <div className="mt-1 space-y-2 animate-fade-in w-full">
                                    <input
                                      type="email"
                                      value={shareEmail}
                                      onChange={(e) => setShareEmail(e.target.value)}
                                      placeholder="Friend's Email Address"
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                                    />
                                    <div className="flex gap-2">
                                      <button onClick={() => handleShareSpecificTicket(subTicket.subTicketId)} disabled={isSplitting} className="flex-1 bg-orange-600 text-white text-xs font-bold py-2 rounded-lg cursor-pointer hover:bg-orange-700 disabled:opacity-70 flex items-center justify-center gap-1">
                                        {isSplitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Transfer
                                      </button>
                                      <button onClick={() => setSharingSubTicketId(null)} className="px-3 py-2 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 cursor-pointer rounded-lg">
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex gap-2 w-full mt-1">
                                    <button onClick={() => shareSubTicketLink(subTicket.subTicketId)} className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 font-bold py-2 px-3 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors text-xs">
                                      <Copy className="w-3 h-3"/> Link
                                    </button>
                                    <button onClick={() => { setSharingSubTicketId(subTicket.subTicketId); setShareEmail(''); }} className="flex-1 flex items-center justify-center gap-1.5 bg-orange-50 text-orange-600 font-bold py-2 px-3 rounded-lg hover:bg-orange-100 cursor-pointer transition-colors text-xs">
                                      <Send className="w-3 h-3"/> Email
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (

                      /* ── VIEW B: SINGLE MASTER QR (NORMAL MODE) ─────────────── */
                      <div className="animate-fade-in">
                        <div className="relative mb-6 overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-2xl">
                          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl"></div>

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

                          <div className="mt-2 flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-white p-6 relative z-10">
                            <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-slate-900"></div>
                            <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-slate-900"></div>

                            {selectedTicket.isCheckedIn && (
                               <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                                 <CheckCircle2 className="w-3 h-3" /> Checked In
                               </div>
                            )}

                            <div id="qr-wrapper-main">
                              {/* Defensive string conversion to prevent react-qr-code crash */}
                              <QRCode value={buildVerifyUrl(String(selectedTicket.ticketId || ''))} size={140} level="H" className="mb-3" />
                            </div>
                            <span className="text-sm font-black tracking-[0.15em] text-slate-900 text-center break-all">
                              {selectedTicket.ticketId}
                            </span>
                            <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Master Scan at Entrance</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <button onClick={downloadPDF} className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 cursor-pointer transition-colors">
                              <Download className="w-4 h-4" /> Save PDF
                            </button>
                            <button onClick={handleShareMain} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 cursor-pointer transition-colors shadow-md shadow-blue-600/20">
                              <Share2 className="w-4 h-4" /> Share Link
                            </button>
                          </div>

                          {canSplit && hasIndividual && (
                            <div className="pt-2">
                              <button
                                onClick={() => setSplitMode(true)}
                                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-300 py-3 font-bold text-orange-600 transition-all active:scale-[0.98] hover:bg-orange-50 bg-white shadow-sm"
                              >
                                <Scissors className="h-4 w-4" /> Split & Distribute Tickets
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
