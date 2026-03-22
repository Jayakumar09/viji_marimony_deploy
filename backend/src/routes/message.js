/**
 * Message Routes for Cloudflare Worker
 */

import { Hono } from 'hono';
import { getPrisma } from '../lib/db.js';
import jwt from 'jsonwebtoken';

const messageRoutes = new Hono();

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

// Get messages between users
messageRoutes.get('/:otherUserId', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const otherUserId = c.req.param('otherUserId');
    const prisma = getPrisma();

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        content: true,
        isRead: true,
        createdAt: true
      }
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        isRead: false
      },
      data: { isRead: true }
    });

    return c.json({ messages });

  } catch (error) {
    console.error('Get messages error:', error);
    return c.json({ error: 'Failed to fetch messages' }, 500);
  }
});

// Send message
messageRoutes.post('/', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { receiverId, content } = body;

    if (!receiverId || !content) {
      return c.json({ error: 'Receiver ID and content required' }, 400);
    }

    const prisma = getPrisma();

    const message = await prisma.message.create({
      data: {
        senderId: userId,
        receiverId,
        content
      }
    });

    return c.json({ message }, 201);

  } catch (error) {
    console.error('Send message error:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// Get conversation list
messageRoutes.get('/conversations/list', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const prisma = getPrisma();

    // Get unique users the current user has messaged with
    const sentMessages = await prisma.message.findMany({
      where: { senderId: userId },
      select: { receiverId: true },
      distinct: ['receiverId']
    });

    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: userId },
      select: { senderId: true },
      distinct: ['senderId']
    });

    const userIds = [...new Set([
      ...sentMessages.map(m => m.receiverId),
      ...receivedMessages.map(m => m.senderId)
    ])];

    // Get user details for each conversation
    const conversations = await Promise.all(
      userIds.map(async (otherUserId) => {
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: otherUserId },
              { senderId: otherUserId, receiverId: userId }
            ]
          },
          orderBy: { createdAt: 'desc' }
        });

        const unreadCount = await prisma.message.count({
          where: {
            senderId: otherUserId,
            receiverId: userId,
            isRead: false
          }
        });

        const user = await prisma.user.findUnique({
          where: { id: otherUserId },
          select: {
            id: true,
            customId: true,
            firstName: true,
            lastName: true,
            profilePhoto: true
          }
        });

        return {
          user,
          lastMessage,
          unreadCount
        };
      })
    );

    // Sort by last message time
    conversations.sort((a, b) => 
      new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0)
    );

    return c.json({ conversations });

  } catch (error) {
    console.error('Get conversations error:', error);
    return c.json({ error: 'Failed to fetch conversations' }, 500);
  }
});

export default messageRoutes;
