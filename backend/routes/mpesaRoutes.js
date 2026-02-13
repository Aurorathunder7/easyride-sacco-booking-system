const express = require('express');
const router = express.Router();
const {
    stkPush,
    stkPushCallback,
    queryStatus,
    b2cPayment,
    b2cCallback,
    transactionStatus,
    reversal,
    simulatePayment
} = require('../controllers/mpesaController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes (for Safaricom callbacks)
router.post('/callback', stkPushCallback);
router.post('/b2c-callback', b2cCallback);

// Protected routes
router.post('/stkpush', protect, stkPush);
router.post('/query', protect, queryStatus);
router.post('/b2c', protect, authorize('admin', 'operator'), b2cPayment);
router.post('/status', protect, authorize('admin'), transactionStatus);
router.post('/reversal', protect, authorize('admin'), reversal);

// Development only - simulate payment (remove in production)
if (process.env.NODE_ENV !== 'production') {
    router.post('/simulate', simulatePayment);
}

module.exports = router;