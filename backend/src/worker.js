/**
 * Cloudflare Worker for Vijayalakshmi Boyar Matrimony API
 * Uses Hono for HTTP routing (compatible with Workers)
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
// import { compress } from 'hono/compress';

// Import route handlers
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import searchRoutes from './routes/search.js';
import messageRoutes from './routes/message.js';
import interestRoutes from './routes/interest.js';
import lookupRoutes from './routes/lookup.js';
import verificationRoutes from './routes/verification.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';
import chatRoutes from './routes/chat.js';

// Import database URL setter
import { setDatabaseUrl } from './lib/db.js';

const app = new Hono();

// Initialize database URL from env
app.use('*', async (c, next) => {
  // DATABASE_URL is available as env.DATABASE_URL in Cloudflare Workers
  if (c.env && c.env.DATABASE_URL) {
    setDatabaseUrl(c.env.DATABASE_URL);
  }
  await next();
});

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'admin-token', 'x-admin-token', 'x-admin-user'],
}));
// app.use('*', compress());

// Health check
app.get('/', (c) => {
  return c.json({
    message: 'Vijayalakshmi Boyar Matrimony API',
    version: '1.0.0',
    status: 'running',
    environment: 'cloudflare-workers',
    database: 'postgresql'
  });
});

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/profile', profileRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/message', messageRoutes);
app.route('/api/interest', interestRoutes);
app.route('/api/lookup', lookupRoutes);
app.route('/api/verification', verificationRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/payments', paymentRoutes);
app.route('/api/chat', chatRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Worker Error:', err);
  return c.json({
    error: 'Something went wrong!',
    message: err.message
  }, 500);
});

export default app;
