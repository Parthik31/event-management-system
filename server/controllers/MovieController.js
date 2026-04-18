import Movie from '../models/Movie.js';
import Show from '../models/Show.js';
import Multiplex from '../models/Multiplex.js';
import Screen from '../models/Screen.js';
import Booking from '../models/Booking.js';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { getApprovedMultiplexQuery } from './MultiplexController.js';
import { getTodayDateString } from '../utils/date.js';
import {
  addMinutesToTime,
  buildRowLabel,
  buildShowRowCategories,
  getCategoryEntries,
  getShowSlotLabel,
  getTimeDifferenceInMinutes,
  normalizeSeatCategoryPricing,
  normalizeSeatCategoryPricingInput,
  normalizeShowSlotPricing
} from '../utils/showPricing.js';

const parseListField = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // Not JSON; fall through
    }

    return trimmed
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  return [];
};

const getUniqueShowCategories = (show) => {
  const showRows = Array.isArray(show?.rowCategories) ? show.rowCategories : [];
  const rowCategories = showRows
    .map((item) => String(item?.category || '').trim())
    .filter(Boolean);

  if (rowCategories.length) {
    return Array.from(new Set(rowCategories));
  }

  const pricingCategories = Object.keys(normalizeSeatCategoryPricingInput(show?.seatCategoryPricing || {}))
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return pricingCategories.length ? pricingCategories : ['Standard'];
};

const getShowRowCategories = (show, options = {}) => {
  const existingRows = Array.isArray(show?.rowCategories) ? show.rowCategories : [];
  if (existingRows.length) {
    return existingRows;
  }

  return buildShowRowCategories(
    Number(show?.screen?.layout?.rows || options.rows || 0),
    show?.seatCategoryPricing,
    show?.basePrice || options.basePrice || 250
  );
};

const getAssignedSeatCategory = (show, rowLabel, rowIndex, options = {}) => {
  const configuredRows = getShowRowCategories(show, options);
  const matched = configuredRows.find((item) => String(item?.rowLabel || '').toUpperCase() === String(rowLabel || '').toUpperCase());
  if (matched?.category) {
    return matched.category;
  }

  return configuredRows[rowIndex]?.category || getUniqueShowCategories(show)[0] || 'Standard';
};

const buildSeatPricingPreview = (show, options = {}) => {
  const screenRows = Number(show?.screen?.layout?.rows || options.rows || 0);
  const rowCategories = getShowRowCategories(show, options);
  const pricing = normalizeSeatCategoryPricing(show?.seatCategoryPricing, show?.basePrice);
  const slotPricing = normalizeShowSlotPricing(show?.showSlotPricing);
  const slotLabel = getShowSlotLabel(show?.baseStartTime || show?.startTime);
  const slotAdjustment = Number(slotPricing[slotLabel] || 0);
  const formatPremium = show?.format === 'IMAX' || show?.format === '4DX' ? 150 : 0;
  const isWeekend = new Date(show?.date).getDay() === 0 || new Date(show?.date).getDay() === 6;
  const capacity = Number(show?.screen?.totalSeats || options.totalSeats || 100);
  const bookedCount = Number(show?.bookedSeats?.length || 0);
  const fillRate = capacity > 0 ? bookedCount / capacity : 0;
  const surgeMultiplier = (isWeekend ? 1.15 : 1) * (fillRate >= 0.8 ? 1.2 : 1);

  const categoryPreview = Object.fromEntries(
    Object.entries(pricing).map(([category, amount]) => [
      category,
      Math.round((Number(amount || 0) + slotAdjustment + formatPremium) * surgeMultiplier)
    ])
  );

  return {
    rowCount: screenRows,
    slotLabel,
    slotAdjustment,
    categoryPreview,
    seatCategories: Array.from({ length: screenRows }).map((_, rowIndex) => ({
      rowIndex,
      rowLabel: buildRowLabel(rowIndex),
      category: getAssignedSeatCategory(show, buildRowLabel(rowIndex), rowIndex, options)
    })),
    isSurgeActive: isWeekend || fillRate >= 0.8
  };
};

// ==========================================
// PRODUCER & ADMIN LOGIC
// ==========================================

export const createMovie = async (req, res) => {
  try {
    const {
      title, description, duration, releaseDate,
      certificate, genre, language, castData, trailerUrls
    } = req.body;

    const posterUrl = req.files?.poster?.[0]?.path || req.body.posterUrl || req.body.poster || '';
    const bannerUrl = req.files?.banner?.[0]?.path || req.body.bannerUrl || req.body.banner || '';

    let parsedCast = [];
    if (castData) {
      try {
        parsedCast = typeof castData === 'string' ? JSON.parse(castData) : castData;
      } catch (err) {
        parsedCast = [];
      }
    }

    let parsedTrailers = [];
    if (trailerUrls) {
      try {
        parsedTrailers = typeof trailerUrls === 'string' ? JSON.parse(trailerUrls) : trailerUrls;
      } catch (err) {
        parsedTrailers = [];
      }
    }

    const isUpcoming = new Date(releaseDate) > new Date();

    const movie = await Movie.create({
      title, description, duration: Number(duration), releaseDate,
      certificate, 
      genre: parseListField(genre),
      language: parseListField(language),
      poster: posterUrl, banner: bannerUrl, trailers: parsedTrailers, cast: parsedCast,
      isUpcoming, organizer: req.user.id, status: 'Pending' 
    });

    res.status(201).json({ success: true, data: movie });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPendingMovies = async (req, res) => {
  try {
    const movies = await Movie.find({ status: 'Pending' })
      .populate('organizer', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: movies.length, data: movies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMovieStatus = async (req, res) => {
  try {
    const { status } = req.body; 
    
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const existingMovie = await Movie.findById(req.params.id);
    if (!existingMovie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    const isUpcoming = status === 'Approved'
      ? new Date(existingMovie.releaseDate) > new Date()
      : false;

    const movie = await Movie.findByIdAndUpdate(
      req.params.id, { status, isUpcoming }, { returnDocument: 'after', runValidators: true }
    );

    res.status(200).json({ success: true, data: movie });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMovie = async (req, res) => {
  try {
    const movieId = req.params.id;

    const existingMovie = await Movie.findById(movieId);
    if (!existingMovie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    if (existingMovie.organizer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this movie' });
    }

    const {
      title, description, duration, releaseDate,
      certificate, genre, language, castData, trailerUrls
    } = req.body;

    const posterUrl = req.files?.poster?.[0]?.path || req.body.posterUrl || req.body.poster || existingMovie.poster || '';
    const bannerUrl = req.files?.banner?.[0]?.path || req.body.bannerUrl || req.body.banner || existingMovie.banner || '';

    if (!posterUrl || !bannerUrl) {
      return res.status(400).json({ success: false, message: 'Poster and banner are required.' });
    }

    let parsedCast = [];
    if (castData) {
      try {
        parsedCast = typeof castData === 'string' ? JSON.parse(castData) : castData;
      } catch {
        parsedCast = [];
      }
    }

    let parsedTrailers = [];
    if (trailerUrls) {
      try {
        parsedTrailers = typeof trailerUrls === 'string' ? JSON.parse(trailerUrls) : trailerUrls;
      } catch {
        parsedTrailers = [];
      }
    }

    const isUpcoming = new Date(releaseDate) > new Date();

    const existingCast = Array.isArray(existingMovie.cast) ? existingMovie.cast : [];
    const normalizedCast = Array.isArray(parsedCast)
      ? parsedCast.map((c, idx) => ({
          name: c?.name || '',
          role: c?.role || '',
          image: c?.image || existingCast[idx]?.image
        }))
      : [];

    const movie = await Movie.findByIdAndUpdate(
      movieId,
      {
        title,
        description,
        duration: Number(duration),
        releaseDate,
        certificate,
        genre: parseListField(genre),
        language: parseListField(language),
        poster: posterUrl,
        banner: bannerUrl,
        trailers: parsedTrailers,
        cast: normalizedCast,
        isUpcoming,
      },
      { returnDocument: 'after', runValidators: true }
    );

    res.status(200).json({ success: true, data: movie });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrganizerMovies = async (req, res) => {
  try {
    const movies = await Movie.find({ organizer: req.user.id }).sort({ createdAt: -1 }).lean();

    if (!movies.length) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const movieIds = movies.map((movie) => new mongoose.Types.ObjectId(movie._id));
    
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

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
            totalUsers: { $addToSet: '$user' }
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
            totalShows: { $sum: 1 },
            activeShows: {
              $sum: {
                $cond: [{ $gte: ['$date', today] }, 1, 0]
              }
            }
          }
        }
      ])
    ]);

    const bookingMap = new Map(bookingStats.map((stat) => [String(stat._id), stat]));
    const showMap = new Map(showStats.map((stat) => [String(stat._id), stat]));

    const enrichedMovies = movies.map((movie) => {
      const booking = bookingMap.get(String(movie._id));
      const shows = showMap.get(String(movie._id));
      const releaseDate = movie.releaseDate ? new Date(movie.releaseDate) : null;
      const isActive =
        movie.status === 'Approved' &&
        releaseDate &&
        releaseDate <= new Date(`${today}T00:00:00+05:30`) &&
        Number(shows?.activeShows || 0) > 0;

      return {
        ...movie,
        ticketsSold: Number(booking?.ticketsSold || 0),
        grossRevenue: Number(booking?.grossRevenue || 0),
        totalUsers: Array.isArray(booking?.totalUsers) ? booking.totalUsers.length : 0,
        totalShows: Number(shows?.totalShows || 0),
        activeShows: Number(shows?.activeShows || 0),
        isActive
      };
    });

    res.status(200).json({ success: true, count: enrichedMovies.length, data: enrichedMovies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// PUBLIC DISCOVERY LOGIC
// ==========================================

export const getMovies = async (req, res) => {
  try {
    const { status, city, genre } = req.query;
    const isAdminRequest = req.user?.role === 'admin';
    const wantsAllApproved = !isAdminRequest && status === 'Approved';
    const query = {};

    if (status === 'coming-soon') {
      query.isUpcoming = true;
      query.status = 'Approved';
    } else if (isAdminRequest && status && ['Pending', 'Approved', 'Rejected'].includes(status)) {
      query.status = status;
    } else if (wantsAllApproved) {
      query.status = 'Approved';
    } else {
      query.isUpcoming = false;
      query.status = 'Approved';
    }

    if (genre) query.genre = { $in: genre.split(',') };

    if (city && city !== 'All Cities') {
        const multiplexesInCity = await Multiplex.find({
          city: new RegExp(`^${city}$`, 'i'),
          ...getApprovedMultiplexQuery()
        }).select('_id');
        const activeMovieIds = await Show.distinct('movie', {
            multiplex: { $in: multiplexesInCity.map(m => m._id) }
        });
        const scheduledMovieIds = await Show.distinct('movie');

        if (wantsAllApproved) {
          query.$or = [
            { isUpcoming: true },
            { _id: { $in: activeMovieIds } },
            { _id: { $nin: scheduledMovieIds } }
          ];
        } else if (query.isUpcoming === false && (activeMovieIds.length > 0 || scheduledMovieIds.length > 0)) {
          query.$or = [
            { _id: { $in: activeMovieIds } },
            { _id: { $nin: scheduledMovieIds } }
          ];
        }
    }

    const movies = await Movie.find(query)
      .populate('organizer', 'name email companyName businessType')
      .sort({ releaseDate: -1 });
    res.status(200).json({ success: true, count: movies.length, data: movies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMovieById = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).populate('organizer', 'name email');
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });

    if (movie.status !== 'Approved') {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }
    
    res.status(200).json({ success: true, data: movie });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMovieByIdForManagement = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).populate('organizer', 'name email companyName businessType');

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    if (req.user.role !== 'admin' && String(movie.organizer?._id || movie.organizer) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this movie' });
    }

    res.status(200).json({ success: true, data: movie });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// THEATRE OWNER & SHOWTIME LOGIC
// ==========================================

export const createShowtime = async (req, res) => {
  try {
    const {
      multiplexId,
      screenId,
      multiplexIds,
      screenIds,
      date,
      dates,
      startTime,
      startTimes,
      staggerMinutes,
      language,
      format,
      basePrice,
      seatRowPartitions,
      seatCategoryPricing,
      showSlotPricing
    } = req.body;
    const movieId = req.params.id;

    const movie = await Movie.findById(movieId);
    if (!movie || movie.status !== 'Approved') {
      return res.status(400).json({ success: false, message: 'Movie is not approved for screening.' });
    }

    const normalizedMultiplexIds = Array.isArray(multiplexIds)
      ? multiplexIds
      : multiplexId
        ? [multiplexId]
        : [];
    const normalizedScreenIds = Array.isArray(screenIds)
      ? screenIds
      : screenId
        ? [screenId]
        : [];
    const normalizedStartTimes = Array.isArray(startTimes)
      ? startTimes.filter(Boolean)
      : startTime
        ? [startTime]
        : [];
    const normalizedDates = Array.isArray(dates)
      ? dates.filter(Boolean)
      : date
        ? [date]
        : [];
    const normalizedStaggerMinutes = Number(staggerMinutes || 15);
    const normalizedBasePrice = Number(basePrice || 250);
    const normalizedSeatRowPartitions = Math.min(4, Math.max(1, Number(seatRowPartitions || 2)));

    if (!normalizedMultiplexIds.length) {
      return res.status(400).json({ success: false, message: 'Select at least one multiplex.' });
    }

    if (!normalizedScreenIds.length) {
      return res.status(400).json({ success: false, message: 'Select at least one screen.' });
    }

    if (!normalizedDates.length) {
      return res.status(400).json({ success: false, message: 'Select at least one show date.' });
    }

    if (!normalizedStartTimes.length) {
      return res.status(400).json({ success: false, message: 'Select at least one show start time.' });
    }

    const ownedMultiplexes = await Multiplex.find({
      _id: { $in: normalizedMultiplexIds },
      owner: req.user.id
    });

    if (ownedMultiplexes.length !== normalizedMultiplexIds.length) {
      return res.status(403).json({ success: false, message: 'You can only schedule shows in your own multiplexes.' });
    }

    const pendingMultiplex = ownedMultiplexes.find((item) => item.status && item.status !== 'Approved');
    if (pendingMultiplex) {
      return res.status(400).json({ success: false, message: 'One of the selected multiplexes is still pending admin approval.' });
    }

    const multiplexIdSet = new Set(ownedMultiplexes.map((item) => String(item._id)));
    const screens = await Screen.find({
      _id: { $in: normalizedScreenIds },
      multiplex: { $in: normalizedMultiplexIds }
    });

    if (screens.length !== normalizedScreenIds.length) {
      return res.status(404).json({ success: false, message: 'One or more selected screens were not found for the chosen multiplexes.' });
    }

    const invalidScreen = screens.find((item) => !multiplexIdSet.has(String(item.multiplex)));
    if (invalidScreen) {
      return res.status(400).json({ success: false, message: 'Selected screens must belong to the chosen multiplexes.' });
    }

    const normalizedSeatCategoryPricing = normalizeSeatCategoryPricing(seatCategoryPricing, normalizedBasePrice);
    const categoryEntries = Object.entries(normalizedSeatCategoryPricing);
    if (categoryEntries.length < 1 || categoryEntries.length > 7) {
      return res.status(400).json({ success: false, message: 'Please keep between 1 and 7 seat categories.' });
    }

    const minimumRowCount = Math.min(...screens.map((screen) => Number(screen.layout?.rows || 0)).filter(Boolean));
    if (categoryEntries.length > minimumRowCount) {
      return res.status(400).json({ success: false, message: 'Seat category count cannot be more than the number of rows in the selected screens.' });
    }

    const normalizedShowSlotPricing = normalizeShowSlotPricing(showSlotPricing);

    const sortedScreens = [...screens].sort((left, right) => {
      const multiplexOrder = String(left.multiplex).localeCompare(String(right.multiplex));
      if (multiplexOrder !== 0) return multiplexOrder;
      return String(left.screenName || '').localeCompare(String(right.screenName || ''));
    });

    const shows = await Show.insertMany(
      normalizedDates.flatMap((currentDate) =>
        normalizedStartTimes.flatMap((baseStartTime) => {
          const waveGroupId = crypto.randomUUID();
          return (
          sortedScreens.map((item, index) => ({
            movie: movieId,
            multiplex: item.multiplex,
            screen: item._id,
            date: currentDate,
            waveGroupId,
            baseStartTime,
            startTime: addMinutesToTime(baseStartTime, normalizedStaggerMinutes * index),
            language,
            format: format || '2D',
            basePrice: normalizedBasePrice,
            seatRowPartitions: normalizedSeatRowPartitions,
            seatCategoryPricing: normalizedSeatCategoryPricing,
            rowCategories: buildShowRowCategories(item.layout?.rows, normalizedSeatCategoryPricing, normalizedBasePrice),
            showSlotPricing: normalizedShowSlotPricing
          }))
          );
        })
      )
    );

    res.status(201).json({ success: true, count: shows.length, data: shows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateShowtime = async (req, res) => {
  try {
    const {
      date,
      startTime,
      language,
      format,
      basePrice,
      seatRowPartitions,
      seatCategoryPricing,
      showSlotPricing
    } = req.body;

    const show = await Show.findById(req.params.showId)
      .populate('multiplex', 'owner')
      .populate('screen', 'screenName rowCategories layout totalSeats');

    if (!show) {
      return res.status(404).json({ success: false, message: 'Show not found.' });
    }

    if (String(show.multiplex?.owner) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this show.' });
    }

    show.date = date ?? show.date;
    show.startTime = startTime ?? show.startTime;
    show.language = language ?? show.language;
    show.format = format ?? show.format;
    show.basePrice = basePrice != null ? Number(basePrice) : show.basePrice;
    show.seatRowPartitions = seatRowPartitions != null ? Math.min(4, Math.max(1, Number(seatRowPartitions))) : show.seatRowPartitions;
    const nextSeatCategoryPricing = seatCategoryPricing
      ? normalizeSeatCategoryPricing(seatCategoryPricing, show.basePrice)
      : normalizeSeatCategoryPricing(show.seatCategoryPricing, show.basePrice);
    const categoryEntries = Object.entries(nextSeatCategoryPricing);
    if (categoryEntries.length < 1 || categoryEntries.length > 7) {
      return res.status(400).json({ success: false, message: 'Please keep between 1 and 7 seat categories.' });
    }

    if (categoryEntries.length > Number(show.screen?.layout?.rows || 0)) {
      return res.status(400).json({ success: false, message: 'Seat category count cannot be more than the number of rows in the selected screen.' });
    }

    show.seatCategoryPricing = nextSeatCategoryPricing;
    show.rowCategories = buildShowRowCategories(show.screen?.layout?.rows, show.seatCategoryPricing, show.basePrice);
    show.showSlotPricing = showSlotPricing
      ? normalizeShowSlotPricing(showSlotPricing)
      : normalizeShowSlotPricing(show.showSlotPricing);

    await show.save();

    res.status(200).json({ success: true, data: show });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateShowWave = async (req, res) => {
  try {
    const {
      movieId,
      multiplexIds,
      screenIds,
      date,
      baseStartTime,
      staggerMinutes,
      language,
      format,
      basePrice,
      seatRowPartitions,
      seatCategoryPricing,
      showSlotPricing
    } = req.body;

    const anchorShow = await Show.findById(req.params.showId)
      .populate('multiplex', 'owner')
      .lean();

    if (!anchorShow) {
      return res.status(404).json({ success: false, message: 'Show wave not found.' });
    }

    if (String(anchorShow.multiplex?.owner) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this show wave.' });
    }

    let waveShows = [];

    if (anchorShow.waveGroupId) {
      waveShows = await Show.find({ waveGroupId: anchorShow.waveGroupId }).sort({ startTime: 1 });
    } else if (anchorShow.baseStartTime) {
      waveShows = await Show.find({
        movie: anchorShow.movie,
        multiplex: anchorShow.multiplex?._id || anchorShow.multiplex,
        date: anchorShow.date,
        baseStartTime: anchorShow.baseStartTime
      }).sort({ startTime: 1 });
    } else {
      const candidateShows = await Show.find({
        movie: anchorShow.movie,
        multiplex: anchorShow.multiplex?._id || anchorShow.multiplex,
        date: anchorShow.date
      })
        .populate('screen', 'screenName')
        .sort({ startTime: 1 });

      const multiplexScreens = await Screen.find({
        multiplex: anchorShow.multiplex?._id || anchorShow.multiplex
      }).sort({ screenName: 1 });

      const anchorScreenId = typeof anchorShow.screen === 'object' ? anchorShow.screen?._id : anchorShow.screen;
      const screenIndex = Math.max(
        0,
        multiplexScreens.findIndex((screen) => String(screen._id) === String(anchorScreenId))
      );
      const inferredBaseStartTime = addMinutesToTime(anchorShow.startTime, -(15 * screenIndex));

      waveShows = candidateShows.filter((show) => {
        const currentScreenId = typeof show.screen === 'object' ? show.screen?._id : show.screen;
        const currentScreenIndex = Math.max(
          0,
          multiplexScreens.findIndex((screen) => String(screen._id) === String(currentScreenId))
        );
        const currentBaseStartTime = addMinutesToTime(show.startTime, -(15 * currentScreenIndex));
        return currentBaseStartTime === inferredBaseStartTime;
      });
    }

    if (!waveShows.length) {
      return res.status(404).json({ success: false, message: 'Show wave not found.' });
    }

    const bookedWaveShows = waveShows.filter((show) => Array.isArray(show.bookedSeats) && show.bookedSeats.length > 0);
    if (bookedWaveShows.length) {
      return res.status(400).json({
        success: false,
        message: 'This show wave already has booked seats, so it cannot be edited.'
      });
    }

    const nextMovieId = movieId || anchorShow.movie;
    const movie = await Movie.findById(nextMovieId);
    if (!movie || movie.status !== 'Approved') {
      return res.status(400).json({ success: false, message: 'Movie is not approved for screening.' });
    }

    const nextMultiplexIds = Array.isArray(multiplexIds) && multiplexIds.length
      ? multiplexIds
      : [...new Set(waveShows.map((show) => String(show.multiplex)))];
    const nextScreenIds = Array.isArray(screenIds) && screenIds.length
      ? screenIds
      : waveShows.map((show) => String(show.screen));
    const nextDate = date || anchorShow.date;
    const nextBaseStartTime = baseStartTime || anchorShow.baseStartTime || anchorShow.startTime;
    const nextStaggerMinutes = Math.max(0, Number(staggerMinutes ?? 15));
    const normalizedBasePrice = basePrice != null ? Number(basePrice) : Number(anchorShow.basePrice || 250);
    const normalizedSeatRowPartitions = seatRowPartitions != null
      ? Math.min(4, Math.max(1, Number(seatRowPartitions)))
      : Math.min(4, Math.max(1, Number(anchorShow.seatRowPartitions || 2)));
    const normalizedSeatCategoryPricingInput = normalizeSeatCategoryPricingInput(
      seatCategoryPricing || anchorShow.seatCategoryPricing
    );
    const normalizedShowSlotPricing = showSlotPricing
      ? normalizeShowSlotPricing(showSlotPricing)
      : normalizeShowSlotPricing(anchorShow.showSlotPricing);

    const ownedMultiplexes = await Multiplex.find({
      _id: { $in: nextMultiplexIds },
      owner: req.user.id
    });

    if (ownedMultiplexes.length !== nextMultiplexIds.length) {
      return res.status(403).json({ success: false, message: 'You can only schedule shows in your own multiplexes.' });
    }

    const pendingMultiplex = ownedMultiplexes.find((item) => item.status && item.status !== 'Approved');
    if (pendingMultiplex) {
      return res.status(400).json({ success: false, message: 'One of the selected multiplexes is still pending admin approval.' });
    }

    const screens = await Screen.find({
      _id: { $in: nextScreenIds },
      multiplex: { $in: nextMultiplexIds }
    });

    if (screens.length !== nextScreenIds.length) {
      return res.status(404).json({ success: false, message: 'One or more selected screens were not found for the chosen multiplexes.' });
    }

    const sortedScreens = [...screens].sort((left, right) => {
      const multiplexOrder = String(left.multiplex).localeCompare(String(right.multiplex));
      if (multiplexOrder !== 0) return multiplexOrder;
      return String(left.screenName || '').localeCompare(String(right.screenName || ''));
    });

    const normalizedSeatCategoryPricing = normalizeSeatCategoryPricing(normalizedSeatCategoryPricingInput, normalizedBasePrice);
    const categoryEntries = Object.entries(normalizedSeatCategoryPricing);
    if (categoryEntries.length < 1 || categoryEntries.length > 7) {
      return res.status(400).json({ success: false, message: 'Please keep between 1 and 7 seat categories.' });
    }

    const minimumRowCount = Math.min(...sortedScreens.map((screen) => Number(screen.layout?.rows || 0)).filter(Boolean));
    if (categoryEntries.length > minimumRowCount) {
      return res.status(400).json({ success: false, message: 'Seat category count cannot be more than the number of rows in the selected screens.' });
    }

    const waveGroupId = anchorShow.waveGroupId || crypto.randomUUID();

    await Show.deleteMany({ _id: { $in: waveShows.map((show) => show._id) } });

    const recreatedShows = await Show.insertMany(
      sortedScreens.map((screen, index) => ({
        movie: nextMovieId,
        multiplex: screen.multiplex,
        screen: screen._id,
        date: nextDate,
        waveGroupId,
        baseStartTime: nextBaseStartTime,
        startTime: addMinutesToTime(nextBaseStartTime, nextStaggerMinutes * index),
        language: language ?? anchorShow.language,
        format: format ?? anchorShow.format ?? '2D',
        basePrice: normalizedBasePrice,
        seatRowPartitions: normalizedSeatRowPartitions,
        seatCategoryPricing: normalizedSeatCategoryPricing,
        rowCategories: buildShowRowCategories(screen.layout?.rows, normalizedSeatCategoryPricing, normalizedBasePrice),
        showSlotPricing: normalizedShowSlotPricing
      }))
    );

    res.status(200).json({ success: true, count: recreatedShows.length, data: recreatedShows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteShowWave = async (req, res) => {
  try {
    const anchorShow = await Show.findById(req.params.showId)
      .populate('multiplex', 'owner')
      .lean();

    if (!anchorShow) {
      return res.status(404).json({ success: false, message: 'Show wave not found.' });
    }

    if (String(anchorShow.multiplex?.owner) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this show wave.' });
    }

    let deleteFilter = null;

    if (anchorShow.waveGroupId) {
      deleteFilter = { waveGroupId: anchorShow.waveGroupId };
    } else if (anchorShow.baseStartTime) {
      deleteFilter = {
        movie: anchorShow.movie,
        multiplex: anchorShow.multiplex?._id || anchorShow.multiplex,
        date: anchorShow.date,
        baseStartTime: anchorShow.baseStartTime
      };
    } else {
      const candidateShows = await Show.find({
        movie: anchorShow.movie,
        multiplex: anchorShow.multiplex?._id || anchorShow.multiplex,
        date: anchorShow.date
      })
        .populate('screen', 'screenName')
        .sort({ startTime: 1 });

      const multiplexScreens = await Screen.find({
        multiplex: anchorShow.multiplex?._id || anchorShow.multiplex
      }).sort({ screenName: 1 });

      const anchorScreenId = typeof anchorShow.screen === 'object' ? anchorShow.screen?._id : anchorShow.screen;
      const screenIndex = Math.max(
        0,
        multiplexScreens.findIndex((screen) => String(screen._id) === String(anchorScreenId))
      );
      const inferredBaseStartTime = addMinutesToTime(anchorShow.startTime, -(15 * screenIndex));

      const matchingIds = candidateShows
        .filter((show) => {
          const currentScreenId = typeof show.screen === 'object' ? show.screen?._id : show.screen;
          const currentScreenIndex = Math.max(
            0,
            multiplexScreens.findIndex((screen) => String(screen._id) === String(currentScreenId))
          );
          const currentBaseStartTime = addMinutesToTime(show.startTime, -(15 * currentScreenIndex));
          return currentBaseStartTime === inferredBaseStartTime;
        })
        .map((show) => show._id);

      deleteFilter = { _id: { $in: matchingIds } };
    }

    const showsToDelete = await Show.find(deleteFilter).select('_id bookedSeats');
    if (!showsToDelete.length) {
      return res.status(404).json({ success: false, message: 'Show wave not found.' });
    }

    const bookedWaveShows = showsToDelete.filter((show) => Array.isArray(show.bookedSeats) && show.bookedSeats.length > 0);
    if (bookedWaveShows.length) {
      return res.status(400).json({
        success: false,
        message: 'This show wave already has booked seats, so it cannot be removed.'
      });
    }

    const result = await Show.deleteMany(deleteFilter);

    res.status(200).json({
      success: true,
      count: result.deletedCount || 0,
      message: 'Show wave removed successfully.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMovieShowtimes = async (req, res) => {
  try {
    const { city, date } = req.query;
    const movieId = req.params.id;
    const targetDate = date || getTodayDateString();

    let multiplexQuery = {};
    if (city && city !== 'All Cities') {
      multiplexQuery = { city: new RegExp(`^${city}$`, 'i') };
    }

    const multiplexes = await Multiplex.find({
      ...multiplexQuery,
      ...getApprovedMultiplexQuery()
    }).select('_id');
    const multiplexIds = multiplexes.map((m) => m._id);

    let shows = await Show.find({
      movie: movieId,
      date: targetDate,
      multiplex: { $in: multiplexIds }
    })
      .populate('multiplex', 'multiplexName address amenities')
      .populate('screen', 'screenName screenType layout totalSeats rowCategories')
      .lean();

    const showIds = shows.map((s) => s._id);

    const activeBookings = await Booking.find({
      show: { $in: showIds },
      $or: [
        { status: 'Locked', expiresAt: { $gt: new Date() } },
        { status: 'Confirmed' }
      ]
    }).select('show seats status');

    const locksByShow = {};
    const confirmedByShow = {};

    for (const booking of activeBookings) {
      const sid = String(booking.show);
      if (booking.status === 'Locked') {
        if (!locksByShow[sid]) locksByShow[sid] = [];
        locksByShow[sid].push(...booking.seats);
      } else {
        if (!confirmedByShow[sid]) confirmedByShow[sid] = [];
        confirmedByShow[sid].push(...booking.seats);
      }
    }

    shows = shows.map((show) => {
      const capacity = show.screen?.totalSeats || 100;
      const lockedSeats = locksByShow[String(show._id)] || [];
      const confirmedSeats = confirmedByShow[String(show._id)] || [];

      const totalUnavailable = new Set([
        ...(show.bookedSeats || []),
        ...lockedSeats,
        ...confirmedSeats
      ]).size;

      const availableSeats = Math.max(0, capacity - totalUnavailable);
      const fillRate = capacity > 0 ? totalUnavailable / capacity : 0;

      const pricingPreview = buildSeatPricingPreview(show, {
        rows: show.screen?.layout?.rows,
        totalSeats: capacity
      });

      return {
        ...show,
        basePrice: Object.values(pricingPreview.categoryPreview || {})[0] || show.basePrice,
        pricingPreview,
        isSurgeActive: pricingPreview.isSurgeActive,
        availableSeats,
        fillRate: Math.round(fillRate * 100),
        isSoldOut: availableSeats === 0,
        isFillingFast: fillRate >= 0.6 && availableSeats > 0,
      };
    });

    res.status(200).json({ success: true, count: shows.length, data: shows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getShowById = async (req, res) => {
  try {
    const show = await Show.findById(req.params.showId)
      .populate('movie', 'title poster organizer')
      .populate('multiplex', 'multiplexName address city status')
      .populate('screen', 'screenName screenType layout totalSeats rowCategories')
      .lean();

    if (!show) {
      return res.status(404).json({ success: false, message: 'Show not found' });
    }

    if (show.multiplex?.status && show.multiplex.status !== 'Approved') {
      return res.status(404).json({ success: false, message: 'Show not found' });
    }

    const activeLocks = await Booking.find({
      show: show._id,
      $or: [
        { status: 'Locked', expiresAt: { $gt: new Date() } },
        { status: 'Confirmed' }
      ]
    }).select('seats status');

    const lockedSeats = activeLocks
      .filter((b) => b.status === 'Locked')
      .flatMap((b) => b.seats);

    const confirmedSeats = activeLocks
      .filter((b) => b.status === 'Confirmed')
      .flatMap((b) => b.seats);

    show.lockedSeats = lockedSeats;
    show.confirmedSeats = confirmedSeats;
    show.unavailableSeats = Array.from(
      new Set([...(show.bookedSeats || []), ...lockedSeats, ...confirmedSeats])
    );

    const pricingPreview = buildSeatPricingPreview(show, {
      rows: show.screen?.layout?.rows,
      totalSeats: show.screen?.totalSeats
    });

    show.basePrice = Object.values(pricingPreview.categoryPreview || {})[0] || show.basePrice;
    show.isSurgeActive = pricingPreview.isSurgeActive;
    show.pricingPreview = pricingPreview;

    res.status(200).json({ success: true, data: show });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
