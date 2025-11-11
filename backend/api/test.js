// Minimal test endpoint
module.exports = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Vercel serverless is working!',
    timestamp: new Date().toISOString(),
    env: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasJWT: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV
    }
  });
};
