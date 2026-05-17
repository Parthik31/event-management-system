import crypto from 'crypto';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Coupon from '../models/Coupon.js';
import Event from '../models/Event.js';
import Movie from '../models/Movie.js';
import Multiplex from '../models/Multiplex.js';
import Show from '../models/Show.js';
import {
  buildShowRowCategories,
  calculateCharges,
  getShowSlotLabel,
  normalizeSeatCategoryPricing,
  normalizeShowSlotPricing
} from '../utils/showPricing.js';
import { clearCacheByPrefix } from '../utils/memoryCache.js';

const LOCK_DURATION_MS = 5 * 60 * 1000;

// ─────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────

const getAssignedSeatCategory = (show, rowLabel) => {
  const matched = buildShowRowCategories(
    show?.screen?.layout?.rows,
    show?.seatCategoryPricing,
    show?.basePrice
  ).find((item) =>
    String(item?.rowLabel || '').toUpperCase() === String(rowLabel || '').toUpperCase()
  );
  if (matched?.category) return matched.category;
  return Object.keys(normalizeSeatCategoryPricing(show?.seatCategoryPricing, show?.basePrice))[0] || 'Standard';
};

const buildMovieSeatDetails = (show, seats = []) => {
  const capacity = Number(show?.screen?.totalSeats || 100);
  const bookedCount = Number(show?.bookedSeats?.length || 0);
  const fillRate = capacity > 0 ? bookedCount / capacity : 0;
  const isWeekend = [0, 6].includes(new Date(show?.date).getDay());
  const surgeMultiplier = (isWeekend ? 1.15 : 1) * (fillRate >= 0.8 ? 1.2 : 1);
  const slotLabel = getShowSlotLabel(show?.baseStartTime || show?.startTime);
  const slotPricing = normalizeShowSlotPricing(show?.showSlotPricing);
  const slotAdjustment = Number(slotPricing[slotLabel] || 0);
  const formatPremium = ['IMAX', '4DX'].includes(show?.format) ? 150 : 0;
  const categoryPricing = normalizeSeatCategoryPricing(show?.seatCategoryPricing, show?.basePrice);

  return seats.map((seatId) => {
    const rowLabel = String(seatId || '').replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase() || 'A';
    const category = getAssignedSeatCategory(show, rowLabel);
    const baseSeatPrice = Number(categoryPricing[category] || show?.basePrice || 0);
    const price = Math.round((baseSeatPrice + slotAdjustment + formatPremium) * surgeMultiplier);
    return { seatId, rowLabel, category, slotLabel, price };
  });
};

const buildTicketId = (length = 8) => {
  const randomPart = crypto.randomBytes(length).toString('hex').toUpperCase();
  return `TKT-${randomPart.slice(0, length)}-${randomPart.slice(length)}`;
};

const clearExpiredLocks = async (session) => {
  const opts = session ? { session } : {};
  await Booking.deleteMany({ status: 'Locked', expiresAt: { $lte: new Date() } }, opts);
};

const buildActiveLockQuery = ({ eventId, showId, seats = [], excludeUserId } = {}) => {
  const query = {
    status: 'Locked',
    expiresAt: { $gt: new Date() }
  };
  if (eventId) query.event = eventId;
  if (showId) query.show = showId;
  if (Array.isArray(seats) && seats.length) query.seats = { $in: seats };
  if (excludeUserId) query.user = { $ne: new mongoose.Types.ObjectId(excludeUserId) };
  return query;
};

const getEventCapacity = (event) =>
  Array.isArray(event?.ticketCategories)
    ? event.ticketCategories.reduce((sum, c) => sum + Number(c?.capacity || 0), 0)
    : 0;

const reserveMovieSeats = async (showId, seats = [], session) => {
  const opts = session ? { session } : {};
  const existingShow = await Show.findById(showId).populate('movie multiplex screen').session(session || null);
  if (!existingShow) return { status: 'missing', show: null };

  const reservedShow = await Show.findOneAndUpdate(
    { _id: showId, bookedSeats: { $nin: seats } },
    { $addToSet: { bookedSeats: { $each: seats } } },
    { new: true, ...opts }
  ).populate('movie multiplex screen');

  if (!reservedShow) return { status: 'conflict', show: existingShow, reservedShow: null };
  return { status: 'ok', show: existingShow, reservedShow };
};

const reserveEventInventory = async (eventId, seats = [], quantity = 0, session) => {
  const opts = session ? { session } : {};
  const existingEvent = await Event.findById(eventId).session(session || null);
  if (!existingEvent) return { status: 'missing', event: null };

  const totalCapacity = getEventCapacity(existingEvent);
  const reservationQuery = { _id: eventId };

  if (Array.isArray(seats) && seats.length) {
    reservationQuery.bookedSeats = { $nin: seats };
  }
  if (totalCapacity > 0) {
    const maxSold = Math.max(totalCapacity - quantity, -1);
    reservationQuery.$or = [
      { ticketsSold: { $lte: maxSold } },
      { ticketsSold: { $exists: false } }
    ];
  }

  const reservationUpdate = { $inc: { ticketsSold: quantity } };
  if (Array.isArray(seats) && seats.length) {
    reservationUpdate.$addToSet = { bookedSeats: { $each: seats } };
  }

  const reservedEvent = await Event.findOneAndUpdate(reservationQuery, reservationUpdate, {
    new: true,
    ...opts
  });

  if (!reservedEvent) return { status: 'conflict', event: existingEvent };
  return { status: 'ok', event: reservedEvent };
};

const getBookingPopulates = () => ([
  { path: 'event', select: 'title date time location image organizer category', populate: { path: 'organizer', select: 'name email' } },
  { path: 'movie', select: 'title organizer poster', populate: { path: 'organizer', select: 'name email' } },
  {
    path: 'show',
    select: 'date startTime multiplex screen movie',
    populate: [
      { path: 'multiplex', select: 'multiplexName owner city' },
      { path: 'screen', select: 'screenName screenType totalSeats layout rowCategories' },
      { path: 'movie', select: 'title organizer' }
    ]
  },
  { path: 'multiplex', select: 'multiplexName owner city', populate: { path: 'owner', select: 'name email' } },
  { path: 'screen', select: 'screenName screenType totalSeats layout rowCategories' },
  { path: 'user', select: 'name email' }
]);

const invalidateAvailabilityCache = ({ eventId, movieId, showId } = {}) => {
  if (eventId) {
    clearCacheByPrefix('events:list:');
    clearCacheByPrefix(`events:detail:${eventId}`);
    clearCacheByPrefix('events:search:');
    clearCacheByPrefix('events:recommended:');
  }
  if (movieId || showId) {
    clearCacheByPrefix('movies:list:');
    clearCacheByPrefix(`movies:detail:${movieId || ''}`);
    clearCacheByPrefix('movies:showtimes:');
  }
};

// ─────────────────────────────────────────────────────────
// EXPORTED CONTROLLERS
// ─────────────────────────────────────────────────────────

export const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { itemType = 'Event', eventId, showId, quantity, categoryName, seats = [], promoCode } = req.body;
    const qty = Number(quantity);

    if (!qty || qty < 1) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
    }

    let ticketPrice = 0;
    let appliedCoupon = null;
    let discountedSubtotal = null;
    let bookingPayload = { itemType, user: req.user.id, quantity: qty, status: 'Confirmed', seats };

    await clearExpiredLocks(session);

    if (itemType === 'Movie') {
      if (!showId) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Show ID is required.' });
      }
      if (!Array.isArray(seats) || seats.length === 0) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Please select at least one seat.' });
      }
      if (seats.length !== qty) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Quantity must match the number of selected seats.' });
      }

      const lockedSeats = await Booking.findOne(
        buildActiveLockQuery({ showId, seats, excludeUserId: req.user.id })
      ).select('_id').session(session);
      
      if (lockedSeats) {
        await session.abortTransaction();
        return res.status(409).json({ success: false, message: 'One or more seats were already booked. Please refresh and try again.' });
      }

      const reservation = await reserveMovieSeats(showId, seats, session);
      if (reservation.status === 'missing') {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: 'Show not found.' });
      }
      if (reservation.status !== 'ok') {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'One or more seats were already booked. Please refresh and try again.' });
      }

      const { show, reservedShow } = reservation;
      const seatDetails = buildMovieSeatDetails(show, seats);
      const subtotalOverride = seatDetails.reduce((sum, seat) => sum + Number(seat.price || 0), 0);
      const distinctCategories = [...new Set(seatDetails.map((seat) => seat.category))];

      ticketPrice = qty > 0 ? Math.round(subtotalOverride / qty) : 0;
      discountedSubtotal = subtotalOverride;

      bookingPayload = {
        ...bookingPayload,
        show: reservedShow?._id,
        movie: reservedShow?.movie?._id,
        multiplex: reservedShow?.multiplex?._id,
        screen: reservedShow?.screen?._id,
        categoryName: categoryName || (distinctCategories.length === 1 ? distinctCategories[0] : 'Mixed Seating'),
        seatDetails
      };
    } else {
      const lockedSeats = seats.length
        ? await Booking.findOne(buildActiveLockQuery({ eventId, seats, excludeUserId: req.user.id })).select('_id').session(session)
        : null;
      if (lockedSeats) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'One or more selected seats are no longer available.' });
      }

      const reservation = await reserveEventInventory(eventId, seats, qty, session);
      if (reservation.status === 'missing') {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }
      if (reservation.status !== 'ok') {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'One or more selected seats are no longer available.' });
      }

      const { event } = reservation;
      ticketPrice = Number(event.price || 0);
      if (event.ticketCategories?.length) {
        const ticketCategory = event.ticketCategories.find((c) => c.name === categoryName);
        if (ticketCategory) ticketPrice = Number(ticketCategory.price || ticketPrice);
      }
      bookingPayload = { ...bookingPayload, event: event._id, categoryName: categoryName || 'General Entry' };
    }

    if (promoCode) {
      const normalizedCode = String(promoCode).trim().toUpperCase();
      appliedCoupon = await Coupon.findOne({ code: normalizedCode, isActive: true }).session(session);

      if (!appliedCoupon) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: 'Invalid or inactive promo code' });
      }
      if (new Date() > new Date(appliedCoupon.expiryDate)) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'This promo code has expired' });
      }
      if (appliedCoupon.usageCount >= appliedCoupon.usageLimit) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'This promo code has reached its usage limit' });
      }
      if (itemType === 'Event' && appliedCoupon.event && appliedCoupon.event.toString() !== eventId?.toString()) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'This promo code is not valid for this event' });
      }

      const subtotal = discountedSubtotal ?? (ticketPrice * qty);
      const rawDiscount =
        appliedCoupon.discountType === 'flat'
          ? Number(appliedCoupon.discountValue || 0)
          : Math.round(subtotal * (Number(appliedCoupon.discountValue || 0) / 100));
      discountedSubtotal = subtotal - Math.min(Math.max(rawDiscount, 0), subtotal);
    }

    const charges = calculateCharges(ticketPrice, qty, discountedSubtotal);

    const individualTickets = Array.from({ length: qty }, () => ({
      subTicketId: buildTicketId(),
      isCheckedIn: false,
      checkedInAt: null,
      isTransferred: false,
      transferredToEmail: null
    }));

    const [booking] = await Booking.create(
      [{ ...bookingPayload, ticketId: buildTicketId(), individualTickets, ticketPrice, convenienceFee: charges.adminCommission, ...charges }],
      { session }
    );

    if (appliedCoupon) {
      await Coupon.findByIdAndUpdate(appliedCoupon._id, { $inc: { usageCount: 1 } }, { session });
    }

    await session.commitTransaction();
    invalidateAvailabilityCache({ eventId, movieId: bookingPayload.movie, showId: bookingPayload.show });

    const populatedBooking = await Booking.findById(booking._id).populate(getBookingPopulates());
    res.status(201).json({ success: true, data: populatedBooking });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

export const lockSeats = async (req, res) => {
  try {
    const { itemType, eventId, showId, seats } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one seat.' });
    }

    await clearExpiredLocks();

    if (itemType === 'Movie') {
      const show = await Show.findById(showId).select('bookedSeats');
      if (!show) return res.status(404).json({ success: false, message: 'Show not found.' });
      if (seats.some((s) => show.bookedSeats.includes(s))) {
        return res.status(409).json({ success: false, message: 'One or more seats are already booked.' });
      }
    } else {
      const event = await Event.findById(eventId).select('bookedSeats');
      if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
      if (seats.some((s) => event.bookedSeats.includes(s))) {
        return res.status(409).json({ success: false, message: 'One or more seats are already booked.' });
      }
    }

    const conflictQuery = {
      status: { $in: ['Locked', 'Confirmed'] },
      seats: { $in: seats },
      user: { $ne: new mongoose.Types.ObjectId(userId) },
      expiresAt: { $gt: new Date() }
    };

    if (itemType === 'Movie') conflictQuery.show = showId;
    else conflictQuery.event = eventId;

    const activeConflicts = await Booking.countDocuments(conflictQuery);
    if (activeConflicts > 0) {
      return res.status(409).json({ success: false, message: 'Too slow! Someone just grabbed those seats. Please choose others.' });
    }

    const userLockQuery = { user: userId, status: 'Locked' };
    if (itemType === 'Movie') userLockQuery.show = showId;
    else userLockQuery.event = eventId;
    
    await Booking.deleteMany(userLockQuery);

    const lockExpiry = new Date(Date.now() + LOCK_DURATION_MS);
    const lockedBooking = await Booking.create({
      user: userId,
      itemType,
      event: eventId || null,
      show: showId || null,
      seats,
      quantity: seats.length,
      status: 'Locked',
      ticketId: `LOCK-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      totalAmount: req.body.totalAmount || 0,
      expiresAt: lockExpiry
    });

    invalidateAvailabilityCache({ eventId, showId });

    res.status(200).json({
      success: true,
      message: 'Seats locked successfully for 5 minutes.',
      lockId: lockedBooking._id,
      expiresAt: lockExpiry
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const bookings = await mongoose.model('Booking').find({
      user: req.user.id,
      status: { $ne: 'Locked' } 
    })
      .populate('event', 'title image date time location category')
      .populate('movie', 'title poster releaseDate language format')
      .populate({ path: 'show', populate: [{ path: 'multiplex', select: 'multiplexName city address' }, { path: 'screen', select: 'screenName' }] })
      .sort({ createdAt: -1 })
      .lean();

    const safeBookings = bookings.map((booking) => {
      if (booking.itemType === 'Movie' && !booking.movie) {
        booking.movie = { title: 'Movie Unavailable/Removed', poster: '' };
      }
      if (booking.itemType === 'Event' && !booking.event) {
        booking.event = { title: 'Event Unavailable/Removed', image: '' };
      }
      return booking;
    });

    res.status(200).json({ success: true, count: safeBookings.length, data: safeBookings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load bookings. Please try again.' });
  }
};

export const verifyBookingPublic = async (req, res) => {
  try {
    const { id } = req.params;

    // 🚀 CRITICAL MOCK TICKET FIX: 
    // If scanning a legacy frontend-generated ticket (TKT-1234-SPLIT-1), 
    // strip the '-SPLIT-1' so MongoDB can actually find the main ticket.
    const searchId = id.includes('-SPLIT-') ? id.split('-SPLIT-')[0] : id;

    let booking = await Booking.findOne({ ticketId: searchId }).populate(getBookingPopulates());

    if (!booking) {
      booking = await Booking.findOne({ 'individualTickets.subTicketId': searchId }).populate(getBookingPopulates());
    }

    if (!booking) return res.status(404).json({ success: false, message: 'Invalid or fake ticket.' });

    const scannedSubTicket = booking.individualTickets?.find(t => t.subTicketId === id) || null;

    res.status(200).json({
      success: true,
      data: booking,
      scannedSubTicketId: id.includes('-SPLIT-') ? id : (scannedSubTicket?.subTicketId || null),
      subTicketCheckedIn: id.includes('-SPLIT-') ? booking.isCheckedIn : (scannedSubTicket?.isCheckedIn || false)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error during verification' });
  }
};

export const getOrganizerBookings = async (req, res) => {
  try {
    const [eventIds, movieIds, multiplexIds] = await Promise.all([
      Event.find({ organizer: req.user.id }).distinct('_id'),
      Movie.find({ organizer: req.user.id }).distinct('_id'),
      Multiplex.find({ owner: req.user.id }).distinct('_id')
    ]);

    const bookingQuery = {
      $or: [
        ...(eventIds.length ? [{ event: { $in: eventIds } }] : []),
        ...(movieIds.length ? [{ movie: { $in: movieIds } }] : []),
        ...(multiplexIds.length ? [{ multiplex: { $in: multiplexIds } }] : [])
      ]
    };

    if (!bookingQuery.$or.length) return res.status(200).json({ success: true, count: 0, data: [] });

    const bookings = await Booking.find({ ...bookingQuery, status: { $ne: 'Locked' } })
      .populate(getBookingPopulates())
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBookingsAdmin = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: { $ne: 'Locked' } })
      .populate(getBookingPopulates())
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const splitTicket = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { targetEmail, subTicketId } = req.body;
    const bookingId = req.params.id;
    const userId = req.user.id;

    if (!subTicketId) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Ticket ID to share is required.' });
    }

    const targetUser = await mongoose.model('User').findOne({ email: targetEmail.toLowerCase().trim() }).session(session);
    if (!targetUser) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Friend must create an EventBook account first.' });
    }
    if (targetUser._id.toString() === userId) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'You cannot transfer tickets to yourself.' });
    }

    const originalBooking = await Booking.findById(bookingId).session(session);
    if (!originalBooking) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    if (originalBooking.user.toString() !== userId) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Not authorized to split this ticket.' });
    }
    if (originalBooking.quantity < 2) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Cannot split a single ticket.' });
    }

    const hasIndividualTickets = Array.isArray(originalBooking.individualTickets) && originalBooking.individualTickets.length > 0;
    
    if (!hasIndividualTickets) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'This old booking format cannot be split.' });
    }

    const subIdx = originalBooking.individualTickets.findIndex(t => t.subTicketId === subTicketId && !t.isTransferred);
    if (subIdx === -1) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Ticket not found or already transferred.' });
    }

    const subTicketsToTransfer = [originalBooking.individualTickets[subIdx]];
    
    let seatsToTransfer = [];
    let detailsToTransfer = [];

    if (originalBooking.seats && originalBooking.seats.length > subIdx) {
      seatsToTransfer = [originalBooking.seats[subIdx]];
      originalBooking.seats.splice(subIdx, 1);
    }
    if (originalBooking.seatDetails && originalBooking.seatDetails.length > subIdx) {
      detailsToTransfer = [originalBooking.seatDetails[subIdx]];
      originalBooking.seatDetails.splice(subIdx, 1);
    }

    const pricePerTicket = originalBooking.ticketPrice;
    const originalNewQuantity = originalBooking.quantity - 1;

    originalBooking.quantity = originalNewQuantity;
    originalBooking.subtotal = originalNewQuantity * pricePerTicket;
    originalBooking.totalAmount = originalBooking.subtotal + originalBooking.convenienceFee + originalBooking.gatewayCharge;

    originalBooking.individualTickets.splice(subIdx, 1);
    await originalBooking.save({ session });

    const originalObj = originalBooking.toObject();
    delete originalObj._id;
    delete originalObj.ticketId;
    delete originalObj.individualTickets;
    delete originalObj.__v;

    const newIndividualTickets = [{
      subTicketId: subTicketsToTransfer[0].subTicketId,
      isCheckedIn: false,
      checkedInAt: null,
      isTransferred: false,
      transferredToEmail: null
    }];

    const [newBooking] = await Booking.create(
      [{
        ...originalObj,
        user: targetUser._id,
        ticketId: buildTicketId(),
        individualTickets: newIndividualTickets,
        quantity: 1,
        seats: seatsToTransfer,
        seatDetails: detailsToTransfer,
        subtotal: pricePerTicket,
        convenienceFee: 0,
        gatewayCharge: 0,
        totalAmount: pricePerTicket,
        isTransferred: true,
        isCheckedIn: false,
        checkInTime: null
      }],
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `Successfully transferred 1 ticket to ${targetUser.name}!`,
      data: newBooking
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

export const scanAndCheckInTicket = async (req, res) => {
  try {
    const { ticketId } = req.body;
    if (!ticketId) return res.status(400).json({ success: false, message: 'Ticket ID is required.' });

    let booking = await Booking.findOne({ ticketId }).populate(getBookingPopulates());
    let subTicketIndex = -1;

    if (!booking) {
      booking = await Booking.findOne({ 'individualTickets.subTicketId': ticketId }).populate(getBookingPopulates());
      if (booking) {
        subTicketIndex = booking.individualTickets.findIndex(t => t.subTicketId === ticketId);
      }
    }

    if (!booking) return res.status(404).json({ success: false, message: 'Ticket not found in the system.' });

    // Allow: event organizer, multiplex owner, movie organizer (producer),
    // or the organizer of the movie linked to the show
    const canScan =
      booking.event?.organizer?._id?.toString() === req.user.id ||
      booking.multiplex?.owner?._id?.toString() === req.user.id ||
      booking.movie?.organizer?.toString() === req.user.id ||
      booking.show?.movie?.organizer?.toString() === req.user.id;

    if (!canScan) return res.status(403).json({ success: false, message: 'You are not authorized to scan this ticket.' });
    if (booking.status === 'Cancelled') return res.status(400).json({ success: false, message: 'This ticket was cancelled and refunded.' });

    if (subTicketIndex >= 0) {
      const subTicket = booking.individualTickets[subTicketIndex];
      if (subTicket.isCheckedIn) {
        return res.status(400).json({
          success: false,
          message: 'ALREADY SCANNED! This individual ticket has already been used for entry.',
          checkInTime: subTicket.checkedInAt
        });
      }
      booking.individualTickets[subTicketIndex].isCheckedIn = true;
      booking.individualTickets[subTicketIndex].checkedInAt = new Date();
    } else {
      if (booking.isCheckedIn) {
        return res.status(400).json({
          success: false,
          message: 'ALREADY SCANNED!',
          checkInTime: booking.checkInTime
        });
      }
      booking.isCheckedIn = true;
      booking.checkInTime = new Date();
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: subTicketIndex >= 0
        ? `Access Granted! Individual Ticket ${subTicketIndex + 1} of ${booking.individualTickets.length} validated.`
        : 'Access Granted! Ticket Valid.',
      data: {
        ticketId: booking.ticketId,
        guestName: booking.user?.name || 'Guest',
        quantity: subTicketIndex >= 0 ? 1 : booking.quantity,
        category: booking.categoryName || 'General Entry',
        seats: booking.seats || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
