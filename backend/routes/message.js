const express = require('express');
const router = express.Router();
const { 
  sendMessage, 
  getConversations, 
  getMessages,
  markMessagesAsRead,
  getUnreadCount
} = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// All routes are protected
router.use(authMiddleware);

// Send message
router.post('/',
  [
    body('receiverId')
      .notEmpty()
      .withMessage('Receiver ID is required'),
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Message content is required')
      .isLength({ max: 1000 })
      .withMessage('Message must not exceed 1000 characters')
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
  sendMessage
);

// Get conversations list
router.get('/conversations', getConversations);

// Get messages with specific user
router.get('/:userId', getMessages);

// Mark messages as read
router.put('/:userId/read', markMessagesAsRead);

// Get unread message count
router.get('/unread/count', getUnreadCount);

module.exports = router;