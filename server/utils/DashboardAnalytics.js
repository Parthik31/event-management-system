import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Event from '../models/Event.js';
import Movie from '../models/Movie.js';
import Multiplex from '../models/Multiplex.js';
import Screen from '../models/Screen.js';
import Show from '../models/Show.js';
import User from '../models/User.js';

const INDIA_TIMEZONE = 'Asia/Kolkata';
const SIMPLE_EMPTY_FINANCE = { summary: { totalRevenue: 0, payouts: 0, pending: 0 }, chart: [], districts: [], reports: [] };

const formatDateLabel = {
  $dateToString: { format: '%d %b', date: '$createdAt', timezone: INDIA_TIMEZONE }
};

const get30DaysAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const getIndiaDateString = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);

const getIndiaStartOfDay = (daysOffset = 0) =>
  new Date(new Date(`${getIndiaDateString()}T00:00:00+05:30`).getTime() + daysOffset * 24 * 60 * 60 * 1000);

const buildEmptyEventDashboardData = () => ({
  kpis: {
    grossRevenue: 0,
    revenue: 0,
    activeEvents: 0,
    activeListings: 0,
    ticketsSold: 0,
    attendees: 0,
    totalUsers: 0
  },
  summary: { totalRevenue: 0, payouts: 0, pending: 0 },
  chart: [],
  districts: [],
  topEvents: [],
  reports: []
});

const buildEmptyOrganizerFinanceData = () => ({
  summary: {
    totalRevenue: 0,
    payouts: 0,
    pending: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
    ticketsSold: 0,
    totalUsers: 0
  },
  chart: [],
  districts: [],
  breakdownByEvent: [],
  breakdownByCategory: [],
  reports: []
});

const buildEmptyMovieDashboardData = () => ({
  kpis: {
    grossRevenue: 0,
    revenue: 0,
    activeMovies: 0,
    activeListings: 0,
    ticketsSold: 0,
    attendees: 0,
    totalUsers: 0
  },
  summary: { totalRevenue: 0, payouts: 0, pending: 0 },
  chart: [],
  districts: [],
  topMovies: [],
  reports: []
});

const buildEmptyMultiplexDashboardData = () => ({
  kpis: {
    totalScreens: 0,
    activeShows: 0,
    ticketsSold: 0,
    grossRevenue: 0,
    revenue: 0,
    attendees: 0,
    activeListings: 0
  },
  summary: { totalRevenue: 0, payouts: 0, pending: 0 },
  chart: [],
  districts: [],
  topMovies: [],
  reports: [],
  management: {
    multiplexes: 0,
    screens: 0,
    activeShows: 0
  }
});

const getOrganizerEventCatalog = async (orgObjId) => {
  const events = await Event.find({ organizer: orgObjId }).sort({ createdAt: -1 }).lean();

  if (!events.length) {
    return [];
  }

  const eventIds = events.map((event) => event._id);
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

  const statsMap = new Map(bookingStats.map((stat) => [String(stat._id), stat]));
  const today = getIndiaDateString();

  return events.map((event) => {
    const liveStats = statsMap.get(String(event._id));
    const totalCapacity = Array.isArray(event.ticketCategories)
      ? event.ticketCategories.reduce(
          (sum, category) => sum + Number(category?.capacity || 0),
          0
        )
      : 0;

    return {
      ...event,
      ticketsSold: Number(liveStats?.ticketsSold || 0),
      grossRevenue: Number(liveStats?.grossRevenue || 0),
      payout: Number(liveStats?.payout || 0),
      totalUsers: Array.isArray(liveStats?.uniqueUsers) ? liveStats.uniqueUsers.length : 0,
      totalCapacity,
      isActive: event.status === 'Approved' && event.date >= today,
      lastBookingAt: liveStats?.lastBookingAt || null
    };
  });
};

const getOrganizerMovieCatalog = async (orgObjId) => {
  const movies = await Movie.find({ organizer: orgObjId }).sort({ createdAt: -1 }).lean();

  if (!movies.length) {
    return [];
  }

  const movieIds = movies.map((movie) => movie._id);
  const [bookingStats, showStats] = await Promise.all([
    Booking.aggregate([
      {
        $match: {
          movie: { $in: movieIds },
          status: 'Confirmed'
        }
      },
      {
        $group: {
          _id: '$movie',
          ticketsSold: { $sum: '$quantity' },
          grossRevenue: { $sum: '$totalAmount' },
          payout: { $sum: '$organizerPayout' },
          uniqueUsers: { $addToSet: '$user' }
        }
      }
    ]),
    Show.aggregate([
      {
        $match: {
          movie: { $in: movieIds }
        }
      },
      {
        $group: {
          _id: '$movie',
          showCount: { $sum: 1 },
          activeShows: {
            $sum: {
              $cond: [{ $gte: ['$date', getIndiaDateString()] }, 1, 0]
            }
          }
        }
      }
    ])
  ]);

  const bookingMap = new Map(bookingStats.map((stat) => [String(stat._id), stat]));
  const showMap = new Map(showStats.map((stat) => [String(stat._id), stat]));
  const today = new Date(`${getIndiaDateString()}T00:00:00+05:30`);

  return movies.map((movie) => {
    const booking = bookingMap.get(String(movie._id));
    const shows = showMap.get(String(movie._id));
    const releaseDate = movie.releaseDate ? new Date(movie.releaseDate) : null;
    const isReleased = releaseDate ? releaseDate <= today : false;
    const isActive = movie.status === 'Approved';

    return {
      ...movie,
      ticketsSold: Number(booking?.ticketsSold || 0),
      grossRevenue: Number(booking?.grossRevenue || 0),
      payout: Number(booking?.payout || 0),
      totalUsers: Array.isArray(booking?.uniqueUsers) ? booking.uniqueUsers.length : 0,
      showCount: Number(shows?.showCount || 0),
      activeShows: Number(shows?.activeShows || 0),
      isActive
    };
  });
};

const getOrganizerMultiplexCatalog = async (orgObjId) => {
  const multiplexes = await Multiplex.find({ owner: orgObjId }).sort({ createdAt: -1 }).lean();

  if (!multiplexes.length) {
    return { multiplexes: [], screens: [], shows: [] };
  }

  const multiplexIds = multiplexes.map((multiplex) => multiplex._id);
  const [screens, shows, bookingStats] = await Promise.all([
    Screen.find({ multiplex: { $in: multiplexIds } }).lean(),
    Show.find({ multiplex: { $in: multiplexIds } }).populate('movie', 'title').lean(),
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
          grossRevenue: { $sum: '$totalAmount' },
          payout: { $sum: '$organizerPayout' },
          uniqueUsers: { $addToSet: '$user' }
        }
      }
    ])
  ]);

  const bookingMap = new Map(bookingStats.map((stat) => [String(stat._id), stat]));
  const today = getIndiaDateString();

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
      payout: Number(liveStats?.payout || 0),
      totalUsers: Array.isArray(liveStats?.uniqueUsers) ? liveStats.uniqueUsers.length : 0
    };
  });

  return {
    multiplexes: enrichedMultiplexes,
    screens,
    shows
  };
};

const getAdminModuleTouchpoints = async () => {
  const [eventMetrics, movieMetrics, multiplexMetrics] = await Promise.all([
    Booking.aggregate([
      { $match: { status: 'Confirmed', event: { $ne: null } } },
      {
        $group: {
          _id: null,
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]),
    Booking.aggregate([
      { $match: { status: 'Confirmed', movie: { $ne: null } } },
      {
        $group: {
          _id: null,
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]),
    Booking.aggregate([
      { $match: { status: 'Confirmed', multiplex: { $ne: null } } },
      {
        $group: {
          _id: null,
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ])
  ]);

  return [
    { name: 'Events', bookings: eventMetrics[0]?.bookings || 0, revenue: eventMetrics[0]?.revenue || 0 },
    { name: 'Movies', bookings: movieMetrics[0]?.bookings || 0, revenue: movieMetrics[0]?.revenue || 0 },
    { name: 'Multiplex', bookings: multiplexMetrics[0]?.bookings || 0, revenue: multiplexMetrics[0]?.revenue || 0 }
  ];
};

const getAdminOrganizerRoster = async () => {
  const organizers = await User.find({ role: 'organizer' })
    .select('name email companyName businessType activeMode createdAt')
    .sort({ createdAt: -1 })
    .lean();

  if (!organizers.length) {
    return [];
  }

  const organizerIds = organizers.map((organizer) => organizer._id);

  const [
    eventListingStats,
    movieListingStats,
    multiplexListingStats,
    eventBookingStats,
    movieBookingStats,
    multiplexBookingStats
  ] = await Promise.all([
    Event.aggregate([
      { $match: { organizer: { $in: organizerIds } } },
      {
        $group: {
          _id: '$organizer',
          listings: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
          lastCreatedAt: { $max: '$createdAt' }
        }
      }
    ]),
    Movie.aggregate([
      { $match: { organizer: { $in: organizerIds } } },
      {
        $group: {
          _id: '$organizer',
          listings: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
          lastCreatedAt: { $max: '$createdAt' }
        }
      }
    ]),
    Multiplex.aggregate([
      { $match: { owner: { $in: organizerIds } } },
      {
        $project: {
          owner: 1,
          createdAt: 1,
          normalizedStatus: { $ifNull: ['$status', 'Approved'] }
        }
      },
      {
        $group: {
          _id: '$owner',
          listings: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$normalizedStatus', 'Pending'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$normalizedStatus', 'Approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$normalizedStatus', 'Rejected'] }, 1, 0] } },
          lastCreatedAt: { $max: '$createdAt' }
        }
      }
    ]),
    Booking.aggregate([
      { $match: { status: 'Confirmed', event: { $ne: null } } },
      { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'eventDetails' } },
      { $project: { organizerId: { $arrayElemAt: ['$eventDetails.organizer', 0] }, totalAmount: 1, createdAt: 1 } },
      { $match: { organizerId: { $in: organizerIds } } },
      {
        $group: {
          _id: '$organizerId',
          revenue: { $sum: '$totalAmount' },
          bookings: { $sum: 1 },
          lastBookingAt: { $max: '$createdAt' }
        }
      }
    ]),
    Booking.aggregate([
      { $match: { status: 'Confirmed', movie: { $ne: null } } },
      { $lookup: { from: 'movies', localField: 'movie', foreignField: '_id', as: 'movieDetails' } },
      { $project: { organizerId: { $arrayElemAt: ['$movieDetails.organizer', 0] }, totalAmount: 1, createdAt: 1 } },
      { $match: { organizerId: { $in: organizerIds } } },
      {
        $group: {
          _id: '$organizerId',
          revenue: { $sum: '$totalAmount' },
          bookings: { $sum: 1 },
          lastBookingAt: { $max: '$createdAt' }
        }
      }
    ]),
    Booking.aggregate([
      { $match: { status: 'Confirmed', multiplex: { $ne: null } } },
      { $lookup: { from: 'multiplexes', localField: 'multiplex', foreignField: '_id', as: 'multiplexDetails' } },
      { $project: { organizerId: { $arrayElemAt: ['$multiplexDetails.owner', 0] }, totalAmount: 1, createdAt: 1 } },
      { $match: { organizerId: { $in: organizerIds } } },
      {
        $group: {
          _id: '$organizerId',
          revenue: { $sum: '$totalAmount' },
          bookings: { $sum: 1 },
          lastBookingAt: { $max: '$createdAt' }
        }
      }
    ])
  ]);

  const listingMap = new Map();
  const bookingMap = new Map();

  [...eventListingStats, ...movieListingStats, ...multiplexListingStats].forEach((stat) => {
    if (!listingMap.has(String(stat._id))) {
      listingMap.set(String(stat._id), stat);
    }
  });

  [...eventBookingStats, ...movieBookingStats, ...multiplexBookingStats].forEach((stat) => {
    if (!bookingMap.has(String(stat._id))) {
      bookingMap.set(String(stat._id), stat);
    }
  });

  const getOrganizerTypeLabel = (organizer) => {
    const mode = String(organizer.activeMode || organizer.businessType || '').toLowerCase();
    if (['movie', 'producer'].includes(mode)) return 'Movie Organizer';
    if (['multiplex', 'theatre', 'theater', 'cinema'].includes(mode)) return 'Multiplex Organizer';
    return 'Event Organizer';
  };

  const getStatusLabel = (listing = {}) => {
    if (Number(listing.pending || 0) > 0) return 'Pending';
    if (Number(listing.rejected || 0) > 0 && Number(listing.approved || 0) === 0) return 'Needs Review';
    if (Number(listing.approved || 0) > 0) return 'Approved';
    return 'New';
  };

  const getActivityLabel = (lastActivityAt) => {
    if (!lastActivityAt) return 'No activity yet';

    const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceActivity <= 3) return 'Active now';
    if (daysSinceActivity <= 14) return 'Recently active';
    return 'Quiet';
  };

  return organizers
    .map((organizer) => {
      const listing = listingMap.get(String(organizer._id)) || {};
      const booking = bookingMap.get(String(organizer._id)) || {};
      const lastActivityAt = booking.lastBookingAt || listing.lastCreatedAt || organizer.createdAt;

      return {
        id: organizer._id,
        name: organizer.companyName || organizer.name,
        email: organizer.email,
        type: getOrganizerTypeLabel(organizer),
        status: getStatusLabel(listing),
        activity: getActivityLabel(lastActivityAt),
        lastActivityAt,
        listings: Number(listing.listings || 0),
        revenue: Number(booking.revenue || 0),
        bookings: Number(booking.bookings || 0)
      };
    })
    .sort((left, right) => new Date(right.lastActivityAt || 0) - new Date(left.lastActivityAt || 0));
};

// ==========================================
// 1. GLOBAL ADMIN COMMAND CENTER
// ==========================================
export const getAdminDashboardData = async () => {
  const [
    totalUsers,
    totalOrganizers,
    summaryData,
    trendData,
    moduleTouchpoints,
    pendingEvents,
    pendingMovies,
    pendingMultiplexes,
    recentBookings,
    organizers
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'organizer' }),
    Booking.aggregate([
      { $match: { status: 'Confirmed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalBookings: { $sum: 1 },
          todayRevenue: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', getIndiaStartOfDay(0)] }, '$totalAmount', 0]
            }
          },
          platformCommission: { $sum: '$adminCommission' }
        }
      }
    ]),
    Booking.aggregate([
      { $match: { status: 'Confirmed', createdAt: { $gte: get30DaysAgo() } } },
      {
        $group: {
          _id: formatDateLabel,
          revenue: { $sum: '$totalAmount' },
          bookings: { $sum: 1 },
          commission: { $sum: '$adminCommission' }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    getAdminModuleTouchpoints(),
    Event.find({ status: 'Pending' }).populate('organizer', 'name email companyName').sort({ createdAt: -1 }).limit(5).lean(),
    Movie.find({ status: 'Pending' }).populate('organizer', 'name email companyName').sort({ createdAt: -1 }).limit(5).lean(),
    Multiplex.find({ status: 'Pending' }).populate('owner', 'name email companyName').sort({ createdAt: -1 }).limit(5).lean(),
    Booking.find({ status: { $in: ['Confirmed', 'Refunded'] } })
      .sort({ createdAt: -1 })
      .limit(12)
      .populate('user', 'email')
      .populate({ path: 'event', select: 'title organizer', populate: { path: 'organizer', select: 'name companyName' } })
      .populate({ path: 'movie', select: 'title organizer', populate: { path: 'organizer', select: 'name companyName' } })
      .populate({ path: 'multiplex', select: 'multiplexName owner', populate: { path: 'owner', select: 'name companyName' } })
      .lean(),
    getAdminOrganizerRoster()
  ]);

  const summary = summaryData[0] || {
    totalRevenue: 0,
    totalBookings: 0,
    todayRevenue: 0,
    platformCommission: 0
  };

  return {
    kpis: {
      totalRevenue: summary.totalRevenue || 0,
      totalBookings: summary.totalBookings || 0,
      totalUsers,
      totalOrganizers,
      todayRevenue: summary.todayRevenue || 0,
      platformCommission: summary.platformCommission || 0
    },
    chart: trendData.map((point) => ({
      date: point._id,
      revenue: point.revenue || 0,
      bookings: point.bookings || 0,
      commission: point.commission || 0
    })),
    categoryBookings: moduleTouchpoints.map((point) => ({
      name: point.name,
      bookings: point.bookings || 0,
      value: point.bookings || 0,
      revenue: point.revenue || 0
    })),
    pendingCounts: {
      events: pendingEvents.length,
      movies: pendingMovies.length,
      multiplexes: pendingMultiplexes.length
    },
    approvals: {
      events: pendingEvents.map((event) => ({
        id: event._id,
        title: event.title,
        status: event.status,
        organizerName: event.organizer?.companyName || event.organizer?.name || 'Organizer',
        date: event.date,
        location: event.location
      })),
      movies: pendingMovies.map((movie) => ({
        id: movie._id,
        title: movie.title,
        status: movie.status,
        organizerName: movie.organizer?.companyName || movie.organizer?.name || 'Organizer',
        releaseDate: movie.releaseDate
      })),
      multiplexes: pendingMultiplexes.map((multiplex) => ({
        id: multiplex._id,
        title: multiplex.multiplexName,
        status: multiplex.status || 'Pending',
        organizerName: multiplex.owner?.companyName || multiplex.owner?.name || 'Organizer',
        city: multiplex.city
      }))
    },
    recentBookings: recentBookings.map((booking) => ({
      id: booking._id,
      reference: booking.ticketId,
      userEmail: booking.user?.email || booking.guestEmail || 'Guest',
      item: booking.event?.title || booking.movie?.title || booking.multiplex?.multiplexName || 'Booking',
      module: booking.event ? 'Event' : booking.movie ? 'Movie' : booking.multiplex ? 'Multiplex' : booking.itemType || 'Booking',
      amount: Number(booking.totalAmount || 0),
      date: booking.createdAt,
      status: booking.status,
      organizerName:
        booking.event?.organizer?.companyName ||
        booking.event?.organizer?.name ||
        booking.movie?.organizer?.companyName ||
        booking.movie?.organizer?.name ||
        booking.multiplex?.owner?.companyName ||
        booking.multiplex?.owner?.name ||
        'Organizer'
    })),
    organizers
  };
};

export const getAdminFinanceData = async () => {
  const [summaryData, chartData, categorySplit, reportsData] = await Promise.all([
    Booking.aggregate([
      { $match: { status: { $in: ['Confirmed', 'Refunded'] } } },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Confirmed'] }, '$totalAmount', 0]
            }
          },
          commissions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Confirmed'] }, '$adminCommission', 0]
            }
          },
          payouts: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Confirmed'] }, '$organizerPayout', 0]
            }
          },
          refunds: { $sum: { $cond: [{ $eq: ['$status', 'Refunded'] }, '$totalAmount', 0] } },
          totalBookings: { $sum: 1 },
          todayRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'Confirmed'] },
                    { $gte: ['$createdAt', getIndiaStartOfDay(0)] }
                  ]
                },
                '$totalAmount',
                0
              ]
            }
          }
        }
      }
    ]),
    Booking.aggregate([
      { $match: { status: 'Confirmed', createdAt: { $gte: get30DaysAgo() } } },
      {
        $group: {
          _id: formatDateLabel,
          revenue: { $sum: '$totalAmount' },
          commission: { $sum: '$adminCommission' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    getAdminModuleTouchpoints(),
    Booking.find({ status: { $in: ['Confirmed', 'Refunded'] } })
      .sort({ createdAt: -1 })
      .limit(80)
      .populate('user', 'email')
      .populate({ path: 'event', select: 'title organizer', populate: { path: 'organizer', select: 'name companyName' } })
      .populate({ path: 'movie', select: 'title organizer', populate: { path: 'organizer', select: 'name companyName' } })
      .populate({ path: 'multiplex', select: 'multiplexName owner', populate: { path: 'owner', select: 'name companyName' } })
      .lean()
  ]);

  const summary = summaryData[0] || {
    totalRevenue: 0,
    commissions: 0,
    payouts: 0,
    refunds: 0,
    totalBookings: 0,
    todayRevenue: 0
  };

  return {
    summary: {
      totalRevenue: summary.totalRevenue || 0,
      todayRevenue: summary.todayRevenue || 0,
      commissions: summary.commissions || 0,
      payouts: summary.payouts || 0,
      refunds: summary.refunds || 0,
      totalBookings: summary.totalBookings || 0
    },
    chart: chartData.map((point) => ({
      _id: point._id,
      date: point._id,
      revenue: point.revenue || 0,
      commission: point.commission || 0,
      bookings: point.bookings || 0
    })),
    categorySplit: categorySplit.map((point) => ({
      name: point.name,
      revenue: point.revenue || 0,
      bookings: point.bookings || 0
    })),
    districts: categorySplit.map((point) => ({ name: point.name, revenue: point.revenue || 0 })),
    reports: reportsData.map((booking) => ({
      id: booking._id,
      reference: booking.ticketId,
      userEmail: booking.user?.email || booking.guestEmail || 'Guest',
      module: booking.event ? 'Event' : booking.movie ? 'Movie' : booking.multiplex ? 'Multiplex' : booking.itemType || 'Booking',
      itemName: booking.event?.title || booking.movie?.title || booking.multiplex?.multiplexName || 'Booking',
      organizerName:
        booking.event?.organizer?.companyName ||
        booking.event?.organizer?.name ||
        booking.movie?.organizer?.companyName ||
        booking.movie?.organizer?.name ||
        booking.multiplex?.owner?.companyName ||
        booking.multiplex?.owner?.name ||
        'Organizer',
      amount: Number(booking.totalAmount || 0),
      commission: Number(booking.adminCommission || 0),
      date: booking.createdAt,
      status: booking.status
    }))
  };
};

// ==========================================
// 2. EVENT ORGANIZER INTELLIGENCE
// ==========================================
export const getEventMetrics = async (organizerId) => {
  const orgObjId = new mongoose.Types.ObjectId(organizerId);
  const eventCatalog = await getOrganizerEventCatalog(orgObjId);

  if (!eventCatalog.length) {
    return buildEmptyEventDashboardData();
  }

  const eventIds = eventCatalog.map((event) => event._id);
  const [summaryData, chartData] = await Promise.all([
    Booking.aggregate([
      { $match: { event: { $in: eventIds }, status: 'Confirmed' } },
      {
        $group: {
          _id: null,
          grossRevenue: { $sum: '$totalAmount' },
          payouts: { $sum: '$organizerPayout' },
          ticketsSold: { $sum: '$quantity' },
          uniqueUsers: { $addToSet: '$user' }
        }
      }
    ]),
    Booking.aggregate([
      { $match: { event: { $in: eventIds }, status: 'Confirmed', createdAt: { $gte: get30DaysAgo() } } },
      {
        $group: {
          _id: formatDateLabel,
          revenue: { $sum: '$totalAmount' },
          ticketsSold: { $sum: '$quantity' }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const summary = summaryData[0] || {
    grossRevenue: 0,
    payouts: 0,
    ticketsSold: 0,
    uniqueUsers: []
  };

  const reports = eventCatalog.map((event) => ({
    id: event._id,
    title: event.title,
    reference: `EVT-${event._id.toString().slice(-6).toUpperCase()}`,
    status: event.status,
    date: event.date,
    time: event.time,
    location: event.location,
    ticketSales: event.ticketsSold || 0,
    ticketsSold: event.ticketsSold || 0,
    grossRevenue: event.grossRevenue || 0,
    earnings: event.grossRevenue || 0,
    payout: event.payout || 0,
    totalUsers: event.totalUsers || 0,
    isActive: Boolean(event.isActive),
    image: event.image || ''
  }));

  const topEvents = [...reports]
    .filter((report) => Number(report.grossRevenue || 0) > 0)
    .sort((left, right) => Number(right.grossRevenue || 0) - Number(left.grossRevenue || 0))
    .slice(0, 6)
    .map((report) => ({ name: report.title, revenue: report.grossRevenue }));

  const activeEvents = eventCatalog.filter((event) => event.isActive).length;

  return {
    kpis: {
      grossRevenue: summary.grossRevenue || 0,
      revenue: summary.grossRevenue || 0,
      activeEvents,
      activeListings: activeEvents,
      ticketsSold: summary.ticketsSold || 0,
      attendees: summary.ticketsSold || 0,
      totalUsers: Array.isArray(summary.uniqueUsers) ? summary.uniqueUsers.length : 0
    },
    summary: {
      totalRevenue: summary.grossRevenue || 0,
      payouts: summary.payouts || 0,
      pending: 0
    },
    chart: chartData.map((point) => ({
      _id: point._id,
      date: point._id,
      revenue: point.revenue || 0,
      ticketsSold: point.ticketsSold || 0
    })),
    districts: topEvents,
    topEvents,
    reports
  };
};

// ==========================================
// 3. MOVIE PRODUCER INTELLIGENCE
// ==========================================
export const getMovieMetrics = async (organizerId) => {
  const orgObjId = new mongoose.Types.ObjectId(organizerId);
  const movieCatalog = await getOrganizerMovieCatalog(orgObjId);

  if (!movieCatalog.length) {
    return buildEmptyMovieDashboardData();
  }

  const movieIds = movieCatalog.map((movie) => movie._id);
  const [summaryData, chartData] = await Promise.all([
    Booking.aggregate([
      { $match: { movie: { $in: movieIds }, status: 'Confirmed' } },
      {
        $group: {
          _id: null,
          grossRevenue: { $sum: '$totalAmount' },
          payouts: { $sum: '$organizerPayout' },
          ticketsSold: { $sum: '$quantity' },
          uniqueUsers: { $addToSet: '$user' }
        }
      }
    ]),
    Booking.aggregate([
      { $match: { movie: { $in: movieIds }, status: 'Confirmed', createdAt: { $gte: get30DaysAgo() } } },
      {
        $group: {
          _id: formatDateLabel,
          revenue: { $sum: '$totalAmount' },
          ticketsSold: { $sum: '$quantity' }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const summary = summaryData[0] || {
    grossRevenue: 0,
    payouts: 0,
    ticketsSold: 0,
    uniqueUsers: []
  };

  const reports = movieCatalog.map((movie) => ({
    id: movie._id,
    title: movie.title,
    reference: `MOV-${movie._id.toString().slice(-6).toUpperCase()}`,
    status: movie.status,
    releaseDate: movie.releaseDate,
    languages: Array.isArray(movie.language) ? movie.language : [],
    certificate: movie.certificate || 'UA',
    shows: movie.showCount || 0,
    activeShows: movie.activeShows || 0,
    ticketsSold: movie.ticketsSold || 0,
    grossRevenue: movie.grossRevenue || 0,
    payout: movie.payout || 0,
    totalUsers: movie.totalUsers || 0,
    isActive: Boolean(movie.isActive),
    poster: movie.poster || ''
  }));

  const topMovies = [...reports]
    .filter((report) => Number(report.grossRevenue || 0) > 0)
    .sort((left, right) => Number(right.grossRevenue || 0) - Number(left.grossRevenue || 0))
    .slice(0, 6)
    .map((report) => ({ name: report.title, revenue: report.grossRevenue }));

  const activeMovies = movieCatalog.filter((movie) => movie.isActive).length;

  return {
    kpis: {
      grossRevenue: summary.grossRevenue || 0,
      revenue: summary.grossRevenue || 0,
      activeMovies,
      activeListings: activeMovies,
      ticketsSold: summary.ticketsSold || 0,
      attendees: summary.ticketsSold || 0,
      totalUsers: Array.isArray(summary.uniqueUsers) ? summary.uniqueUsers.length : 0
    },
    summary: {
      totalRevenue: summary.grossRevenue || 0,
      payouts: summary.payouts || 0,
      pending: 0
    },
    chart: chartData.map((point) => ({
      date: point._id,
      _id: point._id,
      revenue: point.revenue || 0,
      ticketsSold: point.ticketsSold || 0
    })),
    districts: topMovies,
    topMovies,
    reports
  };
};

// ==========================================
// 4. MULTIPLEX OWNER INTELLIGENCE
// ==========================================
export const getMultiplexMetrics = async (organizerId) => {
  const orgObjId = new mongoose.Types.ObjectId(organizerId);
  const multiplexCatalog = await getOrganizerMultiplexCatalog(orgObjId);

  if (!multiplexCatalog.multiplexes.length) {
    return buildEmptyMultiplexDashboardData();
  }

  const multiplexIds = multiplexCatalog.multiplexes.map((multiplex) => multiplex._id);
  const [summaryData, chartData, movieBreakdown] = await Promise.all([
    Booking.aggregate([
      { $match: { multiplex: { $in: multiplexIds }, status: 'Confirmed' } },
      {
        $group: {
          _id: null,
          grossRevenue: { $sum: '$totalAmount' },
          payouts: { $sum: '$organizerPayout' },
          ticketsSold: { $sum: '$quantity' },
          uniqueUsers: { $addToSet: '$user' } // 🚀 FIX 5a: Fetch unique users
        }
      }
    ]),
    Booking.aggregate([
      { $match: { multiplex: { $in: multiplexIds }, status: 'Confirmed', createdAt: { $gte: get30DaysAgo() } } },
      {
        $group: {
          _id: formatDateLabel,
          revenue: { $sum: '$totalAmount' },
          ticketsSold: { $sum: '$quantity' }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Booking.aggregate([
      { $match: { multiplex: { $in: multiplexIds }, status: 'Confirmed' } },
      { $lookup: { from: 'movies', localField: 'movie', foreignField: '_id', as: 'movieDetails' } },
      {
        $group: {
          _id: { $ifNull: [{ $arrayElemAt: ['$movieDetails.title', 0] }, 'Unknown Movie'] },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 6 }
    ])
  ]);

  const summary = summaryData[0] || { grossRevenue: 0, payouts: 0, ticketsSold: 0 };
  const reports = multiplexCatalog.multiplexes.map((multiplex) => {
    const totalCapacity = multiplex.screens.reduce((sum, screen) => sum + Number(screen.totalSeats || 0), 0);
    const occupiedSeats = multiplex.shows.reduce((sum, show) => sum + Number(show.bookedSeats?.length || 0), 0);

    return {
      id: multiplex._id,
      title: multiplex.multiplexName,
      city: multiplex.city,
      screens: multiplex.totalScreens,
      activeShows: multiplex.activeShows,
      ticketsSold: multiplex.ticketsSold,
      grossRevenue: multiplex.grossRevenue,
      payout: multiplex.payout,
      occupancy: totalCapacity > 0 ? Math.round((occupiedSeats / totalCapacity) * 100) : 0
    };
  });

  return {
    kpis: {
      totalScreens: multiplexCatalog.screens.length,
      activeShows: multiplexCatalog.shows.filter((show) => show.date >= getIndiaDateString()).length,
      ticketsSold: summary.ticketsSold || 0,
      totalUsers: Array.isArray(summary.uniqueUsers) ? summary.uniqueUsers.length : 0, 
      grossRevenue: summary.grossRevenue || 0,
      revenue: summary.grossRevenue || 0,
      attendees: summary.ticketsSold || 0,
      activeListings: multiplexCatalog.multiplexes.length
    },
    summary: {
      totalRevenue: summary.grossRevenue || 0,
      payouts: summary.payouts || 0,
      pending: 0
    },
    chart: chartData.map((point) => ({
      date: point._id,
      _id: point._id,
      revenue: point.revenue || 0,
      ticketsSold: point.ticketsSold || 0
    })),
    districts: movieBreakdown.map((point) => ({ name: point._id || 'Unknown Movie', revenue: point.revenue || 0 })),
    topMovies: movieBreakdown.map((point) => ({ name: point._id || 'Unknown Movie', revenue: point.revenue || 0 })),
    reports,
    management: {
      multiplexes: multiplexCatalog.multiplexes.length,
      screens: multiplexCatalog.screens.length,
      activeShows: multiplexCatalog.shows.filter((show) => show.date >= getIndiaDateString()).length
    }
  };
};

// ==========================================
// 5. ROUTING CONTROLLERS
// ==========================================
export const getOrganizerDashboardData = async (params) => {
  if (params.type === 'movie') return getMovieMetrics(params.organizerId);
  if (params.type === 'multiplex') return getMultiplexMetrics(params.organizerId);
  return getEventMetrics(params.organizerId);
};

export const getOrganizerFinanceData = async (params) => {
  const organizerId = params.organizerId;
  const type = params.type;
  const orgObjId = organizerId ? new mongoose.Types.ObjectId(organizerId) : null;

  if (!orgObjId) {
    return buildEmptyOrganizerFinanceData();
  }

  const chartDateMatch = { createdAt: { $gte: get30DaysAgo() } };

  if (type === 'movie') {
    const movieCatalog = await getOrganizerMovieCatalog(orgObjId);
    if (!movieCatalog.length) {
      return buildEmptyOrganizerFinanceData();
    }

    const movieIds = movieCatalog.map((movie) => movie._id);
    const movieNameById = new Map(movieCatalog.map((movie) => [String(movie._id), movie.title]));
    const startOfToday = getIndiaStartOfDay(0);
    const startOfWeek = getIndiaStartOfDay(-6);

    const [summaryData, chartData, reportsData] = await Promise.all([
      Booking.aggregate([
        { $match: { movie: { $in: movieIds }, status: 'Confirmed' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            payouts: { $sum: '$organizerPayout' },
            todayRevenue: {
              $sum: {
                $cond: [{ $gte: ['$createdAt', startOfToday] }, '$totalAmount', 0]
              }
            },
            weeklyRevenue: {
              $sum: {
                $cond: [{ $gte: ['$createdAt', startOfWeek] }, '$totalAmount', 0]
              }
            },
            ticketsSold: { $sum: '$quantity' },
            uniqueUsers: { $addToSet: '$user' }
          }
        }
      ]),
      Booking.aggregate([
        { $match: { movie: { $in: movieIds }, status: 'Confirmed', ...chartDateMatch } },
        {
          $group: {
            _id: formatDateLabel,
            revenue: { $sum: '$totalAmount' },
            ticketsSold: { $sum: '$quantity' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Booking.find({ movie: { $in: movieIds } })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('movie', 'title')
        .populate('user', 'email')
        .lean()
    ]);

    const summary = summaryData[0] || {
      totalRevenue: 0,
      payouts: 0,
      todayRevenue: 0,
      weeklyRevenue: 0,
      ticketsSold: 0,
      uniqueUsers: []
    };

    const breakdownByEvent = [...movieCatalog]
      .filter((movie) => Number(movie.grossRevenue || 0) > 0)
      .sort((left, right) => Number(right.grossRevenue || 0) - Number(left.grossRevenue || 0))
      .slice(0, 8)
      .map((movie) => ({
        name: movie.title,
        revenue: Number(movie.grossRevenue || 0),
        ticketsSold: Number(movie.ticketsSold || 0)
      }));

    return {
      summary: {
        totalRevenue: summary.totalRevenue || 0,
        payouts: summary.payouts || 0,
        pending: 0,
        todayRevenue: summary.todayRevenue || 0,
        weeklyRevenue: summary.weeklyRevenue || 0,
        ticketsSold: summary.ticketsSold || 0,
        totalUsers: Array.isArray(summary.uniqueUsers) ? summary.uniqueUsers.length : 0
      },
      chart: chartData.map((point) => ({
        _id: point._id,
        date: point._id,
        revenue: point.revenue || 0,
        ticketsSold: point.ticketsSold || 0
      })),
      districts: breakdownByEvent,
      breakdownByEvent,
      breakdownByCategory: [],
      reports: reportsData.map((booking) => ({
        id: booking._id,
        reference: booking.ticketId,
        userEmail: booking.user?.email || booking.guestEmail || 'Guest',
        movieName: booking.movie?.title || movieNameById.get(String(booking.movie)) || 'Movie',
        ticketsPurchased: Number(booking.quantity || 0),
        totalAmount: Number(booking.totalAmount || 0),
        date: booking.createdAt,
        status: booking.status
      }))
    };
  }

  if (type === 'multiplex') {
    const multiplexCatalog = await getOrganizerMultiplexCatalog(orgObjId);
    if (!multiplexCatalog.multiplexes.length) {
      return buildEmptyOrganizerFinanceData();
    }

    const multiplexIds = multiplexCatalog.multiplexes.map((multiplex) => multiplex._id);
    const activeShowIds = multiplexCatalog.shows
      .filter((show) => show.date >= getIndiaDateString())
      .map((show) => show._id);

    const [summaryData, chartData, screenBreakdownData, movieBreakdownData, reportsData] = await Promise.all([
      Booking.aggregate([
        { $match: { multiplex: { $in: multiplexIds }, status: 'Confirmed' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            payouts: { $sum: '$organizerPayout' },
            todayRevenue: {
              $sum: {
                $cond: [{ $gte: ['$createdAt', getIndiaStartOfDay(0)] }, '$totalAmount', 0]
              }
            },
            showsRevenue: {
              $sum: {
                $cond: [{ $in: ['$show', activeShowIds] }, '$totalAmount', 0]
              }
            },
            ticketsSold: { $sum: '$quantity' }
          }
        }
      ]),
      Booking.aggregate([
        { $match: { multiplex: { $in: multiplexIds }, status: 'Confirmed', ...chartDateMatch } },
        {
          $group: {
            _id: formatDateLabel,
            revenue: { $sum: '$totalAmount' },
            ticketsSold: { $sum: '$quantity' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Booking.aggregate([
        { $match: { multiplex: { $in: multiplexIds }, status: 'Confirmed' } },
        { $lookup: { from: 'screens', localField: 'screen', foreignField: '_id', as: 'screenDetails' } },
        {
          $group: {
            _id: { $ifNull: [{ $arrayElemAt: ['$screenDetails.screenName', 0] }, 'Unknown Screen'] },
            revenue: { $sum: '$totalAmount' },
            ticketsSold: { $sum: '$quantity' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 8 }
      ]),
      Booking.aggregate([
        { $match: { multiplex: { $in: multiplexIds }, status: 'Confirmed' } },
        { $lookup: { from: 'movies', localField: 'movie', foreignField: '_id', as: 'movieDetails' } },
        {
          $group: {
            _id: { $ifNull: [{ $arrayElemAt: ['$movieDetails.title', 0] }, 'Unknown Movie'] },
            revenue: { $sum: '$totalAmount' },
            ticketsSold: { $sum: '$quantity' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 8 }
      ]),
      Booking.find({ multiplex: { $in: multiplexIds } })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('movie', 'title')
        .populate('screen', 'screenName')
        .populate('user', 'email')
        .lean()
    ]);

    const summary = summaryData[0] || { totalRevenue: 0, payouts: 0, todayRevenue: 0, showsRevenue: 0, ticketsSold: 0 };

    return {
      summary: {
        totalRevenue: summary.totalRevenue || 0,
        payouts: summary.payouts || 0,
        pending: 0,
        todayRevenue: summary.todayRevenue || 0,
        showsRevenue: summary.showsRevenue || 0,
        ticketsSold: summary.ticketsSold || 0
      },
      chart: chartData
        .sort((a, b) => new Date(a._id) - new Date(b._id))
        .map((point) => ({
          _id: point._id,
          date: point._id,
          revenue: point.revenue || 0,
          ticketsSold: point.ticketsSold || 0
        })),
      districts: screenBreakdownData.map((point) => ({ name: point._id || 'Unknown Screen', revenue: point.revenue || 0 })),
      breakdownByEvent: movieBreakdownData.map((point) => ({ name: point._id || 'Unknown Movie', revenue: point.revenue || 0, ticketsSold: point.ticketsSold || 0 })),
      breakdownByCategory: screenBreakdownData.map((point) => ({ name: point._id || 'Unknown Screen', revenue: point.revenue || 0, ticketsSold: point.ticketsSold || 0 })),
      reports: reportsData.map((booking) => ({
        id: booking._id,
        reference: booking.ticketId,
        userEmail: booking.user?.email || booking.guestEmail || 'Guest',
        movieName: booking.movie?.title || 'Movie',
        screenNumber: booking.screen?.screenName || 'N/A',
        ticketsPurchased: Number(booking.quantity || 0),
        totalAmount: Number(booking.totalAmount || 0),
        date: booking.createdAt,
        status: booking.status
      }))
    };
  }

  const eventCatalog = await getOrganizerEventCatalog(orgObjId);
  if (!eventCatalog.length) {
    return buildEmptyOrganizerFinanceData();
  }

  const eventIds = eventCatalog.map((event) => event._id);
  const eventNameById = new Map(eventCatalog.map((event) => [String(event._id), event.title]));
  const startOfToday = getIndiaStartOfDay(0);
  const startOfWeek = getIndiaStartOfDay(-6);

  const [summaryData, chartData, categoryBreakdownData, reportsData] = await Promise.all([
    Booking.aggregate([
      { $match: { event: { $in: eventIds }, status: 'Confirmed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          payouts: { $sum: '$organizerPayout' },
          todayRevenue: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', startOfToday] }, '$totalAmount', 0]
            }
          },
          weeklyRevenue: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', startOfWeek] }, '$totalAmount', 0]
            }
          },
          ticketsSold: { $sum: '$quantity' },
          uniqueUsers: { $addToSet: '$user' }
        }
      }
    ]),
    Booking.aggregate([
      { $match: { event: { $in: eventIds }, status: 'Confirmed', ...chartDateMatch } },
      {
        $group: {
          _id: formatDateLabel,
          revenue: { $sum: '$totalAmount' },
          ticketsSold: { $sum: '$quantity' }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Booking.aggregate([
      { $match: { event: { $in: eventIds }, status: 'Confirmed' } },
      {
        $group: {
          _id: { $ifNull: ['$categoryName', 'General Entry'] },
          revenue: { $sum: '$totalAmount' },
          ticketsSold: { $sum: '$quantity' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 }
    ]),
    Booking.find({ event: { $in: eventIds } })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('event', 'title')
      .populate('user', 'email')
      .lean()
  ]);

  const summary = summaryData[0] || {
    totalRevenue: 0,
    payouts: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
    ticketsSold: 0,
    uniqueUsers: []
  };

  const breakdownByEvent = [...eventCatalog]
    .filter((event) => Number(event.grossRevenue || 0) > 0)
    .sort((left, right) => Number(right.grossRevenue || 0) - Number(left.grossRevenue || 0))
    .slice(0, 8)
    .map((event) => ({
      name: event.title,
      revenue: Number(event.grossRevenue || 0),
      ticketsSold: Number(event.ticketsSold || 0)
    }));

  const breakdownByCategory = categoryBreakdownData.map((item) => ({
    name: item._id || 'General Entry',
    revenue: Number(item.revenue || 0),
    ticketsSold: Number(item.ticketsSold || 0)
  }));

  const reports = reportsData.map((booking) => ({
    id: booking._id,
    reference: booking.ticketId,
    userEmail: booking.user?.email || booking.guestEmail || 'Guest',
    eventName: booking.event?.title || eventNameById.get(String(booking.event)) || 'Event',
    ticketsPurchased: Number(booking.quantity || 0),
    totalAmount: Number(booking.totalAmount || 0),
    date: booking.createdAt,
    status: booking.status,
    categoryName: booking.categoryName || 'General Entry'
  }));

  return {
    summary: {
      totalRevenue: summary.totalRevenue || 0,
      payouts: summary.payouts || 0,
      pending: 0,
      todayRevenue: summary.todayRevenue || 0,
      weeklyRevenue: summary.weeklyRevenue || 0,
      ticketsSold: summary.ticketsSold || 0,
      totalUsers: Array.isArray(summary.uniqueUsers) ? summary.uniqueUsers.length : 0
    },
    chart: chartData.map((point) => ({
      _id: point._id,
      date: point._id,
      revenue: point.revenue || 0,
      ticketsSold: point.ticketsSold || 0
    })),
    districts: breakdownByEvent,
    breakdownByEvent,
    breakdownByCategory,
    reports
  };
};
