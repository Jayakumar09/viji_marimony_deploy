const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  updateProfile,
  adminLogin
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { 
  validateRegistration, 
  validateLogin, 
  validateProfileUpdate,
  handleValidationErrors 
} = require('../middleware/validation');

// Public routes
router.post('/register', validateRegistration, handleValidationErrors, register);
router.post('/login', validateLogin, handleValidationErrors, login);

// Forgot password - returns success regardless (security)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists (but don't reveal this for security)
    const user = await require('../utils/database').prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    // Always return success for security
    // In production, you would send an actual email with reset link
    res.json({ 
      message: 'If an account exists with this email, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin login route - separate endpoint for admin authentication
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find admin in admin table
    const admin = await require('../utils/database').prisma.admin.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    
    if (!admin.isActive) {
      return res.status(401).json({ error: 'Admin account is deactivated' });
    }
    
    // Check password
    const isPasswordValid = await require('../utils/password').comparePassword(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    
    // Generate admin token
    const token = require('../utils/jwt').generateAdminToken(admin.id);
    
    res.json({
      message: 'Admin login successful',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error during admin login' });
  }
});

// Protected routes
router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, validateProfileUpdate, handleValidationErrors, updateProfile);

module.exports = router;