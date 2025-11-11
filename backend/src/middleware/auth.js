const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided. Please login.' 
      });
    }
    
    // Check if token is blacklisted
    const isBlacklisted = await prisma.blacklistedToken.findUnique({
      where: { token }
    });

    if (isBlacklisted) {
      // If token is blacklisted and expired, clean it up
      if (new Date() > new Date(isBlacklisted.expiresAt)) {
        await prisma.blacklistedToken.delete({
          where: { id: isBlacklisted.id }
        });
      } else {
        return res.status(401).json({
          success: false,
          error: 'Token has been invalidated. Please log in again.'
        });
      }
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        balance: true,
        isAdmin: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired. Please login again.' 
      });
    }
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication error' 
    });
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      success: false, 
      error: 'Admin access required' 
    });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware };