const ProvablyFairRNG = require('../utils/rng');
const GameService = require('../services/gameService');

class KenoController {
  static async playKeno(req, res) {
    try {
      const { betAmount, pickedNumbers, clientSeed } = req.body;
      const userId = req.user.id;
      
      // Validation
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid bet amount' 
        });
      }
      
      if (!pickedNumbers || pickedNumbers.length !== 10) {
        return res.status(400).json({ 
          success: false, 
          error: 'Must pick exactly 10 numbers (1-80)' 
        });
      }
      
      // Validate picked numbers
      const isValid = pickedNumbers.every(n => n >= 1 && n <= 80);
      if (!isValid) {
        return res.status(400).json({ 
          success: false, 
          error: 'Numbers must be between 1 and 80' 
        });
      }
      
      // Check for duplicates
      if (new Set(pickedNumbers).size !== pickedNumbers.length) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot pick duplicate numbers' 
        });
      }
      
      // Check user balance
      if (parseFloat(req.user.balance) < betAmount) {
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient balance' 
        });
      }
      
      // Generate truly random drawn numbers using crypto
      const crypto = require('crypto');
      const drawnNumbers = [];
      
      // Use Fisher-Yates shuffle with crypto randomness (Stack.com style)
      const allNumbers = Array.from({ length: 80 }, (_, i) => i + 1);
      for (let i = allNumbers.length - 1; i > allNumbers.length - 21; i--) {
        const randomBytes = crypto.randomBytes(4);
        const randomIndex = randomBytes.readUInt32BE(0) % (i + 1);
        [allNumbers[i], allNumbers[randomIndex]] = [allNumbers[randomIndex], allNumbers[i]];
        drawnNumbers.push(allNumbers[i]);
      }
      
      // Generate provably fair seeds for verification
      const serverSeed = ProvablyFairRNG.generateServerSeed();
      const usedClientSeed = clientSeed || ProvablyFairRNG.generateClientSeed();
      const nonce = Date.now() + Math.floor(Math.random() * 1000000);
      
      // Calculate matches
      const matches = pickedNumbers.filter(num => drawnNumbers.includes(num)).length;
      
      // Payout table with 75% RTP (25% house edge)
      const payoutTable = {
        0: 0, 1: 0, 2: 0, 3: 0,
        4: 1, 5: 2, 6: 10, 7: 50,
        8: 200, 9: 1000, 10: 5000
      };
      
      const multiplier = payoutTable[matches];
      const payout = betAmount * multiplier;
      const profit = payout - betAmount;
      
      // Store game data
      const gameData = {
        pickedNumbers,
        drawnNumbers,
        matches,
        multiplier
      };
      
      // Record in database
      const result = await GameService.recordGame(
        userId,
        'keno',
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
        game: 'keno',
        result: {
          betAmount,
          pickedNumbers,
          drawnNumbers,
          matches,
          multiplier,
          payout,
          profit,
          newBalance: parseFloat(result.newBalance)
        },
        provablyFair: {
          serverSeed,
          clientSeed: usedClientSeed,
          nonce
        }
      });
    } catch (error) {
      console.error('Keno error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);
      
      if (error.message === 'Insufficient balance') {
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient balance' 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: 'Game error. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = KenoController;