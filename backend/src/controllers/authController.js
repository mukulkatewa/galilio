const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

class AuthController {
  // Register new user
  static async register(req, res) {
    try {
      const { email, username, password } = req.body;
      
      // Validation
      if (!email || !username || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'All fields are required' 
        });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ 
          success: false, 
          error: 'Password must be at least 6 characters' 
        });
      }
      
      // Check if user exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email.toLowerCase() },
            { username: username.toLowerCase() }
          ]
        }
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email or username already exists' 
        });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          password: hashedPassword,
          balance: parseFloat(process.env.INITIAL_USER_BALANCE) || 10000
        },
        select: {
          id: true,
          email: true,
          username: true,
          balance: true,
          createdAt: true
        }
      });
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          token
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Registration failed' 
      });
    }
  }
  
  // Login
  static async login(req, res) {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Username and password are required' 
        });
      }
      
      // Find user (can login with email or username)
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: username.toLowerCase() },
            { username: username.toLowerCase() }
          ]
        }
      });
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }
      
      // Generate token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            balance: user.balance,
            isAdmin: user.isAdmin
          },
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Login failed' 
      });
    }
  }
  
  // Get current user
  // Logout user
  static async logout(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1]; // Get token from header
      
      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'No token provided'
        });
      }

      // Decode the token to get expiration time
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return res.status(400).json({
          success: false,
          error: 'Invalid token'
        });
      }

      // Add token to blacklist
      await prisma.blacklistedToken.create({
        data: {
          token,
          expiresAt: new Date(decoded.exp * 1000), // Convert to milliseconds
          userId: req.user.id
        }
      });

      res.json({
        success: true,
        message: 'Successfully logged out. Token has been invalidated.'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred during logout',
        details: error.message
      });
    }
  }
  
  // Get current user
  static async getCurrentUser(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          username: true,
          balance: true,
          isAdmin: true,
          createdAt: true
        }
      });
      
      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get user data' 
      });
    }
  }
}

module.exports = AuthController;