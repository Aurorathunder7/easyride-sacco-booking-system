const express = require('express');
const router = express.Router();
const {
    getDashboard,
    getBookings,
    getBookingDetails,
    getProfile,
    updateProfile,
    cancelBooking,
    getPaymentHistory,
    downloadTicket
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All customer routes require authentication and customer role
router.use(protect);
router.use(authorize('customer'));

// Dashboard
router.get('/dashboard', getDashboard);

// Bookings
router.get('/bookings', getBookings);
router.get('/bookings/:id', getBookingDetails);
router.put('/bookings/:id/cancel', cancelBooking);
router.get('/bookings/:id/ticket', downloadTicket);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Payments
router.get('/payments', getPaymentHistory);

module.exports = router;