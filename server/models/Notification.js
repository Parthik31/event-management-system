import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Booking', 'Reminder', 'Promo', 'Update', 'System'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  // Optional: Link the notification to a specific event if applicable
  relatedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
