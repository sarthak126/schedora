const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const Salon = require('./src/models/Salon');
const Subscription = require('./src/models/Subscription');
const User = require('./src/models/User');

const testAdminSalons = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('DB Connected');

        // Simulate logic from adminController
        const salons = await Salon.find({}).populate('owner', 'name email').sort({ createdAt: -1 });

        const salonsWithSubs = await Promise.all(salons.map(async (salon) => {
            const sub = await Subscription.findOne({ provider: salon.owner._id });
            return {
                name: salon.name,
                owner: salon.owner?.email,
                subscription: sub ? `${sub.plan} (${sub.status}) - Expires: ${sub.endDate}` : 'No Sub (Default Free)'
            };
        }));

        console.log('Salons with Subs:', JSON.stringify(salonsWithSubs, null, 2));

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

testAdminSalons();
