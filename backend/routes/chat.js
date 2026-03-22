const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware, adminAuthMiddleware } = require('../middleware/auth');
const { isAdmin, isAdminOrMainAdmin } = require('../middleware/roleMiddleware');

// User routes (require user authentication)
router.post('/user/send', authMiddleware, chatController.chatUpload.single('image'), chatController.sendUserMessage);
router.get('/user/messages', authMiddleware, chatController.getUserChat);
router.get('/user/unread-count', authMiddleware, chatController.getUserUnreadCount);
router.post('/user/start', authMiddleware, chatController.startChat);
router.put('/user/mark-read', authMiddleware, chatController.markAsRead);

// Admin routes (require admin authentication)
router.post('/admin/send', isAdminOrMainAdmin, chatController.chatUpload.single('image'), chatController.sendAdminMessage);
router.get('/admin/conversations', isAdminOrMainAdmin, chatController.getAdminChats);
router.get('/admin/unread-count', isAdminOrMainAdmin, chatController.getAdminUnreadCount);
router.get('/admin/chat/:userId', isAdminOrMainAdmin, chatController.getAdminChatWithUser);
router.put('/admin/mark-read/:userId', isAdminOrMainAdmin, chatController.markAsRead);

// Delete message route (both user and admin can delete)
router.delete('/message/:messageId', authMiddleware, chatController.deleteMessage);
router.delete('/admin/message/:messageId', isAdminOrMainAdmin, chatController.deleteMessage);

module.exports = router;
