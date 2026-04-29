import mongoose from 'mongoose';

const movieSeatDetailSchema = new mongoose.Schema(
  {
    seatId: {
      type: String,
      required: true
    },
    rowLabel: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      default: 'Standard'
    },
    slotLabel: {
      type: String,
      default: 'morning'
    },
    price: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ['Event', 'Movie'],
      default: 'Event'
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show'
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie'
    },
    multiplex: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Multiplex'
    },
    screen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Screen'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ticketId: {
      type: String,
      required: true,
      unique: true, // e.g., "TKT-A8F9-2026"
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    categoryName: {
      type: String,
      default: 'General Entry',
    },
    status: {
      type: String,
      enum: ['Locked', 'Confirmed', 'Cancelled', 'Refunded'],
      default: 'Confirmed'
    },
    expiresAt: {
      type: Date,
      default: undefined // Important: If undefined, MongoDB TTL ignores it
    },
    guestEmail: {
      type: String, // Used if the ticket was transferred to someone else
    },
    isTransferred: {
      type: Boolean,
      default: false,
    },
    ticketPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    convenienceFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    adminCommission: {
      type: Number,
      default: 0,
      min: 0,
    },
    gatewayCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    organizerPayout: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // 🚀 NEW: Tracks which specific seats this user bought
    seats: {
      type: [String], 
      default: []
    },
    seatDetails: {
      type: [movieSeatDetailSchema],
      default: []
    },
    
    // 🚀 NEW: QR Code Scanner Entry Tracking
    isCheckedIn: {
      type: Boolean,
      default: false
    },
    checkInTime: {
      type: Date
    }
  },
  { timestamps: true }
);

bookingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ event: 1, status: 1, expiresAt: 1 });
bookingSchema.index({ show: 1, status: 1, expiresAt: 1 });
bookingSchema.index({ event: 1, status: 1, expiresAt: 1, seats: 1 });
bookingSchema.index({ show: 1, status: 1, expiresAt: 1, seats: 1 });
bookingSchema.index({ movie: 1, status: 1, createdAt: -1 });
bookingSchema.index({ multiplex: 1, status: 1, createdAt: -1 });

export default mongoose.model('Booking', bookingSchema);
