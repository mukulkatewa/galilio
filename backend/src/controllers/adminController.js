const prisma = require('../config/prisma');

class AdminController {
  // Get overall statistics
  static async getStats(req, res) {
    try {
      // Stats by game type
      const gameStats = await prisma.game.groupBy({
        by: ['gameType'],
        _count: {
          id: true
        },
        _sum: {
          betAmount: true,
          payout: true,
          profit: true
        }
      });
      
      // Format game stats
      const byGame = gameStats.map(stat => ({
        gameType: stat.gameType,
        totalGames: stat._count.id,
        totalWagered: parseFloat(stat._sum.betAmount || 0),
        totalPayout: parseFloat(stat._sum.payout || 0),
        houseProfit: parseFloat((stat._sum.betAmount || 0) - (stat._sum.payout || 0)),
        actualEdge: stat._sum.betAmount > 0 
          ? (((stat._sum.betAmount - stat._sum.payout) / stat._sum.betAmount) * 100).toFixed(2)
          : 0
      }));
      
      // Overall stats
      const overall = await prisma.game.aggregate({
        _count: {
          id: true
        },
        _sum: {
          betAmount: true,
          payout: true,
          profit: true
        }
      });
      
      // User stats
      const totalUsers = await prisma.user.count();
      const totalBalance = await prisma.user.aggregate({
        _sum: {
          balance: true
        }
      });
      
      // Recent big wins
      const bigWins = await prisma.game.findMany({
        where: {
          profit: {
            gt: 100
          }
        },
        orderBy: {
          profit: 'desc'
        },
        take: 10,
        include: {
          user: {
            select: {
              username: true
            }
          }
        }
      });
      
      // Profit over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const profitOverTime = await prisma.game.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        _sum: {
          betAmount: true,
          payout: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      
      const formattedProfitOverTime = profitOverTime.map(item => ({
        date: item.createdAt.toISOString().split('T')[0],
        profit: parseFloat((item._sum.betAmount - item._sum.payout).toFixed(2))
      }));
      
      res.json({
        success: true,
        data: {
          byGame,
          overall: {
            totalGames: overall._count.id,
            totalWagered: parseFloat(overall._sum.betAmount || 0),
            totalPayout: parseFloat(overall._sum.payout || 0),
            houseProfit: parseFloat((overall._sum.betAmount || 0) - (overall._sum.payout || 0)),
            actualEdge: overall._sum.betAmount > 0
              ? (((overall._sum.betAmount - overall._sum.payout) / overall._sum.betAmount) * 100).toFixed(2)
              : 0
          },
          users: {
            total: totalUsers,
            totalBalance: parseFloat(totalBalance._sum.balance ||0)
          },
          bigWins: bigWins.map(game => ({
            username: game.user.username,
            gameType: game.gameType,
            betAmount: parseFloat(game.betAmount),
            payout: parseFloat(game.payout),
            profit: parseFloat(game.profit),
            createdAt: game.createdAt
          })),
          profitOverTime: formattedProfitOverTime
        }
      });
    } catch (error) {
      console.error('Admin stats error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch statistics' 
      });
    }
  }
  
  // Get detailed house stats
  static async getHouseStats(req, res) {
    try {
      const stats = await prisma.houseStats.findMany({
        orderBy: {
          date: 'desc'
        },
        take: 30
      });
      
      const formatted = stats.map(stat => ({
        date: stat.date,
        gameType: stat.gameType,
        totalGames: stat.totalGames,
        totalWagered: parseFloat(stat.totalWagered),
        totalPayout: parseFloat(stat.totalPayout),
        houseProfit: parseFloat(stat.houseProfit)
      }));
      
      res.json({
        success: true,
        data: { stats: formatted }
      });
    } catch (error) {
      console.error('House stats error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch house statistics' 
      });
    }
  }
  
  // Get all users (admin only)
  static async getUsers(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;
      
      const users = await prisma.user.findMany({
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          username: true,
          email: true,
          balance: true,
          isAdmin: true,
          createdAt: true,
          _count: {
            select: {
              games: true
            }
          }
        }
      });
      
      const total = await prisma.user.count();
      
      res.json({
        success: true,
        data: {
          users: users.map(u => ({
            ...u,
            balance: parseFloat(u.balance),
            totalGames: u._count.games
          })),
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch users' 
      });
    }
  }
  
  // Adjust user balance (admin only)
  static async adjustBalance(req, res) {
    try {
      const { userId, amount, reason } = req.body;
      
      if (!userId || amount === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'userId and amount are required' 
        });
      }
      
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }
      
      const balanceBefore = parseFloat(user.balance);
      const balanceAfter = balanceBefore + amount;
      
      // Update balance and create transaction
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { balance: balanceAfter }
        }),
        prisma.transaction.create({
          data: {
            userId,
            type: 'admin_adjustment',
            amount,
            balanceBefore,
            balanceAfter,
            reference: reason || 'Admin adjustment'
          }
        })
      ]);
      
      res.json({
        success: true,
        message: 'Balance adjusted successfully',
        data: {
          userId,
          balanceBefore,
          balanceAfter,
          adjustment: amount
        }
      });
    } catch (error) {
      console.error('Adjust balance error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to adjust balance' 
      });
    }
  }
}

module.exports = AdminController;