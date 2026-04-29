import mongoose from 'mongoose';

const ticketCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    location: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
    category: { type: String, required: true },
    duration: { type: String, default: '' },
    image: { type: String, default: '' },
    banner: { type: String, default: '' },
    trailerUrl: { type: String, default: '' },
    language: { type: String, default: 'English' },
    ageLimit: { type: String, default: 'All Ages' },
    terms: { type: String, default: '' },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending',
    },
    adminFeedback: { type: String, default: '' },
    hasLayout: { type: Boolean, default: false },
    layoutImage: { type: String, default: '' },
    ticketCategories: {
      type: [ticketCategorySchema],
      default: [{ name: 'General Entry', price: 0, capacity: 0 }],
    },
    layoutConfig: {
      rows: { type: Number, default: 0 },
      cols: { type: Number, default: 0 },
    },
    bookedSeats: {
      type: [String],
      default: [],
    },
    ticketsSold: { type: Number, default: 0 },
  },
  { timestamps: true }
);

eventSchema.virtual('isSoldOut').get(function isSoldOut() {
  const totalCapacity = (this.ticketCategories || []).reduce(
    (sum, category) => sum + (Number(category.capacity) || 0), 0
  );
  // Check both explicit seats AND general admission quantity
  return totalCapacity > 0 && (this.bookedSeats.length >= totalCapacity || this.ticketsSold >= totalCapacity);
});

eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

eventSchema.index({ title: 'text', description: 'text', category: 'text', location: 'text' });
eventSchema.index({ status: 1, date: 1, category: 1 });
eventSchema.index({ organizer: 1, createdAt: -1 });
eventSchema.index({ status: 1, date: 1, ticketsSold: -1 });

export default mongoose.model('Event', eventSchema);
