import mongoose from 'mongoose';

const rowCategorySchema = new mongoose.Schema({
  rowLabel: { type: String, required: true },
  category: { type: String, required: true }
}, { _id: false });

const screenSchema = new mongoose.Schema({
  multiplex: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Multiplex',
    required: true
  },
  screenName: { type: String, required: true }, // e.g., 'Audi 1', 'IMAX'
  screenType: { 
    type: String, 
    enum: ['2D', '3D', 'IMAX', '4DX', 'Gold'], 
    default: '2D' 
  },
  layout: {
    rows: { type: Number, required: true },
    cols: { type: Number, required: true }
  },
  rowCategories: {
    type: [rowCategorySchema],
    default: []
  },
  totalSeats: { type: Number }
}, { timestamps: true });

export default mongoose.model('Screen', screenSchema);
