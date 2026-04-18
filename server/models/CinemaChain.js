import mongoose from 'mongoose';

const cinemaChainSchema = new mongoose.Schema({
  chainName: { type: String, required: true, unique: true },
  brandLogo: { type: String },
  headquartersCity: { type: String },
  contactEmail: { type: String }
}, { timestamps: true });

export default mongoose.model('CinemaChain', cinemaChainSchema);
