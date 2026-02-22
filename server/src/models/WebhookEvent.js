const mongoose = require('mongoose');

/**
 * WebhookEvent Model - Stores Razorpay webhook events for idempotency and audit
 * Prevents duplicate processing and provides audit trail
 */
const webhookEventSchema = new mongoose.Schema(
    {
        // Razorpay event ID (unique identifier from Razorpay)
        event_id: {
            type: String,
            required: true,
            unique: true
        },

        // Event type (e.g., "subscription.charged", "payment.captured")
        event_type: {
            type: String,
            required: true
        },

        // Entity type (payment, subscription, refund, etc.)
        entity_type: {
            type: String
        },

        // Entity ID from the event payload
        entity_id: {
            type: String
        },

        // Full event payload (stored as JSON)
        payload: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },

        // Whether this event has been processed
        processed: {
            type: Boolean,
            default: false
        },

        // When the event was processed
        processed_at: {
            type: Date
        },

        // Processing result
        processing_result: {
            type: String,
            enum: ['success', 'failed', 'skipped', 'pending'],
            default: 'pending'
        },

        // Error message if processing failed
        error_message: {
            type: String
        },

        // Number of processing attempts
        attempts: {
            type: Number,
            default: 0
        },

        // Last attempt timestamp
        last_attempt_at: {
            type: Date
        },

        // IP address of the webhook request
        source_ip: {
            type: String
        },

        // Signature verification status
        signature_verified: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// =================== INDEXES ===================
// Note: event_id index created via unique:true in schema definition

webhookEventSchema.index({ event_type: 1, createdAt: -1 });
webhookEventSchema.index({ processed: 1, createdAt: -1 });
webhookEventSchema.index({ entity_id: 1 });

// =================== STATIC METHODS ===================

/**
 * Check if event was already processed (idempotency)
 */
webhookEventSchema.statics.isAlreadyProcessed = async function (eventId) {
    const event = await this.findOne({ event_id: eventId, processed: true });
    return !!event;
};

/**
 * Record a new webhook event
 */
webhookEventSchema.statics.recordEvent = async function (eventId, eventType, payload, sourceIp, signatureVerified) {
    try {
        const event = await this.create({
            event_id: eventId,
            event_type: eventType,
            entity_type: payload?.entity || payload?.payload?.payment?.entity ? 'payment' : 'unknown',
            entity_id: payload?.payload?.payment?.entity?.id || payload?.payload?.subscription?.entity?.id,
            payload: payload,
            source_ip: sourceIp,
            signature_verified: signatureVerified,
            last_attempt_at: new Date()
        });
        return event;
    } catch (error) {
        // If duplicate key error, event already exists
        if (error.code === 11000) {
            return await this.findOne({ event_id: eventId });
        }
        throw error;
    }
};

/**
 * Mark event as processed
 */
webhookEventSchema.statics.markProcessed = async function (eventId, result = 'success', errorMessage = null) {
    return await this.findOneAndUpdate(
        { event_id: eventId },
        {
            processed: true,
            processed_at: new Date(),
            processing_result: result,
            error_message: errorMessage,
            $inc: { attempts: 1 }
        },
        { new: true }
    );
};

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
