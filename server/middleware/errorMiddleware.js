/**
 * Centralized error-handling middleware.
 * Formats errors to match docs/API_CONTRACT.md error envelope:
 * { "error": { "code": "...", "message": "...", "details": [] } }
 */
export function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);

  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected server error occurred';
  let details = [];

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed for report input';
    details = Object.keys(err.errors).map((field) => ({
      field,
      message: err.errors[field].message,
    }));
  }

  // CastError (e.g. invalid MongoDB ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid ID format for ${err.path}`;
  }

  // Multer upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    code = 'FILE_TOO_LARGE';
    message = 'Uploaded file exceeds the 5MB size limit';
  }

  if (err.isCustom) {
    statusCode = err.statusCode || 400;
    code = err.code || 'BAD_REQUEST';
    message = err.message;
    details = err.details || [];
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      details,
    },
  });
}

/**
 * 404 handler for nonexistent routes.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Resource not found: ${req.method} ${req.originalUrl}`,
      details: [],
    },
  });
}
