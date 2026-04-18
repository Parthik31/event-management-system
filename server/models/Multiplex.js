import mongoose from 'mongoose';

const multiplexSchema = new mongoose.Schema({
  chain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CinemaChain'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  multiplexName: { type: String, required: true },
  city: { type: String, required: true },
  address: { type: String, required: true },
  amenities: [{ type: String }], // e.g., ['Parking', 'Food Court', 'Recliner']
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  adminFeedback: {
    type: String,
    default: ''
  },
  location: {
    lat: Number,
    lng: Number
  }
}, { timestamps: true });

export default mongoose.model('Multiplex', multiplexSchema);
