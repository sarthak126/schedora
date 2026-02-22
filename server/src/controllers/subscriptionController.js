const Subscription = require('../models/Subscription');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
let razorpay;
try {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    } else {
        console.warn("⚠️  Razorpay keys missing in .env (Subscription). Payment features will use MOCK mode.");
    }
} catch (err) {
    console.error("⚠️  Failed to initialize Razorpay (Subscription):", err.message);
}

// Plan Details (Hardcoded for MVP)
const PLANS = {
    'pro': { amount: 49900, durationDays: 30, name: 'Pro Plan' }, // Amount in paise
    'business': { amount: 99900, durationDays: 30, name: 'Business Plan' }
};

// @desc    Get current subscription status
// @route   GET /api/subscriptions/current
// @access  Private (Provider)
const getCurrentSubscription = async (req, res) => {
    try {
        let subscription = await Subscription.findOne({ provider: req.user.id });

        // Auto-create free trial if missing (similar to middleware logic for consistency)
        // Auto-create free trial if missing (similar to middleware logic for consistency)
        if (!subscription) {
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 30); // Changed to 30 days
            subscription = await Subscription.create({
                provider: req.user.id,
                startDate: new Date(),
                endDate: trialEndDate,
                status: 'active',
                planName: 'free'
            });
        }

        // Dummy Mode Override: If payments disabled, make it look active
        if (process.env.PAYMENTS_ENABLED === 'false') {
            // Convert to object to modify safely without saving
            const subObj = subscription.toObject();
            subObj.status = 'active';
            if (new Date() > subObj.endDate) {
                const extendedDate = new Date();
                extendedDate.setDate(extendedDate.getDate() + 30);
                subObj.endDate = extendedDate;
            }
            return res.json(subObj);
        }

        res.json(subscription);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create Subscription Order
// @route   POST /api/subscriptions/order
// @access  Private (Provider)
const createSubscriptionOrder = async (req, res) => {
    const { plan } = req.body;

    if (!PLANS[plan]) {
        return res.status(400).json({ message: 'Invalid Plan' });
    }

    try {
        let order;
        if (razorpay) {
            const options = {
                amount: PLANS[plan].amount,
                currency: "INR",
                receipt: `sub_${Date.now()}`,
            };
            order = await razorpay.orders.create(options);
        } else {
            console.warn("⚠️  Generating MOCK Subscription order (no keys found)");
            order = {
                id: `sub_mock_${Date.now()}`,
                amount: PLANS[plan].amount,
                currency: "INR",
                status: "created",
                isMock: true
            };
        }
        res.json({ order, planDetails: PLANS[plan] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Razorpay Order Failed' });
    }
};

// @desc    Verify Subscription Payment
// @route   POST /api/subscriptions/verify
// @access  Private (Provider)
const verifySubscriptionPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

    let isValid = false;

    // Check for mock order bypass
    if (razorpay_order_id && razorpay_order_id.startsWith('sub_mock_')) {
        console.log("⚠️  Mock Subscription verification for:", razorpay_order_id);
        isValid = true;
    } else {
        if (!process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({ message: 'Razorpay keys missing on server' });
        }
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        isValid = generated_signature === razorpay_signature;
    }

    if (isValid) {
        try {
            // Calculate new end date
            const durationDays = PLANS[plan].durationDays;
            const newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + durationDays);

            // Upsert Subscription
            const subscription = await Subscription.findOneAndUpdate(
                { provider: req.user.id },
                {
                    plan: plan,
                    status: 'active',
                    startDate: new Date(),
                    endDate: newEndDate,
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id
                },
                { new: true, upsert: true }
            );

            res.json({ message: 'Subscription Activated', subscription });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Database Update Failed' });
        }
    } else {
        res.status(400).json({ message: 'Invalid Signature' });
    }
};

module.exports = {
    getCurrentSubscription,
    createSubscriptionOrder,
    verifySubscriptionPayment
};
