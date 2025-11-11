const ProvablyFairRNG = require('../utils/rng');
const GameService = require('../services/gameService');
const crypto = require('crypto');

class DragonTowerController {
  constructor() {
    // Bind methods to ensure 'this' is properly set
    this.getDifficultyConfig = this.getDifficultyConfig.bind(this);
    this.initGame = this.initGame.bind(this);
    this.playDragonTower = this.playDragonTower.bind(this);
  }

  getDifficultyConfig(difficulty) {
    const configs = {
      easy: { eggs: 3, tiles: 4, levels: 8 },
      medium: { eggs: 2, tiles: 4, levels: 10 },
      hard: { eggs: 1, tiles: 4, levels: 12 },
      expert: { eggs: 1, tiles: 3, levels: 15 },
      master: { eggs: 1, tiles: 5, levels: 20 }
    };
    return configs[difficulty] || configs.medium;
  }
  
  // Initialize game - generate all egg positions
  async initGame(req, res) {
    try {
      const { difficulty } = req.body;
      const config = this.getDifficultyConfig(difficulty);
      
      // Generate server seed (hidden from player until game ends)
      const serverSeed = ProvablyFairRNG.generateServerSeed();
      const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
      
      // Store in session or return to frontend (you decide)
      res.json({
        success: true,
        data: {
          serverSeedHash, // Show hash to prove fairness
          config,
          gameId: `dt_${Date.now()}`
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to initialize game' 
      });
    }
  }
  
  async playDragonTower(req, res) {
    try {
      const { gameId, tile, betAmount, clientSeed } = req.body;
      const userId = req.user.id;
      
      console.log('DragonTower play request:', { userId, gameId, tile, betAmount });
      
      // Validation
      if (!gameId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Game ID is required' 
        });
      }
      
      if (tile === undefined || tile === null || tile < 1 || tile > 4) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid tile selection (must be 1-4)' 
        });
      }
      
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Bet amount is required and must be greater than 0' 
        });
      }
      
      // In a real implementation, you would retrieve the game state from a database
      // For now, we'll use a default config
      const config = this.getDifficultyConfig('medium');
      
      // Check balance
      if (parseFloat(req.user.balance) < betAmount) {
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient balance' 
        });
      }
      
      // Generate server seed and client seed
      const serverSeed = ProvablyFairRNG.generateServerSeed();
      const usedClientSeed = clientSeed || ProvablyFairRNG.generateClientSeed();
      const nonce = Date.now();
      
      // Generate egg positions for this level
      const eggPositions = new Set();
      
      for (let i = 0; i < config.eggs; i++) {
        const position = ProvablyFairRNG.generateNumber(
          serverSeed, 
          usedClientSeed, 
          nonce + i, 
          config.tiles
        ) - 1; // Convert to 0-based index
        eggPositions.add(position);
      }
      
      // Check if player's tile has an egg (0-based index)
      const playerTileIndex = tile - 1; // Convert to 0-based index
      const hasEgg = eggPositions.has(playerTileIndex);
      
      // Calculate multiplier (simplified for single level)
      const winChance = config.eggs / config.tiles;
      const multiplier = parseFloat(((1 / winChance) * 0.98).toFixed(2)); // 2% house edge
      
      // Calculate payout
      const payout = hasEgg ? betAmount * multiplier : 0;
      const profit = payout - betAmount;
      
      // Game data to store
      const gameData = {
        level: 1,
        totalLevels: config.levels,
        eggs: Array.from(eggPositions).map(p => p + 1), // Convert back to 1-based for display
        playerTile: tile,
        hasEgg,
        multiplier,
        won: hasEgg,
        payout: parseFloat(payout.toFixed(2)),
        profit: parseFloat(profit.toFixed(2))
      };
      
      // Record the game result
      const result = await GameService.recordGame(
        userId,
        'dragon-tower',
        betAmount,
        payout,
        profit,
        gameData,
        serverSeed,
        usedClientSeed,
        nonce
      );
      
      // Return the game result
      res.json({
        success: true,
        game: 'dragon-tower',
        result: {
          betAmount,
          tile,
          hasEgg,
          multiplier,
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
      console.error('Dragon Tower error:', error);
      
      if (error.message === 'Insufficient balance') {
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient balance' 
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message || 'An unexpected error occurred'
      });
    }
  }
}

module.exports = DragonTowerController;