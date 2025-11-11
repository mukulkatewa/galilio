const ProvablyFairRNG = require('../utils/rng');
const GameService = require('../services/gameService');

class DiceController {
  static async playDice(req, res) {
    try {
      const { betAmount, target, rollOver, clientSeed } = req.body;
      const userId = req.user.id;
      
      // Validation
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid bet amount' 
        });
      }
      
      if (target === undefined || target < 0.01 || target > 99.99) {
        return res.status(400).json({ 
          success: false, 
          error: 'Target must be between 0.01 and 99.99' 
        });
      }
      
      if (rollOver === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'Must specify rollOver (true/false)' 
        });
      }
      
      // Check balance
      if (parseFloat(req.user.balance) < betAmount) {
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient balance' 
        });
      }
      
      // Generate dice result
      const serverSeed = ProvablyFairRNG.generateServerSeed();
      const usedClientSeed = clientSeed || ProvablyFairRNG.generateClientSeed();
      const nonce = Date.now();
      
      const randomFloat = ProvablyFairRNG.generateFloat(serverSeed, usedClientSeed, nonce);
      const result = randomFloat * 100;
      
      // Calculate win chance and multiplier
      const winChance = rollOver 
        ? (100 - target) / 100 
        : target / 100;
      
      const houseEdge = 0.01;
      const multiplier = (1 / winChance) * (1 - houseEdge);
      
      // Determine win
      const won = rollOver ? result > target : result < target;
      const payout = won ? betAmount * multiplier : 0;
      const profit = payout - betAmount;
      
      // Game data
      const gameData = {
        target,
        rollOver,
        result: parseFloat(result.toFixed(2)),
        winChance: parseFloat((winChance * 100).toFixed(2)),
        multiplier: parseFloat(multiplier.toFixed(4)),
        won
      };
      
      // Record in database
      const dbResult = await GameService.recordGame(
        userId,
        'dice',
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
        game: 'dice',
        result: {
          betAmount,
          target,
          rollOver,
          result: parseFloat(result.toFixed(2)),
          won,
          winChance: parseFloat((winChance * 100).toFixed(2)),
          multiplier: parseFloat(multiplier.toFixed(4)),
          payout: parseFloat(payout.toFixed(2)),
          profit: parseFloat(profit.toFixed(2)),
          newBalance: parseFloat(dbResult.newBalance)
        },
        provablyFair: {
          serverSeed,
          clientSeed: usedClientSeed,
          nonce
        }
      });
    } catch (error) {
      console.error('Dice error:', error);
      
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

module.exports = DiceController;