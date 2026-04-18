import express from 'express';
import { getAdminFinanceStats, getOrganizerDashboardStats, getOrganizerFinanceStats } from '../controllers/FinanceController.js';
import { protect, authorize } from '../middleware/Auth.js';

const router = express.Router();

router.use(protect);

// Admin Route: Get platform-wide earnings
router.get('/admin/stats', authorize('admin'), getAdminFinanceStats);

// Organizer Route: Get individual earnings
router.get('/organizer/stats', authorize('organizer'), getOrganizerFinanceStats);
router.get('/organizer/dashboard', authorize('organizer'), getOrganizerDashboardStats);
router.get('/organizer/:type/stats', authorize('organizer'), getOrganizerFinanceStats);
router.get('/organizer/:type/dashboard', authorize('organizer'), getOrganizerDashboardStats);

export default router;
