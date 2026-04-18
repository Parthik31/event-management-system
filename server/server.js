import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// security
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Database Connection
import connectDB from './config/db.js';

// Global Error Handler
import { notFound, errorHandler } from './middleware/ErrorMiddleware.js';

// Route Imports
import authRoutes from './routes/AuthRoutes.js';
import eventRoutes from './routes/EventRoutes.js';
import bookingRoutes from './routes/BookingRoutes.js';
import adminRoutes from './routes/AdminRoutes.js';
import financeRoutes from './routes/FinanceRoutes.js';
import supportRoutes from './routes/SupportRoutes.js'; 
import uploadRoutes from './routes/UploadRoutes.js';
import couponRoutes from './routes/CouponRoutes.js'; 
import interactionRoutes from './routes/InteractionRoutes.js';
import notificationRoutes from './routes/NotificationRoutes.js';
import movieRoutes from './routes/MovieRoutes.js';
import multiplexRoutes from './routes/MultiplexRoutes.js';

// Load Environment Variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

app.use(helmet()); 
app.use(morgan('dev')); 

// 👈 FIX 1: CORS MUST BE AT THE VERY TOP (Before any limiters)
app.use(cors({
  origin: true, // Allows all origins temporarily for local testing
  credentials: true
}));

// --- MIDDLEWARE ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// 👈 FIX 2: Increased Limits for Real-Time Polling
const standardLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 500, // Increased from 100 to 500
  message: { success: false, message: 'Too many requests, please try again.' }
});

const checkoutLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 30, // Increased to 30 for safety
  message: { success: false, message: 'Booking limit exceeded.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 800, // Increased from 100 to 800 to handle background syncing
  message: { success: false, message: 'Too many requests, please try again.' }
});

app.use('/api/', standardLimiter);
app.use('/api/v1/bookings/lock', checkoutLimiter);
app.use('/api/v1/bookings', checkoutLimiter);
app.use('/api', apiLimiter);

// Static Files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// --- ROUTES ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/support', supportRoutes); 
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/interactions', interactionRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/movies', movieRoutes);
app.use('/api/v1/multiplexes', multiplexRoutes);

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'EventBook API is running...' });
});

// --- CENTRALIZED ERROR HANDLING MIDDLEWARE ---
// 1. If no route matches, it hits the 404 middleware
app.use(notFound);

// 2. If ANY error is thrown in ANY route, it falls down into this global handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// --- PROCESS-LEVEL CRASH PROTECTION ---
// Stops Node.js from dying if a background task or DB connection completely fails
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
});

process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
