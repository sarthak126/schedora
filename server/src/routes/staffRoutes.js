const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createStaff,
    getStaffBySalon,
    getStaffById,
    updateStaff,
    deleteStaff,
    assignServices,
    updateAvailability,
    markLeave,
    getAvailableStaff,
    getMyAppointments,
    updateMyStatus,
    updateMyPassword,
    getLiveStatus,
} = require('../controllers/staffController');

// Public routes
router.get('/salon/:salonId', getStaffBySalon);
router.get('/salon/:salonId/live-status', getLiveStatus);
router.get('/available', getAvailableStaff);
router.get('/:id', getStaffById);

// Protected routes
router.get('/me/appointments', protect, getMyAppointments);
router.put('/me/status', protect, updateMyStatus);
router.put('/me/password', protect, updateMyPassword);
router.post('/', protect, createStaff);
router.put('/:id', protect, updateStaff);
router.delete('/:id', protect, deleteStaff);
router.post('/:id/services', protect, assignServices);
router.put('/:id/availability', protect, updateAvailability);
router.post('/:id/leave', protect, markLeave);

module.exports = router;
