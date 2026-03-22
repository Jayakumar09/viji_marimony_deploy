/**
 * Script to fix custom IDs to have proper sequential numbers
 * This resets all IDs and reassigns them with correct sequential numbers
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCustomIds() {
  console.log('Starting custom ID fix...');
  
  // Get all users ordered by creation date
  const allUsers = await prisma.user.findMany({
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  console.log(`Found ${allUsers.length} total users`);
  
  let counter = 1;
  
  for (const user of allUsers) {
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
  
  console.log('\nDone! All users now have sequential IDs.');
  
  // Show all users with their customIds
  const users = await prisma.user.findMany({
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
  users.forEach(u => {
    console.log(`  ${u.customId} - ${u.firstName} ${u.lastName} (${u.email})`);
  });
}

fixCustomIds()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
