/**
 * Error handling middleware for FFMPEG Service
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import { ApiResponse } from '../types';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (logger: Logger) => {
  return (err: AppError, req: Request, res: Response, next: NextFunction) => {
    // Log the error
    logger.error('Error occurred:', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Default error response
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Handle specific error types
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation Error: ' + err.message;
    } else if (err.name === 'MulterError') {
      statusCode = 400;
      if (err.message.includes('File too large')) {
        message = 'File size exceeds maximum allowed limit';
      } else if (err.message.includes('Unexpected field')) {
        message = 'Invalid file field name';
      } else {
        message = 'File upload error: ' + err.message;
      }
    } else if (err.message.includes('ENOENT')) {
      statusCode = 404;
      message = 'File not found';
    } else if (err.message.includes('EACCES')) {
      statusCode = 403;
      message = 'Permission denied';
    } else if (err.message.includes('ENOSPC')) {
      statusCode = 507;
      message = 'Insufficient storage space';
    }

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
      message = 'Internal Server Error';
    }

    const response: ApiResponse = {
      success: false,
      error: message,
      timestamp: new Date()
    };

    res.status(statusCode).json(response);
  };
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
