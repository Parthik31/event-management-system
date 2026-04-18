import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Event from '../models/Event.js';

// @desc    Add a Review
// @route   POST /api/v1/events/:eventId/reviews
// @access  Private (Only attendees)
export const createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const eventId = req.params.eventId;
    const userId = req.user.id;

    // 1. Verify the user actually bought a ticket for this event
    const hasBooked = await Booking.findOne({ 
      event: eventId, 
      user: userId, 
      status: 'Confirmed' 
    });

    if (!hasBooked) {
      return res.status(403).json({ 
        success: false, 
        message: 'You must attend this event before leaving a review.' 
      });
    }

    // 2. Check if they already reviewed it
    const existingReview = await Review.findOne({ event: eventId, user: userId });
    if (existingReview) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already reviewed this event.' 
      });
    }

    // 3. Create the review
    const review = await Review.create({
      event: eventId,
      user: userId,
      rating: Number(rating),
      comment
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get All Reviews for an Event
// @route   GET /api/v1/events/:eventId/reviews
// @access  Public
export const getEventReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ event: req.params.eventId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    // Calculate average rating dynamically
    const averageRating = reviews.length 
      ? (reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length).toFixed(1) 
      : 0;

    res.status(200).json({ 
      success: true, 
      count: reviews.length, 
      averageRating,
      data: reviews 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Organizer replies to a review
// @route   PUT /api/v1/events/:eventId/reviews/:id/reply
// @access  Private (Organizer of the event)
export const replyToReview = async (req, res) => {
  try {
    const { reply } = req.body;
    const reviewId = req.params.id;
    const eventId = req.params.eventId;

    if (!reply || !reply.trim()) {
      return res.status(400).json({ success: false, message: 'Reply text is required' });
    }

    // 1. Find the event to ensure the person replying is the actual organizer
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to reply to reviews for this event.' });
    }

    // 2. Find and update the review
    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    review.organizerReply = reply;
    review.repliedAt = new Date();
    await review.save();

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
