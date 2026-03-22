// Get full profile data for PDF generation test
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getFullProfile() {
  try {
    const profileId = 'cmldjmdfv0000xmu9tn15fvfy';
    
    const profile = await prisma.user.findUnique({
      where: { id: profileId }
    });
    
    console.log('Full Profile Data:');
    console.log(JSON.stringify(profile, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getFullProfile();
