import Event from '../models/Event.js';
import Booking from '../models/Booking.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import SavedEvent from '../models/SavedEvent.js';
import { getTodayDateString } from '../utils/date.js';

const enrichEventsWithLiveStats = async (events = []) => {
  if (!events.length) {
    return [];
  }

  // BULLETPROOF FIX: Explicitly cast to ObjectId so the aggregation never silently fails
  const eventIds = events.map((event) => new mongoose.Types.ObjectId(event._id));
  const today = getTodayDateString();

  const bookingStats = await Booking.aggregate([
    {
      $match: {
        event: { $in: eventIds },
        status: 'Confirmed'
      }
    },
    {
      $group: {
        _id: '$event',
        ticketsSold: { $sum: '$quantity' },
        grossRevenue: { $sum: '$totalAmount' },
        payout: { $sum: '$organizerPayout' },
        uniqueUsers: { $addToSet: '$user' },
        lastBookingAt: { $max: '$createdAt' }
      }
    }
  ]);

  const bookingStatsMap = new Map(
    bookingStats.map((stat) => [String(stat._id), stat])
  );

  return events.map((event) => {
    const liveStats = bookingStatsMap.get(String(event._id));
    const totalCapacity = Array.isArray(event.ticketCategories)
      ? event.ticketCategories.reduce(
          (sum, category) => sum + Number(category?.capacity || 0),
          0
        )
      : 0;
    const ticketsSold = Number(liveStats?.ticketsSold || 0);

    return {
      ...event,
      ticketsSold,
      grossRevenue: Number(liveStats?.grossRevenue || 0),
      payout: Number(liveStats?.payout || 0),
      totalUsers: Array.isArray(liveStats?.uniqueUsers) ? liveStats.uniqueUsers.length : 0,
      totalCapacity,
      isActive: event.status === 'Approved' && event.date >= today,
      sellThroughRate:
        totalCapacity > 0 ? Math.min(100, Math.round((ticketsSold / totalCapacity) * 100)) : 0,
      lastBookingAt: liveStats?.lastBookingAt || null
    };
  });
};

// @desc    Get Organizer Dashboard Stats
export const getOrganizerStats = async (req, res) => {
  try {
    const organizerId = new mongoose.Types.ObjectId(req.user.id);
    const today = getTodayDateString();
    const rawEventIds = await Event.find({ organizer: organizerId }).distinct('_id');
    
    // Safety check: ensure distinct returned ObjectIds
    const eventIds = rawEventIds.map(id => new mongoose.Types.ObjectId(id));
    const totalEvents = eventIds.length;
    
    const activeEvents = await Event.countDocuments({
      organizer: organizerId,
      status: 'Approved',
      date: { $gte: today }
    });

    const bookingStats = eventIds.length
      ? await Booking.aggregate([
          {
            $match: {
              event: { $in: eventIds },
              status: 'Confirmed'
            }
          },
          {
            $group: {
              _id: null,
              totalTickets: { $sum: '$quantity' },
              uniqueUsers: { $addToSet: '$user' },
              totalRevenue: { $sum: '$totalAmount' }
            }
          }
        ])
      : [];

    const stats = bookingStats.length > 0 ? bookingStats[0] : { totalTickets: 0, uniqueUsers: [], totalRevenue: 0 };

    res.status(200).json({
      success: true,
      data: {
        totalEvents,
        activeEvents,
        totalTickets: stats.totalTickets,
        totalCustomers: stats.uniqueUsers.length,
        totalRevenue: stats.totalRevenue || 0 // Send to frontend
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create an Event
export const createEvent = async (req, res) => {
  try {
    req.body.organizer = req.user.id; // Assign logged-in user as organizer
    
    // Safety check: parse layoutConfig if it comes as a string representation
    if (typeof req.body.layoutConfig === 'string') {
      try {
        req.body.layoutConfig = JSON.parse(req.body.layoutConfig);
      } catch (e) {
        // Ignore parse error and proceed, Mongoose schema will handle fallback
      }
    }
    
    // Mongoose schema handles missing required fields, firing a validation error caught below
    const event = await Event.create(req.body); 
    
    res.status(201).json({ success: true, data: event }); 
  } catch (error) { 
    res.status(400).json({ success: false, message: error.message }); 
  }
};

// @desc    Get All Approved Events
export const getEvents = async (req, res) => {
  try { 
    const { category, status = 'Approved' } = req.query;
    const isAdminRequest = req.user?.role === 'admin';
    const requestedStatus = ['Pending', 'Approved', 'Rejected'].includes(status) ? status : 'Approved';
    let query = { status: isAdminRequest ? requestedStatus : 'Approved' }; 
    
    if (category && category !== 'All') query.category = category; 
    
    const events = await Event.find(query).populate('organizer', 'name email companyName businessType').sort({ date: 1 }); 
    
    res.status(200).json({ success: true, count: events.length, data: events }); 
  } catch (error) { 
    res.status(500).json({ success: false, message: 'Server Error' }); 
  }
};

// @desc    Get Single Event
export const getEvent = async (req, res) => {
  try { 
    const event = await Event.findById(req.params.id).populate('organizer', 'name email'); 
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' }); 

    if (event.status !== 'Approved') {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    res.status(200).json({ success: true, data: event }); 
  } catch (error) { 
    res.status(500).json({ success: false, message: 'Server Error' }); 
  }
};

export const getEventForManagement = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'name email companyName businessType');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (req.user.role !== 'admin' && String(event.organizer?._id || event.organizer) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this event' });
    }

    res.status(200).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get Organizer's Events
export const getMyEvents = async (req, res) => {
  try { 
    const events = await Event.find({ organizer: req.user.id }).sort({ createdAt: -1 }).lean();
    const enrichedEvents = await enrichEventsWithLiveStats(events);

    res.status(200).json({ success: true, data: enrichedEvents }); 
  } catch (error) { 
    res.status(500).json({ success: false, message: 'Server Error' }); 
  }
};

// @desc    Update Event
export const updateEvent = async (req, res) => {
  try { 
    let event = await Event.findById(req.params.id); 
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' }); 
    
    // Authorization check
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') { 
      return res.status(403).json({ success: false, message: 'Not authorized to update this event' }); 
    } 

    // Safety check: parse layoutConfig if it comes as a string representation
    if (typeof req.body.layoutConfig === 'string') {
      try {
        req.body.layoutConfig = JSON.parse(req.body.layoutConfig);
      } catch (e) {
        // Ignore parse error and proceed
      }
    }
    
    event = await Event.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true }); 
    res.status(200).json({ success: true, data: event, message: 'Event updated successfully' }); 
  } catch (error) { 
    res.status(500).json({ success: false, message: error.message }); 
  }
};

// @desc    Update Event Status (Admin)
export const updateEventStatus = async (req, res) => {
  try { 
    const { status, adminFeedback } = req.body; 
    let updates = {}; 
    
    if (status) updates.status = status; 
    if (adminFeedback !== undefined) updates.adminFeedback = adminFeedback; 
    
    const event = await Event.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' }); 
    res.status(200).json({ success: true, data: event }); 
  } catch (error) { 
    res.status(500).json({ success: false, message: error.message }); 
  }
};

// @desc    Search Events (Optimized with Text Index & Advanced Filters)
export const searchEvents = async (req, res) => {
  try { 
    const { q, category, minPrice, maxPrice, startDate, endDate } = req.query;
    
    // Base query: only show approved events
    const query = { status: 'Approved' };
    
    // 1. Text/Keyword Search
    if (q) {
      query.$text = { $search: q };
    }
    
    // 2. Category Filter
    if (category && category !== 'All') {
      query.category = { $in: category.split(',') };
    }

    // 3. Price Filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined && minPrice !== '') query.price.$gte = Number(minPrice);
      if (maxPrice !== undefined && maxPrice !== '') query.price.$lte = Number(maxPrice);
    }

    // 4. Date Range Filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    } else {
      // Default: Only show upcoming events (today onwards)
      const todayStr = getTodayDateString();
      query.date = { $gte: todayStr };
    }
    
    // Execute query (Sort by relevance if searching, otherwise sort by date)
    const events = q 
      ? await Event.find(query, { score: { $meta: "textScore" } }).sort({ score: { $meta: "textScore" } })
      : await Event.find(query).sort({ date: 1 });
      
    res.status(200).json({ success: true, count: events.length, data: events }); 
  } catch (error) { 
    res.status(500).json({ success: false, message: error.message }); 
  }
};

// @desc    Get Personalized AI Recommendations
// @route   GET /api/v1/events/recommended
// @access  Public (Adaptive)
export const getRecommendedEvents = async (req, res) => {
  try {
    const todayStr = getTodayDateString();
    let recommended = [];
    let userId = null;

    // 1. Silently check if the user is logged in (Optional Auth)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) { /* Ignore invalid tokens for this route */ }
    } else if (req.cookies?.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) { /* Ignore */ }
    }

    // 2. AI Collaborative Filtering (If Logged In)
    if (userId) {
      const userObjId = new mongoose.Types.ObjectId(userId);
      const bookings = await Booking.find({ user: userObjId }).populate('event');
      const saved = await SavedEvent.find({ user: userObjId }).populate('event');

      // Extract user's favorite categories
      const favoriteCategories = new Set();
      bookings.forEach(b => b.event && favoriteCategories.add(b.event.category));
      saved.forEach(s => s.event && favoriteCategories.add(s.event.category));

      if (favoriteCategories.size > 0) {
        // Find upcoming events in these categories that the user HASN'T booked yet
        const bookedEventIds = bookings.map(b => b.event?._id);
        
        recommended = await Event.find({
          status: 'Approved',
          date: { $gte: todayStr },
          category: { $in: Array.from(favoriteCategories) },
          _id: { $nin: bookedEventIds } 
        }).limit(6);
      }
    }

    // 3. Fallback: Trending Events (If Guest OR no history found)
    if (recommended.length === 0) {
      recommended = await Event.find({
        status: 'Approved',
        date: { $gte: todayStr }
      })
      .sort({ ticketsSold: -1 }) // Sort by highest tickets sold
      .limit(6);
    }

    res.status(200).json({ success: true, count: recommended.length, data: recommended });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
