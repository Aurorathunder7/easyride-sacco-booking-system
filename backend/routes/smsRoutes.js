const express = require('express');
const router = express.Router();
const {
    sendBookingConfirmation,
    sendPaymentReceipt,
    sendReminder,
    getLogs,
    retryFailed,
    checkBalance,
    testSMS
} = require('../controllers/smsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protected routes
router.post('/booking/:id/confirm', protect, authorize('operator', 'admin'), sendBookingConfirmation);
router.post('/payment/:id/receipt', protect, authorize('operator', 'admin'), sendPaymentReceipt);
router.post('/reminder/:id', protect, authorize('operator', 'admin'), sendReminder);
router.get('/logs/:bookingId', protect, authorize('operator', 'admin'), getLogs);
router.post('/retry/:smsId', protect, authorize('admin'), retryFailed);
router.get('/balance', protect, authorize('admin'), checkBalance);

// Test route (development only)
if (process.env.NODE_ENV !== 'production') {
    router.post('/test', protect, testSMS);
}

module.exports = router;