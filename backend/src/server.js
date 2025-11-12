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
  process.env.NODE_ENV = 'development';
}

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';

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

// CORS configuration - allow frontend URLs
// Pattern matching will automatically allow any galilio*.vercel.app URL
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://galilio-frontend.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

// Helper function to check if origin matches Vercel deployment pattern
function isAllowedVercelOrigin(origin) {
  if (!origin) return false;
  
  // Match any galilio*.vercel.app URL (case-insensitive)
  const vercelPattern = /^https:\/\/galilio[\w-]*\.vercel\.app$/i;
  return vercelPattern.test(origin);
}

// Handle OPTIONS requests FIRST - before any other middleware (including Helmet)
// This is critical for CORS preflight to work
// This must be the absolute first middleware to handle all OPTIONS requests
app.use((req, res, next) => {
  // Handle OPTIONS preflight requests immediately - BEFORE anything else
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    
    // Log for debugging
    console.log(`[CORS] OPTIONS request from origin: ${origin}, path: ${req.path}`);
    
    // Validate origin
    let allowedOrigin = null;
    
    if (!origin) {
      allowedOrigin = '*';
      console.log(`[CORS] No origin header, allowing all`);
    } else if (isDevelopment && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      allowedOrigin = origin;
      console.log(`[CORS] Development origin allowed: ${origin}`);
    } else {
      const originClean = origin.replace(/\/$/, '');
      
      // Check exact match first
      const exactMatch = allowedOrigins.some(allowed => {
        if (!allowed) return false;
        const allowedClean = allowed.replace(/\/$/, '');
        return originClean === allowedClean;
      });
      
      if (exactMatch) {
        allowedOrigin = origin;
        console.log(`[CORS] Exact match found: ${origin}`);
      } else if (isAllowedVercelOrigin(originClean)) {
        // Automatic pattern matching for any galilio*.vercel.app URL
        allowedOrigin = origin;
        console.log(`[CORS] ✅ Allowing Vercel origin via pattern match: ${origin}`);
      } else if (process.env.FRONTEND_URL) {
        const frontendUrlClean = process.env.FRONTEND_URL.replace(/\/$/, '');
        if (originClean === frontendUrlClean) {
          allowedOrigin = origin;
          console.log(`[CORS] FRONTEND_URL match: ${origin}`);
        }
      }
    }
    
    if (allowedOrigin) {
      res.header('Access-Control-Allow-Origin', allowedOrigin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400'); // 24 hours
      console.log(`[CORS] ✅ OPTIONS request allowed, returning 200`);
      return res.sendStatus(200);
    } else {
      console.warn(`[CORS] ❌ OPTIONS request blocked for origin: ${origin}`);
      console.warn(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
      console.warn(`[CORS] Pattern test result: ${isAllowedVercelOrigin(origin)}`);
      res.header('Access-Control-Allow-Origin', '*'); // Still set header for debugging
      return res.status(403).json({ 
        error: 'CORS policy: Origin not allowed',
        origin: origin,
        allowedOrigins: allowedOrigins,
        patternMatch: isAllowedVercelOrigin(origin)
      });
    }
  }
  
  next();
});

// Security middleware - configure Helmet for development
if (isDevelopment) {
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
  }));
} else {
  app.use(helmet());
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // In development, allow all localhost origins
    if (isDevelopment && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }
    
    // Remove trailing slash for comparison
    const originClean = origin.replace(/\/$/, '');
    
    // Check exact match first
    const exactMatch = allowedOrigins.some(allowed => {
      if (!allowed) return false;
      const allowedClean = allowed.replace(/\/$/, '');
      return originClean === allowedClean;
    });
    
    if (exactMatch) {
      return callback(null, true);
    }
    
    // Check if it matches Vercel deployment pattern (works in both dev and production)
    if (isAllowedVercelOrigin(originClean)) {
      console.log(`CORS: Allowing Vercel origin via pattern match: ${origin}`);
      return callback(null, true);
    }
    
    // Also allow if FRONTEND_URL is set and matches
    if (process.env.FRONTEND_URL) {
      const frontendUrlClean = process.env.FRONTEND_URL.replace(/\/$/, '');
      if (originClean === frontendUrlClean) {
        return callback(null, true);
      }
    }
    
    console.warn(`CORS blocked origin: ${origin}`);
    console.warn(`Allowed origins: ${allowedOrigins.join(', ')}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
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

// Middleware to check for missing environment variables (only in Vercel)
if (process.env.VERCEL === '1' && !hasRequiredEnvVars) {
  app.use((req, res, next) => {
    // Allow health check to work
    if (req.path === '/api/health' || req.path === '/health') {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Backend is not properly configured',
        missingVariables: missingVars,
        instructions: 'Please set the following environment variables in Vercel: ' + missingVars.join(', ')
      });
    }
    // For other routes, return error
    if (req.path !== '/' && req.path !== '/api') {
      return res.status(500).json({
        success: false,
        error: 'Configuration Error',
        message: 'Backend is missing required environment variables',
        missingVariables: missingVars,
        instructions: 'Please configure DATABASE_URL and JWT_SECRET in Vercel project settings'
      });
    }
    next();
  });
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

// Root endpoint - redirect to API info
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Galilio Backend API',
    version: '1.0.0',
    api: '/api',
    health: '/api/health',
    documentation: 'Visit /api for API information'
  });
});

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Galilio API is running',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me'
      },
      games: {
        dice: 'POST /api/games/dice',
        keno: 'POST /api/games/keno',
        limbo: 'POST /api/games/limbo',
        crash: 'POST /api/games/crash',
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
        users: 'GET /api/admin/users'
      }
    }
  });
});

// Note: We don't need explicit app.options() routes because:
// 1. The middleware OPTIONS handler (line 92) catches all OPTIONS requests
// 2. The function-level handler in api/index.js also catches OPTIONS requests
// Express 5 doesn't support wildcard patterns like '/api/*' in route paths

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