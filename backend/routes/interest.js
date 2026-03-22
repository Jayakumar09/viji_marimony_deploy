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
const { body, validationResult } = require('express-validator');

// All routes are protected
router.use(authMiddleware);

// Send interest
router.post('/',
  [
    body('receiverId')
      .notEmpty()
      .withMessage('Receiver ID is required'),
    body('message')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Message must not exceed 500 characters')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  },
  sendInterest
);

// Get received interests
router.get('/received', getReceivedInterests);

// Get sent interests
router.get('/sent', getSentInterests);

// Respond to interest (accept/reject)
router.put('/:interestId/respond',
  [
    body('status')
      .isIn(['ACCEPTED', 'REJECTED'])
      .withMessage('Status must be either ACCEPTED or REJECTED')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  },
  respondToInterest
);

// Get interest statistics
router.get('/stats', getInterestStats);

module.exports = router;