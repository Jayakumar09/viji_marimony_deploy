/**
 * Main route exports for Cloudflare Worker
 * Re-exports all route modules
 */

import authRoutes from './auth.js';
import profileRoutes from './profile.js';
import searchRoutes from './search.js';
import messageRoutes from './message.js';
import interestRoutes from './interest.js';
import lookupRoutes from './lookup.js';
import verificationRoutes from './verification.js';
import adminRoutes from './admin.js';
import paymentRoutes from './payments.js';
import chatRoutes from './chat.js';

export {
  authRoutes,
  profileRoutes,
  searchRoutes,
  messageRoutes,
  interestRoutes,
  lookupRoutes,
  verificationRoutes,
  adminRoutes,
  paymentRoutes,
  chatRoutes
};
