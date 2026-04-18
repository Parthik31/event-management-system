import express from 'express';
// 🚀 Update the import to include replyToReview
import { createReview, getEventReviews, replyToReview } from '../controllers/ReviewController.js';
import { protect, authorize } from '../middleware/Auth.js';

const router = express.Router({ mergeParams: true });

router.route('/')
  .get(getEventReviews)
  .post(protect, createReview);

// 🚀 NEW ROUTE for replying
router.route('/:id/reply')
  .put(protect, authorize('organizer'), replyToReview);

export default router;
