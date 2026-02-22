const mongoose = require('mongoose');
const Subscription = require('../src/models/Subscription');
require('dotenv').config();

const expireLatestSubscription = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        // Find the most recently updated subscription
        const sub = await Subscription.findOne().sort({ updatedAt: -1 });

        if (!sub) {
            console.log("No subscription found.");
            process.exit(1);
        }

        console.log(`Found Subscription for Provider: ${sub.provider}`);
        console.log(`Current End Date: ${sub.endDate}`);

        // Set End Date to Yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        sub.endDate = yesterday;
        // status will be updated to 'expired' by middleware next time it's accessed, 
        // OR we can force it here. Let's force it to simulate "Time Passed" fully.
        // Actually, the middleware checks (new Date() > endDate), so even if status is active, it should catch it.
        // But for clarity let's keep status active to test if middleware CATCHES it and updates it.
        sub.status = 'active';

        await sub.save();

        console.log(`Updated End Date to: ${sub.endDate}`);
        console.log("Subscription manually expired (Simulating time travel).");

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

expireLatestSubscription();
