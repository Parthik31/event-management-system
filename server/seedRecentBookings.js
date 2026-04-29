import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';

import User from './models/User.js';
import Event from './models/Event.js';
import Show from './models/Show.js';
import Booking from './models/Booking.js';

dotenv.config();

const generateRandomString = (length = 8) =>
  crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const getRandomElement = (arr) =>
  arr[Math.floor(Math.random() * arr.length)];

const seedRecentBookings = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const users = await User.find({ role: 'user' });
    const events = await Event.find({ status: 'Approved' });
    const shows = await Show.find();

    const bookingsToInsert = [];
    const today = new Date();

    console.log('🚀 Generating last 20 days bookings...');

    for (let i = 0; i < 80; i++) {
      const user = getRandomElement(users);

      // random date in last 20 days
      const date = new Date();
      date.setDate(today.getDate() - getRandomInt(0, 19));

      // randomly choose event or movie
      const isEvent = Math.random() > 0.5;

      if (isEvent && events.length > 0) {
        const event = getRandomElement(events);
        const quantity = getRandomInt(1, 5);
        const price = event.price || 500;

        const subtotal = quantity * price;
        const totalAmount = subtotal + Math.round(subtotal * 0.23);

        bookingsToInsert.push({
          itemType: 'Event',
          event: event._id,
          user: user._id,
          ticketId: `EVT-${generateRandomString(8)}`,
          status: 'Confirmed',
          quantity,
          ticketPrice: price,
          subtotal,
          totalAmount,
          paymentMethod: getRandomElement(['UPI', 'Card']),
          paymentStatus: 'Completed',
          createdAt: date,
          updatedAt: date
        });

      } else if (shows.length > 0) {
        const show = getRandomElement(shows);
        const quantity = getRandomInt(1, 5);

        const subtotal = quantity * show.basePrice;
        const totalAmount = subtotal + Math.round(subtotal * 0.23);

        bookingsToInsert.push({
          itemType: 'Movie',
          show: show._id,
          movie: show.movie,
          multiplex: show.multiplex,
          screen: show.screen,
          user: user._id,
          ticketId: `MOV-${generateRandomString(8)}`,
          status: 'Confirmed',
          quantity,
          ticketPrice: show.basePrice,
          subtotal,
          totalAmount,
          paymentMethod: getRandomElement(['UPI', 'Card']),
          paymentStatus: 'Completed',
          createdAt: date,
          updatedAt: date
        });
      }
    }

    await Booking.insertMany(bookingsToInsert);

    console.log(`✅ Added ${bookingsToInsert.length} recent bookings`);

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};

seedRecentBookings();
