/**
 * AI Features Routes
 * Handles AI-generated profiles, matching, chat suggestions, and moderation
 */

const express = require('express');
const router = express.Router();
const { 
  generateProfile,
  getAISuggestions,
  getMatchDetails,
  generateChatSuggestions,
  checkChatAccess,
  getAIProfile,
  updateAIProfile
} = require('../controllers/aiController');
const { authMiddleware } = require('../middleware/auth');
const { aiRateLimiter, strictAiRateLimiter } = require('../middleware/aiRateLimit');
const { contentModeration } = require('../middleware/contentModeration');

// All AI routes require authentication
router.use(authMiddleware);

// AI Profile Generation
// POST /api/ai/generate-profile
router.post('/generate-profile', 
  aiRateLimiter,
  contentModeration,
  generateProfile
);

// Get AI profile
router.get('/profile', getAIProfile);

// Update AI profile
router.put('/profile', updateAIProfile);

// AI Match Suggestions
// GET /api/ai/matches
router.get('/matches',
  aiRateLimiter,
  getAISuggestions
);

// Get detailed match analysis
// GET /api/ai/matches/:userId
router.get('/matches/:userId',
  aiRateLimiter,
  getMatchDetails
);

// AI Chat Suggestions
// POST /api/ai/chat-suggestions
router.post('/chat-suggestions',
  strictAiRateLimiter,
  contentModeration,
  generateChatSuggestions
);

// Check chat access
// GET /api/ai/check-chat/:userId
router.get('/check-chat/:userId', checkChatAccess);

module.exports = router;