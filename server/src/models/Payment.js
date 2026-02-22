const mongoose = require('mongoose');

/**
 * Payment Model - Centralized payment ledger for all transactions
 * Tracks both subscription payments and booking payments
 */
const paymentSchema = new mongoose.Schema(
    {
        // =================== PAYMENT TYPE ===================

        // Type of payment
        type: {
            type: String,
            enum: ['subscription', 'booking', 'refund'],
            required: true
        },

        // =================== RAZORPAY IDENTIFIERS ===================

        // Razorpay Order ID
        razorpay_order_id: {
            type: String,
            sparse: true
        },

        // Razorpay Payment ID
        razorpay_payment_id: {
            type: String,
            sparse: true
        },

        // Razorpay Subscription ID (for subscription payments)
        razorpay_subscription_id: {
            type: String
        },

        // Razorpay Signature (for verification audit)
        razorpay_signature: {
            type: String
        },

        // =================== AMOUNT DETAILS ===================

        // Total amount in paise
        amount: {
            type: Number,
            required: true
        },

        // Currency
        currency: {
            type: String,
            default: 'INR'
        },

        // Platform commission (in paise) - for marketplace payments
        commission_amount: {
            type: Number,
            default: 0
        },

        // Amount to transfer to salon (amount - commission)
        salon_amount: {
            type: Number,
            default: 0
        },

        // =================== STATUS ===================

        // Payment status
        status: {
            type: String,
            enum: [
                'created',    // Order created, awaiting payment
                'authorized', // Payment authorized
                'captured',   // Payment captured (successful)
                'failed',     // Payment failed
                'refunded',   // Payment refunded (full)
                'partially_refunded', // Partial refund
                'pending'     // Processing
            ],
            default: 'created'
        },

        // =================== PAYMENT METHOD ===================

        // Payment method used
        method: {
            type: String,
            enum: ['card', 'upi', 'netbanking', 'wallet', 'emi', 'unknown'],
            default: 'unknown'
        },

        // Card last 4 digits (if card payment)
        card_last4: {
            type: String
        },

        // Bank name (if netbanking)
        bank: {
            type: String
        },

        // VPA/UPI ID (if UPI)
        vpa: {
            type: String
        },

        // =================== ASSOCIATIONS ===================

        // Associated subscription (for subscription payments)
        subscription: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subscription'
        },

        // Associated booking (for booking payments)
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking'
        },

        // Associated salon (for booking payments)
        salon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Salon'
        },

        // Customer/User who made the payment
        payer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        // =================== TRANSFER DETAILS (Route API) ===================

        // Razorpay Transfer ID (when funds transferred to salon)
        transfer_id: {
            type: String
        },

        // Transfer status
        transfer_status: {
            type: String,
            enum: ['not_applicable', 'pending', 'processed', 'failed', 'reversed'],
            default: 'not_applicable'
        },

        // =================== REFUND DETAILS ===================

        // Original payment ID (for refund payments)
        original_payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment'
        },

        // Refund ID
        refund_id: {
            type: String
        },

        // Refund amount (can be partial)
        refund_amount: {
            type: Number
        },

        // Refund reason
        refund_reason: {
            type: String
        },

        // =================== WEBHOOK TRACKING ===================

        // Webhook event ID that confirmed this payment
        webhook_event_id: {
            type: String
        },

        // =================== METADATA ===================

        // Error message if payment failed
        error_message: {
            type: String
        },

        // Error code
        error_code: {
            type: String
        },

        // Additional notes
        notes: {
            type: mongoose.Schema.Types.Mixed
        }
    },
    {
        timestamps: true
    }
);

// =================== INDEXES ===================
// Note: razorpay_order_id and razorpay_payment_id indexes created via sparse:true

paymentSchema.index({ booking: 1 });
paymentSchema.index({ subscription: 1 });
paymentSchema.index({ payer: 1, createdAt: -1 });
paymentSchema.index({ type: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });

// =================== VIRTUAL FIELDS ===================

paymentSchema.virtual('amountFormatted').get(function () {
    return `₹${(this.amount / 100).toFixed(2)}`;
});

// =================== STATIC METHODS ===================

/**
 * Find payment by Razorpay Order ID
 */
paymentSchema.statics.findByOrderId = function (orderId) {
    return this.findOne({ razorpay_order_id: orderId });
};

/**
 * Find payment by Razorpay Payment ID
 */
paymentSchema.statics.findByPaymentId = function (paymentId) {
    return this.findOne({ razorpay_payment_id: paymentId });
};

module.exports = mongoose.model('Payment', paymentSchema);
