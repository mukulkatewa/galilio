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
      easy: { eggs: 3, tiles: 4, levels: 5 },
      medium: { eggs: 2, tiles: 3, levels: 6 },
      hard: { eggs: 1, tiles: 3, levels: 7 },
      expert: { eggs: 1, tiles: 2, levels: 8 },
      master: { eggs: 1, tiles: 4, levels: 8 }
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
      const { gameId, level, tileIndex, action } = req.body;
      const userId = req.user.id;
      
      console.log('DragonTower play request:', { userId, gameId, level, tileIndex, action });
      
      // Validation
      if (!gameId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Game ID is required' 
        });
      }

      // Handle cash out action
      if (action === 'collect') {
        // In a real implementation, retrieve game state from database
        // For now, we'll simulate a successful cash out
        // You would need to store game state in initGame and retrieve it here
        
        return res.json({
          success: true,
          result: {
            action: 'cashout',
            payout: 0, // This should be calculated from stored game state
            newBalance: parseFloat(req.user.balance)
          }
        });
      }
      
      // Validate tile selection for continue action
      if (tileIndex === undefined || tileIndex === null) {
        return res.status(400).json({ 
          success: false, 
          error: 'Tile index is required' 
        });
      }

      if (level === undefined || level === null) {
        return res.status(400).json({ 
          success: false, 
          error: 'Level is required' 
        });
      }
      
      // In a real implementation, retrieve game config from stored game state
      // For now, we'll use medium difficulty as default
      const config = this.getDifficultyConfig('medium');
      
      // Validate tile index is within range
      if (tileIndex < 0 || tileIndex >= config.tiles) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid tile index (must be 0-${config.tiles - 1})` 
        });
      }
      
      // Generate server seed and client seed for this level
      const serverSeed = ProvablyFairRNG.generateServerSeed();
      const clientSeed = ProvablyFairRNG.generateClientSeed();
      const nonce = Date.now() + level;
      
      // Generate egg positions for this level
      const eggPositions = new Set();
      let attempts = 0;
      
      while (eggPositions.size < config.eggs && attempts < 100) {
        const position = ProvablyFairRNG.generateNumber(
          serverSeed, 
          clientSeed, 
          nonce + attempts, 
          config.tiles
        ) % config.tiles; // Ensure 0-based index
        eggPositions.add(position);
        attempts++;
      }
      
      // Check if player's tile has an egg
      const isEgg = eggPositions.has(tileIndex);
      
      // Calculate multiplier for this level
      const winChance = config.eggs / config.tiles;
      const levelMultiplier = (1 / winChance) * 0.99; // 1% house edge
      
      // Calculate cumulative multiplier (increases with each level)
      let currentMultiplier = 1.0;
      for (let i = 0; i <= level; i++) {
        currentMultiplier *= levelMultiplier;
      }
      
      // If egg found, player continues
      if (isEgg) {
        const nextLevel = level + 1;
        const isComplete = nextLevel >= config.levels;
        
        // If tower is complete, record the win
        if (isComplete) {
          // In real implementation, get betAmount from stored game state
          const betAmount = 10; // Placeholder
          const payout = betAmount * currentMultiplier;
          const profit = payout - betAmount;
          
          const gameData = {
            level: nextLevel,
            totalLevels: config.levels,
            isEgg,
            multiplier: currentMultiplier,
            won: true,
            completed: true,
            payout: parseFloat(payout.toFixed(2)),
            profit: parseFloat(profit.toFixed(2))
          };
          
          const result = await GameService.recordGame(
            userId,
            'dragon-tower',
            betAmount,
            payout,
            profit,
            gameData,
            serverSeed,
            clientSeed,
            nonce
          );
          
          return res.json({
            success: true,
            result: {
              isEgg: true,
              currentLevel: nextLevel,
              multiplier: parseFloat(currentMultiplier.toFixed(2)),
              payout: parseFloat(payout.toFixed(2)),
              newBalance: parseFloat(result.newBalance),
              completed: true
            }
          });
        }
        
        // Continue to next level
        return res.json({
          success: true,
          result: {
            isEgg: true,
            currentLevel: nextLevel,
            multiplier: parseFloat(currentMultiplier.toFixed(2)),
            completed: false
          }
        });
      } else {
        // Bomb hit - game over, player loses
        // In real implementation, get betAmount from stored game state
        const betAmount = 10; // Placeholder
        const payout = 0;
        const profit = -betAmount;
        
        const gameData = {
          level: level,
          totalLevels: config.levels,
          isEgg: false,
          multiplier: currentMultiplier,
          won: false,
          completed: false,
          payout: 0,
          profit: parseFloat(profit.toFixed(2))
        };
        
        const result = await GameService.recordGame(
          userId,
          'dragon-tower',
          betAmount,
          payout,
          profit,
          gameData,
          serverSeed,
          clientSeed,
          nonce
        );
        
        return res.json({
          success: true,
          result: {
            isEgg: false,
            currentLevel: level,
            multiplier: 0,
            payout: 0,
            newBalance: parseFloat(result.newBalance),
            gameOver: true
          }
        });
      }
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