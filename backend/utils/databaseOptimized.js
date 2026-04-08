const { PrismaClient } = require('@prisma/client');
const os = require('os');

const PRISMA_POOL_CONFIG = {
  min: 2,
  max: parseInt(process.env.PRISMA_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
};

const prismaClientOptions = {
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
  
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
};

const prisma = new PrismaClient(prismaClientOptions);

const testConnection = async () => {
  try {
    await prisma.$connect();
    
    await prisma.$executeRaw`
      SET statement_timeout = '30s'
    `;

    const maxConnections = await prisma.$queryRaw`
      SHOW max_connections
    `;
    
    const dbType = process.env.DATABASE_URL?.startsWith('postgresql')
      ? 'PostgreSQL'
      : 'SQLite';

    console.log(`[DB] Connected to ${dbType}`);
    console.log(`[DB] Max connections: ${maxConnections[0]?.max_connections || 'N/A'}`);
    console.log(`[DB] Pool config: min=${PRISMA_POOL_CONFIG.min}, max=${PRISMA_POOL_CONFIG.max}`);

    try {
      const userCount = await prisma.user.count();
      console.log(`[DB] Total users: ${userCount}`);
    } catch (countErr) {
      console.log(`[DB] User count error: ${countErr.message}`);
    }

    return true;
  } catch (error) {
    console.error('[DB] Connection failed:', error.message);
    throw error;
  }
};

const debugDatabaseStatus = async () => {
  const debugInfo = {
    databaseUrlSet: !!process.env.DATABASE_URL,
    dbType: process.env.DATABASE_URL?.startsWith('postgresql') ? 'PostgreSQL' : 'SQLite',
    poolConfig: PRISMA_POOL_CONFIG,
    timestamp: new Date().toISOString()
  };

  try {
    const userCount = await prisma.user.count();
    debugInfo.userCount = userCount;
  } catch (err) {
    debugInfo.userCountError = err.message;
  }

  return debugInfo;
};

const gracefulShutdown = async () => {
  console.log('[DB] Closing connections...');
  await prisma.$disconnect();
  console.log('[DB] Connections closed');
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = {
  prisma,
  testConnection,
  debugDatabaseStatus,
  PRISMA_POOL_CONFIG
};
