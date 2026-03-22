const express = require('express');
const router = express.Router();
const { 
  searchProfiles, 
  getProfileById, 
  getSearchFilters,
  getRecommendedProfiles 
} = require('../controllers/searchController');
const { authMiddleware } = require('../middleware/auth');

// Search profiles with filters - public route
router.get('/', searchProfiles);

// Get recommended profiles - requires auth
router.get('/recommended', authMiddleware, getRecommendedProfiles);

// Get search filter options
router.get('/filters', getSearchFilters);

// Get specific profile by ID - requires auth
router.get('/:profileId', authMiddleware, getProfileById);

module.exports = router;