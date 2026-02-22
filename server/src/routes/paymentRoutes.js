const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { paymentLimiter, subscriptionLimiter } = require('../middleware/rateLimiter');
const {
    getPlans,
    createSubscription,
    getSubscriptionStatus,
    cancelSubscription,
    createBookingOrder,
    verifyPayment,
    initiateRefund,
    getAllPayments,
    getSubscriptionAnalytics,
    configureSalonPayment,
    getSalonPaymentStatus
} = require('../controllers/paymentController');

// =================== PUBLIC ROUTES ===================

// Check if payments feature is enabled globally
router.get('/feature-status', (req, res) => {
    res.json({
        paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true',
        message: process.env.PAYMENTS_ENABLED === 'true'
            ? 'Payments are live'
            : 'Online payments coming soon!'
    });
});

// Get available subscription plans
router.get('/plans', getPlans);

// =================== SUBSCRIPTION ROUTES (FLOW A - Salon → Platform) ===================

// Create subscription (Provider only) - Rate limited: 5/hour
router.post('/subscription/create', protect, authorize('provider'), subscriptionLimiter, createSubscription);

// Get current subscription status
router.get('/subscription/status', protect, authorize('provider'), getSubscriptionStatus);

// Cancel subscription
router.post('/subscription/cancel', protect, authorize('provider'), cancelSubscription);

// =================== SALON PAYMENT CONFIGURATION (Direct Payment Model) ===================

// Configure salon's own Razorpay credentials
router.post('/salon/configure', protect, authorize('provider'), configureSalonPayment);

// Get salon's payment configuration status
router.get('/salon/status', protect, authorize('provider'), getSalonPaymentStatus);

// =================== BOOKING PAYMENT ROUTES (FLOW B - Direct Payment to Salon) ===================

// Create order for booking payment (uses salon's Razorpay)
router.post('/order/create', protect, paymentLimiter, createBookingOrder);

// Verify payment signature
router.post('/verify', protect, verifyPayment);

// Initiate refund (Provider or Admin only)
router.post('/refund', protect, authorize('provider', 'admin'), initiateRefund);

// =================== ADMIN ROUTES ===================

// Get all payments (Admin only)
router.get('/admin/all', protect, authorize('admin'), getAllPayments);

// Get subscription analytics (Admin only)
router.get('/admin/subscriptions', protect, authorize('admin'), getSubscriptionAnalytics);

module.exports = router;

