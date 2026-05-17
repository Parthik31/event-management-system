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
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// --- CORS: Use CLIENT_URL env var in production, fallback to allow all in dev ---
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL]
  : true;

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// --- MIDDLEWARE ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// --- RATE LIMITERS ---

// General API limiter — applies to all /api routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 800,
  message: { success: false, message: 'Too many requests, please try again.' }
});

// Checkout limiter — targeted ONLY at booking creation and seat locking,
// NOT on GET /my or /organizer which are read-only and polled by the dashboard
const checkoutLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Booking limit exceeded. Please wait and try again.' }
});

// Auth limiter — brute-force protection on login and register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts. Please try again later.' }
});

app.use('/api', apiLimiter);
app.use('/api/v1/bookings/lock', checkoutLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

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
