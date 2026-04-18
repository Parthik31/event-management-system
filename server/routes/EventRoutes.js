import express from 'express';
import { 
  createEvent, getEvents, getEvent, getEventForManagement, updateEvent, updateEventStatus,
  getMyEvents, getOrganizerStats, searchEvents, getRecommendedEvents 
} from '../controllers/EventController.js';
import { protect, authorize } from '../middleware/Auth.js';

// 🚀 ADDED THIS IMPORT:
import reviewRouter from './ReviewRoutes.js'; 

const router = express.Router();

// --- NESTED ROUTER FOR REVIEWS ---
// This forwards any requests matching /events/:eventId/reviews to the ReviewRoutes
router.use('/:eventId/reviews', reviewRouter);

// --- PUBLIC ROUTES ---
router.get('/admin/list', protect, authorize('admin'), getEvents);
router.route('/').get(getEvents);
router.get('/search', searchEvents); // Search MUST precede /:id parameter
router.get('/recommended', getRecommendedEvents);

// --- ORGANIZER ROUTES ---
router.get('/organizer/my', protect, authorize('organizer'), getMyEvents);
router.get('/organizer/manage/:id', protect, authorize('organizer', 'admin'), getEventForManagement);
router.get('/organizer/stats', protect, authorize('organizer'), getOrganizerStats);
router.post('/', protect, authorize('organizer'), createEvent);
router.put('/:id', protect, authorize('organizer'), updateEvent);

// --- ADMIN ROUTES ---
router.put('/:id/status', protect, authorize('admin'), updateEventStatus);

// --- SINGLE EVENT ROUTE (Public) ---
// Kept at the bottom so it doesn't intercept /search or /organizer
router.get('/:id', getEvent);

export default router;
