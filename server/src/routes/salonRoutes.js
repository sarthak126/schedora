const express = require('express');
const router = express.Router();
const { createOrUpdateSalon, getMySalon, getAllSalons, getSalonById, getSalonStats } = require('../controllers/salonController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');
const { parser } = require('../config/cloudinary');

router.route('/')
    .post(protect, authorize('provider'), checkSubscription, parser.array('images'), createOrUpdateSalon)
    .get(getAllSalons); // Public list

router.route('/me')
    .get(protect, authorize('provider'), getMySalon);

router.route('/stats')
    .get(protect, authorize('provider'), getSalonStats); // Stats route

router.route('/:id')
    .get(getSalonById); // Public detail

module.exports = router;
