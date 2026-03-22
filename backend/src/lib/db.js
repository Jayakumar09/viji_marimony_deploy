/**
 * Database connection for PostgreSQL (AWS RDS)
 * Used by Cloudflare Workers with Prisma
 */

import { PrismaClient } from '@prisma/client';

let prisma = null;

// Get DATABASE_URL from environment
const getDatabaseUrl = () => {
  // For Cloudflare Workers, check global context
  if (typeof globalThis !== 'undefined' && globalThis.DATABASE_URL) {
    return globalThis.DATABASE_URL;
  }
  // For Node.js/Express
  return process.env.DATABASE_URL;
};

export const createPrismaClient = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
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

export default { getPrisma, closePrisma };
