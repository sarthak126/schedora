const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getDashboardStats,
    getAdminSalons,
    updateSalonStatus,
    getAllUsers
} = require('../controllers/adminController');

// All routes are protected and require 'admin' role
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/salons', getAdminSalons);
router.put('/salons/:id/status', updateSalonStatus);
router.get('/users', getAllUsers);

module.exports = router;
