const express = require('express');
const router = express.Router();
const {
    createBooking,
    createManualBooking,
    updateBookingStatus,
    verifyPayment,
    getMyBookings,
    getAvailableSlots,
    cancelBooking
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Slot Availability (Public or Private - you choose)
router.get('/slots/available', getAvailableSlots);

router.post('/manual', protect, createManualBooking);
router.put('/:id/status', protect, updateBookingStatus);
router.delete('/:id', protect, cancelBooking);
router.post('/', protect, createBooking);
router.post('/verify', protect, verifyPayment);
router.get('/my', protect, getMyBookings);

module.exports = router;
