/**
 * Script to generate custom IDs for existing users
 * Format: {NAME}_VBM{YY}ID{000001}
 * Example: DHARSHINI_VBM26ID000001
 * 
 * This script properly handles existing IDs and continues from the highest number.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateCustomIds() {
  console.log('Starting custom ID generation...');
  
  // First, get all users with customId to find the highest number
  const usersWithId = await prisma.user.findMany({
    where: {
      customId: { not: null }
    },
    select: {
      customId: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  // Extract the highest number from existing IDs
  let maxNumber = 0;
  for (const user of usersWithId) {
    const match = user.customId.match(/ID(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }
  
  console.log(`Highest existing ID number: ${maxNumber}`);
  
  // Get all users without customId
  const usersWithoutId = await prisma.user.findMany({
    where: {
      customId: null
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  console.log(`Found ${usersWithoutId.length} users without customId`);
  
  let counter = maxNumber + 1;
  
  for (const user of usersWithoutId) {
    const firstName = user.firstName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10);
    const year = new Date().getFullYear().toString().slice(-2);
    const serial = counter.toString().padStart(6, '0');
    const customId = `${firstName}_VBM${year}ID${serial}`;
    
    await prisma.user.update({
      where: { id: user.id },
      data: { customId }
    });
    
    console.log(`Updated user ${user.id}: ${customId}`);
    counter++;
  }
  
  console.log(`\nDone! Generated ${usersWithoutId.length} custom IDs.`);
  
  // Show all users with their customIds
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      customId: true,
      firstName: true,
      lastName: true,
      email: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  console.log('\nAll users:');
  allUsers.forEach(u => {
    console.log(`  ${u.customId || 'NO ID'} - ${u.firstName} ${u.lastName} (${u.email})`);
  });
}

generateCustomIds()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
