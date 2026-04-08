const { PrismaClient } = require('@prisma/client');

const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

async function testConnection() {
  try {
    await prisma.$connect();
    
    const dbType = process.env.DATABASE_URL?.startsWith('postgresql') 
      ? 'PostgreSQL' 
      : 'SQLite';
    
    console.log(`✅ Database connected (${dbType})`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

async function debugDatabaseStatus() {
  return {
    databaseUrlSet: !!process.env.DATABASE_URL,
    dbType: process.env.DATABASE_URL?.startsWith('postgresql') ? 'PostgreSQL' : 'SQLite',
    timestamp: new Date().toISOString()
  };
}

module.exports = { prisma, testConnection, debugDatabaseStatus };
