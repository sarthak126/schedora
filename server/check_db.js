const mongoose = require('mongoose');
const Booking = require('./models/Booking');
const Salon = require('./models/Salon');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://sanjivinik1000:z8H10zV8E1G1B0pU@cluster0.o8k6h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(async () => {
        console.log('Connected to DB');
        const recentBooking = await Booking.findOne().sort('-createdAt').populate('salon');
        if (!recentBooking) {
            console.log("No recent bookings.");
            process.exit(0);
        }
        console.log("Most recent booking ID:", recentBooking._id);
        console.log("Booking user (Customer):", recentBooking.user);
        console.log("Booking status:", recentBooking.status);
        console.log("Payment status:", recentBooking.paymentStatus);

        if (recentBooking.salon) {
            const salon = await Salon.findById(recentBooking.salon._id);
            if (salon) {
                console.log("Salon owner ID:", salon.owner);
                console.log("Expected socket room:", `provider_${salon.owner}`);
            }
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
