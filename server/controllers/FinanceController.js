import mongoose from 'mongoose';
import { getAdminFinanceData, getOrganizerDashboardData, getOrganizerFinanceData } from '../utils/DashboardAnalytics.js';
import { normalizeMode } from '../utils/modeHelpers.js';

const getOrganizerType = (req) => normalizeMode(req.params.type || req.user.businessType || req.user.activeMode);

export const getAdminFinanceStats = async (req, res) => {
  try {
    const data = await getAdminFinanceData({
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      status: req.query.status
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrganizerFinanceStats = async (req, res) => {
  try {
    const type = getOrganizerType(req);
    // 👈 FIX: Strictly cast to ObjectId before passing to the analytics utility
    const safeOrganizerId = new mongoose.Types.ObjectId(req.user.id);
    
    const data = await getOrganizerFinanceData({
      organizerId: safeOrganizerId,
      type,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      status: req.query.status
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrganizerDashboardStats = async (req, res) => {
  try {
    const type = getOrganizerType(req);
    // 👈 FIX: Strictly cast to ObjectId before passing to the analytics utility
    const safeOrganizerId = new mongoose.Types.ObjectId(req.user.id);

    const data = await getOrganizerDashboardData({
      organizerId: safeOrganizerId,
      type,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
