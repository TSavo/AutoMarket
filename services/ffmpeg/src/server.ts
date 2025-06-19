/**
 * FFMPEG Service REST API Server
 * 
 * Provides RESTful endpoints for FFMPEG operations including:
 * - Audio extraction from video files
 * - Audio format conversion
 * - Video processing
 * - Health checks and status monitoring
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

import { videoRoutes } from './routes/video';
import { audioRoutes } from './routes/audio';
import { healthRoutes } from './routes/health';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { ServiceHealth, ProcessingJob } from './types';

// Configuration
const PORT = parseInt(process.env.PORT || '8006');
const HOST = process.env.HOST || '0.0.0.0';
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, '../outputs');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '500') * 1024 * 1024; // 500MB default

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ffmpeg-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Ensure directories exist
[UPLOAD_DIR, OUTPUT_DIR, 'logs'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10  // Allow up to 10 files for complex video composition
  },
  fileFilter: (req, file, cb) => {
    // Accept video and audio files
    const allowedMimes = [
      'video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm',
      'audio/mp3', 'audio/wav', 'audio/flac', 'audio/m4a', 'audio/aac'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

// Express app setup
const app = express();

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger(logger));

// Make upload middleware available to routes
app.locals.upload = upload;
app.locals.logger = logger;
app.locals.uploadDir = UPLOAD_DIR;
app.locals.outputDir = OUTPUT_DIR;

// Routes
app.use('/health', healthRoutes);
app.use('/video', videoRoutes);
app.use('/audio', audioRoutes);

// Serve static files (outputs)
app.use('/outputs', express.static(OUTPUT_DIR));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'FFMPEG Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      video: {
        extractAudio: 'POST /video/extractAudio',
        compose: 'POST /video/compose',
        filter: 'POST /video/filter',
        metadata: 'POST /video/metadata'
      },
      audio: {
        convert: 'POST /audio/convert'
      }
    },
    timestamp: new Date()
  });
});

// Error handling
app.use(errorHandler(logger));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `${req.method} ${req.originalUrl} is not a valid endpoint`,
    timestamp: new Date()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, HOST, () => {
  logger.info(`🚀 FFMPEG Service started on http://${HOST}:${PORT}`);
  logger.info(`📁 Upload directory: ${UPLOAD_DIR}`);
  logger.info(`📁 Output directory: ${OUTPUT_DIR}`);
  logger.info(`📊 Max file size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
});

export default app;
