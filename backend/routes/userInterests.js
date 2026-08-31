/**
 * User Interest System Routes
 * Handles sending/responding to interests and chat access
 */

const express = require('express');
const router = express.Router();
const {
  sendInterest,
  getReceivedInterests,
  getSentInterests,
  respondToInterest,
  getInterestStats
} = require('../controllers/interestController');
const { authMiddleware } = require('../middleware/auth');

// All interest routes require authentication
router.use(authMiddleware);

// Send interest to another user
// POST /api/interests/send
router.post('/send', sendInterest);

// Respond to an interest (accept/reject)
// POST /api/interests/respond/:interestId
router.post('/respond/:interestId', respondToInterest);

// List received interests
// GET /api/interests/list
router.get('/list', getReceivedInterests);

// List sent interests
// GET /api/interests/sent
router.get('/sent', getSentInterests);

// Get interest statistics
// GET /api/interests/stats
router.get('/stats', getInterestStats);

module.exports = router;