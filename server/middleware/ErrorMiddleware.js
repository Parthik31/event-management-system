// 1. Catch-All for 404 Not Found API Routes
export const notFound = (req, res, next) => {
  const error = new Error(`API Route Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error); // Pass the error to the global handler below
};

// 2. Global Error Handler (The Safety Net)
export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    message = 'Resource not found. Invalid ID format.';
    statusCode = 404;
  }

  // Handle Mongoose Duplicate Key Error (e.g., registering with an existing email)
  if (err.code === 11000) {
    message = 'Duplicate field value entered. This record already exists.';
    statusCode = 400;
  }

  // Handle Mongoose Validation Error (Missing required fields)
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map((val) => val.message).join(', ');
    statusCode = 400;
  }

  // Handle JWT Auth Errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid session token. Please log in again.';
    statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    message = 'Session expired. Please log in again.';
    statusCode = 401;
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Only show the stack trace in development, hide it in production for security!
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
