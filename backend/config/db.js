/**
 * SQL Server Database Configuration
 * Uses mssql package for SQL Server connections
 */

const sql = require('mssql');

// SQL Server configuration
const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'YourPassword123',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'MatrimonyDB',
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true' || false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Create connection pool
let pool = null;

async function getPool() {
  if (pool && pool.connected) {
    return pool;
  }
  try {
    pool = await sql.connect(config);
    console.log('✅ SQL Server connected successfully');
    return pool;
  } catch (error) {
    console.error('❌ SQL Server connection failed:', error.message);
    throw error;
  }
}

// Helper function to get pool promise
async function poolPromise() {
  return getPool();
}

// Close pool gracefully
async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

// Test connection
async function testConnection() {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 as test');
    console.log('✅ SQL Server connection test successful');
    return true;
  } catch (error) {
    console.error('❌ SQL Server connection test failed:', error.message);
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

module.exports = {
  sql,
  getPool,
  poolPromise,
  closePool,
  testConnection,
  config
};
