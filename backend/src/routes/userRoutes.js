const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const GameService = require('../services/gameService');
const prisma = require('../config/prisma');

router.use(authMiddleware);

// Get user balance
router.get('/balance', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { balance: true }
    });
    
    res.json({
      success: true,
      data: { balance: parseFloat(user.balance) }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get balance' 
    });
  }
});

// Get game history
router.get('/history', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const history = await GameService.getUserGameHistory(
      req.user.id,
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json({
      success: true,
      data: { history }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get history' 
    });
  }
});

module.exports = router;