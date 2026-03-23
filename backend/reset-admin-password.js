// Reset admin password to a known value
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const admin = await prisma.admin.update({
      where: { email: 'vijayalakshmijayakumar45@gmail.com' },
      data: { password: hashedPassword }
    });
    
    console.log('Admin password reset to: admin123');
    console.log('Admin:', admin);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();