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
    downloadTicket,
    searchCustomer  // Add this import
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ============================================
// All customer routes require authentication
// ============================================
router.use(protect);

// ============================================
// Customer Search - Allow both customers and operators
// This route must come BEFORE the authorize('customer') middleware
// ============================================
router.get('/search', (req, res, next) => {
    // Allow both customers and operators to search for customers
    if (req.user.role === 'customer' || req.user.role === 'operator') {
        next();
    } else {
        res.status(403).json({ 
            success: false, 
            message: 'Access denied. Only customers and operators can search for customers.' 
        });
    }
}, searchCustomer);

// ============================================
// Now apply customer role authorization for the remaining routes
// ============================================
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