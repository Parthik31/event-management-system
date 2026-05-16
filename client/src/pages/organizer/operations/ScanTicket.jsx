// filepath: /frontend/src/pages/organizer/ScanTicket.jsx
import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../../../utils/Axios';
import { CheckCircle2, XCircle, Loader2, QrCode, ArrowLeft, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';

const ScanTicket = () => {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Force dark mode context for the scanner to ensure the background blends well
    document.documentElement.classList.add('dark');
    
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: { width: 250, height: 250 },
      fps: 10,
    });

    scanner.render(success, errorCallback);

    function success(decodedText) {
      // Pause scanner while validating with backend
      scanner.pause(true);

      // BUG-01 FIX: QR codes encode a full URL like:
      //   http://192.168.1.6:5173/verify/TKT-ABCD-1234
      // Extract just the ticket ID from the path segment.
      // If the scanned text is already a plain ticket ID (no '/'), use it as-is.
      let ticketId = decodedText.trim();
      if (ticketId.includes('/verify/')) {
        ticketId = ticketId.split('/verify/').pop().split('?')[0].trim();
      }

      handleScan(ticketId, scanner);
    }

    function errorCallback() {
      // Ignore routine scan errors (when it doesn't see a QR code)
    }

    // Cleanup on unmount
    return () => {
      document.documentElement.classList.remove('dark'); // Restore original theme on exit
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, []);

  const handleScan = async (ticketId, scannerInstance) => {
    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      // Verify with backend
      const res = await api.post('/bookings/scan', { ticketId });
      
      if (res.data.success) {
        setScanResult(res.data);
      }
    } catch (err) {
      setError({
        message: err.response?.data?.message || 'Invalid Ticket or Server Error',
        details: err.response?.data?.checkInTime 
          ? `Already checked in at ${new Date(err.response.data.checkInTime).toLocaleTimeString()}`
          : 'Please check with the box office.'
      });
    } finally {
      setLoading(false);
      // Auto-resume scanner after 3 seconds for continuous entry management
      setTimeout(() => {
        setScanResult(null);
        setError(null);
        if (scannerInstance.getState() === 2) { // 2 = paused
           scannerInstance.resume();
        }
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans relative overflow-hidden">
      
      {/* Immersive Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-150 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Top Navbar */}
      <div className="relative z-10 flex items-center justify-between p-4 md:p-6 border-b border-gray-800 bg-gray-950/50 backdrop-blur-md">
        <Link to="/organizer/dashboard" className="p-2 bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors border border-gray-800">
          <ArrowLeft className="w-6 h-6 text-gray-300" />
        </Link>
        <div className="flex items-center gap-2">
          <QrCode className="w-6 h-6 text-emerald-500" />
          <h1 className="text-xl font-black tracking-widest uppercase">Entry Portal</h1>
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* Main Scanner Container */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        
        <div className="w-full max-w-md relative">
          
          {/* Target Overlay (Styling the generic scanner box) */}
          <div className="relative bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl p-2">
            
            {/* The actual HTML5 Scanner div */}
            <div id="reader" className="w-full rounded-2xl overflow-hidden [&_video]:object-cover [&_video]:rounded-2xl"></div>
            
            {/* Scanning Overlay State */}
            {loading && (
              <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                <p className="font-bold text-gray-300 tracking-widest uppercase animate-pulse">Verifying Database...</p>
              </div>
            )}
          </div>

          {/* Results Feedback Panel (Pops up below scanner) */}
          <div className="mt-6 h-40">
            {scanResult && !loading && (
              <div className="bg-emerald-500/10 border border-emerald-500/50 rounded-2xl p-6 text-center shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] animate-in slide-in-from-bottom-4">
                <div className="flex justify-center items-center gap-2 mb-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <h2 className="text-2xl font-black text-emerald-400 tracking-wider">ACCESS GRANTED</h2>
                </div>
                <p className="text-white font-bold text-lg">{scanResult.data?.guestName || 'Valid Ticket'}</p>
                <div className="flex justify-center items-center gap-4 mt-3">
                  <span className="bg-gray-900 px-4 py-1.5 rounded-lg text-sm font-bold border border-gray-800 flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-gray-400" /> {scanResult.data?.quantity || 1} Admit
                  </span>
                  <span className="bg-gray-900 px-4 py-1.5 rounded-lg text-sm font-bold border border-gray-800 text-emerald-400">
                    {scanResult.data?.category || 'General'}
                  </span>
                </div>
                {scanResult.data?.seats && scanResult.data.seats.length > 0 && (
                  <p className="mt-3 text-sm font-bold text-emerald-200 bg-emerald-900/50 inline-block px-3 py-1 rounded-md">
                    Seats: {scanResult.data.seats.join(', ')}
                  </p>
                )}
              </div>
            )}

            {error && !loading && (
              <div className="bg-rose-500/10 border border-rose-500/50 rounded-2xl p-6 text-center shadow-[0_0_30px_-5px_rgba(225,29,72,0.3)] animate-in slide-in-from-bottom-4">
                <div className="flex justify-center items-center gap-2 mb-2">
                  <XCircle className="w-8 h-8 text-rose-500" />
                  <h2 className="text-2xl font-black text-rose-500 tracking-wider">ACCESS DENIED</h2>
                </div>
                <p className="text-white font-bold mb-1">{error.message}</p>
                {error.details && <p className="text-rose-400 text-sm font-medium bg-rose-950/50 inline-block px-3 py-1 rounded-md mt-2">{error.details}</p>}
              </div>
            )}

            {!scanResult && !error && !loading && (
              <div className="text-center opacity-50">
                <QrCode className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm font-medium tracking-widest uppercase">Point camera at QR code to check-in</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ScanTicket;
