const mongoose = require('mongoose');

/**
 * Plan Model - Stores Razorpay subscription plan configurations
 * Plans are created once in Razorpay and referenced here
 */
const planSchema = new mongoose.Schema(
    {
        // Display name for the plan
        name: {
            type: String,
            required: [true, 'Plan name is required'],
            trim: true
        },

        // Razorpay Plan ID (e.g., "plan_xxx")
        razorpay_plan_id: {
            type: String,
            required: [true, 'Razorpay plan ID is required'],
            unique: true
        },

        // Amount in paise (49900 = ₹499)
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: 0
        },

        // Currency (INR for India)
        currency: {
            type: String,
            default: 'INR'
        },

        // Billing interval
        interval: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'yearly'],
            required: true
        },

        // Number of intervals (e.g., interval=monthly, period=3 = quarterly)
        period: {
            type: Number,
            default: 1,
            min: 1
        },

        // Human-readable description
        description: {
            type: String,
            default: ''
        },

        // Features included in this plan
        features: [{
            type: String
        }],

        // Whether this plan is currently available for new subscriptions
        isActive: {
            type: Boolean,
            default: true
        },

        // Display order in UI
        displayOrder: {
            type: Number,
            default: 0
        },

        // Trial period in days (0 = no trial)
        trialDays: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

// Index for faster lookups (razorpay_plan_id already indexed via unique:true)
planSchema.index({ isActive: 1, displayOrder: 1 });

// Virtual for formatted amount
planSchema.virtual('amountFormatted').get(function () {
    return `₹${(this.amount / 100).toFixed(2)}`;
});

// Virtual for billing cycle description
planSchema.virtual('billingCycle').get(function () {
    if (this.period === 1) {
        return this.interval;
    }
    return `${this.period} ${this.interval}s`;
});

module.exports = mongoose.model('Plan', planSchema);
