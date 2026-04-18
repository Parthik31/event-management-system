import mongoose from 'mongoose';

const showSlotPricingSchema = new mongoose.Schema({
  morning: { type: Number, default: 0 },
  afternoon: { type: Number, default: 0 },
  night: { type: Number, default: 0 }
}, { _id: false });

const rowCategorySchema = new mongoose.Schema({
  rowLabel: { type: String, required: true },
  category: { type: String, required: true }
}, { _id: false });

const showSchema = new mongoose.Schema({
  movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  multiplex: { type: mongoose.Schema.Types.ObjectId, ref: 'Multiplex', required: true },
  screen: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true },
  date: { type: String, required: true }, // e.g., "2026-03-25"
  waveGroupId: { type: String, default: '' },
  baseStartTime: { type: String, default: '' },
  startTime: { type: String, required: true }, // e.g., "14:30"
  endTime: { type: String },
  language: { type: String, required: true },
  format: { type: String, default: '2D' },
  basePrice: { type: Number, required: true },
  seatRowPartitions: { type: Number, default: 2, min: 1, max: 4 },
  seatCategoryPricing: { type: Map, of: Number, default: () => ({}) },
  rowCategories: { type: [rowCategorySchema], default: [] },
  showSlotPricing: { type: showSlotPricingSchema, default: () => ({}) },
  bookedSeats: { type: [String], default: [] }
}, { timestamps: true });

showSchema.index({ movie: 1, date: 1, multiplex: 1, startTime: 1 });
showSchema.index({ multiplex: 1, date: 1, startTime: 1 });

export default mongoose.model('Show', showSchema);
