const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Salon = require('../src/models/Salon');
const Review = require('../src/models/Review');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Database connection error:', err.message);
        process.exit(1);
    }
};

const syncRatings = async () => {
    await connectDB();

    try {
        const salons = await Salon.find({});
        console.log(`Found ${salons.length} salons to check.`);

        for (const salon of salons) {
            const stats = await Review.aggregate([
                {
                    $match: { salon: salon._id }
                },
                {
                    $group: {
                        _id: '$salon',
                        avgRating: { $avg: '$rating' },
                        numReviews: { $sum: 1 }
                    }
                }
            ]);

            if (stats.length > 0) {
                await Salon.findByIdAndUpdate(salon._id, {
                    averageRating: stats[0].avgRating,
                    totalReviews: stats[0].numReviews
                });
                console.log(`Updated Salon "${salon.name}": ${stats[0].avgRating.toFixed(1)} stars (${stats[0].numReviews} reviews)`);
            } else {
                await Salon.findByIdAndUpdate(salon._id, {
                    averageRating: 0,
                    totalReviews: 0
                });
                console.log(`Updated Salon "${salon.name}": 0 stars (0 reviews)`);
            }
        }

        console.log('Rating sync complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

syncRatings();
