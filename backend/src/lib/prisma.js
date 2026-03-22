/**
 * Prisma Client for Cloudflare Workers + PostgreSQL
 * Supports both local development and Cloudflare Workers environment
 */

import { PrismaClient } from '@prisma/client';

// For Cloudflare Workers, we use a global variable to prevent recreation on each request
let prisma;

if (typeof globalThis.__prisma === 'undefined') {
  globalThis.__prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
}

prisma = globalThis.__prisma;

export { prisma };
