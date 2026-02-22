const express = require('express');
const router = express.Router();
const { getReviews, addReview } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('customer'), addReview);

router.route('/:salonId')
    .get(getReviews);

module.exports = router;
