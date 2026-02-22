const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:notifications@schedora.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    console.log('✅ Web Push configured with VAPID keys');
} else {
    console.warn('⚠️ VAPID keys not found. Web Push notifications disabled.');
}

/**
 * Send push notification to all subscriptions for a given user
 * @param {string} userId - The provider's user ID
 * @param {object} payload - Notification payload { title, message, ... }
 */
const sendPushToUser = async (userId, payload) => {
    try {
        const subscriptions = await PushSubscription.find({ userId });

        if (subscriptions.length === 0) return;

        const pushPayload = JSON.stringify({
            title: payload.title || 'New Notification',
            message: payload.message || '',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `appointment-${payload.bookingId || Date.now()}`,
            data: {
                url: '/dashboard/provider',
                bookingId: payload.bookingId,
                customerName: payload.customerName,
                serviceName: payload.serviceName,
                date: payload.date,
                time: payload.time,
            }
        });

        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    await webpush.sendNotification(sub.subscription, pushPayload);
                } catch (err) {
                    // If subscription is expired or invalid, remove it
                    if (err.statusCode === 404 || err.statusCode === 410) {
                        await PushSubscription.findByIdAndDelete(sub._id);
                        console.log(`🗑️ Removed expired push subscription for user ${userId}`);
                    }
                    throw err;
                }
            })
        );

        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (succeeded > 0) {
            console.log(`📲 Push sent to ${succeeded} device(s) for user ${userId}`);
        }
        if (failed > 0) {
            console.log(`📲 Push failed for ${failed} device(s) for user ${userId}`);
        }
    } catch (err) {
        console.error('Push notification error:', err.message);
    }
};

module.exports = { sendPushToUser };
