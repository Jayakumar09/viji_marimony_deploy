/**
 * Database connection for PostgreSQL (AWS RDS)
 * Used by Cloudflare Workers with Prisma + pg adapter
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let prisma = null;
let dbUrl = null;

// Set DATABASE_URL from Cloudflare secrets
export const setDatabaseUrl = (url) => {
  dbUrl = url;
};

// Get DATABASE_URL from environment
const getDatabaseUrl = () => {
  if (dbUrl) return dbUrl;
  if (typeof globalThis !== 'undefined') {
    return globalThis.DATABASE_URL || process.env.DATABASE_URL;
  }
  return process.env.DATABASE_URL;
};

export const createPrismaClient = () => {
  const connectionString = getDatabaseUrl();
  
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  
  // Create pg pool
  const pool = new pg.Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  // Create adapter
  const adapter = new PrismaPg(pool);
  
  // Create Prisma client with adapter
  return new PrismaClient({ adapter });
};

// Singleton pattern for Prisma client
export const getPrisma = () => {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
};

// Close connection (for graceful shutdown)
export const closePrisma = async () => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
};

export default { getPrisma, closePrisma, setDatabaseUrl };
