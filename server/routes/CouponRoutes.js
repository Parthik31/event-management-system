import express from 'express';
import { 
  createCoupon, 
  getOrganizerCoupons, 
  validateCoupon, 
  getEventCoupons // 🚀 NEW IMPORT
} from '../controllers/CouponController.js';
import { protect, authorize } from '../middleware/Auth.js';

const router = express.Router();

// --- PUBLIC ROUTES ---
// 🚀 NEW: Fetch available coupons for a specific event
router.get('/event/:eventId', getEventCoupons); 

// --- USER ROUTES ---
router.post('/validate', protect, validateCoupon); 

// --- ORGANIZER ROUTES ---
router.post('/', protect, authorize('organizer'), createCoupon); 
router.get('/organizer', protect, authorize('organizer'), getOrganizerCoupons); 

export default router;
