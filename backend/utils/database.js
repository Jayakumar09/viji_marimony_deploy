const { PrismaClient } = require('@prisma/client');

// Configure Prisma based on environment
const prismaClientOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
};

// For PostgreSQL, add connection pool settings
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql')) {
  prismaClientOptions.datasources = {
    db: {
      url: process.env.DATABASE_URL,
    },
  };
}

const prisma = new PrismaClient(prismaClientOptions);

// Test database connection asynchronously
async function testConnection() {
  try {
    await prisma.$connect();
    
    // Get database type for logging
    const dbType = process.env.DATABASE_URL?.startsWith('postgresql') 
      ? 'PostgreSQL (AWS RDS)' 
      : 'SQLite';
    
    console.log(`✅ Database connected successfully (${dbType})`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = { prisma, testConnection };