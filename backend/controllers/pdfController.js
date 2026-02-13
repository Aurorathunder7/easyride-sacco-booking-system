const pdfService = require('../services/pdfService');
const fs = require('fs-extra');

/**
 * @desc    Generate ticket PDF
 * @route   POST /api/pdf/ticket/:bookingId
 * @access  Private
 */
const generateTicket = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Check if user has access to this booking
        let hasAccess = false;

        if (userRole === 'admin') {
            hasAccess = true;
        } else if (userRole === 'operator') {
            hasAccess = true; // Operators can view all bookings
        } else if (userRole === 'customer') {
            // Check if booking belongs to this customer
            const [booking] = await promisePool.query(
                'SELECT * FROM bookings WHERE bookingID = ? AND customerID = ?',
                [bookingId, userId]
            );
            hasAccess = booking.length > 0;
        }

        if (!hasAccess) {
            return res.status(403).json({ 
                success: false,
                message: 'You do not have permission to view this ticket' 
            });
        }

        const result = await pdfService.generateTicket(bookingId);

        res.json({
            success: true,
            message: 'Ticket generated successfully',
            ...result
        });

    } catch (error) {
        console.error('❌ Generate ticket error:', error);
        next(error);
    }
};

/**
 * @desc    Generate receipt PDF
 * @route   POST /api/pdf/receipt/:paymentId
 * @access  Private
 */
const generateReceipt = async (req, res, next) => {
    try {
        const { paymentId } = req.params;

        const result = await pdfService.generateReceipt(paymentId);

        res.json({
            success: true,
            message: 'Receipt generated successfully',
            ...result
        });

    } catch (error) {
        console.error('❌ Generate receipt error:', error);
        next(error);
    }
};

/**
 * @desc    Generate daily report PDF
 * @route   POST /api/pdf/report/daily
 * @access  Private (Admin/Operator)
 */
const generateReport = async (req, res, next) => {
    try {
        const { date } = req.body;

        const result = await pdfService.generateDailyReport(date);

        res.json({
            success: true,
            message: 'Report generated successfully',
            ...result
        });

    } catch (error) {
        console.error('❌ Generate report error:', error);
        next(error);
    }
};

/**
 * @desc    Download ticket PDF
 * @route   GET /api/pdf/ticket/:bookingId/download
 * @access  Private
 */
const downloadTicket = async (req, res, next) => {
    try {
        const { bookingId } = req.params;

        // First generate the ticket
        const result = await pdfService.generateTicket(bookingId);

        // Check if file exists
        if (!await fs.pathExists(result.filepath)) {
            return res.status(404).json({ 
                success: false,
                message: 'Ticket file not found' 
            });
        }

        // Set headers for download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

        // Stream the file
        const fileStream = fs.createReadStream(result.filepath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('❌ Download ticket error:', error);
        next(error);
    }
};

/**
 * @desc    Download receipt PDF
 * @route   GET /api/pdf/receipt/:paymentId/download
 * @access  Private
 */
const downloadReceipt = async (req, res, next) => {
    try {
        const { paymentId } = req.params;

        const result = await pdfService.generateReceipt(paymentId);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

        const fileStream = fs.createReadStream(result.filepath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('❌ Download receipt error:', error);
        next(error);
    }
};

/**
 * @desc    View ticket in browser
 * @route   GET /api/pdf/ticket/:bookingId/view
 * @access  Private
 */
const viewTicket = async (req, res, next) => {
    try {
        const { bookingId } = req.params;

        const result = await pdfService.generateTicket(bookingId);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${result.filename}"`);

        const fileStream = fs.createReadStream(result.filepath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('❌ View ticket error:', error);
        next(error);
    }
};

module.exports = {
    generateTicket,
    generateReceipt,
    generateReport,
    downloadTicket,
    downloadReceipt,
    viewTicket
};