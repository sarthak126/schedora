const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        name: {
            type: String,
            required: [true, 'Please add a salon name'],
        },
        description: {
            type: String,
            required: [true, 'Please add a description'],
        },
        address: {
            type: String,
            required: [true, 'Please add an address'],
        },
        // GeoJSON for location
        location: {
            type: {
                type: String,
                enum: ['Point'],
            },
            coordinates: {
                type: [Number],
                index: '2dsphere',
            },
        },
        contactNumber: {
            type: String,
        },
        images: {
            type: [String], // Array of URLs
            default: [],
        },
        openingHours: {
            mon: { open: String, close: String },
            tue: { open: String, close: String },
            wed: { open: String, close: String },
            thu: { open: String, close: String },
            fri: { open: String, close: String },
            sat: { open: String, close: String },
            sun: { open: String, close: String },
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        views: {
            type: Number,
            default: 0
        },
        averageRating: {
            type: Number,
            default: 0
        },
        totalReviews: {
            type: Number,
            default: 0
        },
        subscriptionPlan: {
            type: String,
            enum: ['free', 'pro', 'enterprise'],
            default: 'free'
        },
        requireAppointmentApproval: {
            type: Boolean,
            default: false
        },

        // =================== PAYMENT CONFIGURATION ===================

        /**
         * Payment Mode - Controls how customer payments are processed
         * 
         * 'direct'  - Salon uses their own Razorpay account (default)
         *             Money goes directly to salon's bank
         *             Platform doesn't touch customer money
         * 
         * 'platform' - Platform collects payment, transfers to salon (FUTURE)
         *              Requires Route API activation
         *              Enables commission collection
         */
        paymentMode: {
            type: String,
            enum: ['direct', 'platform'],
            default: 'direct'
        },

        // Salon's own Razorpay credentials (for 'direct' mode)
        razorpay: {
            // Razorpay Key ID (public, safe to use in frontend)
            key_id: {
                type: String,
                select: false // Don't return by default in queries
            },
            // Razorpay Key Secret (ENCRYPTED, never expose)
            key_secret_encrypted: {
                type: String,
                select: false
            },
            // Whether payment is configured and verified
            isConfigured: {
                type: Boolean,
                default: false
            },
            // Last verification timestamp
            verifiedAt: {
                type: Date
            }
        },

        // Platform Route API fields (for future 'platform' mode)
        platformPayment: {
            // Razorpay linked account ID (when using Route API)
            razorpay_account_id: {
                type: String
            },
            // KYC status for Route API
            kyc_status: {
                type: String,
                enum: ['not_started', 'pending', 'verified', 'rejected'],
                default: 'not_started'
            },
            // Whether salon can receive platform transfers
            canReceiveTransfers: {
                type: Boolean,
                default: false
            }
        },

        // Commission settings (for future 'platform' mode)
        commission: {
            // Platform commission percentage (0-100)
            percentage: {
                type: Number,
                default: 0,
                min: 0,
                max: 100
            },
            // Fixed commission amount (in paise)
            fixedAmount: {
                type: Number,
                default: 0
            }
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Salon', salonSchema);
