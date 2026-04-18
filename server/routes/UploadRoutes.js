import express from 'express';
import { uploadCDN } from '../config/cloudinary.js';

const router = express.Router();

// @route   POST /api/v1/upload
// @desc    Uploads file to CDN and returns permanent URL
router.post('/', uploadCDN.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    // req.file.path contains the PERMANENT Cloudinary secure_url
    res.status(200).json({
      success: true,
      message: 'Image uploaded permanently',
      url: req.file.path, // Save this EXACT string to your Movie/Event MongoDB document
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, message: 'Image upload failed' });
  }
});

export default router;
