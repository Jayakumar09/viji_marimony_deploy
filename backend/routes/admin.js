 const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const multer = require('multer');
const upload = multer({ memory: true });
const { 
  adminMiddleware,
  getPendingVerifications,
  approvePhoto,
  rejectPhoto,
  getAllUsers,
  updateUserVerification,
  verifyUser,
  getUserDetails,
  getDashboardStats,
  createSubscription,
  syncUserSubscription,
  getPendingProfileVerifications,
  approveProfileVerification,
  rejectProfileVerification
} = require('../controllers/adminController');
const {
  getAdminUserProfile,
  blockUser,
  unblockUser,
  deleteUser,
  getUserActivityLogs,
  manualVerifyUser,
  updateSubscription,
  verifyUserPhoto
} = require('../controllers/adminUserProfileController');
const {
  approveDocument,
  rejectDocument
} = require('../controllers/profileController');

// Admin authentication routes (simplified for demo)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const admin = await require('../utils/database').prisma.admin.findUnique({
      where: { email }
    });
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const bcrypt = require('bcryptjs');
    const validPassword = await bcrypt.compare(password, admin.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET || 'boyar-matrimony-super-secret-key-change-in-production-2024',
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// All admin routes require authentication
router.use(adminMiddleware);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Photo verification routes
router.get('/photos/pending', getPendingVerifications);
router.put('/photos/:id/approve', approvePhoto);
router.put('/photos/:id/reject', rejectPhoto);

// User management
router.get('/users', getAllUsers);

// Photo verification for user photos (profile and gallery) - MUST be before /users/:id routes
router.post('/users/:userId/photos/verify', verifyUserPhoto);

router.put('/users/:id/verification', updateUserVerification);
router.put('/users/:id/verify', verifyUser);

// Admin User Profile - Full detailed view - MUST be before /users/:id
router.get('/users/:id/profile', getAdminUserProfile);

// Get basic user details - AFTER more specific routes
router.get('/users/:id', getUserDetails);

// User status management - MUST be before /users/:id
router.put('/users/:id/block', blockUser);
router.put('/users/:id/unblock', unblockUser);
router.delete('/users/:id', deleteUser);

// User verification - MUST be before /users/:id
router.put('/users/:id/manual-verify', manualVerifyUser);

// User activity logs - MUST be before /users/:id
router.get('/users/:id/activity-logs', getUserActivityLogs);

// Subscription management
router.get('/subscriptions', async (req, res) => {
  try {
    const { prisma } = require('../utils/database');
    const subscriptions = await prisma.subscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ subscriptions });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});
router.post('/subscriptions', createSubscription);
router.put('/subscriptions/sync/:userId', syncUserSubscription);
router.put('/subscriptions/:id', updateSubscription);

// Profile verification workflow routes
router.get('/profile-verifications/pending', getPendingProfileVerifications);
router.put('/profile-verifications/:userId/approve', approveProfileVerification);
router.put('/profile-verifications/:userId/reject', rejectProfileVerification);

// Document approval routes
router.put('/documents/:id/approve', approveDocument);
router.put('/documents/:id/reject', rejectDocument);

// Share profile via email
router.post('/share-profile-email', upload.single('pdf'), async (req, res) => {
  try {
    const { email, profileName, shareType } = req.body;
    const pdfFile = req.file;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Get SMTP settings from environment
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpUser = process.env.EMAIL_USER || process.env.BUSINESS_EMAIL_USER;
    const smtpPass = process.env.EMAIL_PASS || process.env.BUSINESS_EMAIL_PASS;
    const fromEmail = process.env.FROM_EMAIL || process.env.BUSINESS_EMAIL_USER;
    
    // If SMTP is not configured, return fallback message
    if (!smtpUser || !smtpPass) {
      console.log('SMTP not configured, returning fallback');
      return res.json({ 
        success: true, 
        message: 'Email service not configured. Please use the mailto link to send email.',
        fallback: true
      });
    }
    
    console.log('Using SMTP:', smtpHost, 'From:', fromEmail);
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    
    const sanitizedText = shareType === 'other' ? '(Sanitized - Private info hidden)' : '(Full Profile)';
    
    // Prepare email
    const mailOptions = {
      from: `"Vijayalakshmi Boyar Matrimony" <${fromEmail}>`,
      to: email,
      subject: `${profileName}'s Profile - Vijayalakshmi Boyar Matrimony`,
      text: `Please find attached the profile of ${profileName} ${sanitizedText}.\n\nRegards,\nVijayalakshmi Boyar Matrimony`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B5CF6;">Vijayalakshmi Boyar Matrimony</h2>
          <p>Please find attached the profile of <strong>${profileName}</strong> ${sanitizedText}.</p>
          <p>This profile was shared via our matrimony service.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Regards,<br>Vijayalakshmi Boyar Matrimony</p>
        </div>
      `
    };
    
    // Attach PDF if provided
    if (pdfFile) {
      mailOptions.attachments = [
        {
          filename: pdfFile.originalname || `${profileName}_Profile.pdf`,
          content: pdfFile.buffer
        }
      ];
    }
    
    // Send email
    await transporter.sendMail(mailOptions);
    
    console.log('Profile email sent successfully to:', email);
    
    res.json({ 
      success: true, 
      message: `Profile sent to ${email}` 
    });
  } catch (error) {
    console.error('Share profile email error:', error);
    res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
});

module.exports = router;
