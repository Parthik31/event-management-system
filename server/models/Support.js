import mongoose from 'mongoose';

const supportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }, // Optional: Links to user if they are logged in
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    role: {
      type: String,
      enum: ['user', 'organizer', 'guest'],
      default: 'user',
    },
    subject: {
      type: String,
      required: [true, 'Please provide a subject line'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please describe your issue'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Open', 'Resolved'],
      default: 'Open',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Support', supportSchema);
