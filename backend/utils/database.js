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
    
    // DEBUG: Log more info about the database connection
    console.log(`[DEBUG testConnection] DATABASE_URL is set: ${!!process.env.DATABASE_URL}`);
    console.log(`[DEBUG testConnection] DATABASE_URL prefix: ${process.env.DATABASE_URL?.substring(0, 20)}...`);
    
    // Try a simple query to verify connection
    try {
      const userCount = await prisma.user.count();
      console.log(`[DEBUG testConnection] Total users in database: ${userCount}`);
    } catch (countErr) {
      console.log(`[DEBUG testConnection] Error counting users: ${countErr.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// Debug endpoint to check database status
async function debugDatabaseStatus() {
  const debugInfo = {
    databaseUrlSet: !!process.env.DATABASE_URL,
    databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) || 'NOT SET',
    dbType: process.env.DATABASE_URL?.startsWith('postgresql') ? 'PostgreSQL' : 'SQLite',
    timestamp: new Date().toISOString()
  };
  
  try {
    const userCount = await prisma.user.count();
    debugInfo.userCount = userCount;
    console.log(`[DEBUG debugDatabaseStatus] User count: ${userCount}`);
  } catch (err) {
    debugInfo.userCountError = err.message;
    console.log(`[DEBUG debugDatabaseStatus] Error: ${err.message}`);
  }
  
  return debugInfo;
}

module.exports = { prisma, testConnection, debugDatabaseStatus };