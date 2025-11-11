const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeUserAdmin(email) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { isAdmin: true },
    });
    console.log(`User ${email} is now an admin`);
  } catch (error) {
    console.error('Error making user admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Use the test user's email
makeUserAdmin('test1@example.com');
