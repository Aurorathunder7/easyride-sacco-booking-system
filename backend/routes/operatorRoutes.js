const express = require('express');
const router = express.Router();
const {
    getDashboard,
    getBookings,
    getBookingDetails,
    searchCustomer,
    createBooking,
    updateBookingStatus,
    cancelBooking,
    getTodaySchedule,
    generateDailyReport,
    printTicket,
    sendSMSReminder,
    getCustomerByPhone
} = require('../controllers/operatorController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All operator routes require authentication and operator role
router.use(protect);
router.use(authorize('operator'));

// Dashboard
router.get('/dashboard', getDashboard);

// Bookings management
router.get('/bookings', getBookings);
router.get('/bookings/:id', getBookingDetails);
router.post('/bookings', createBooking);
router.put('/bookings/:id/status', updateBookingStatus);
router.post('/bookings/:id/cancel', cancelBooking);
router.get('/bookings/:id/ticket', printTicket);
router.post('/bookings/:id/reminder', sendSMSReminder);

// Customer management
router.get('/customers/search', searchCustomer);
router.get('/customers/phone/:phone', getCustomerByPhone);

// Schedule and reports
router.get('/schedule/today', getTodaySchedule);
router.get('/reports/daily', generateDailyReport);

module.exports = router;