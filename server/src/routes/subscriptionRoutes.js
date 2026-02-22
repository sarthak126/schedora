const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getCurrentSubscription,
    createSubscriptionOrder,
    verifySubscriptionPayment
} = require('../controllers/subscriptionController');

router.get('/current', protect, authorize('provider'), getCurrentSubscription);
router.post('/order', protect, authorize('provider'), createSubscriptionOrder);
router.post('/verify', protect, authorize('provider'), verifySubscriptionPayment);

module.exports = router;
