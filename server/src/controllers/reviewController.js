const Review = require('../models/Review');
const Salon = require('../models/Salon');
const mongoose = require('mongoose');

// @desc    Get reviews for a salon
// @route   GET /api/reviews/:salonId
// @access  Public
const getReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ salon: req.params.salonId })
            .populate('user', 'name')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Add a review
// @route   POST /api/reviews
// @access  Private (Customer)
const addReview = async (req, res) => {
    try {
        const { salonId, rating, comment } = req.body;

        const salon = await Salon.findById(salonId);
        if (!salon) {
            return res.status(404).json({ message: 'Salon not found' });
        }

        // Check if user already reviewed
        const existingReview = await Review.findOne({
            user: req.user.id,
            salon: salonId
        });

        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this salon' });
        }

        const review = await Review.create({
            user: req.user.id,
            salon: salonId,
            rating,
            comment
        });

        const newReview = await Review.findById(review._id).populate('user', 'name');

        // Calculate new average
        const stats = await Review.aggregate([
            {
                $match: { salon: new mongoose.Types.ObjectId(salonId) }
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
            await Salon.findByIdAndUpdate(salonId, {
                averageRating: stats[0].avgRating,
                totalReviews: stats[0].numReviews
            });
        }

        res.status(201).json(newReview);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getReviews,
    addReview
};
