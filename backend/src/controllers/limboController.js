const ProvablyFairRNG = require('../utils/rng');
const GameService = require('../services/gameService');

class LimboController {
  static async playLimbo(req, res) {
    try {
      const { betAmount, targetMultiplier, clientSeed } = req.body;
      const userId = req.user.id;
      
      // Validation
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid bet amount' 
        });
      }
      
      if (!targetMultiplier || targetMultiplier < 1.01) {
        return res.status(400).json({ 
          success: false, 
          error: 'Target multiplier must be at least 1.01x' 
        });
      }
      
      if (targetMultiplier > 1000000) {
        return res.status(400).json({ 
          success: false, 
          error: 'Target multiplier too high (max 1,000,000x)' 
        });
      }
      
      // Check balance
      if (parseFloat(req.user.balance) < betAmount) {
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient balance' 
        });
      }
      
      // Generate provably fair outcome
      const serverSeed = ProvablyFairRNG.generateServerSeed();
      const usedClientSeed = clientSeed || ProvablyFairRNG.generateClientSeed();
      const nonce = Date.now();
      
      const randomFloat = ProvablyFairRNG.generateFloat(serverSeed, usedClientSeed, nonce);
      
      // Exponential distribution with 1% house edge
      const houseEdge = 0.01;
      const outcomeMultiplier = 1 / (randomFloat * (1 - houseEdge));
      const finalOutcome = Math.min(outcomeMultiplier, 1000000);
      
      // Determine win/loss
      const won = finalOutcome >= targetMultiplier;
      const payout = won ? betAmount * targetMultiplier * (1 - houseEdge) : 0;
      const profit = payout - betAmount;
      
      // Game data
      const gameData = {
        targetMultiplier,
        outcomeMultiplier: parseFloat(finalOutcome.toFixed(2)),
        won
      };
      
      // Record in database
      const result = await GameService.recordGame(
        userId,
        'limbo',
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
        game: 'limbo',
        result: {
          betAmount,
          targetMultiplier,
          outcomeMultiplier: parseFloat(finalOutcome.toFixed(2)),
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
      console.error('Limbo error:', error);
      
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

module.exports = LimboController;