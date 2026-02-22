const express = require('express');
const router = express.Router();
const PushSubscription = require('../models/PushSubscription');
const { protect } = require('../middleware/authMiddleware');

// Get VAPID public key (public endpoint)
router.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

// Subscribe to push notifications
router.post('/subscribe', protect, async (req, res) => {
    try {
        const { subscription } = req.body;

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ message: 'Invalid subscription object' });
        }

        // Upsert — update if same endpoint exists, create if new
        await PushSubscription.findOneAndUpdate(
            {
                userId: req.user.id,
                'subscription.endpoint': subscription.endpoint
            },
            {
                userId: req.user.id,
                subscription: subscription,
                userAgent: req.headers['user-agent']
            },
            { upsert: true, new: true }
        );

        console.log(`📲 Push subscription saved for user ${req.user.id}`);
        res.json({ message: 'Subscribed to push notifications' });
    } catch (err) {
        console.error('Push subscribe error:', err.message);
        res.status(500).json({ message: 'Failed to subscribe' });
    }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', protect, async (req, res) => {
    try {
        const { endpoint } = req.body;

        if (endpoint) {
            await PushSubscription.deleteOne({
                userId: req.user.id,
                'subscription.endpoint': endpoint
            });
        } else {
            // Remove all subscriptions for this user
            await PushSubscription.deleteMany({ userId: req.user.id });
        }

        res.json({ message: 'Unsubscribed from push notifications' });
    } catch (err) {
        console.error('Push unsubscribe error:', err.message);
        res.status(500).json({ message: 'Failed to unsubscribe' });
    }
});

module.exports = router;
