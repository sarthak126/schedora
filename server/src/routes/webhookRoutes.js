const express = require('express');
const router = express.Router();
const { handleRazorpayWebhook } = require('../controllers/webhookController');

/**
 * Razorpay Webhook Endpoint
 * 
 * IMPORTANT: This route MUST use express.json() middleware
 * The signature is verified against the JSON body
 * 
 * Configure this URL in Razorpay Dashboard:
 * Settings → Webhooks → Add New Webhook
 * URL: https://your-domain.com/api/webhooks/razorpay
 * 
 * Events to subscribe:
 * - subscription.authenticated
 * - subscription.charged
 * - subscription.pending
 * - subscription.halted
 * - subscription.cancelled
 * - payment.captured
 * - payment.failed
 * - refund.processed
 */

// Razorpay webhook handler
router.post('/razorpay', handleRazorpayWebhook);

module.exports = router;
