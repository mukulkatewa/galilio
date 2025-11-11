const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function resetTestUser() {
  try {
    const hashedPassword = await bcrypt.hash('Test@123', 10);
    
    const updatedUser = await prisma.user.updateMany({
      where: {
        username: 'testuser',
      },
      data: {
        password: hashedPassword,
      },
    });
    
    console.log('Updated user:', updatedUser);
    
    if (updatedUser.count === 0) {
      // If no user exists, create one
      const newUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          password: hashedPassword,
        },
      });
      console.log('Created new test user:', newUser);
    }
    
    return updatedUser;
  } catch (error) {
    console.error('Error resetting test user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetTestUser();
