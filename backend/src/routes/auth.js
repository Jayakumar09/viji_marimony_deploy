/**
 * Auth Routes for Cloudflare Worker
 * Hono-compatible authentication routes
 */

import { Hono } from 'hono';
import { getPrisma } from '../lib/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const authRoutes = new Hono();

// Helper to get JWT secret
const getJwtSecret = () => {
  return process.env.JWT_SECRET || globalThis.JWT_SECRET || 'fallback-secret';
};

// Register new user
authRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, firstName, lastName, gender, dateOfBirth, phone, city, state, community, subCaste, education, profession, income, maritalStatus } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !gender || !dateOfBirth || !city || !state || !maritalStatus) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const prisma = getPrisma();
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return c.json({ error: 'Email already registered' }, 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Calculate age from dateOfBirth
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    // Generate custom ID
    const userCount = await prisma.user.count();
    const customId = `VBM${String(userCount + 1).padStart(6, '0')}`;

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        gender,
        dateOfBirth: dob,
        age,
        phone,
        city,
        state,
        community: community || 'Boyar',
        subCaste,
        education,
        profession,
        income,
        maritalStatus,
      }
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return c.json({
      message: 'Registration successful',
      user: userWithoutPassword,
      token
    }, 201);

  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed', details: error.message }, 500);
  }
});

// Login
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400);
    }

    const prisma = getPrisma();
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return c.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed', details: error.message }, 500);
  }
});

// Get current user
authRoutes.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const { password: _, ...userWithoutPassword } = user;
    return c.json({ user: userWithoutPassword });

  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Update password
authRoutes.post('/change-password', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());
    
    const body = await c.req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Current and new password required' }, 400);
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    return c.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ error: 'Failed to change password' }, 500);
  }
});

// Forgot password - send OTP
authRoutes.post('/forgot-password', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: 'Email required' }, 400);
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists
      return c.json({ message: 'If email exists, OTP will be sent' });
    }

    // Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP (in production, use a proper OTP table or cache)
    // For now, we'll just return the OTP (in production, send via SMS/email)
    
    return c.json({ 
      message: 'OTP sent successfully',
      // Remove this in production - OTP should be sent via email/SMS
      devOtp: otp 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

// Verify OTP and reset password
authRoutes.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const { email, otp, newPassword } = body;

    if (!email || !otp || !newPassword) {
      return c.json({ error: 'Email, OTP, and new password required' }, 400);
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    return c.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    return c.json({ error: 'Failed to reset password' }, 500);
  }
});

export default authRoutes;
