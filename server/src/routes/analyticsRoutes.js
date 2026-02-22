const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getProviderAnalytics } = require('../controllers/analyticsController');

router.get('/provider', protect, authorize('provider', 'admin'), getProviderAnalytics);

module.exports = router;
