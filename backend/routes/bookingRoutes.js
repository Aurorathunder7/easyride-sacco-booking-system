const express = require('express');
const router = express.Router();
const {
    getAllRoutes,
    getAvailableSchedules,
    getSeatAvailability,
    createBooking,
    getBookingDetails,
    getBookingByReference,
    getCustomerBookings,
    cancelBooking,
    getPaymentHistory,
    getBookingTicket,
    updateBookingStatus  // Add this import
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ============================================
// PUBLIC ROUTES (no authentication needed for searching)
// ============================================
router.get('/routes', getAllRoutes);
router.get('/schedules', getAvailableSchedules);
router.get('/seats/availability', getSeatAvailability);

// ============================================
// PROTECTED ROUTES (require login)
// ============================================
router.post('/', protect, createBooking);
router.get('/customer', protect, getCustomerBookings);
router.get('/reference/:reference', getBookingByReference);
router.get('/:id', protect, getBookingDetails);
router.get('/:id/ticket', protect, getBookingTicket);
router.put('/:id/status', protect, authorize('operator', 'admin'), updateBookingStatus);  // Add status update route
router.put('/:id/cancel', protect, cancelBooking);
router.get('/payments/history', protect, getPaymentHistory);

module.exports = router;