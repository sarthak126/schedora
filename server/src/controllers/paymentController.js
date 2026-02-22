const Razorpay = require('razorpay');
const crypto = require('crypto');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Salon = require('../models/Salon');

// =================== RAZORPAY INITIALIZATION ===================

let razorpay;

const initRazorpay = () => {
    if (razorpay) return razorpay;

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.warn('⚠️  Razorpay keys not configured. Payment features will be disabled.');
        return null;
    }

    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    console.log('✅ Razorpay initialized successfully');
    return razorpay;
};

// Initialize on module load
initRazorpay();

// =================== HELPER FUNCTIONS ===================

/**
 * Generate signature for verification
 */
const generateSignature = (payload, secret) => {
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
};

/**
 * Verify Razorpay payment signature
 */
const verifySignature = (orderId, paymentId, signature) => {
    if (!process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay secret key not configured');
    }

    const expectedSignature = generateSignature(
        `${orderId}|${paymentId}`,
        process.env.RAZORPAY_KEY_SECRET
    );

    return expectedSignature === signature;
};

// =================== PLAN MANAGEMENT ===================

/**
 * @desc    Get all available plans
 * @route   GET /api/payments/plans
 * @access  Public
 */
const getPlans = async (req, res) => {
    try {
        const plans = await Plan.find({ isActive: true })
            .sort({ displayOrder: 1 })
            .select('-razorpay_plan_id'); // Don't expose Razorpay ID to frontend

        res.json(plans);
    } catch (error) {
        console.error('Get Plans Error:', error);
        res.status(500).json({ message: 'Failed to fetch plans' });
    }
};

// =================== SUBSCRIPTION MANAGEMENT (FLOW A) ===================

/**
 * @desc    Create a Razorpay subscription for salon billing
 * @route   POST /api/payments/subscription/create
 * @access  Private (Provider)
 */
const createSubscription = async (req, res) => {
    try {
        const { planId } = req.body;

        if (!razorpay) {
            return res.status(503).json({ message: 'Payment service unavailable. Please configure Razorpay keys.' });
        }

        // Validate plan
        const plan = await Plan.findById(planId);
        if (!plan || !plan.isActive) {
            return res.status(400).json({ message: 'Invalid or inactive plan' });
        }

        // Check if user already has an active subscription
        const existingSub = await Subscription.findOne({
            provider: req.user.id,
            status: { $in: ['active', 'authenticated', 'pending'] }
        });

        if (existingSub && existingSub.razorpay_subscription_id) {
            return res.status(400).json({
                message: 'You already have an active subscription',
                subscription: existingSub
            });
        }

        // Create Razorpay subscription
        const subscriptionOptions = {
            plan_id: plan.razorpay_plan_id,
            customer_notify: 1,
            total_count: 120, // Max billing cycles (10 years for monthly)
            notes: {
                provider_id: req.user.id.toString(),
                plan_name: plan.name
            }
        };

        const razorpaySubscription = await razorpay.subscriptions.create(subscriptionOptions);

        // Calculate period dates
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + (plan.period * (plan.interval === 'monthly' ? 30 : plan.interval === 'yearly' ? 365 : 7)));

        // Create or update subscription record
        const subscription = await Subscription.findOneAndUpdate(
            { provider: req.user.id },
            {
                plan: plan._id,
                planName: plan.name.toLowerCase().includes('pro') ? 'pro' :
                    plan.name.toLowerCase().includes('business') ? 'business' : 'enterprise',
                razorpay_subscription_id: razorpaySubscription.id,
                short_url: razorpaySubscription.short_url,
                status: 'created',
                startDate: now,
                endDate: periodEnd,
                current_period_start: now,
                current_period_end: periodEnd
            },
            { new: true, upsert: true }
        );

        // Create payment record
        await Payment.create({
            type: 'subscription',
            amount: plan.amount,
            currency: plan.currency,
            subscription: subscription._id,
            payer: req.user.id,
            status: 'created',
            notes: { plan_id: planId }
        });

        res.json({
            subscription_id: razorpaySubscription.id,
            short_url: razorpaySubscription.short_url,
            key_id: process.env.RAZORPAY_KEY_ID,
            plan_name: plan.name,
            amount: plan.amount,
            subscription: subscription
        });

    } catch (error) {
        console.error('Create Subscription Error:', error);
        res.status(500).json({
            message: 'Failed to create subscription',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Get current subscription status
 * @route   GET /api/payments/subscription/status
 * @access  Private (Provider)
 */
const getSubscriptionStatus = async (req, res) => {
    try {
        const subscription = await Subscription.findOrCreateForProvider(req.user.id);

        // Populate plan details if exists
        await subscription.populate('plan');

        res.json({
            subscription,
            isActive: subscription.isActive(),
            hasPremiumAccess: subscription.hasPremiumAccess(),
            daysRemaining: subscription.getDaysRemaining()
        });
    } catch (error) {
        console.error('Get Subscription Status Error:', error);
        res.status(500).json({ message: 'Failed to fetch subscription status' });
    }
};

/**
 * @desc    Cancel subscription
 * @route   POST /api/payments/subscription/cancel
 * @access  Private (Provider)
 */
const cancelSubscription = async (req, res) => {
    try {
        const { cancelImmediately = false, reason } = req.body;

        const subscription = await Subscription.findOne({ provider: req.user.id });

        if (!subscription || !subscription.razorpay_subscription_id) {
            return res.status(404).json({ message: 'No active subscription found' });
        }

        if (razorpay) {
            // Cancel in Razorpay
            await razorpay.subscriptions.cancel(
                subscription.razorpay_subscription_id,
                cancelImmediately
            );
        }

        // Update local record
        subscription.cancel_at_period_end = !cancelImmediately;
        subscription.cancelled_at = new Date();
        subscription.cancellation_reason = reason;

        if (cancelImmediately) {
            subscription.status = 'cancelled';
        }

        await subscription.save();

        res.json({
            message: cancelImmediately ? 'Subscription cancelled' : 'Subscription will cancel at period end',
            subscription
        });

    } catch (error) {
        console.error('Cancel Subscription Error:', error);
        res.status(500).json({ message: 'Failed to cancel subscription' });
    }
};

// =================== BOOKING PAYMENTS (FLOW B) ===================

const { getSalonRazorpay, verifySalonSignature } = require('../utils/paymentUtils');

/**
 * @desc    Create order for booking payment (Direct Payment Model)
 * @route   POST /api/payments/order/create
 * @access  Private (Customer)
 * 
 * PAYMENT MODEL:
 * - 'direct' mode: Uses salon's own Razorpay → Money goes directly to salon
 * - 'platform' mode: Uses platform Razorpay → Route API transfers (future)
 */
const createBookingOrder = async (req, res) => {
    try {
        const { bookingId } = req.body;

        // Validate booking
        const booking = await Booking.findById(bookingId)
            .populate('service')
            .populate({
                path: 'salon',
                select: '+razorpay.key_id +razorpay.key_secret_encrypted +razorpay.isConfigured paymentMode'
            });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.paymentStatus === 'paid') {
            return res.status(400).json({ message: 'Booking already paid' });
        }

        // Get appropriate Razorpay instance (salon's or platform's)
        let salonPayment;
        try {
            salonPayment = getSalonRazorpay(booking.salon, razorpay);
        } catch (err) {
            if (err.message === 'PAYMENT_NOT_CONFIGURED') {
                return res.status(400).json({
                    message: 'This salon has not configured payment settings yet. Please contact the salon.',
                    error_code: 'SALON_PAYMENT_NOT_CONFIGURED'
                });
            }
            throw err;
        }

        // Create Razorpay order using salon's (or platform's) account
        const orderOptions = {
            amount: booking.price * 100, // Convert to paise
            currency: 'INR',
            receipt: `booking_${booking._id}`,
            notes: {
                booking_id: booking._id.toString(),
                salon_id: booking.salon._id.toString(),
                service: booking.service?.name || 'Service',
                payment_mode: salonPayment.mode
            }
        };

        const order = await salonPayment.razorpay.orders.create(orderOptions);

        // Update booking with order ID and payment mode
        booking.orderId = order.id;
        booking.paymentMode = salonPayment.mode;
        await booking.save();

        // Create payment record
        await Payment.create({
            type: 'booking',
            razorpay_order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            booking: booking._id,
            salon: booking.salon._id,
            payer: req.user.id,
            status: 'created',
            payment_mode: salonPayment.mode,
            notes: { mode: salonPayment.mode }
        });

        res.json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: salonPayment.key_id, // Salon's key (not platform's)
            booking_id: booking._id,
            salon_name: booking.salon.name,
            service_name: booking.service?.name,
            payment_mode: salonPayment.mode // Inform frontend of payment mode
        });

    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({ message: 'Failed to create order' });
    }
};

/**
 * @desc    Verify payment signature (works for both direct and platform modes)
 * @route   POST /api/payments/verify
 * @access  Private
 */
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } = req.body;

        // Find the payment to determine mode
        const payment = await Payment.findOne({ razorpay_order_id }).populate('salon');

        if (!payment) {
            return res.status(404).json({ message: 'Payment record not found' });
        }

        let isValid = false;

        // Verify based on payment mode
        if (payment.payment_mode === 'direct' && payment.salon) {
            // Direct mode - use salon's secret
            const salon = await Salon.findById(payment.salon)
                .select('+razorpay.key_secret_encrypted');

            if (salon?.razorpay?.key_secret_encrypted) {
                const { decrypt } = require('../utils/paymentUtils');
                const salonSecret = decrypt(salon.razorpay.key_secret_encrypted);
                if (salonSecret) {
                    isValid = verifySalonSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, salonSecret);
                }
            }
        } else {
            // Platform mode - use platform's secret
            isValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        }

        if (!isValid) {
            console.error('Payment signature verification failed');
            return res.status(400).json({ message: 'Payment verification failed' });
        }

        // Update payment record
        await Payment.findByIdAndUpdate(payment._id, {
            razorpay_payment_id,
            razorpay_signature,
            status: 'captured'
        });

        // Update booking if this is a booking payment
        if (booking_id) {
            const booking = await Booking.findById(booking_id);
            if (booking) {
                booking.paymentId = razorpay_payment_id;
                booking.orderId = razorpay_order_id;
                booking.paymentStatus = 'paid';
                booking.isTemporary = false;
                booking.reservedUntil = null;
                await booking.save();
            }
        }

        res.json({
            message: 'Payment verified successfully',
            payment_id: razorpay_payment_id
        });

    } catch (error) {
        console.error('Verify Payment Error:', error);
        res.status(500).json({ message: 'Payment verification failed' });
    }
};

/**
 * @desc    Initiate refund
 * @route   POST /api/payments/refund
 * @access  Private (Provider/Admin)
 */
const initiateRefund = async (req, res) => {
    try {
        const { payment_id, amount, reason } = req.body;

        if (!razorpay) {
            return res.status(503).json({ message: 'Payment service unavailable' });
        }

        // Find original payment
        const originalPayment = await Payment.findOne({ razorpay_payment_id: payment_id });

        if (!originalPayment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Calculate refund amount (full if not specified)
        const refundAmount = amount || originalPayment.amount;

        // Create refund in Razorpay
        const refund = await razorpay.payments.refund(payment_id, {
            amount: refundAmount,
            notes: { reason }
        });

        // Create refund payment record
        await Payment.create({
            type: 'refund',
            razorpay_payment_id: refund.payment_id,
            refund_id: refund.id,
            amount: refund.amount,
            refund_amount: refund.amount,
            refund_reason: reason,
            original_payment: originalPayment._id,
            booking: originalPayment.booking,
            salon: originalPayment.salon,
            status: refund.status === 'processed' ? 'refunded' : 'pending'
        });

        // Update original payment status
        originalPayment.status = refundAmount >= originalPayment.amount ? 'refunded' : 'partially_refunded';
        await originalPayment.save();

        // Update booking if exists
        if (originalPayment.booking) {
            await Booking.findByIdAndUpdate(originalPayment.booking, {
                paymentStatus: 'refunded',
                status: 'cancelled'
            });
        }

        res.json({
            message: 'Refund initiated successfully',
            refund_id: refund.id,
            amount: refund.amount
        });

    } catch (error) {
        console.error('Refund Error:', error);
        res.status(500).json({ message: 'Failed to process refund' });
    }
};

// =================== ADMIN FUNCTIONS ===================

/**
 * @desc    Get all payments (admin)
 * @route   GET /api/payments/admin/all
 * @access  Private (Admin)
 */
const getAllPayments = async (req, res) => {
    try {
        const { type, status, page = 1, limit = 20 } = req.query;

        const filter = {};
        if (type) filter.type = type;
        if (status) filter.status = status;

        const payments = await Payment.find(filter)
            .populate('payer', 'name email')
            .populate('booking')
            .populate('subscription')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Payment.countDocuments(filter);

        res.json({
            payments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get All Payments Error:', error);
        res.status(500).json({ message: 'Failed to fetch payments' });
    }
};

/**
 * @desc    Get subscription analytics (admin)
 * @route   GET /api/payments/admin/subscriptions
 * @access  Private (Admin)
 */
const getSubscriptionAnalytics = async (req, res) => {
    try {
        const stats = await Subscription.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const recentPayments = await Payment.find({ type: 'subscription' })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('payer', 'name email');

        res.json({
            stats: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
            recentPayments
        });
    } catch (error) {
        console.error('Subscription Analytics Error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics' });
    }
};

// =================== SALON PAYMENT CONFIGURATION ===================

const { encrypt } = require('../utils/paymentUtils');

/**
 * @desc    Configure salon's Razorpay credentials (Direct Payment Model)
 * @route   POST /api/payments/salon/configure
 * @access  Private (Provider)
 */
const configureSalonPayment = async (req, res) => {
    try {
        const { razorpay_key_id, razorpay_key_secret } = req.body;

        if (!razorpay_key_id || !razorpay_key_secret) {
            return res.status(400).json({
                message: 'Both Razorpay Key ID and Key Secret are required'
            });
        }

        // Find salon owned by this provider
        const salon = await Salon.findOne({ owner: req.user.id });
        if (!salon) {
            return res.status(404).json({ message: 'Salon not found' });
        }

        // Verify credentials by making a test API call
        try {
            const testRazorpay = new Razorpay({
                key_id: razorpay_key_id,
                key_secret: razorpay_key_secret
            });

            // Try to fetch plans (minimal API call to verify credentials)
            await testRazorpay.plans.all({ count: 1 });
        } catch (err) {
            return res.status(400).json({
                message: 'Invalid Razorpay credentials. Please check your Key ID and Secret.',
                error_code: 'INVALID_CREDENTIALS'
            });
        }

        // Encrypt and store credentials
        salon.razorpay = {
            key_id: razorpay_key_id,
            key_secret_encrypted: encrypt(razorpay_key_secret),
            isConfigured: true,
            verifiedAt: new Date()
        };
        salon.paymentMode = 'direct';

        await salon.save();

        res.json({
            message: 'Payment configuration saved successfully',
            paymentMode: salon.paymentMode,
            isConfigured: true
        });

    } catch (error) {
        console.error('Configure Salon Payment Error:', error);
        res.status(500).json({ message: 'Failed to configure payment settings' });
    }
};

/**
 * @desc    Get salon's payment configuration status
 * @route   GET /api/payments/salon/status
 * @access  Private (Provider)
 */
const getSalonPaymentStatus = async (req, res) => {
    try {
        const salon = await Salon.findOne({ owner: req.user.id })
            .select('paymentMode razorpay.isConfigured razorpay.verifiedAt');

        if (!salon) {
            return res.status(404).json({ message: 'Salon not found' });
        }

        res.json({
            paymentMode: salon.paymentMode || 'direct',
            isConfigured: salon.razorpay?.isConfigured || false,
            lastVerified: salon.razorpay?.verifiedAt
        });

    } catch (error) {
        console.error('Get Salon Payment Status Error:', error);
        res.status(500).json({ message: 'Failed to fetch payment status' });
    }
};

module.exports = {
    // Plans
    getPlans,

    // Subscriptions (Flow A)
    createSubscription,
    getSubscriptionStatus,
    cancelSubscription,

    // Booking Payments (Flow B - Direct Payment Model)
    createBookingOrder,
    verifyPayment,
    initiateRefund,

    // Salon Payment Configuration
    configureSalonPayment,
    getSalonPaymentStatus,

    // Admin
    getAllPayments,
    getSubscriptionAnalytics
};
