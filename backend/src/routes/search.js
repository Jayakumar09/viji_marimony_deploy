/**
 * Search Routes for Cloudflare Worker
 * Hono-compatible search routes
 */

import { Hono } from 'hono';
import { getPrisma } from '../lib/db.js';
import jwt from 'jsonwebtoken';

const searchRoutes = new Hono();

// Helper to get JWT secret
const getJwtSecret = () => {
  return process.env.JWT_SECRET || globalThis.JWT_SECRET || 'fallback-secret';
};

// Middleware to verify token
const authenticate = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401);
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());
    c.set('userId', decoded.userId);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

// Search profiles
searchRoutes.post('/', authenticate, async (c) => {
  try {
    const body = await c.req.json();
    const {
      gender,
      minAge,
      maxAge,
      city,
      state,
      community,
      subCaste,
      education,
      profession,
      maritalStatus,
      minHeight,
      maxHeight,
      page = 1,
      limit = 20
    } = body;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = { isActive: true };

    if (gender) where.gender = gender;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (state) where.state = { contains: state, mode: 'insensitive' };
    if (community) where.community = community;
    if (subCaste) where.subCaste = { contains: subCaste, mode: 'insensitive' };
    if (education) where.education = { contains: education, mode: 'insensitive' };
    if (profession) where.profession = { contains: profession, mode: 'insensitive' };
    if (maritalStatus) where.maritalStatus = maritalStatus;
    
    if (minAge || maxAge) {
      where.age = {};
      if (minAge) where.age.gte = parseInt(minAge);
      if (maxAge) where.age.lte = parseInt(maxAge);
    }

    const prisma = getPrisma();

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          customId: true,
          firstName: true,
          lastName: true,
          gender: true,
          age: true,
          city: true,
          state: true,
          education: true,
          profession: true,
          profilePhoto: true,
          isVerified: true,
          isPremium: true,
          createdAt: true,
        }
      }),
      prisma.user.count({ where })
    ]);

    return c.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    return c.json({ error: 'Search failed', details: error.message }, 500);
  }
});

// Quick search (simple filters)
searchRoutes.get('/quick', authenticate, async (c) => {
  try {
    const gender = c.req.query('gender');
    const minAge = parseInt(c.req.query('minAge')) || 18;
    const maxAge = parseInt(c.req.query('maxAge')) || 50;
    const limit = parseInt(c.req.query('limit')) || 10;

    const prisma = getPrisma();

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        gender: gender || undefined,
        age: { gte: minAge, lte: maxAge },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        customId: true,
        firstName: true,
        lastName: true,
        gender: true,
        age: true,
        city: true,
        state: true,
        profilePhoto: true,
        isVerified: true,
      }
    });

    return c.json({ users });

  } catch (error) {
    console.error('Quick search error:', error);
    return c.json({ error: 'Search failed' }, 500);
  }
});

export default searchRoutes;
