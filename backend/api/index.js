// Vercel serverless function handler
try {
  const app = require('../src/server');
  module.exports = app;
} catch (error) {
  console.error('Failed to initialize Express app:', error);
  console.error('Error stack:', error.stack);
  
  // Export a minimal error handler
  const express = require('express');
  const errorApp = express();
  
  errorApp.use((req, res) => {
    res.status(500).json({
      success: false,
      error: 'Server initialization failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  });
  
  module.exports = errorApp;
}
