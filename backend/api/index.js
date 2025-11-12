// Vercel serverless function handler
// Set Vercel environment flag before requiring server
process.env.VERCEL = '1';

let app;

try {
  // Wrap in try-catch to handle any initialization errors
  app = require('../src/server');
  
  // Verify app was exported correctly
  if (!app) {
    throw new Error('Server module did not export app');
  }
  
  console.log('✅ Express app initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Express app:', error);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  
  // Export a minimal error handler that provides helpful information
  const express = require('express');
  app = express();
  
  // Basic CORS for error responses
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });
  
  app.use((req, res) => {
    res.status(500).json({
      success: false,
      error: 'Server initialization failed',
      message: error.message,
      hint: 'Check Vercel logs for detailed error information',
      commonIssues: [
        'Missing DATABASE_URL environment variable',
        'Missing JWT_SECRET environment variable',
        'Prisma client not generated (run: npx prisma generate)',
        'Database connection string invalid'
      ],
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  });
}

// Wrap the app to handle OPTIONS requests at the Vercel function level
// This ensures OPTIONS requests are handled even if Express middleware doesn't catch them
// Vercel serverless functions need async handlers
const handler = async (req, res) => {
  // Handle OPTIONS requests immediately at the function level - BEFORE Express
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin || req.headers.Origin;
    console.log(`[Vercel Function] OPTIONS request intercepted, origin: ${origin}, path: ${req.url}`);
    
    // Pattern to match galilio*.vercel.app URLs
    const vercelPattern = /^https:\/\/galilio[\w-]*\.vercel\.app$/i;
    const isAllowed = !origin || vercelPattern.test(origin) || origin.includes('localhost') || origin.includes('127.0.0.1');
    
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400');
      console.log(`[Vercel Function] ✅ OPTIONS allowed for origin: ${origin}`);
      res.status(200).end();
      return;
    } else {
      console.warn(`[Vercel Function] ❌ OPTIONS blocked for origin: ${origin}`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(403).json({ error: 'CORS policy: Origin not allowed', origin: origin });
      return;
    }
  }
  
  // For non-OPTIONS requests, pass to Express app
  return app(req, res);
};

// Export the handler for Vercel serverless
module.exports = handler;
