/**
 * Interest Routes for Cloudflare Worker
 */

import { Hono } from 'hono';
import { getPrisma } from '../lib/db.js';
import jwt from 'jsonwebtoken';

const interestRoutes = new Hono();

const getJwtSecret = () => process.env.JWT_SECRET || globalThis.JWT_SECRET || 'fallback-secret';

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

// Send interest
interestRoutes.post('/', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { receiverId, message } = body;

    if (!receiverId) {
      return c.json({ error: 'Receiver ID required' }, 400);
    }

    const prisma = getPrisma();

    // Check if interest already exists
    const existing = await prisma.interest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId },
          { senderId: receiverId, receiverId: userId }
        ]
      }
    });

    if (existing) {
      return c.json({ error: 'Interest already sent' }, 400);
    }

    const interest = await prisma.interest.create({
      data: {
        senderId: userId,
        receiverId,
        message,
        status: 'PENDING'
      }
    });

    return c.json({ message: 'Interest sent successfully', interest }, 201);

  } catch (error) {
    console.error('Send interest error:', error);
    return c.json({ error: 'Failed to send interest' }, 500);
  }
});

// Get sent interests
interestRoutes.get('/sent', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const prisma = getPrisma();

    const interests = await prisma.interest.findMany({
      where: { senderId: userId },
      include: {
        receiver: {
          select: {
            id: true,
            customId: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            age: true,
            city: true,
            state: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return c.json({ interests });

  } catch (error) {
    console.error('Get sent interests error:', error);
    return c.json({ error: 'Failed to fetch interests' }, 500);
  }
});

// Get received interests
interestRoutes.get('/received', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const prisma = getPrisma();

    const interests = await prisma.interest.findMany({
      where: { receiverId: userId },
      include: {
        sender: {
          select: {
            id: true,
            customId: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            age: true,
            city: true,
            state: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return c.json({ interests });

  } catch (error) {
    console.error('Get received interests error:', error);
    return c.json({ error: 'Failed to fetch interests' }, 500);
  }
});

// Accept/Reject interest
interestRoutes.put('/:id/respond', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const interestId = c.req.param('id');
    const body = await c.req.json();
    const { status } = body; // 'ACCEPTED' or 'REJECTED'

    if (!status || !['ACCEPTED', 'REJECTED'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const prisma = getPrisma();

    const interest = await prisma.interest.findFirst({
      where: { id: interestId, receiverId: userId }
    });

    if (!interest) {
      return c.json({ error: 'Interest not found' }, 404);
    }

    const updated = await prisma.interest.update({
      where: { id: interestId },
      data: { status }
    });

    return c.json({ message: `Interest ${status.toLowerCase()}`, interest: updated });

  } catch (error) {
    console.error('Respond to interest error:', error);
    return c.json({ error: 'Failed to respond' }, 500);
  }
});

export default interestRoutes;
