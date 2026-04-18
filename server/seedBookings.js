// ----- seedBookings.js -----
import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Import your existing models
import User from './models/User.js';
import Event from './models/Event.js';
import Booking from './models/Booking.js';

dotenv.config();

const generateRandomString = (length = 8) => crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 🚀 NEW: Function to generate a completely random Date and Time within a range
const getRandomDateInRange = (startStr, endStr) => {
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  return new Date(start + Math.random() * (end - start));
};

const seedEventBookings = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for Event Seeding...');

    // 1. Fetch Eligible Users
    const users = await User.find({ role: 'user' }).select('_id name email');
    if (users.length === 0) throw new Error('No users found with role "user"');

    // 2. Fetch Events
    const events = await Event.find({ status: 'Approved' }).select('_id title price ticketCategories');
    if (events.length === 0) throw new Error('No approved events found in DB.');

    const bookingsToInsert = [];
    const eventUpdates = {}; 

    // 3. Generate Event Bookings
    console.log('Generating realistic event bookings from March 1 to April 1...');
    for (let i = 0; i < 60; i++) {
      const user = getRandomElement(users);
      const event = getRandomElement(events);
      const quantity = getRandomInt(1, 6);

      let ticketPrice = event.price || 500;
      let categoryName = 'General Entry';
      
      if (event.ticketCategories && event.ticketCategories.length > 0) {
        const selectedCat = getRandomElement(event.ticketCategories);
        ticketPrice = selectedCat.price;
        categoryName = selectedCat.name;
      }

      const subtotal = quantity * ticketPrice;
      const adminCommission = Math.round(subtotal * 0.05);
      const gatewayCharge = Math.round(subtotal * 0.18);
      const totalAmount = subtotal + adminCommission + gatewayCharge;
      const organizerPayout = subtotal - Math.round(subtotal * 0.15);

      // 🚀 NEW: Random exact time between March 1 and April 1, 2026
      const randomTransactionDate = getRandomDateInRange('2026-03-01T00:00:00Z', '2026-04-01T23:59:59Z');

      bookingsToInsert.push({
        itemType: 'Event',
        event: event._id,
        user: user._id,
        ticketId: `EVT-${generateRandomString(8)}`,
        status: 'Confirmed',
        quantity,
        ticketPrice,
        categoryName,
        subtotal,
        convenienceFee: 0,
        adminCommission,
        gatewayCharge,
        totalAmount,
        organizerPayout,
        paymentMethod: getRandomElement(['UPI', 'Card', 'Wallet']),
        paymentStatus: 'Completed',
        createdAt: randomTransactionDate,
        updatedAt: randomTransactionDate
      });

      if (!eventUpdates[event._id]) eventUpdates[event._id] = 0;
      eventUpdates[event._id] += quantity;
    }

    const insertedBookings = await Booking.insertMany(bookingsToInsert);

    for (const [eventId, count] of Object.entries(eventUpdates)) {
      await Event.findByIdAndUpdate(eventId, {
        $inc: { ticketsSold: count }
      });
    }

    console.log(`✅ Successfully seeded ${insertedBookings.length} Event Bookings between March 1 and April 1!`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedEventBookings();
