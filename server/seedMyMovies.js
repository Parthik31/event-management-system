// ----- seedMyMovies.js -----
import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Import your existing models
import User from './models/User.js';
import Movie from './models/Movie.js';
import Multiplex from './models/Multiplex.js';
import Screen from './models/Screen.js';
import Show from './models/Show.js';
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

const seedMovieBookings = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for Movie Seeding...');

    // 1. Fetch Eligible Users
    const users = await User.find({ role: 'user' }).select('_id name email');
    if (users.length === 0) throw new Error('No users found with role "user"');

    // 2. Fetch Movies & Multiplexes
    const movies = await Movie.find({ status: 'Approved' }).select('_id title duration language');
    const multiplexes = await Multiplex.find({ status: 'Approved' }).select('_id multiplexName owner');

    if (movies.length === 0 || multiplexes.length === 0) {
      throw new Error('Ensure you have Approved Movies and Multiplexes in the DB first.');
    }

    // 3. Bootstrap Screens if needed
    let screens = await Screen.find();
    if (screens.length === 0) {
      console.log('Generating screens for multiplexes...');
      const screenDocs = multiplexes.map(mp => ({
        multiplex: mp._id,
        screenName: `Audi ${getRandomInt(1, 4)}`,
        screenType: getRandomElement(['2D', '3D', 'IMAX']),
        layout: { rows: 10, cols: 15 },
        totalSeats: 150
      }));
      screens = await Screen.insertMany(screenDocs);
    }

    // 4. Bootstrap Shows if needed
    let shows = await Show.find();
    if (shows.length === 0) {
      console.log('Generating dynamic shows in March/April...');
      const showDocs = [];
      for (let i = 0; i < 15; i++) {
        const movie = getRandomElement(movies);
        const screen = getRandomElement(screens);
        
        // Schedule shows randomly in March
        const showDateObj = getRandomDateInRange('2026-03-05T00:00:00Z', '2026-04-10T00:00:00Z');
        const dateStr = showDateObj.toISOString().split('T')[0];

        showDocs.push({
          movie: movie._id,
          multiplex: screen.multiplex,
          screen: screen._id,
          date: dateStr,
          startTime: `${getRandomInt(10, 22).toString().padStart(2, '0')}:${getRandomElement(['00', '15', '30', '45'])}`,
          language: movie.language[0] || 'Hindi',
          format: screen.screenType || '2D',
          basePrice: getRandomElement([150, 250, 350, 500]),
          bookedSeats: []
        });
      }
      shows = await Show.insertMany(showDocs);
    }

    // 5. Generate Bookings
    console.log('Generating realistic movie bookings from March 1 to April 1...');
    const bookingsToInsert = [];
    
    for (let i = 0; i < 60; i++) {
      const user = getRandomElement(users);
      const show = getRandomElement(shows);
      const quantity = getRandomInt(1, 6);
      
      const rowLabel = String.fromCharCode(65 + getRandomInt(0, 9)); 
      const startCol = getRandomInt(1, 10);
      const selectedSeats = Array.from({ length: quantity }, (_, idx) => `${rowLabel}${startCol + idx}`);

      const subtotal = quantity * show.basePrice;
      const adminCommission = Math.round(subtotal * 0.05);
      const gatewayCharge = Math.round(subtotal * 0.18);
      const totalAmount = subtotal + adminCommission + gatewayCharge;
      const organizerPayout = subtotal - Math.round(subtotal * 0.15);

      // 🚀 NEW: Random exact time between March 1 and April 1, 2026
      const randomTransactionDate = getRandomDateInRange('2026-03-01T00:00:00Z', '2026-04-01T23:59:59Z');

      bookingsToInsert.push({
        itemType: 'Movie',
        movie: show.movie,
        multiplex: show.multiplex,
        screen: show.screen,
        show: show._id,
        user: user._id,
        ticketId: `MOV-${generateRandomString(8)}`,
        status: 'Confirmed',
        quantity,
        seats: selectedSeats,
        ticketPrice: show.basePrice,
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
    }

    const insertedBookings = await Booking.insertMany(bookingsToInsert);
    console.log(`✅ Successfully seeded ${insertedBookings.length} Movie Bookings between March 1 and April 1!`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedMovieBookings();