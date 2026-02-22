const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const WebhookEvent = require('../models/WebhookEvent');
const Salon = require('../models/Salon');

// =================== SIGNATURE VERIFICATION ===================

/**
 * Verify Razorpay webhook signature
 */
const verifyWebhookSignature = (body, signature) => {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
        console.error('❌ RAZORPAY_WEBHOOK_SECRET not configured');
        return false;
    }

    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(JSON.stringify(body))
        .digest('hex');

    return expectedSignature === signature;
};

// =================== EVENT HANDLERS ===================

/**
 * Handle subscription.authenticated event
 * Subscription is authorized but first payment pending
 */
const handleSubscriptionAuthenticated = async (payload) => {
    const subscriptionEntity = payload.payload.subscription.entity;

    await Subscription.findOneAndUpdate(
        { razorpay_subscription_id: subscriptionEntity.id },
        {
            status: 'authenticated',
            razorpay_customer_id: subscriptionEntity.customer_id
        }
    );

    console.log(`✅ Subscription authenticated: ${subscriptionEntity.id}`);
};

/**
 * Handle subscription.charged event
 * Successful recurring payment
 */
const handleSubscriptionCharged = async (payload) => {
    const subscriptionEntity = payload.payload.subscription.entity;
    const paymentEntity = payload.payload.payment?.entity;

    // Calculate new period end
    const periodEnd = new Date();
    if (subscriptionEntity.current_end) {
        periodEnd.setTime(subscriptionEntity.current_end * 1000);
    } else {
        // Fallback: add 30 days
        periodEnd.setDate(periodEnd.getDate() + 30);
    }

    // Update subscription
    const subscription = await Subscription.findOneAndUpdate(
        { razorpay_subscription_id: subscriptionEntity.id },
        {
            status: 'active',
            current_period_start: subscriptionEntity.current_start
                ? new Date(subscriptionEntity.current_start * 1000)
                : new Date(),
            current_period_end: periodEnd,
            endDate: periodEnd,
            charge_at: subscriptionEntity.charge_at
                ? new Date(subscriptionEntity.charge_at * 1000)
                : null,
            last_payment_id: paymentEntity?.id,
            last_payment_date: new Date(),
            last_payment_amount: paymentEntity?.amount,
            $inc: { paid_count: 1 },
            auth_attempts: 0 // Reset on successful payment
        },
        { new: true }
    );

    // Update salon subscription plan
    if (subscription) {
        await Salon.findOneAndUpdate(
            { owner: subscription.provider },
            { subscriptionPlan: subscription.planName }
        );
    }

    // Record payment
    if (paymentEntity) {
        await Payment.findOneAndUpdate(
            { razorpay_payment_id: paymentEntity.id },
            {
                type: 'subscription',
                razorpay_payment_id: paymentEntity.id,
                razorpay_subscription_id: subscriptionEntity.id,
                amount: paymentEntity.amount,
                currency: paymentEntity.currency,
                status: 'captured',
                method: paymentEntity.method,
                subscription: subscription?._id
            },
            { upsert: true }
        );
    }

    console.log(`✅ Subscription charged: ${subscriptionEntity.id}, Period ends: ${periodEnd}`);
};

/**
 * Handle subscription.pending event
 * Payment retry in progress
 */
const handleSubscriptionPending = async (payload) => {
    const subscriptionEntity = payload.payload.subscription.entity;

    await Subscription.findOneAndUpdate(
        { razorpay_subscription_id: subscriptionEntity.id },
        {
            status: 'pending',
            $inc: { auth_attempts: 1 }
        }
    );

    console.log(`⚠️ Subscription pending (retry): ${subscriptionEntity.id}`);
};

/**
 * Handle subscription.halted event
 * Max retries failed, subscription stopped
 */
const handleSubscriptionHalted = async (payload) => {
    const subscriptionEntity = payload.payload.subscription.entity;

    const subscription = await Subscription.findOneAndUpdate(
        { razorpay_subscription_id: subscriptionEntity.id },
        {
            status: 'halted',
            short_url: subscriptionEntity.short_url // For retry payment link
        },
        { new: true }
    );

    // Downgrade salon to free plan
    if (subscription) {
        await Salon.findOneAndUpdate(
            { owner: subscription.provider },
            { subscriptionPlan: 'free' }
        );
    }

    console.log(`❌ Subscription halted: ${subscriptionEntity.id}`);
    // TODO: Send email notification to provider
};

/**
 * Handle subscription.cancelled event
 */
const handleSubscriptionCancelled = async (payload) => {
    const subscriptionEntity = payload.payload.subscription.entity;

    const subscription = await Subscription.findOneAndUpdate(
        { razorpay_subscription_id: subscriptionEntity.id },
        {
            status: 'cancelled',
            cancelled_at: new Date()
        },
        { new: true }
    );

    // Downgrade salon to free plan
    if (subscription) {
        await Salon.findOneAndUpdate(
            { owner: subscription.provider },
            { subscriptionPlan: 'free' }
        );
    }

    console.log(`🚫 Subscription cancelled: ${subscriptionEntity.id}`);
};

/**
 * Handle payment.captured event (for booking payments)
 */
const handlePaymentCaptured = async (payload) => {
    const paymentEntity = payload.payload.payment.entity;
    const orderId = paymentEntity.order_id;

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
        { razorpay_order_id: orderId },
        {
            razorpay_payment_id: paymentEntity.id,
            status: 'captured',
            method: paymentEntity.method,
            card_last4: paymentEntity.card?.last4,
            bank: paymentEntity.bank,
            vpa: paymentEntity.vpa
        },
        { new: true }
    );

    // Update booking if this is a booking payment
    if (payment?.booking) {
        await Booking.findByIdAndUpdate(payment.booking, {
            paymentId: paymentEntity.id,
            paymentStatus: 'paid',
            status: 'confirmed',
            isTemporary: false,
            reservedUntil: null
        });
    }

    console.log(`✅ Payment captured: ${paymentEntity.id}`);
};

/**
 * Handle payment.failed event
 */
const handlePaymentFailed = async (payload) => {
    const paymentEntity = payload.payload.payment.entity;
    const orderId = paymentEntity.order_id;

    const payment = await Payment.findOneAndUpdate(
        { razorpay_order_id: orderId },
        {
            status: 'failed',
            error_code: paymentEntity.error_code,
            error_message: paymentEntity.error_description
        },
        { new: true }
    );

    // Update booking status
    if (payment?.booking) {
        await Booking.findByIdAndUpdate(payment.booking, {
            paymentStatus: 'failed',
            status: 'cancelled'
        });
    }

    console.log(`❌ Payment failed: ${paymentEntity.id}`);
};

/**
 * Handle refund.processed event
 */
const handleRefundProcessed = async (payload) => {
    const refundEntity = payload.payload.refund.entity;

    await Payment.findOneAndUpdate(
        { refund_id: refundEntity.id },
        {
            status: 'refunded',
            refund_amount: refundEntity.amount
        }
    );

    console.log(`💰 Refund processed: ${refundEntity.id}`);
};

// =================== MAIN WEBHOOK HANDLER ===================

/**
 * @desc    Handle Razorpay webhook events
 * @route   POST /api/webhooks/razorpay
 * @access  Public (verified via signature)
 */
const handleRazorpayWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const body = req.body;

        // Verify signature
        if (!verifyWebhookSignature(body, signature)) {
            console.error('❌ Webhook signature verification failed');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const eventId = body.event;
        const eventType = body.event;

        // Check idempotency - prevent duplicate processing
        const isProcessed = await WebhookEvent.isAlreadyProcessed(body.event + '_' + (body.payload?.payment?.entity?.id || body.payload?.subscription?.entity?.id || Date.now()));
        if (isProcessed) {
            console.log(`ℹ️ Webhook already processed: ${eventType}`);
            return res.status(200).json({ message: 'Already processed' });
        }

        // Record event
        const webhookEvent = await WebhookEvent.recordEvent(
            body.event + '_' + (body.payload?.payment?.entity?.id || body.payload?.subscription?.entity?.id || Date.now()),
            eventType,
            body,
            req.ip,
            true
        );

        // Route to handler
        try {
            switch (eventType) {
                // Subscription events
                case 'subscription.authenticated':
                    await handleSubscriptionAuthenticated(body);
                    break;
                case 'subscription.charged':
                    await handleSubscriptionCharged(body);
                    break;
                case 'subscription.pending':
                    await handleSubscriptionPending(body);
                    break;
                case 'subscription.halted':
                    await handleSubscriptionHalted(body);
                    break;
                case 'subscription.cancelled':
                    await handleSubscriptionCancelled(body);
                    break;

                // Payment events
                case 'payment.captured':
                    await handlePaymentCaptured(body);
                    break;
                case 'payment.failed':
                    await handlePaymentFailed(body);
                    break;

                // Refund events
                case 'refund.processed':
                    await handleRefundProcessed(body);
                    break;

                default:
                    console.log(`ℹ️ Unhandled webhook event: ${eventType}`);
            }

            // Mark as processed
            await WebhookEvent.markProcessed(webhookEvent.event_id, 'success');

        } catch (handlerError) {
            console.error(`❌ Webhook handler error for ${eventType}:`, handlerError);
            await WebhookEvent.markProcessed(webhookEvent.event_id, 'failed', handlerError.message);
            // Still return 200 to prevent Razorpay retries for internal errors
        }

        res.status(200).json({ status: 'ok' });

    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    handleRazorpayWebhook
};
