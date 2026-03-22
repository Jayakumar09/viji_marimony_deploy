const express = require('express');
const router = express.Router();
const {
  addCustomCity,
  getCustomCitiesByState,
  addSubCaste,
  getSubCastes
} = require('../controllers/lookupController');

// Public lookup routes
router.get('/cities', getCustomCitiesByState);
router.post('/cities', addCustomCity);

router.get('/subcastes', getSubCastes);
router.post('/subcastes', addSubCaste);

module.exports = router;
