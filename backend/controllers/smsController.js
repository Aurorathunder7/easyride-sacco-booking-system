const smsService = require('../services/smsService');
const smsConfig = require('../config/sms');

/**
 * @desc    Send booking confirmation SMS
 * @route   POST /api/sms/booking/:id/confirm
 * @access  Private (Operator/Admin)
 */
const sendBookingConfirmation = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await smsService.sendBookingConfirmation(id);

        res.json({
            success: true,
            message: 'Booking confirmation SMS sent successfully',
            result
        });

    } catch (error) {
        console.error('❌ Send booking confirmation error:', error);
        next(error);
    }
};

/**
 * @desc    Send payment receipt SMS
 * @route   POST /api/sms/payment/:id/receipt
 * @access  Private (Operator/Admin)
 */
const sendPaymentReceipt = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await smsService.sendPaymentReceipt(id);

        res.json({
            success: true,
            message: 'Payment receipt SMS sent successfully',
            result
        });

    } catch (error) {
        console.error('❌ Send payment receipt error:', error);
        next(error);
    }
};

/**
 * @desc    Send trip reminder SMS
 * @route   POST /api/sms/reminder/:id
 * @access  Private (Operator/Admin)
 */
const sendReminder = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await smsService.sendTripReminder(id);

        res.json({
            success: true,
            message: 'Reminder SMS sent successfully',
            result
        });

    } catch (error) {
        console.error('❌ Send reminder error:', error);
        next(error);
    }
};

/**
 * @desc    Get SMS logs for a booking
 * @route   GET /api/sms/logs/:bookingId
 * @access  Private (Operator/Admin)
 */
const getLogs = async (req, res, next) => {
    try {
        const { bookingId } = req.params;

        const logs = await smsService.getSMSLogs(bookingId);

        res.json({
            success: true,
            logs
        });

    } catch (error) {
        console.error('❌ Get SMS logs error:', error);
        next(error);
    }
};

/**
 * @desc    Retry failed SMS
 * @route   POST /api/sms/retry/:smsId
 * @access  Private (Admin)
 */
const retryFailed = async (req, res, next) => {
    try {
        const { smsId } = req.params;

        const result = await smsService.retryFailedSMS(smsId);

        res.json({
            success: true,
            message: 'SMS retry initiated',
            result
        });

    } catch (error) {
        console.error('❌ Retry SMS error:', error);
        next(error);
    }
};

/**
 * @desc    Check SMS balance
 * @route   GET /api/sms/balance
 * @access  Private (Admin)
 */
const checkBalance = async (req, res, next) => {
    try {
        const balance = await smsConfig.checkBalance();

        res.json({
            success: true,
            balance
        });

    } catch (error) {
        console.error('❌ Check balance error:', error);
        next(error);
    }
};

/**
 * @desc    Test SMS (development only)
 * @route   POST /api/sms/test
 * @access  Private
 */
const testSMS = async (req, res, next) => {
    try {
        const { phoneNumber, message } = req.body;

        if (!phoneNumber || !message) {
            return res.status(400).json({ 
                success: false,
                message: 'Phone number and message are required' 
            });
        }

        const result = await smsConfig.sendSMS(phoneNumber, message);

        res.json({
            success: true,
            message: 'Test SMS sent',
            result
        });

    } catch (error) {
        console.error('❌ Test SMS error:', error);
        next(error);
    }
};

module.exports = {
    sendBookingConfirmation,
    sendPaymentReceipt,
    sendReminder,
    getLogs,
    retryFailed,
    checkBalance,
    testSMS
};