import mongoose from 'mongoose';

const waitlistSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Waiting', 'Notified', 'Booked'],
    default: 'Waiting'
  }
}, { timestamps: true });

// Prevent duplicate waitlist entries for the same event
waitlistSchema.index({ event: 1, user: 1 }, { unique: true });

export default mongoose.model('Waitlist', waitlistSchema);
