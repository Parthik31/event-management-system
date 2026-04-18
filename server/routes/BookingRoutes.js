import express from 'express';
import { 
  createBooking, getMyBookings, verifyBookingPublic,
  getOrganizerBookings, getAllBookingsAdmin, splitTicket, scanAndCheckInTicket, lockSeats
} from '../controllers/BookingController.js';
import { protect, authorize } from '../middleware/Auth.js';

const router = express.Router();

// --- PUBLIC ROUTES ---
// Anyone can scan the QR code to verify
router.get('/verify/:id', verifyBookingPublic);

// --- PROTECTED USER ROUTES ---
router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);
router.post('/:id/split', protect, splitTicket);
router.post('/lock', protect, lockSeats);

// --- ORGANIZER ROUTES ---
// Fetch real transaction data for the organizer's dashboard
router.get('/organizer', protect, authorize('organizer'), getOrganizerBookings);
// Add this line under your existing --- ORGANIZER ROUTES ---
router.post('/scan', protect, authorize('organizer'), scanAndCheckInTicket);

// --- ADMIN ROUTES ---
// Fetch absolute platform totals for the Admin dashboard
router.get('/admin/all', protect, authorize('admin'), getAllBookingsAdmin);

export default router;
