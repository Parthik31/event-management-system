import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Earned', 'Redeemed', 'Refund', 'Deposit'],
    required: true
  },
  currency: {
    type: String,
    enum: ['Points', 'INR'], // Tracks if it's loyalty points or actual money
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true // e.g., "Earned points for booking Event X" or "Redeemed 100 points"
  },
  // Optional reference to the booking that triggered this transaction
  relatedBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }
}, { timestamps: true });

export default mongoose.model('WalletTransaction', walletTransactionSchema);
