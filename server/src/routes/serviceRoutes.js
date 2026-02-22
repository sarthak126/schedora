const express = require('express');
const router = express.Router();
const { addService, getServices, getSalonServices, updateService, deleteService } = require('../controllers/serviceController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');

router.route('/')
    .post(protect, authorize('provider'), checkSubscription, addService)
    .get(protect, authorize('provider'), getServices);

router.route('/salon/:salonId')
    .get(getSalonServices); // Public

router.route('/:id')
    .put(protect, authorize('provider'), updateService)
    .delete(protect, authorize('provider'), deleteService);

module.exports = router;
