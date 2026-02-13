const express = require('express');
const router = express.Router();
const {
    // Public booking endpoints
    searchRoutes,
    getRouteDetails,
    getAvailableSchedules,
    getSeatAvailability,
    
    // Protected booking endpoints (require authentication)
    createBooking,
    getBookingDetails,
    getBookingByReference,
    checkAvailability,
    initiatePayment,
    confirmBooking
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

// Public routes (no authentication needed for searching)
router.get('/routes/search', searchRoutes);
router.get('/routes/:id', getRouteDetails);
router.get('/schedules', getAvailableSchedules);
router.get('/seats/availability', getSeatAvailability);
router.get('/check-availability', checkAvailability);

// Protected routes (require login)
router.post('/', protect, createBooking);
router.get('/reference/:reference', getBookingByReference);
router.get('/:id', protect, getBookingDetails);
router.post('/:id/payment', protect, initiatePayment);
router.post('/:id/confirm', protect, confirmBooking);

module.exports = router;