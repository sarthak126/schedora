const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
    {
        salon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Salon',
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true, // For staff login
        },
        role: {
            type: String,
            required: true,
            enum: ['Hair Stylist', 'Barber', 'Beautician', 'Makeup Artist', 'Nail Technician', 'Massage Therapist', 'Other'],
        },
        profilePhoto: {
            type: String,
            default: '',
        },
        experience: {
            type: Number, // Years of experience
            default: 0,
        },
        phone: {
            type: String,
            required: true,
        },
        servicesOffered: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
        }],
        workingDays: [{
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        }],
        workingHours: {
            start: {
                type: String, // "09:00"
                default: "09:00",
            },
            end: {
                type: String, // "18:00"
                default: "18:00",
            },
        },
        breakTimes: [{
            start: String, // "13:00"
            end: String,   // "14:00"
            days: [String], // ['Monday', 'Wednesday']
        }],
        availabilityStatus: {
            type: String,
            enum: ['active', 'on-leave', 'on-break'],
            default: 'active',
        },
        leaveSchedule: [{
            startDate: Date,
            endDate: Date,
            reason: String,
        }],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Provider who added this staff
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
staffSchema.index({ salon: 1, isActive: 1 });

module.exports = mongoose.model('Staff', staffSchema);
