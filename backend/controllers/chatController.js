const { prisma } = require('../utils/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for chat image uploads
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/chat');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `chat_${req.user?.id || req.admin?.id}_${uniqueSuffix}${ext}`);
  }
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// User sends message to admin
const sendUserMessage = async (req, res) => {
  try {
    const { message, messageType } = req.body;
    const userId = req.user.id;
    const isImage = messageType === 'image' || req.file;

    // Check if it's an image message
    if (isImage) {
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required for image messages' });
      }
      
      // Create image URL
      const imageUrl = `/uploads/chat/${req.file.filename}`;
      
      const chatMessage = await prisma.chatMessage.create({
        data: {
          userId,
          senderType: 'USER',
          messageType: 'image',
          message: imageUrl
        }
      });

      return res.status(201).json({
        message: 'Image sent successfully',
        data: chatMessage
      });
    }

    // Text message
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Create chat message from user
    const chatMessage = await prisma.chatMessage.create({
      data: {
        userId,
        senderType: 'USER',
        messageType: 'text',
        message: message.trim()
      }
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: chatMessage
    });

  } catch (error) {
    console.error('Send user chat message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin sends message to user
const sendAdminMessage = async (req, res) => {
  try {
    const { userId, message, messageType } = req.body;
    const adminId = req.admin?.id || 'admin';
    const isImage = messageType === 'image' || req.file;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if it's an image message
    if (isImage) {
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required for image messages' });
      }
      
      // Create image URL
      const imageUrl = `/uploads/chat/${req.file.filename}`;
      
      const chatMessage = await prisma.chatMessage.create({
        data: {
          userId,
          adminId,
          senderType: 'ADMIN',
          messageType: 'image',
          message: imageUrl
        }
      });

      return res.status(201).json({
        message: 'Image sent successfully',
        data: chatMessage
      });
    }

    // Text message
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Create chat message from admin
    const chatMessage = await prisma.chatMessage.create({
      data: {
        userId,
        adminId,
        senderType: 'ADMIN',
        messageType: 'text',
        message: message.trim()
      }
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: chatMessage
    });

  } catch (error) {
    console.error('Send admin chat message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// User gets their conversation with admin
const getUserChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [messages, totalCount] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.chatMessage.count({
        where: { userId }
      })
    ]);

    // Mark admin messages as read
    await prisma.chatMessage.updateMany({
      where: {
        userId,
        senderType: 'ADMIN',
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalMessages: totalCount,
        hasNext: skip + messages.length < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get user chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin gets all chat conversations (list of users with chats)
const getAdminChats = async (req, res) => {
  try {
    // Get all unique users who have chatted
    const chats = await prisma.chatMessage.findMany({
      select: {
        userId: true,
        createdAt: true,
        message: true,
        senderType: true,
        isRead: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group by user and get latest message info
    const userChatMap = new Map();
    
    for (const chat of chats) {
      if (!userChatMap.has(chat.userId)) {
        // Get user details
        const user = await prisma.user.findUnique({
          where: { id: chat.userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            email: true,
            phone: true,
            isActive: true
          }
        });

        if (user) {
          // Count unread messages from this user
          const unreadCount = await prisma.chatMessage.count({
            where: {
              userId: chat.userId,
              senderType: 'USER',
              isRead: false
            }
          });

          userChatMap.set(chat.userId, {
            user,
            lastMessage: chat.message,
            lastMessageTime: chat.createdAt,
            lastSenderType: chat.senderType,
            unreadCount
          });
        }
      }
    }

    // Convert to array and sort by last message time
    const conversations = Array.from(userChatMap.values())
      .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    res.json({ conversations });

  } catch (error) {
    console.error('Get admin chats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin gets chat with specific user
const getAdminChatWithUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
        email: true,
        phone: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [messages, totalCount] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.chatMessage.count({
        where: { userId }
      })
    ]);

    // Mark user messages as read
    await prisma.chatMessage.updateMany({
      where: {
        userId,
        senderType: 'USER',
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({
      user,
      messages: messages.reverse(),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalMessages: totalCount,
        hasNext: skip + messages.length < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get admin chat with user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get unread message count for user
const getUserUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const unreadCount = await prisma.chatMessage.count({
      where: {
        userId,
        senderType: 'ADMIN',
        isRead: false
      }
    });

    res.json({ unreadCount });

  } catch (error) {
    console.error('Get user unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get total unread count for admin (from all users)
const getAdminUnreadCount = async (req, res) => {
  try {
    const unreadCount = await prisma.chatMessage.count({
      where: {
        senderType: 'USER',
        isRead: false
      }
    });

    res.json({ unreadCount });

  } catch (error) {
    console.error('Get admin unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark messages as read (for both user and admin)
const markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterType = req.admin ? 'ADMIN' : 'USER';
    const requesterId = req.admin ? 'admin' : req.user.id;

    if (requesterType === 'USER') {
      // User marks admin messages as read
      await prisma.chatMessage.updateMany({
        where: {
          userId: requesterId,
          senderType: 'ADMIN',
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    } else {
      // Admin marks user messages as read
      await prisma.chatMessage.updateMany({
        where: {
          userId,
          senderType: 'USER',
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    }

    res.json({ message: 'Messages marked as read' });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Start new chat (user initiates chat with admin)
const startChat = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user already has chat history
    const existingChat = await prisma.chatMessage.findFirst({
      where: { userId }
    });

    if (existingChat) {
      return res.json({ 
        message: 'Chat already exists',
        hasExistingChat: true 
      });
    }

    res.json({ 
      message: 'Ready to start new chat',
      hasExistingChat: false 
    });

  } catch (error) {
    console.error('Start chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a chat message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id;
    const adminId = req.admin?.id;

    // Find the message
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check authorization - user can delete their own messages, admin can delete any message
    const isUserOwner = userId && message.userId === userId && message.senderType === 'USER';
    const isAdmin = !!adminId;

    if (!isUserOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    // If it's an image message, delete the image file
    if (message.messageType === 'image' && message.message) {
      const imagePath = path.join(__dirname, '../uploads/chat', path.basename(message.message));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete the message from database
    await prisma.chatMessage.delete({
      where: { id: messageId }
    });

    res.json({ 
      message: 'Message deleted successfully',
      deletedMessageId: messageId 
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  chatUpload,
  sendUserMessage,
  sendAdminMessage,
  getUserChat,
  getAdminChats,
  getAdminChatWithUser,
  getUserUnreadCount,
  getAdminUnreadCount,
  markAsRead,
  startChat,
  deleteMessage
};
