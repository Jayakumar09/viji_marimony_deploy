const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  updateHoroscope,
  updateFamilyBackground,
  updateSubscription,
  getSubscriptionPlans,
  uploadDocument,
  getDocuments,
  deleteDocument,
  uploadProfilePhoto,
  uploadGalleryPhotos,
  deletePhoto,
  saveProfilePhotoAdjustments
} = require('../controllers/profileController');
const { authMiddleware } = require('../middleware/auth');
const { 
  validateProfileUpdate,
  handleValidationErrors 
} = require('../middleware/validation');
const multer = require('multer');
const { upload, uploadSingle, uploadMultiple } = require('../utils/upload');

// All routes are protected
router.use(authMiddleware);

// Get user profile
router.get('/', getProfile);

// Update user profile
router.put('/', validateProfileUpdate, handleValidationErrors, updateProfile);

// ============ HOROSCOPE ROUTES ============
router.put('/horoscope', updateHoroscope);

// ============ FAMILY BACKGROUND ROUTES ============
router.put('/family', updateFamilyBackground);

// ============ SUBSCRIPTION ROUTES ============
router.put('/subscription', updateSubscription);
router.get('/subscription/plans', getSubscriptionPlans);

// ============ DOCUMENT ROUTES ============
router.post('/documents', (req, res, next) => {
  upload.single('document')(req, res, (err) => {
    if (err) {
      console.error('Multer error (document):', err);
      return res.status(400).json({ 
        error: 'File upload failed', 
        details: err.message 
      });
    }
    next();
  });
}, uploadDocument);

router.get('/documents', getDocuments);
router.delete('/documents/:id', deleteDocument);

// Upload profile photo with error handling for multer
router.post('/photo', (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      console.error('Multer error (profile photo):', err);
      return res.status(400).json({ 
        error: 'File upload failed', 
        details: err.message 
      });
    }
    next();
  });
}, uploadProfilePhoto);

// Upload gallery photos with error handling for multer
router.post('/photos', (req, res, next) => {
  uploadMultiple(req, res, (err) => {
    if (err) {
      console.error('Multer error (gallery photos):', err);
      return res.status(400).json({ 
        error: 'File upload failed', 
        details: err.message 
      });
    }
    next();
  });
}, uploadGalleryPhotos);

// Delete photo
router.delete('/photo', deletePhoto);

// Save profile photo adjustments
router.put('/photo/adjustments', saveProfilePhotoAdjustments);

module.exports = router;
