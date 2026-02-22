const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
    {
        salon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Salon',
            required: true,
        },
        name: {
            type: String,
            required: [true, 'Please add a service name'],
        },
        description: {
            type: String,
        },
        price: {
            type: Number,
            required: [true, 'Please add a price'],
        },
        duration: {
            type: Number, // in minutes
            required: [true, 'Please add a duration'],
        },
        category: {
            type: String,
            enum: ['Hair', 'Face', 'Body', 'Nails', 'Other'],
            default: 'Other',
        },
        icon: {
            type: String, // Icon name from Lucide (e.g., 'Scissors', 'Zap')
            default: 'Scissors',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Service', serviceSchema);
