import { Request, Response, NextFunction } from 'express';

/**
 * Catches all unhandled exceptions, formatting them into standard
 * JSON API error structures.
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Centralized Server Error Interceptor:', error);

  // Multer limits exceptions
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      status: 'error',
      message: 'File size limit exceeded. Maximum size is 10MB.'
    });
  }

  const statusCode = error.status || 500;
  const message = error.message || 'An unexpected server error occurred.';

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
};
