const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            // required: true, // Optional for walk-ins
        },
        salon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Salon',
            required: true,
        },
        // For Walk-ins / Manual Bookings
        customerName: {
            type: String
        },
        customerPhone: {
            type: String
        },
        type: {
            type: String,
            enum: ['online', 'walk-in'],
            default: 'online'
        },
        staff: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Staff',
            // Will be required in Phase 2
        },
        service: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
            required: true,
        },
        date: {
            type: Date, // ISO Date object (stored in UTC)
            required: true,
        },
        time: {
            type: String,
            required: true,
        },
        // NEW: For duration-based slot blocking
        startTime: {
            type: Date, // Exact start datetime (date + time combined)
            // Will be auto-calculated from date + time during booking creation
        },
        endTime: {
            type: Date, // startTime + service duration
            // Auto-calculated to block time range
        },
        duration: {
            type: Number, // Service duration in minutes (cached from Service model)
            // Used for faster availability calculations
        },
        price: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
            default: 'pending',
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending',
        },
        paymentId: {
            type: String, // Razorpay Payment ID
        },
        orderId: {
            type: String, // Razorpay Order ID
        },
        // Temporary Slot Reservation fields
        isTemporary: {
            type: Boolean,
            default: false,
        },
        reservedUntil: {
            type: Date, // Expiry time for temporary reservation
        },
        // NEW: Group/Party Booking Support
        groupId: {
            type: String, // Links multiple bookings together (e.g., parent + 2 kids)
            // All bookings in a group share the same groupId
        },
        personNumber: {
            type: Number, // Which person in the group (1, 2, 3, etc.)
            default: 1
        }
    },
    {
        timestamps: true,
    }
);

// TTL Index: Automatically delete bookings when 'reservedUntil' expires
bookingSchema.index({ reservedUntil: 1 }, { expireAfterSeconds: 0 });

// Compound Unique Index: Prevents double-booking same staff at identical date/time
bookingSchema.index(
    { salon: 1, staff: 1, date: 1, time: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: { $in: ['pending', 'confirmed', 'in-progress'] },
            staff: { $exists: true, $ne: null }
        },
        name: "prevent_double_booking_staff"
    }
);

module.exports = mongoose.model('Booking', bookingSchema);
