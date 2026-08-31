const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware, adminAuthMiddleware } = require('../middleware/auth');
const { isAdmin, isAdminOrMainAdmin } = require('../middleware/roleMiddleware');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const cache = require('../utils/cache');
const { checkPremiumAccess } = require('../middleware/premiumAccess');

// User-to-admin chat
router.post('/user/send', authMiddleware, chatController.chatUpload.single('image'), chatController.sendUserMessage);
router.get('/user/messages', authMiddleware, cacheMiddleware('chat-user', 5000), chatController.getUserChat);
router.get('/user/unread-count', authMiddleware, chatController.getUserUnreadCount);
router.post('/user/start', authMiddleware, chatController.startChat);
router.put('/user/mark-read', authMiddleware, (req, res, next) => { cache.clearByPrefix('chat-user'); next(); }, chatController.markAsRead);

// Admin chat
router.post('/admin/send', isAdminOrMainAdmin, chatController.chatUpload.single('image'), chatController.sendAdminMessage);
router.get('/admin/conversations', isAdminOrMainAdmin, cacheMiddleware('chat-admin', 30000), chatController.getAdminChats);
router.get('/admin/unread-count', isAdminOrMainAdmin, cacheMiddleware('chat-admin', 30000), chatController.getAdminUnreadCount);
router.get('/admin/chat/:userId', isAdminOrMainAdmin, chatController.getAdminChatWithUser);
router.put('/admin/mark-read/:userId', isAdminOrMainAdmin, (req, res, next) => { cache.clearByPrefix('chat-admin'); next(); }, chatController.markAsRead);

// User-to-user chat (requires premium or accepted interest)
router.post('/message/send', authMiddleware, checkPremiumAccess, chatController.chatUpload.single('image'), chatController.sendUserToUserMessage);
router.get('/message/conversations', authMiddleware, chatController.getUserChats);
router.get('/message/chat/:userId', authMiddleware, checkPremiumAccess, chatController.getUserChatWithUser);
router.get('/message/unread-count', authMiddleware, chatController.getUserUnreadCount);
router.get('/message/check-access/:userId', authMiddleware, chatController.checkChatAccess);

router.delete('/message/:messageId', authMiddleware, chatController.deleteMessage);
router.delete('/admin/message/:messageId', isAdminOrMainAdmin, chatController.deleteMessage);

module.exports = router;
