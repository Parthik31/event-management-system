import Coupon from '../models/Coupon.js';

// @desc    Create a new Promo Code
// @route   POST /api/v1/coupons
// @access  Private (Organizer)
export const createCoupon = async (req, res) => {
  try {
    req.body.organizer = req.user.id;
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This coupon code already exists!' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get Organizer's Promo Codes
// @route   GET /api/v1/coupons/organizer
// @access  Private (Organizer)
export const getOrganizerCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({ organizer: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Validate & Apply a Promo Code (For Users)
// @route   POST /api/v1/coupons/validate
// @access  Private (User)
export const validateCoupon = async (req, res) => {
  try {
    const { code, eventId } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid or inactive promo code' });
    }

    if (new Date() > new Date(coupon.expiryDate)) {
      return res.status(400).json({ success: false, message: 'This promo code has expired' });
    }

    if (coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'This promo code has reached its usage limit' });
    }

    // If coupon is tied to a specific event, verify it matches
    if (coupon.event && coupon.event.toString() !== eventId) {
      return res.status(400).json({ success: false, message: 'This promo code is not valid for this event' });
    }

    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Active Coupons for a Specific Event (Public)
// @route   GET /api/v1/coupons/event/:eventId
// @access  Public
export const getEventCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({
      event: req.params.eventId,
      isActive: true,
      expiryDate: { $gt: new Date() } // Ensure it hasn't expired
    }).select('code discountType discountValue expiryDate usageLimit usageCount');

    // Only return coupons that haven't reached their usage limit
    const availableCoupons = coupons.filter(c => c.usageCount < c.usageLimit);

    res.status(200).json({ success: true, data: availableCoupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
