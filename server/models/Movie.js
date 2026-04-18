import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  poster: { type: String, required: true }, // Image URL or Path
  banner: { type: String, required: true }, // Image URL or Path
  trailers: [{ type: String }], // Updated to Array for multiple trailers
  genre: [{ type: String, required: true }], 
  language: [{ type: String, required: true }], 
  duration: { type: Number, required: true }, 
  releaseDate: { type: Date, required: true },
  certificate: { type: String, enum: ['U', 'UA', 'A', 'S'], default: 'UA' },
  // 🚀 NEW: Comprehensive Cast & Crew Array
  cast: [{
    name: String,
    role: String,
    image: String
  }],
  description: { type: String, required: true },
  isUpcoming: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  totalVotes: { type: Number, default: 0 },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
}, { timestamps: true });

export default mongoose.model('Movie', movieSchema);
