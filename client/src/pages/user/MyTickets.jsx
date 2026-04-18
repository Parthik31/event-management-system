import React, { useEffect, useState, useCallback } from 'react';
import { Download, Share2, Scissors, QrCode, Loader2, X, Network, Save, Send } from 'lucide-react';
import api, { resolveMediaUrl } from '../../utils/Axios';
import QRCode from 'react-qr-code'; 
import jsPDF from 'jspdf';
import { toast } from 'react-hot-toast';

const MyTickets = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Split Ticket States (Phase 10)
  const [splitMode, setSplitMode] = useState(false);
  const [targetEmail, setTargetEmail] = useState(''); 
  const [splitQuantity, setSplitQuantity] = useState(1);
  const [isSplitting, setIsSplitting] = useState(false);

  const handleSplitTicket = async () => {
    if (!targetEmail.trim()) return toast.error("Please enter your friend's email.");
    if (splitQuantity >= selectedTicket.quantity || splitQuantity < 1) {
      return toast.error("Invalid transfer quantity.");
    }

    setIsSplitting(true);
    try {
      const { data } = await api.post(`/bookings/${selectedTicket._id}/split`, {
        targetEmail: targetEmail.trim(),
        splitQuantity: Number(splitQuantity)
      });

      if (data.success) {
        toast.success(data.message);
        setSplitMode(false);
        setTargetEmail('');
        setSplitQuantity(1);
        
        // Optimistic UI Update: Reduce the ticket count locally so they see it instantly
        setSelectedTicket(prev => ({ ...prev, quantity: prev.quantity - splitQuantity }));
        setBookings(prev => prev.map(b => b._id === selectedTicket._id ? { ...b, quantity: b.quantity - splitQuantity } : b));
        
        // Haptic Feedback for success
        if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 50, 30]); 
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to split ticket.");
    } finally {
      setIsSplitting(false);
    }
  };
  
  const autoDetectedIp = window.location.hostname !== 'localhost' ? window.location.hostname : '192.168.1.6';
  const [networkIp, setNetworkIp] = useState(
    localStorage.getItem('eventbook_ip_v3') ||
    localStorage.getItem('eventbook_ip_v2') ||
    autoDetectedIp
  );
  const [tempIp, setTempIp] = useState(autoDetectedIp);

  const getTicketTitle = useCallback((booking) => (
    booking.event?.title || booking.movie?.title || booking.show?.movie?.title || 'Ticket'
  ), []);

  const getTicketImage = useCallback((booking) => (
    booking.event?.image || booking.movie?.poster || booking.show?.movie?.poster || ''
  ), []);

  const getTicketDate = useCallback((booking) => (
    booking.event?.date || booking.show?.date || booking.movie?.releaseDate || 'NA'
  ), []);

  const getTicketTime = useCallback((booking) => (
    booking.event?.time || booking.show?.startTime || 'NA'
  ), []);

  const fetchBookings = async () => {
    try {
      const { data } = await api.get('/bookings/my');
      if (data.success) setBookings(data.data);
    } catch {
      toast.error("Could not load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleSaveIp = () => {
    if (!tempIp.trim()) return toast.error("Please enter a valid IP");
    setNetworkIp(tempIp.trim());
    localStorage.setItem('eventbook_ip_v3', tempIp.trim());
    localStorage.setItem('eventbook_ip_v2', tempIp.trim());
    toast.success("IP Saved! QR Code Generated.");
  };

  const handleResetIp = () => {
    setNetworkIp('');
    localStorage.removeItem('eventbook_ip_v3');
    localStorage.removeItem('eventbook_ip_v2');
    setTempIp('');
  };

  // PDF Generator
  const downloadPDF = async () => {
    const toastId = toast.loading("Generating VIP Ticket...");
    try {
      const ticketWidth = 220; const ticketHeight = 80;
      const doc = new jsPDF('l', 'mm', [ticketWidth, ticketHeight]);
      const stubX = 160; 

      doc.setFillColor(3, 7, 18); doc.rect(0, 0, ticketWidth, ticketHeight, 'F');
      doc.setFillColor(249, 115, 22); doc.rect(0, 0, 8, ticketHeight, 'F');

      doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text("EVENTBOOK VERIFIED", 15, 14);

      doc.setDrawColor(55, 65, 81); doc.setLineDashPattern([2, 3], 0); doc.line(stubX, 5, stubX, ticketHeight - 5); doc.setLineDashPattern([], 0);

      doc.setTextColor(255, 255, 255); doc.setFontSize(20);
      const splitTitle = doc.splitTextToSize(getTicketTitle(selectedTicket), 135);
      doc.text(splitTitle, 15, 28);
      
      const detailStartY = 28 + (splitTitle.length * 7);
      doc.setFontSize(10); doc.setTextColor(156, 163, 175); doc.setFont('helvetica', 'normal');
      doc.text(`DATE  :  ${getTicketDate(selectedTicket)}`, 15, detailStartY);
      doc.text(`TIME  :  ${getTicketTime(selectedTicket)}`, 15, detailStartY + 6);
      
      const venueStr = selectedTicket.itemType === 'Movie' 
        ? (selectedTicket.show?.multiplex?.multiplexName || selectedTicket.movie?.title)
        : (selectedTicket.event?.location || 'TBA');

      if (venueStr) {
        const splitLoc = doc.splitTextToSize(`VENUE :  ${venueStr}`, 135);
        doc.text(splitLoc, 15, detailStartY + 14);
      }
      
      doc.setFillColor(31, 41, 55); doc.roundedRect(15, ticketHeight - 16, 30, 9, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text(`ADMIT: ${selectedTicket.quantity}`, 18, ticketHeight - 9.5);

      const wrapper = document.getElementById('qr-wrapper');
      const svg = wrapper ? wrapper.querySelector('svg') : null;
      
      if (svg) {
        const xml = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
        const img = new Image(); const svg64 = btoa(xml); const image64 = 'data:image/svg+xml;base64,' + svg64;

        await new Promise((resolve, reject) => {
          img.onload = () => {
            canvas.width = img.width; canvas.height = img.height;
            ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); resolve();
          };
          img.onerror = reject; img.src = image64;
        });
        
        doc.setFillColor(255, 255, 255); doc.roundedRect(stubX + 13, 12, 34, 34, 2, 2, 'F');
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', stubX + 15, 14, 30, 30);
      }
      
      doc.setFontSize(8); doc.setTextColor(156, 163, 175); doc.setFont('helvetica', 'normal'); doc.text('TICKET ID', stubX + 30, 55, { align: 'center' });
      doc.setFontSize(11); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.text(selectedTicket.ticketId, stubX + 30, 61, { align: 'center' });
      
      doc.save(`EventBook-${selectedTicket.ticketId}.pdf`);
      toast.success("VIP Ticket Downloaded!", { id: toastId });
    } catch {
      toast.error("PDF generation failed", { id: toastId });
    }
  };

  const getQrValue = useCallback((ticketId) => {
    const targetHost = networkIp || window.location.hostname;
    return `http://${targetHost}:5173/verify/${ticketId}`;
  }, [networkIp]);

  const handleShare = async () => {
    const url = getQrValue(selectedTicket.ticketId);
    if (navigator.share) {
      try { await navigator.share({ title: 'Event Ticket', url }); } catch (e) { console.error('Share failed', e); }
    } else {
      navigator.clipboard.writeText(url); toast.success("Link Copied to clipboard!");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-8 h-8" /></div>;

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
                    {booking.isTransferred && <span className="inline-block mt-2 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Transferred to {booking.guestEmail || 'Friend'}</span>}
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-gray-50 pt-4">
                    <span className="font-bold text-gray-900">{booking.quantity} Tickets</span>
                    <button 
                      onClick={() => { setSelectedTicket(booking); setSplitMode(false); setTargetEmail(''); setSplitQuantity(1); }}
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

        {/* --- TICKET MODAL --- */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
              
              <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50 shrink-0">
                <h3 className="font-bold text-gray-700">Digital Ticket</h3>
                <button onClick={() => setSelectedTicket(null)} className="cursor-pointer hover:bg-gray-200 p-1 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50">

                {!networkIp ? (
                  <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl text-center mb-6">
                    <Network className="w-10 h-10 text-orange-500 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-900 mb-2">Network Setup Required</h3>
                    <p className="text-sm text-gray-600 mb-4">Please confirm your IP Address for QR generation.</p>
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

                    {/* --- PHASE 11: PREMIUM DIGITAL WALLET PASS --- */}
                    <div className="relative mb-6 overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-2xl">
                      {/* Background Glow */}
                      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl"></div>
                      
                      {/* 1. Header: Title & Total Tickets */}
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

                      {/* 2. Venue & Timing Details */}
                      <div className="mb-6 grid grid-cols-2 gap-4 relative z-10">
                        <div>
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/40">Date & Time</span>
                          <p className="text-sm font-bold text-white">
                            {getTicketDate(selectedTicket)}
                          </p>
                          <p className="text-sm font-medium text-orange-300">
                            {getTicketTime(selectedTicket)}
                          </p>
                        </div>
                        <div>
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/40">Venue</span>
                          <p className="text-sm font-bold text-white line-clamp-1">
                            {selectedTicket.itemType === 'Movie' 
                              ? (selectedTicket.show?.multiplex?.multiplexName || selectedTicket.show?.multiplex?.name || 'Local Cinema') 
                              : (selectedTicket.event?.location || 'Venue TBA')}
                          </p>
                          {selectedTicket.itemType === 'Movie' && selectedTicket.show?.screen && (
                            <p className="text-sm font-medium text-white/60">
                              Screen {selectedTicket.show.screen.name || selectedTicket.show.screen.screenNumber || '1'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 3. Movie Seat Details Grid */}
                      {selectedTicket.itemType === 'Movie' && selectedTicket.seats && selectedTicket.seats.length > 0 && (
                        <div className="mb-6 rounded-2xl bg-black/40 p-4 border border-white/5 relative z-10">
                          <span className="mb-3 block text-[10px] font-bold uppercase tracking-wider text-orange-400">Seat Assignments</span>
                          <div className="flex flex-wrap gap-2">
                            {selectedTicket.seats.map((seatId, idx) => {
                              // Extract Row Character (A) and Seat Number (12)
                              const rowChar = String(seatId).replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase() || '-';
                              const seatNum = String(seatId).replace(/[^0-9]/g, '') || '-';
                              
                              // Find category 
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

                      {/* 4. The Inverted QR Code Area */}
                      <div className="mt-2 flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-white p-6 relative z-10">
                        {/* Ticket cutout notches */}
                        <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-slate-900"></div>
                        <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-slate-900"></div>
                        
                        <div id="qr-wrapper">
                          <QRCode 
                            value={getQrValue(selectedTicket.ticketId)} 
                            size={140} 
                            level="H"
                            className="mb-3"
                          />
                        </div>
                        <span className="text-sm font-black tracking-[0.2em] text-slate-900">{selectedTicket.ticketId}</span>
                        <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Scan at Entrance</span>
                      </div>
                    </div>

                    {/* --- Action Buttons (PDF, Share, Split) --- */}
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

                      {/* --- PHASE 10: INTERACTIVE SPLIT WIDGET --- */}
                      {selectedTicket.quantity > 1 && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          {!splitMode ? (
                            <button 
                              onClick={() => setSplitMode(true)} 
                              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-200 py-3 font-bold text-orange-600 transition-all active:scale-[0.98] hover:bg-orange-50"
                            >
                              <Scissors className="h-4 w-4" /> Split & Distribute Tickets
                            </button>
                          ) : (
                            <div className="animate-slide-up space-y-3 rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <h4 className="text-sm font-bold text-slate-900">Transfer Tickets</h4>
                                <button onClick={() => setSplitMode(false)} className="text-slate-400 transition-colors hover:text-slate-600 cursor-pointer">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              
                              <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Friend's Email</label>
                                <input 
                                  type="email" 
                                  value={targetEmail}
                                  onChange={(e) => setTargetEmail(e.target.value)}
                                  placeholder="friend@example.com"
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                                />
                              </div>
                              
                              <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Tickets to Transfer (Max {selectedTicket.quantity - 1})</label>
                                <input 
                                  type="number" 
                                  min="1" 
                                  max={selectedTicket.quantity - 1}
                                  value={splitQuantity}
                                  onChange={(e) => setSplitQuantity(e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                                />
                              </div>

                              <button 
                                onClick={handleSplitTicket}
                                disabled={isSplitting}
                                className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 font-bold text-white shadow-md shadow-orange-500/30 transition-all active:scale-[0.95] hover:bg-orange-700 disabled:opacity-70 disabled:cursor-not-allowed"
                              >
                                {isSplitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Transfer Now
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {!splitMode && (
                        <div className="mt-4 flex flex-col items-center gap-1">
                          <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                            <Network className="w-3 h-3" /> Connected: {networkIp}
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
        )}
      </div>
    </div>
  );
};

export default MyTickets;
