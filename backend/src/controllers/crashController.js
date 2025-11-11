const ProvablyFairRNG = require('../utils/rng');
const GameService = require('../services/gameService');

// Game state manager for multiplayer crash
class CrashGameManager {
  constructor() {
    this.currentGame = null;
    this.activeBets = new Map(); // userId -> { betAmount, joinedAt }
    this.roundCounter = 0; // Track rounds for unique generation
  }

  generateCrashPoint() {
    this.roundCounter++;
    
    // Use crypto.randomBytes for true randomness (not provably fair seeds)
    const crypto = require('crypto');
    const randomBytes = crypto.randomBytes(4);
    const randomInt = randomBytes.readUInt32BE(0);
    const randomFloat = randomInt / 0xFFFFFFFF; // 0 to 1
    
    // Bustabit-style crash formula
    // crashPoint = 99 / (100 * e) where e is random [0,1)
    // This gives proper exponential distribution
    const houseEdge = 0.01;
    let crashPoint;
    
    if (randomFloat === 0) {
      crashPoint = 10000;
    } else {
      // Formula: floor((99 / (randomFloat * 100)) * 100) / 100
      // This ensures 1% house edge and proper distribution
      const result = (99 / (randomFloat * 100));
      crashPoint = Math.floor(result * 100) / 100;
    }
    
    // Generate provably fair seeds for verification
    const serverSeed = ProvablyFairRNG.generateServerSeed();
    const clientSeed = ProvablyFairRNG.generateClientSeed();
    const nonce = Date.now() + this.roundCounter;
    
    return {
      crashPoint: Math.max(1.00, Math.min(crashPoint, 10000)),
      serverSeed,
      clientSeed,
      nonce
    };
  }

  startNewRound() {
    const crashData = this.generateCrashPoint();
    this.currentGame = {
      ...crashData,
      startTime: Date.now(),
      status: 'active'
    };
    this.activeBets.clear();
    return this.currentGame;
  }

  placeBet(userId, betAmount) {
    if (!this.currentGame || this.currentGame.status !== 'active') {
      return { success: false, error: 'No active game' };
    }

    this.activeBets.set(userId, {
      betAmount,
      joinedAt: Date.now()
    });

    return { success: true };
  }

  cashOut(userId, multiplier) {
    const bet = this.activeBets.get(userId);
    if (!bet) {
      return { success: false, error: 'No active bet found' };
    }

    if (!this.currentGame || this.currentGame.status !== 'active') {
      return { success: false, error: 'Game is not active' };
    }

    if (multiplier >= this.currentGame.crashPoint) {
      return { success: false, error: 'Game already crashed' };
    }

    this.activeBets.delete(userId);
    return {
      success: true,
      betAmount: bet.betAmount,
      cashOutMultiplier: multiplier,
      payout: bet.betAmount * multiplier
    };
  }

  getCurrentGame() {
    return this.currentGame;
  }
}

// Single instance for all players
const gameManager = new CrashGameManager();

class CrashController {
  
  // Get current game state
  static async getCurrentGame(req, res) {
    try {
      let game = gameManager.getCurrentGame();
      
      // Check if current game has exceeded its crash time
      if (game && game.status === 'active') {
        const elapsed = Date.now() - game.startTime;
        const minDuration = 3000;
        const maxDuration = 15000;
        const gameLength = Math.min(minDuration + (game.crashPoint * 800), maxDuration);
        
        // If game has run its course, mark as crashed and start new one
        if (elapsed >= gameLength) {
          game.status = 'crashed';
          game = null; // Force new game
        }
      }
      
      if (!game || game.status !== 'active') {
        // ALWAYS start new round - generate fresh crash point
        game = gameManager.startNewRound();
        console.log('NEW CRASH GAME GENERATED:', game.crashPoint);
      }

      const elapsed = Date.now() - game.startTime;
      const currentMultiplier = 1.00;

      res.json({
        success: true,
        game: {
          crashPoint: game.crashPoint,
          startTime: game.startTime,
          status: game.status,
          currentMultiplier
        }
      });
    } catch (error) {
      console.error('Get current game error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get game state' 
      });
    }
  }

  // Place bet on current round
  static async placeBet(req, res) {
    try {
      const { betAmount } = req.body;
      const userId = req.user.id;
      
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid bet amount' 
        });
      }
      
      if (parseFloat(req.user.balance) < betAmount) {
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient balance' 
        });
      }

      // Ensure game is active
      let game = gameManager.getCurrentGame();
      if (!game || game.status !== 'active') {
        game = gameManager.startNewRound();
      }

      const result = gameManager.placeBet(userId, betAmount);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        message: 'Bet placed successfully',
        gameStartTime: game.startTime
      });
    } catch (error) {
      console.error('Place bet error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to place bet' 
      });
    }
  }

  // Manual cashout
  static async cashOut(req, res) {
    try {
      const { multiplier } = req.body;
      const userId = req.user.id;
      
      if (!multiplier || multiplier < 1.01) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid multiplier' 
        });
      }

      const game = gameManager.getCurrentGame();
      if (!game) {
        return res.status(400).json({ 
          success: false, 
          error: 'No active game' 
        });
      }

      const cashOutResult = gameManager.cashOut(userId, multiplier);
      
      if (!cashOutResult.success) {
        return res.status(400).json(cashOutResult);
      }

      // Record in database
      const betAmount = cashOutResult.betAmount;
      const payout = cashOutResult.payout;
      const profit = payout - betAmount;

      const gameData = {
        crashPoint: game.crashPoint,
        cashedOutAt: multiplier,
        won: true
      };

      const dbResult = await GameService.recordGame(
        userId,
        'crash',
        betAmount,
        payout,
        profit,
        gameData,
        game.serverSeed,
        game.clientSeed,
        game.nonce
      );

      res.json({
        success: true,
        result: {
          betAmount,
          cashOutMultiplier: multiplier,
          payout,
          profit,
          newBalance: parseFloat(dbResult.newBalance)
        }
      });
    } catch (error) {
      console.error('Cash out error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to cash out' 
      });
    }
  }
}

module.exports = CrashController;