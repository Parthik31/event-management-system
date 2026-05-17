import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../../utils/Axios';
import { CheckCircle, XCircle, Ticket, Loader2, Calendar, MapPin, User, Hash, Film } from 'lucide-react';

const VerifyTicket = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const seat = searchParams.get('seat');

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [scannedSubTicketId, setScannedSubTicketId] = useState(null);
  const [subTicketCheckedIn, setSubTicketCheckedIn] = useState(false);

  useEffect(() => {
    const verifyTicket = async () => {
      try {
        const res = await api.get(`/bookings/verify/${id}`);
        
        if (res.data.success) {
          setTicket(res.data.data);
          setScannedSubTicketId(res.data.scannedSubTicketId || null);
          setSubTicketCheckedIn(res.data.subTicketCheckedIn || false);
        } else {
          setInvalid(true);
        }
      } catch (error) {
        setInvalid(true);
        if (error.message === 'Network Error') {
           setErrorMsg('Cannot reach the server. Please check your internet connection.');
        } else {
           setErrorMsg(error.response?.data?.message || 'Verification Failed. Invalid Ticket.');
        }
      } finally {
        setLoading(false);
      }
    };
    verifyTicket();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium tracking-wide">Verifying secure ticket...</p>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Invalid Ticket</h2>
          <p className="text-red-500 font-medium mb-8">{errorMsg}</p>
          <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500 font-mono break-all">
            Scanned ID: {id}
          </div>
        </div>
      </div>
    );
  }

  const { user, quantity, ticketId, itemType, event, movie, show } = ticket;
  const isMovieTicket = itemType === 'Movie' || (!event && (movie || show));

  const displayTitle  = isMovieTicket
    ? (movie?.title || show?.movie?.title || 'Movie Ticket')
    : (event?.title || 'Event Ticket');

  const displayDate   = isMovieTicket
    ? (show?.date ? new Date(show.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A')
    : (event?.date || 'N/A');

  const displayTime   = isMovieTicket
    ? (show?.startTime || 'N/A')
    : (event?.time || 'N/A');

  const displayVenue  = isMovieTicket
    ? (show?.multiplex?.multiplexName || show?.multiplex?.name || 'Cinema Hall')
    : (event?.location || 'N/A');

  const subTickets = ticket.individualTickets || [];
  const scannedSubTicket = scannedSubTicketId
    ? subTickets.find(t => t.subTicketId === scannedSubTicketId)
    : null;
  const subTicketNumber = scannedSubTicket
    ? subTickets.indexOf(scannedSubTicket) + 1
    : null;

  const displayTicketId = scannedSubTicketId || ticketId;
  const displayQuantity = scannedSubTicketId ? 1 : quantity;

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 py-8 font-sans">
      <div className="max-w-sm w-full relative">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10 bg-green-500 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-green-500/30">
          <CheckCircle className="w-5 h-5" /> VERIFIED
        </div>
        <div className="bg-white rounded-4xl overflow-hidden shadow-2xl">
          <div className="bg-orange-500 p-8 pt-10 text-center text-white relative">
            {isMovieTicket ? <Film className="w-12 h-12 mx-auto mb-3 opacity-90" /> : <Ticket className="w-12 h-12 mx-auto mb-3 opacity-90" />}
            <h2 className="text-2xl font-black leading-tight mb-1">{displayTitle}</h2>
            
            {subTicketNumber && (
              <p className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm font-bold mt-2">
                Ticket {subTicketNumber} of {subTickets.length}
              </p>
            )}
            {seat && !subTicketNumber && (
              <p className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm font-bold mt-2">
                Seat / Entry #{seat}
              </p>
            )}

            <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-gray-900 rounded-full"></div>
            <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-gray-900 rounded-full"></div>
          </div>
          <div className="border-b-2 border-dashed border-gray-200 mx-8"></div>
          <div className="p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Date & Time</p>
                <p className="font-bold text-gray-900">{displayDate} at {displayTime}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Venue</p>
                <p className="font-bold text-gray-900">{displayVenue}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Purchased By</p>
                <p className="font-bold text-gray-900">{user?.name || 'Guest'}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex justify-between items-center mt-4">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Hash className="w-3 h-3"/> Ticket ID
                </p>
                <p className="font-mono font-bold text-gray-900 text-sm break-all">{displayTicketId}</p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Admit</p>
                <p className="font-black text-xl text-orange-600">{displayQuantity}</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-gray-500 text-xs mt-6 font-medium">Powered by EventBook Validation System</p>
      </div>
    </div>
  );
};

export default VerifyTicket;
