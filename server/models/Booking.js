import mongoose from 'mongoose';

// ─── Individual ticket slot (1 per person in a multi-ticket purchase) ───────
// Each booking with qty=N generates N of these, each with its own unique QR code.
// This allows per-person entry scanning and ticket transfers without splitting
// the whole booking.
const individualTicketSchema = new mongoose.Schema(
  {
    subTicketId: { type: String, required: true },   // unique QR code value
    isCheckedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date, default: null },
    isTransferred: { type: Boolean, default: false },
    transferredToEmail: { type: String, default: null }
  },
  { _id: false }
);

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
    },

    // 🎫 Individual ticket slots — one per person in a multi-ticket purchase.
    // Populated at booking creation time (qty N → N entries).
    // Each slot has its own unique subTicketId used as the QR code value.
    // Old bookings (before this schema version) will have an empty array here;
    // the frontend falls back to the main ticketId in that case.
    individualTickets: {
      type: [individualTicketSchema],
      default: []
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
