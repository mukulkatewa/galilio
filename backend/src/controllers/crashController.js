const ProvablyFairRNG = require('../utils/rng');
const GameService = require('../services/gameService');

class CrashController {
  static generateCrashPoint(serverSeed, clientSeed, nonce) {
    const randomFloat = ProvablyFairRNG.generateFloat(serverSeed, clientSeed, nonce);
    const houseEdge = 0.01;
    const crashPoint = 1 / (randomFloat * (1 - houseEdge));
    return Math.min(crashPoint, 10000);
  }
  
  static async playCrash(req, res) {
    try {
      console.log('playCrash called with body:', req.body);
      const { betAmount, cashOutAt, clientSeed } = req.body;
      const userId = req.user.id;
      console.log('User ID:', userId, 'Bet amount:', betAmount, 'Cash out at:', cashOutAt);
      
      // Validation
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid bet amount' 
        });
      }
      
      if (cashOutAt && cashOutAt < 1.01) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cash-out point must be at least 1.01x' 
        });
      }
      
      // Check balance
      if (parseFloat(req.user.balance) < betAmount) {
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient balance' 
        });
      }
      
      // Generate crash point
      const serverSeed = ProvablyFairRNG.generateServerSeed();
      const usedClientSeed = clientSeed || ProvablyFairRNG.generateClientSeed();
      const nonce = Date.now();
      
      console.log('Generating crash point with:', { serverSeed, usedClientSeed, nonce });
      const crashPoint = CrashController.generateCrashPoint(serverSeed, usedClientSeed, nonce);
      console.log('Generated crash point:', crashPoint);
      
      // Determine outcome
      let won = false;
      let cashedOutAt = 0;
      let payout = 0;
      
      // If cashOutAt is provided, use it to determine if the user wins
      if (cashOutAt) {
        won = crashPoint >= cashOutAt;
        cashedOutAt = cashOutAt;
        payout = won ? betAmount * cashOutAt : 0;
      } else {
        // If no cashOutAt, use the crash point directly
        won = true;
        cashedOutAt = crashPoint;
        payout = betAmount * crashPoint;
      }
      
      const profit = payout - betAmount;
      
      // Game data
      const gameData = {
        crashPoint: parseFloat(crashPoint.toFixed(2)),
        cashOutAt: cashOutAt || null,
        cashedOutAt,
        won
      };
      
      // Record in database
      const result = await GameService.recordGame(
        userId,
        'crash',
        betAmount,
        payout,
        profit,
        gameData,
        serverSeed,
        usedClientSeed,
        nonce
      );
      
      res.json({
        success: true,
        game: 'crash',
        result: {
          betAmount,
          crashPoint: parseFloat(crashPoint.toFixed(2)),
          cashOutAt: cashOutAt || null,
          cashedOutAt,
          won,
          payout: parseFloat(payout.toFixed(2)),
          profit: parseFloat(profit.toFixed(2)),
          newBalance: parseFloat(result.newBalance)
        },
        provablyFair: {
          serverSeed,
          clientSeed: usedClientSeed,
          nonce
        }
      });
    } catch (error) {
      console.error('Crash error:', error);
      
      if (error.message === 'Insufficient balance') {
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient balance' 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: 'Game error. Please try again.' 
      });
    }
  }
}

module.exports = CrashController;