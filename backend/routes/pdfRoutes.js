const express = require('express');
const router = express.Router();
const {
    generateTicket,
    generateReceipt,
    generateReport,
    downloadTicket,
    downloadReceipt,
    viewTicket
} = require('../controllers/pdfController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Generate PDFs
router.post('/ticket/:bookingId', protect, generateTicket);
router.post('/receipt/:paymentId', protect, generateReceipt);
router.post('/report/daily', protect, authorize('admin', 'operator'), generateReport);

// Download PDFs
router.get('/ticket/:bookingId/download', protect, downloadTicket);
router.get('/receipt/:paymentId/download', protect, downloadReceipt);
router.get('/ticket/:bookingId/view', protect, viewTicket);

module.exports = router;