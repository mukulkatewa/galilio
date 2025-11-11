const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { requestLogger, errorLogger } = require('./middleware/logging');
const { requestDurationMiddleware, getMetrics } = require('./monitoring/prometheus');
const logger = require('./utils/logger');
require('dotenv').config();

// Initialize Sentry for error tracking
const Sentry = require('@sentry/node');

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
let hasRequiredEnvVars = true;

if (missingVars.length > 0) {
  hasRequiredEnvVars = false;
  console.error('❌ CRITICAL: Missing required environment variables:', missingVars.join(', '));
  console.error('Please set these in your Vercel project settings:');
  console.error('- DATABASE_URL: Your PostgreSQL connection string');
  console.error('- JWT_SECRET: A secret key for JWT tokens (min 32 characters)');
  
  // In serverless, don't exit - let the app start and return helpful errors
  if (process.env.VERCEL !== '1') {
    process.exit(1);
  }
}

// Set NODE_ENV default
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const app = express();

// Initialize Sentry after app is created
let isSentryInitialized = false;
if (process.env.SENTRY_DSN && process.env.SENTRY_DSN !== 'your_sentry_dsn_here') {
  try {
    const { Integrations } = require('@sentry/node');
    const { Integrations: TracingIntegrations } = require('@sentry/tracing');
    
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        new Integrations.Http({ tracing: true }),
        new TracingIntegrations.Express({ app }),
      ],
      tracesSampleRate: 1.0,
      environment: process.env.NODE_ENV || 'development',
    });
    isSentryInitialized = true;
    console.log('Sentry initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
}

const httpServer = createServer(app);

// Security middleware
app.use(helmet());

// CORS configuration - allow frontend URLs
const allowedOrigins = [
  'http://localhost:3000',
  'https://galilio-frontend.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10kb' }));

// Request logging middleware
app.use(requestLogger);

// Prometheus metrics middleware
if (process.env.PROMETHEUS_METRICS_ENABLED === 'true') {
  app.use(requestDurationMiddleware);
  app.get('/metrics', getMetrics);
}

// Sentry request handler must be the first middleware
if (isSentryInitialized) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
  console.log('Sentry request handlers attached');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  const status = hasRequiredEnvVars ? 200 : 503;
  res.status(status).json({ 
    success: hasRequiredEnvVars, 
    message: hasRequiredEnvVars ? 'Galilio API is running' : 'Configuration Error: Missing environment variables',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version,
    configured: hasRequiredEnvVars,
    missingVars: hasRequiredEnvVars ? undefined : missingVars
  });
});

// API Documentation endpoint
app.get('/api-docs', (req, res) => {
  res.status(200).json({
    message: 'API Documentation has been removed. Please refer to the project documentation.',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me'
      },
      games: {
        dice: 'POST /api/games/dice',
        keno: 'POST /api/games/keno',
        crash: 'POST /api/games/crash',
        limbo: 'POST /api/games/limbo',
        dragonTower: {
          init: 'POST /api/games/dragon-tower/init',
          play: 'POST /api/games/dragon-tower'
        }
      },
      user: {
        balance: 'GET /api/user/balance',
        history: 'GET /api/user/history'
      },
      admin: {
        stats: 'GET /api/admin/stats',
        users: 'GET /api/admin/users',
        adjustBalance: 'POST /api/admin/adjust-balance'
      }
    }
  });
});

// API Routes
const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Log errors
app.use(errorLogger);

// Global error handler
app.use((err, req, res, next) => {
  const errorId = req.id || 'unknown';
  
  // Log the error
  logger.error('Unhandled error', {
    errorId,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    statusCode: err.statusCode || 500
  });
  
  // Report to Sentry if configured
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, {
      tags: {
        path: req.path,
        method: req.method,
        statusCode: err.statusCode || 500
      }
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'The provided token is invalid'
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: err.errors
    });
  }

  // Handle Prisma errors
  if (err.code && err.code.startsWith('P')) {
    return res.status(400).json({
      success: false,
      error: 'Database Error',
      message: 'An error occurred while processing your request'
    });
  }

  // Default error response
  res.status(err.statusCode || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Something went wrong!'
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit in serverless mode
  if (process.env.VERCEL !== '1') {
    process.exit(1);
  }
});

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Start the server only if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
  });
} else {
  console.log('🚀 Running in Vercel serverless mode');
}

// Export app for Vercel serverless
module.exports = app;