const prisma = require('../config/prisma');
const { Prisma } = require('@prisma/client');

class GameService {
  // Record game result and update balance
  static async recordGame(userId, gameType, betAmount, payout, profit, gameData, serverSeed, clientSeed, nonce) {
    try {
      // Use transaction to ensure data consistency
      const result = await prisma.$transaction(async (tx) => {
        // Get current user balance
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { balance: true }
        });
        
        const currentBalance = parseFloat(user.balance);
        
        // Check if user has enough balance
        if (currentBalance < betAmount) {
          throw new Error('Insufficient balance');
        }
        
        const balanceBefore = currentBalance;
        const balanceAfter = currentBalance + profit;
        
        // Update user balance
        await tx.user.update({
          where: { id: userId },
          data: { balance: balanceAfter }
        });
        
        // Record bet transaction
        await tx.transaction.create({
          data: {
            userId,
            type: 'bet',
            amount: -betAmount,
            balanceBefore,
            balanceAfter: currentBalance - betAmount,
            reference: `${gameType}_bet`
          }
        });
        
        // Record win transaction if applicable
        if (payout > 0) {
          await tx.transaction.create({
            data: {
              userId,
              type: 'win',
              amount: payout,
              balanceBefore: currentBalance - betAmount,
              balanceAfter,
              reference: `${gameType}_win`
            }
          });
        }
        
        // Record game
        const game = await tx.game.create({
          data: {
            userId,
            gameType,
            betAmount,
            payout,
            profit,
            gameData,
            serverSeed,
            clientSeed,
            nonce: BigInt(nonce)
          }
        });
        
        // Update house stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        await tx.houseStats.upsert({
          where: {
            date_gameType: {
              date: today,
              gameType
            }
          },
          create: {
            date: today,
            gameType,
            totalGames: 1,
            totalWagered: betAmount,
            totalPayout: payout,
            houseProfit: -profit
          },
          update: {
            totalGames: { increment: 1 },
            totalWagered: { increment: betAmount },
            totalPayout: { increment: payout },
            houseProfit: { increment: -profit }
          }
        });
        
        return {
          game,
          newBalance: balanceAfter
        };
      });
      
      return result;
    } catch (error) {
      console.error('Game service error:', error);
      throw error;
    }
  }
  
  // Get user's game history
  static async getUserGameHistory(userId, limit = 20, offset = 0) {
    return await prisma.game.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        gameType: true,
        betAmount: true,
        payout: true,
        profit: true,
        createdAt: true
      }
    });
  }
}

module.exports = GameService;