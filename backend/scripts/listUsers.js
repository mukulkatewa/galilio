const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        balance: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log('Users in the database:');
    console.table(users);
    
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
