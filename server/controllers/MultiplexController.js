import Booking from '../models/Booking.js';
import Multiplex from '../models/Multiplex.js';
import Screen from '../models/Screen.js';
import Show from '../models/Show.js';
import mongoose from 'mongoose';

const INDIA_TIMEZONE = 'Asia/Kolkata';
const getTodayDateString = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

const getApprovedMultiplexQuery = () => ({
  $or: [{ status: 'Approved' }, { status: { $exists: false } }]
});

// @desc    Create a new Multiplex (Theatre building)
// @route   POST /api/v1/multiplexes
// @access  Private (Organizer)
export const createMultiplex = async (req, res) => {
  try {
    const { multiplexName, city, address, amenities } = req.body;

    const multiplex = await Multiplex.create({
      multiplexName,
      city,
      address,
      amenities,
      status: 'Pending',
      owner: req.user.id
    });

    res.status(201).json({ success: true, data: multiplex });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMultiplex = async (req, res) => {
  try {
    const { multiplexName, city, address, amenities } = req.body;

    const multiplex = await Multiplex.findOne({ _id: req.params.id, owner: req.user.id });
    if (!multiplex) {
      return res.status(404).json({ success: false, message: 'Multiplex not found.' });
    }

    multiplex.multiplexName = multiplexName ?? multiplex.multiplexName;
    multiplex.city = city ?? multiplex.city;
    multiplex.address = address ?? multiplex.address;
    multiplex.amenities = Array.isArray(amenities)
      ? amenities
      : typeof amenities === 'string'
        ? amenities.split(',').map((item) => item.trim()).filter(Boolean)
        : multiplex.amenities;

    await multiplex.save();

    res.status(200).json({ success: true, data: multiplex });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a Screen (Audi) to a Multiplex
// @route   POST /api/v1/multiplexes/:id/screens
// @access  Private (Organizer)
export const addScreen = async (req, res) => {
  try {
    const { screenName, screenType, rows, cols } = req.body;
    const multiplexId = req.params.id;

    const multiplex = await Multiplex.findOne({ _id: multiplexId, owner: req.user.id });
    if (!multiplex) {
      return res.status(403).json({ success: false, message: 'Not authorized to add screens to this multiplex' });
    }

    const totalSeats = rows * cols;
    const normalizedScreenType = ['2D', '3D', 'IMAX', '4DX', 'Gold'].includes(screenType)
      ? screenType
      : '2D';

    const screen = await Screen.create({
      multiplex: multiplexId,
      screenName,
      screenType: normalizedScreenType,
      totalSeats,
      layout: { rows, cols },
      rowCategories: []
    });

    res.status(201).json({ success: true, data: screen });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateScreen = async (req, res) => {
  try {
    const { screenName, screenType, rows, cols } = req.body;
    const screen = await Screen.findById(req.params.screenId).populate('multiplex', 'owner');

    if (!screen) {
      return res.status(404).json({ success: false, message: 'Screen not found.' });
    }

    if (String(screen.multiplex?.owner) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this screen.' });
    }

    const nextRows = Number(rows || screen.layout?.rows || 0);
    const nextCols = Number(cols || screen.layout?.cols || 0);

    screen.screenName = screenName ?? screen.screenName;
    screen.screenType = ['2D', '3D', 'IMAX', '4DX', 'Gold'].includes(screenType) ? screenType : screen.screenType;
    screen.layout = {
      rows: nextRows,
      cols: nextCols
    };
    screen.totalSeats = nextRows * nextCols;
    screen.rowCategories = [];

    await screen.save();

    res.status(200).json({ success: true, data: screen });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Multiplexes (and their screens) owned by the logged-in Organizer
// @route   GET /api/v1/multiplexes/my
// @access  Private (Organizer)
export const getMyMultiplexes = async (req, res) => {
  try {
    const multiplexes = await Multiplex.find({ owner: req.user.id }).lean();

    if (!multiplexes.length) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // 👈 FIX: Explicitly cast multiplex IDs to ObjectIds for the aggregation pipeline
    const multiplexIds = multiplexes.map((multiplex) => new mongoose.Types.ObjectId(multiplex._id));
    const today = getTodayDateString();

    const [screens, shows, bookingStats] = await Promise.all([
      Screen.find({ multiplex: { $in: multiplexIds } }).lean(),
      Show.find({ multiplex: { $in: multiplexIds } })
        .populate('movie', 'title')
        .populate('screen', 'screenName screenType layout totalSeats rowCategories')
        .lean(),
      Booking.aggregate([
        {
          $match: {
            multiplex: { $in: multiplexIds },
            status: 'Confirmed'
          }
        },
        {
          $group: {
            _id: '$multiplex',
            ticketsSold: { $sum: '$quantity' },
            grossRevenue: { $sum: '$totalAmount' }
          }
        }
      ])
    ]);

    const bookingMap = new Map(bookingStats.map((stat) => [String(stat._id), stat]));

    const enrichedMultiplexes = multiplexes.map((multiplex) => {
      const multiplexScreens = screens.filter((screen) => String(screen.multiplex) === String(multiplex._id));
      const multiplexShows = shows.filter((show) => String(show.multiplex) === String(multiplex._id));
      const liveStats = bookingMap.get(String(multiplex._id));

      return {
        ...multiplex,
        screens: multiplexScreens,
        shows: multiplexShows,
        totalScreens: multiplexScreens.length,
        activeShows: multiplexShows.filter((show) => show.date >= today).length,
        ticketsSold: Number(liveStats?.ticketsSold || 0),
        grossRevenue: Number(liveStats?.grossRevenue || 0),
        status: multiplex.status || 'Approved'
      };
    });

    res.status(200).json({ success: true, count: enrichedMultiplexes.length, data: enrichedMultiplexes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get multiplexes for admin review
// @route   GET /api/v1/multiplexes/admin/list
// @access  Private (Admin)
export const getAdminMultiplexes = async (req, res) => {
  try {
    const requestedStatus = req.query.status;
    const query = requestedStatus && ['Pending', 'Approved', 'Rejected'].includes(requestedStatus)
      ? { status: requestedStatus }
      : {};

    const multiplexes = await Multiplex.find(query)
      .populate('owner', 'name email companyName businessType')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: multiplexes.length,
      data: multiplexes.map((multiplex) => ({
        ...multiplex,
        status: multiplex.status || 'Approved'
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update multiplex approval status
// @route   PUT /api/v1/multiplexes/admin/:id/status
// @access  Private (Admin)
export const updateMultiplexStatus = async (req, res) => {
  try {
    const { status, adminFeedback } = req.body;

    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid multiplex status.' });
    }

    const multiplex = await Multiplex.findByIdAndUpdate(
      req.params.id,
      {
        status,
        adminFeedback: adminFeedback ?? ''
      },
      { returnDocument: 'after', runValidators: true }
    ).populate('owner', 'name email companyName businessType');

    if (!multiplex) {
      return res.status(404).json({ success: false, message: 'Multiplex not found.' });
    }

    res.status(200).json({ success: true, data: multiplex });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export { getApprovedMultiplexQuery };
