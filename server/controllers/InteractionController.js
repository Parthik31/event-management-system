import SavedEvent from '../models/SavedEvent.js';
import Waitlist from '../models/Waitlist.js';
import Event from '../models/Event.js';

// @desc    Toggle Save/Bookmark an Event
// @route   POST /api/v1/interactions/save/:eventId
// @access  Private (User)
export const toggleSavedEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user.id;

    // Check if the event exists
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    // Check if already saved
    const existingSave = await SavedEvent.findOne({ user: userId, event: eventId });

    if (existingSave) {
      // If it exists, remove it (Toggle Off)
      await SavedEvent.findByIdAndDelete(existingSave._id);
      return res.status(200).json({ success: true, message: 'Event removed from saved list', isSaved: false });
    } else {
      // If it doesn't exist, create it (Toggle On)
      await SavedEvent.create({ user: userId, event: eventId });
      return res.status(201).json({ success: true, message: 'Event saved to wishlist', isSaved: true });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all saved events for the logged-in user
// @route   GET /api/v1/interactions/saved
// @access  Private (User)
export const getSavedEvents = async (req, res) => {
  try {
    const saved = await SavedEvent.find({ user: req.user.id })
      .populate('event', 'title image date location price')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: saved.length, data: saved });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Join Waitlist for a sold-out event
// @route   POST /api/v1/interactions/waitlist/:eventId
// @access  Private (User)
export const joinWaitlist = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user.id;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    // 🚀 BUG FIX 3: Ensure the event is actually sold out before allowing waitlist entry
    if (!event.isSoldOut) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tickets are still available, no need for the waitlist!' 
      });
    }

    // Check if user is already on the waitlist
    const existingEntry = await Waitlist.findOne({ event: eventId, user: userId });
    if (existingEntry) {
      return res.status(400).json({ success: false, message: 'You are already on the waitlist for this event.' });
    }

    const waitlistEntry = await Waitlist.create({ event: eventId, user: userId });
    res.status(201).json({ success: true, message: 'Successfully joined the waitlist!', data: waitlistEntry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
