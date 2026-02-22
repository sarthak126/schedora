const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        salon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Salon',
            required: true,
        },
        rating: {
            type: Number,
            required: [true, 'Please add a rating between 1 and 5'],
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            required: [true, 'Please add a comment'],
            maxlength: 500,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent user from submitting multiple reviews for the same salon (optional, good for MVP)
reviewSchema.index({ salon: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
