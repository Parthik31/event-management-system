import express from 'express';
import { createSupportTicket, getTickets } from '../controllers/SupportController.js';
import { protect, authorize } from '../middleware/Auth.js';

const router = express.Router();

// Create a new support ticket (Requires Login)
router.post('/', protect, createSupportTicket); 

// Get all support tickets (Admin only)
router.get('/', protect, authorize('admin'), getTickets);

export default router;
