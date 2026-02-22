const Subscription = require('../models/Subscription');

// Middleware to check if provider has an active subscription
const checkSubscription = async (req, res, next) => {
    try {
        // 1. Fetch subscription for the user
        const subscription = await Subscription.findOne({ provider: req.user.id });

        // 2. If no subscription found, create a Free Trial (30 Days) automatically
        // This acts as a fallback for existing users or new signups
        if (!subscription) {
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 30); // Changed to 30 days trial

            await Subscription.create({
                provider: req.user.id,
                planName: 'free',
                status: 'active',
                startDate: new Date(),
                endDate: trialEndDate
            });
            return next(); // Allow access as trial is now active
        }

        // Logic Bypass: If payments are disabled, allow access even if expired (Dummy Mode)
        if (process.env.PAYMENTS_ENABLED === 'false') {
            req.subscription = subscription;
            return next();
        }

        // 3. Check if active and not expired
        if (subscription.status !== 'active' || new Date() > subscription.endDate) {
            // If expired, update status to expired if not already
            if (subscription.status === 'active') {
                subscription.status = 'expired';
                await subscription.save();
            }

            return res.status(403).json({
                message: 'Subscription Expired. Please upgrade your plan to continue.',
                code: 'SUBSCRIPTION_EXPIRED'
            });
        }

        // 4. Attach sub to req for potential usage
        req.subscription = subscription;
        next();

    } catch (error) {
        console.error("Subscription Check Error:", error);
        res.status(500).json({ message: 'Server Error checking subscription' });
    }
};

module.exports = { checkSubscription };
