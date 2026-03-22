const jwt = require('jsonwebtoken');
const { prisma } = require('../utils/database');

const JWT_SECRET = process.env.JWT_SECRET || 'boyar-matrimony-super-secret-key-change-in-production-2024';

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Support both `id` and `userId` in token payload for backwards compatibility
    const userId = decoded.id || decoded.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token payload.' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        isPremium: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    res.status(500).json({ error: 'Server error in authentication.' });
  }
};

const adminAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Support both `id` and `adminId` in token payload
    const adminId = decoded.id || decoded.adminId;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Invalid admin token payload.' });
    }
    
    // First try to find in Admin table
    let admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    });

    // If not found in Admin table, check if it's the super admin user
    if (!admin) {
      const user = await prisma.user.findUnique({
        where: { id: adminId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true
        }
      });

      // Check if this is the super admin email
      if (user && user.email === 'vijayalakshmijayakumar45@gmail.com') {
        admin = {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: 'SUPER_ADMIN',
          isActive: user.isActive
        };
      }
    }

    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin token.' });
    }

    if (!admin.isActive) {
      return res.status(401).json({ error: 'Admin account is deactivated.' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    res.status(500).json({ error: 'Server error in admin authentication.' });
  }
};

module.exports = { authMiddleware, adminAuthMiddleware };