import express from 'express';
import { getNotifications, markAsRead } from '../controllers/NotificationController.js';
import { protect } from '../middleware/Auth.js';

const router = express.Router();

router.use(protect); // All notification routes require login

router.get('/', getNotifications);

// FIX: Split the optional parameter into two separate explicit routes
router.put('/read', markAsRead);        // Mark all as read
router.put('/read/:id', markAsRead);    // Mark specific as read

export default router;
