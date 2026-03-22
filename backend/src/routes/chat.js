/**
 * Chat Routes for Cloudflare Worker
 */

import { Hono } from 'hono';
import { getPrisma } from '../lib/db.js';
import jwt from 'jsonwebtoken';

const chatRoutes = new Hono();

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

// Send chat message (user to admin)
chatRoutes.post('/', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { message, messageType = 'text' } = body;

    if (!message) {
      return c.json({ error: 'Message required' }, 400);
    }

    const prisma = getPrisma();

    const chatMessage = await prisma.chatMessage.create({
      data: {
        userId,
        senderType: 'USER',
        messageType,
        message
      }
    });

    return c.json({ message: 'Message sent', chatMessage }, 201);

  } catch (error) {
    console.error('Send chat error:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// Get chat history
chatRoutes.get('/', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const limit = parseInt(c.req.query('limit')) || 50;

    const prisma = getPrisma();

    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: limit
    });

    return c.json({ messages });

  } catch (error) {
    console.error('Get chat error:', error);
    return c.json({ error: 'Failed to fetch messages' }, 500);
  }
});

// Admin: Get all chats
chatRoutes.get('/admin/all', async (c) => {
  try {
    const adminToken = c.req.header('admin-token') || c.req.header('x-admin-token');
    
    if (!adminToken) {
      return c.json({ error: 'Admin token required' }, 401);
    }

    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 20;

    const prisma = getPrisma();

    // Get unique user chats
    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              profilePhoto: true
            }
          }
        }
      }),
      prisma.chatMessage.count()
    ]);

    // Group by user
    const userChats = {};
    messages.forEach(msg => {
      if (!userChats[msg.userId]) {
        userChats[msg.userId] = {
          user: msg.user,
          lastMessage: msg,
          unreadCount: 0
        };
      }
      if (!msg.isRead && msg.senderType === 'USER') {
        userChats[msg.userId].unreadCount++;
      }
    });

    return c.json({
      chats: Object.values(userChats),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all chats error:', error);
    return c.json({ error: 'Failed to fetch chats' }, 500);
  }
});

// Admin: Send reply to user
chatRoutes.post('/admin/reply', async (c) => {
  try {
    const adminToken = c.req.header('admin-token') || c.req.header('x-admin-token');
    
    if (!adminToken) {
      return c.json({ error: 'Admin token required' }, 401);
    }

    const body = await c.req.json();
    const { userId, message, messageType = 'text', adminId } = body;

    if (!userId || !message) {
      return c.json({ error: 'User ID and message required' }, 400);
    }

    const prisma = getPrisma();

    const chatMessage = await prisma.chatMessage.create({
      data: {
        userId,
        adminId,
        senderType: 'ADMIN',
        messageType,
        message
      }
    });

    return c.json({ message: 'Reply sent', chatMessage }, 201);

  } catch (error) {
    console.error('Send admin reply error:', error);
    return c.json({ error: 'Failed to send reply' }, 500);
  }
});

// Admin: Mark messages as read
chatRoutes.put('/admin/read/:userId', async (c) => {
  try {
    const adminToken = c.req.header('admin-token') || c.req.header('x-admin-token');
    
    if (!adminToken) {
      return c.json({ error: 'Admin token required' }, 401);
    }

    const userId = c.req.param('userId');

    const prisma = getPrisma();

    await prisma.chatMessage.updateMany({
      where: { userId, senderType: 'USER', isRead: false },
      data: { isRead: true, readAt: new Date() }
    });

    return c.json({ message: 'Messages marked as read' });

  } catch (error) {
    console.error('Mark read error:', error);
    return c.json({ error: 'Failed to mark as read' }, 500);
  }
});

export default chatRoutes;
