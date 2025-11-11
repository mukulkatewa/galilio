const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, json } = format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
  }`;
});

// Detect if running in Vercel serverless
const isVercelServerless = process.env.VERCEL === '1';

// Configure transports based on environment
const loggerTransports = [new transports.Console()];

// Only add file transports in non-serverless environments
if (!isVercelServerless) {
  const fs = require('fs');
  const logDir = 'logs';
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
  
  loggerTransports.push(
    new transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env.NODE_ENV === 'production' ? json() : combine(colorize(), logFormat)
  ),
  transports: loggerTransports,
  // Only use file handlers in non-serverless environments
  exceptionHandlers: isVercelServerless ? [new transports.Console()] : [
    new transports.Console(),
    new transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: isVercelServerless ? [new transports.Console()] : [
    new transports.Console(),
    new transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Log unhandled exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Don't exit in serverless - let the function complete
  if (!isVercelServerless) {
    process.exit(1);
  }
});

module.exports = logger;
