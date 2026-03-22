/**
 * Profile Routes for Cloudflare Worker
 * Hono-compatible profile routes
 */

import { Hono } from 'hono';
import { getPrisma } from '../lib/db.js';
import jwt from 'jsonwebtoken';

const profileRoutes = new Hono();

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

// Get all profiles (with pagination)
profileRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 20;
    const skip = (page - 1) * limit;

    const prisma = getPrisma();
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
        skip,
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
          education: true,
          profession: true,
          profilePhoto: true,
          isVerified: true,
          isPremium: true,
          createdAt: true,
        }
      }),
      prisma.user.count({ where: { isActive: true } })
    ]);

    return c.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get profiles error:', error);
    return c.json({ error: 'Failed to fetch profiles' }, 500);
  }
});

// Get profile by ID
profileRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        customId: true,
        firstName: true,
        lastName: true,
        gender: true,
        age: true,
        city: true,
        state: true,
        community: true,
        subCaste: true,
        education: true,
        profession: true,
        income: true,
        maritalStatus: true,
        height: true,
        weight: true,
        complexion: true,
        physicalStatus: true,
        drinkingHabit: true,
        smokingHabit: true,
        diet: true,
        profilePhoto: true,
        bio: true,
        familyValues: true,
        familyType: true,
        familyStatus: true,
        aboutFamily: true,
        isVerified: true,
        isPremium: true,
        raasi: true,
        natchathiram: true,
        fatherName: true,
        fatherOccupation: true,
        motherName: true,
        motherOccupation: true,
        createdAt: true,
      }
    });

    if (!user) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    return c.json({ user });

  } catch (error) {
    console.error('Get profile error:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

// Update own profile
profileRoutes.put('/update', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const prisma = getPrisma();

    // Calculate age if dateOfBirth is provided
    let updateData = { ...body };
    if (body.dateOfBirth) {
      const dob = new Date(body.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      updateData.age = age;
      updateData.dateOfBirth = dob;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        customId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        age: true,
        city: true,
        state: true,
      }
    });

    return c.json({ message: 'Profile updated successfully', user });

  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// Upload profile photo
profileRoutes.post('/photo', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { photoUrl } = body;

    if (!photoUrl) {
      return c.json({ error: 'Photo URL required' }, 400);
    }

    const prisma = getPrisma();

    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: photoUrl },
      select: { id: true, profilePhoto: true }
    });

    return c.json({ message: 'Profile photo updated', user });

  } catch (error) {
    console.error('Upload photo error:', error);
    return c.json({ error: 'Failed to upload photo' }, 500);
  }
});

// Get current user profile
profileRoutes.get('/me/profile', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const { password: _, ...userWithoutPassword } = user;
    return c.json({ user: userWithoutPassword });

  } catch (error) {
    console.error('Get my profile error:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

export default profileRoutes;
