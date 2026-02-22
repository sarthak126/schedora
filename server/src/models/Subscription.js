const mongoose = require('mongoose');

/**
 * Subscription Model - Tracks salon subscription status with Razorpay Subscriptions API
 * Each provider has one active subscription record
 */
const subscriptionSchema = new mongoose.Schema(
    {
        // Reference to the provider (User with role='provider')
        provider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true // One active subscription per provider
        },

        // Reference to the Plan model
        plan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Plan'
        },

        // Legacy plan name (for backward compatibility)
        planName: {
            type: String,
            enum: ['free', 'pro', 'business', 'enterprise'],
            default: 'free'
        },

        // =================== RAZORPAY FIELDS ===================

        // Razorpay Subscription ID (e.g., "sub_xxx")
        razorpay_subscription_id: {
            type: String,
            sparse: true // Allow null but unique when set
        },

        // Razorpay Customer ID (e.g., "cust_xxx")
        razorpay_customer_id: {
            type: String
        },

        // Razorpay short URL for payment retry
        short_url: {
            type: String
        },

        // =================== STATUS TRACKING ===================

        // Subscription status
        status: {
            type: String,
            enum: [
                'created',      // Subscription created, awaiting auth
                'authenticated', // Card authorized, awaiting first charge
                'active',       // Successfully charging
                'pending',      // Payment retry in progress
                'halted',       // Max retries failed
                'cancelled',    // User cancelled
                'completed',    // Fixed-term subscription completed
                'expired',      // Legacy: subscription period ended
                'paused'        // Subscription paused
            ],
            default: 'created'
        },

        // =================== BILLING PERIOD ===================

        // Current billing period start
        current_period_start: {
            type: Date
        },

        // Current billing period end
        current_period_end: {
            type: Date
        },

        // Next charge date
        charge_at: {
            type: Date
        },

        // Start date of subscription
        startDate: {
            type: Date,
            required: true,
            default: Date.now
        },

        // End date (for display and legacy compatibility)
        endDate: {
            type: Date,
            required: true
        },

        // =================== PAYMENT TRACKING ===================

        // Total successful payments
        paid_count: {
            type: Number,
            default: 0
        },

        // Failed authentication attempts
        auth_attempts: {
            type: Number,
            default: 0
        },

        // Last successful payment ID
        last_payment_id: {
            type: String
        },

        // Last payment date
        last_payment_date: {
            type: Date
        },

        // Last payment amount (in paise)
        last_payment_amount: {
            type: Number
        },

        // ============ LEGACY FIELDS (Backward Compatibility) ============

        // Old paymentId field
        paymentId: {
            type: String // Razorpay Payment ID if paid (legacy)
        },

        // Old orderId field
        orderId: {
            type: String // Razorpay Order ID (legacy)
        },

        // =================== CANCELLATION ===================

        // Scheduled cancellation at period end
        cancel_at_period_end: {
            type: Boolean,
            default: false
        },

        // Cancellation date
        cancelled_at: {
            type: Date
        },

        // Cancellation reason
        cancellation_reason: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

// =================== INDEXES ===================

// subscriptionSchema.index({ razorpay_subscription_id: 1 }); // Already indexed in schema definition
subscriptionSchema.index({ provider: 1, status: 1 });
subscriptionSchema.index({ current_period_end: 1 });

// =================== INSTANCE METHODS ===================

/**
 * Check if subscription is currently active and valid
 */
subscriptionSchema.methods.isActive = function () {
    const activeStatuses = ['active', 'authenticated', 'pending'];
    return activeStatuses.includes(this.status) && new Date() <= this.current_period_end;
};

/**
 * Check if subscription has access to premium features
 */
subscriptionSchema.methods.hasPremiumAccess = function () {
    // Free plan doesn't have premium access
    if (this.planName === 'free' && !this.razorpay_subscription_id) {
        return false;
    }
    return this.isActive();
};

/**
 * Get days remaining in current period
 */
subscriptionSchema.methods.getDaysRemaining = function () {
    if (!this.current_period_end) return 0;
    const now = new Date();
    const diff = this.current_period_end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

// =================== STATIC METHODS ===================

/**
 * Find or create subscription for a provider
 */
subscriptionSchema.statics.findOrCreateForProvider = async function (providerId) {
    let subscription = await this.findOne({ provider: providerId });

    if (!subscription) {
        // Create free trial subscription
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial

        subscription = await this.create({
            provider: providerId,
            planName: 'free',
            status: 'active',
            startDate: new Date(),
            endDate: trialEndDate,
            current_period_start: new Date(),
            current_period_end: trialEndDate
        });
    }

    return subscription;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
