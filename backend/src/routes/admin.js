/**
 * Admin Routes for Cloudflare Worker
 */

import { Hono } from 'hono';
import { getPrisma } from '../lib/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const adminRoutes = new Hono();

const getJwtSecret = () => process.env.JWT_SECRET || globalThis.JWT_SECRET || 'fallback-secret';

// Admin authentication middleware
const authenticateAdmin = async (c, next) => {
  const adminToken = c.req.header('admin-token') || c.req.header('x-admin-token');
  
  if (!adminToken) {
    return c.json({ error: 'Admin token required' }, 401);
  }
  
  try {
    // Verify admin token
    const decoded = jwt.verify(adminToken, getJwtSecret() + '-admin');
    c.set('adminId', decoded.adminId);
    c.set('adminRole', decoded.role);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid admin token' }, 401);
  }
};

// Admin login
adminRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400);
    }

    const prisma = getPrisma();
    
    const admin = await prisma.admin.findUnique({
      where: { email }
    });

    if (!admin) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate admin token
    const token = jwt.sign(
      { adminId: admin.id, role: admin.role },
      getJwtSecret() + '-admin',
      { expiresIn: '24h' }
    );

    const { password: _, ...adminWithoutPassword } = admin;

    return c.json({
      message: 'Admin login successful',
      admin: adminWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Get all users (admin)
adminRoutes.get('/users', authenticateAdmin, async (c) => {
  try {
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 20;
    const skip = (page - 1) * limit;
    const search = c.req.query('search') || '';
    const verified = c.req.query('verified');
    const premium = c.req.query('premium');

    const prisma = getPrisma();

    const where = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { customId: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (verified !== undefined) {
      where.isVerified = verified === 'true';
    }
    
    if (premium !== undefined) {
      where.isPremium = premium === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          customId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          gender: true,
          age: true,
          city: true,
          state: true,
          isVerified: true,
          isPremium: true,
          isActive: true,
          createdAt: true
        }
      }),
      prisma.user.count({ where })
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
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// Get user by ID (admin)
adminRoutes.get('/users/:id', authenticateAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const { password: _, ...userWithoutPassword } = user;
    return c.json({ user: userWithoutPassword });

  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

// Update user (admin)
adminRoutes.put('/users/:id', authenticateAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const adminId = c.get('adminId');

    const prisma = getPrisma();

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date()
      }
    });

    // Log admin activity
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'UPDATE_USER',
        targetUserId: id,
        details: JSON.stringify(Object.keys(body))
      }
    });

    const { password: _, ...userWithoutPassword } = user;
    return c.json({ message: 'User updated', user: userWithoutPassword });

  } catch (error) {
    console.error('Update user error:', error);
    return c.json({ error: 'Failed to update user' }, 500);
  }
});

// Verify user (admin)
adminRoutes.post('/users/:id/verify', authenticateAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { status, notes } = body;
    const adminId = c.get('adminId');

    const prisma = getPrisma();

    const user = await prisma.user.update({
      where: { id },
      data: {
        isVerified: status === 'APPROVED',
        profileVerificationStatus: status,
        profileVerified: status === 'APPROVED',
        manualVerificationNotes: notes
      }
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'VERIFY_USER',
        targetUserId: id,
        details: JSON.stringify({ status, notes })
      }
    });

    return c.json({ message: `User ${status.toLowerCase()}`, user: { id: user.id, isVerified: user.isVerified } });

  } catch (error) {
    console.error('Verify user error:', error);
    return c.json({ error: 'Failed to verify user' }, 500);
  }
});

// Get dashboard stats
adminRoutes.get('/stats', authenticateAdmin, async (c) => {
  try {
    const prisma = getPrisma();

    const [
      totalUsers,
      verifiedUsers,
      premiumUsers,
      pendingVerifications,
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isVerified: true } }),
      prisma.user.count({ where: { isPremium: true } }),
      prisma.user.count({ where: { profileVerificationStatus: 'Pending' } }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          createdAt: true
        }
      })
    ]);

    return c.json({
      stats: {
        totalUsers,
        verifiedUsers,
        premiumUsers,
        pendingVerifications
      },
      recentUsers
    });

  } catch (error) {
    console.error('Get stats error:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

export default adminRoutes;
