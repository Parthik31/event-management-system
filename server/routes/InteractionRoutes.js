import express from 'express';
import { toggleSavedEvent, getSavedEvents, joinWaitlist } from '../controllers/InteractionController.js';
import { protect } from '../middleware/Auth.js';

const router = express.Router();

router.use(protect); // All interaction routes require login

router.get('/saved', getSavedEvents);
router.post('/save/:eventId', toggleSavedEvent);
router.post('/waitlist/:eventId', joinWaitlist);

export default router;
