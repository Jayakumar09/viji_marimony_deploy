/**
 * Verification Routes for Cloudflare Worker
 */

import { Hono } from 'hono';
import { getPrisma } from '../lib/db.js';
import jwt from 'jsonwebtoken';

const verificationRoutes = new Hono();

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

// Submit verification documents
verificationRoutes.post('/submit', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { idType, documentNumber, documentUrl, selfieUrl } = body;

    if (!idType || !documentNumber || !documentUrl || !selfieUrl) {
      return c.json({ error: 'All verification documents required' }, 400);
    }

    const prisma = getPrisma();

    const verification = await prisma.verification.create({
      data: {
        userId,
        idType,
        encryptedIdNumber: documentNumber, // In production, encrypt this
        last4Digits: documentNumber.slice(-4),
        idImagePath: documentUrl,
        selfiePath: selfieUrl,
        status: 'PENDING'
      }
    });

    return c.json({ message: 'Verification submitted', verification }, 201);

  } catch (error) {
    console.error('Submit verification error:', error);
    return c.json({ error: 'Failed to submit verification' }, 500);
  }
});

// Get verification status
verificationRoutes.get('/status', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const prisma = getPrisma();

    const verification = await prisma.verification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!verification) {
      return c.json({ status: 'NOT_SUBMITTED' });
    }

    return c.json({ 
      status: verification.status,
      submittedAt: verification.createdAt,
      verifiedAt: verification.verifiedAt,
      notes: verification.notes
    });

  } catch (error) {
    console.error('Get verification status error:', error);
    return c.json({ error: 'Failed to get status' }, 500);
  }
});

export default verificationRoutes;
