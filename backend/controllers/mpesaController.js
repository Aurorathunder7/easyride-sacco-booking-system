const mpesaService = require('../config/mpesa');
const { promisePool } = require('../config/db');

/**
 * @desc    Initiate STK Push payment
 * @route   POST /api/mpesa/stkpush
 * @access  Private
 */
const stkPush = async (req, res, next) => {
    try {
        const { phoneNumber, amount, bookingId, accountReference } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!phoneNumber || !amount) {
            return res.status(400).json({ 
                success: false,
                message: 'Phone number and amount are required' 
            });
        }

        // Validate amount
        if (amount < 10 || amount > 150000) {
            return res.status(400).json({ 
                success: false,
                message: 'Amount must be between KES 10 and KES 150,000' 
            });
        }

        // Initiate STK Push
        const result = await mpesaService.stkPush(
            phoneNumber,
            amount,
            accountReference || `BOOK${Date.now()}`,
            'EasyRide Booking Payment'
        );

        // If booking ID provided, update payment record
        if (bookingId && result.CheckoutRequestID) {
            // Check if payment record exists
            const [existing] = await promisePool.query(
                'SELECT * FROM payments WHERE bookingID = ?',
                [bookingId]
            );

            if (existing.length > 0) {
                // Update existing payment
                await promisePool.query(
                    `UPDATE payments 
                     SET mpesaReference = ?, status = 'pending' 
                     WHERE bookingID = ?`,
                    [result.CheckoutRequestID, bookingId]
                );
            } else {
                // Create new payment record
                await promisePool.query(
                    `INSERT INTO payments (
                        bookingID, amount, phoneNumber, mpesaReference, status
                    ) VALUES (?, ?, ?, ?, 'pending')`,
                    [bookingId, amount, phoneNumber, result.CheckoutRequestID]
                );
            }
        }

        res.json({
            success: true,
            message: 'M-Pesa prompt sent. Please check your phone and enter PIN.',
            checkoutRequestID: result.CheckoutRequestID,
            responseCode: result.ResponseCode,
            responseDescription: result.ResponseDescription
        });

    } catch (error) {
        console.error('❌ STK Push error:', error);
        next(error);
    }
};

/**
 * @desc    Handle M-Pesa STK Push callback
 * @route   POST /api/mpesa/callback
 * @access  Public (Safaricom calls this)
 */
const stkPushCallback = async (req, res, next) => {
    try {
        const callbackData = req.body;
        console.log('📥 M-Pesa Callback Received:', JSON.stringify(callbackData, null, 2));

        // Extract callback data
        const stkCallback = callbackData.Body?.stkCallback;
        
        if (!stkCallback) {
            return res.status(400).json({ 
                ResultCode: 1, 
                ResultDesc: 'Invalid callback data' 
            });
        }

        const {
            MerchantRequestID,
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
            CallbackMetadata
        } = stkCallback;

        // Find payment record
        const [payment] = await promisePool.query(
            'SELECT * FROM payments WHERE mpesaReference = ?',
            [CheckoutRequestID]
        );

        if (payment.length === 0) {
            console.log('⚠️ Payment not found for CheckoutRequestID:', CheckoutRequestID);
            return res.json({ 
                ResultCode: 0, 
                ResultDesc: 'Success' 
            });
        }

        const paymentRecord = payment[0];
        const bookingId = paymentRecord.bookingID;

        if (ResultCode === 0) {
            // Payment successful
            const metadata = CallbackMetadata?.Item || [];
            
            // Extract metadata
            const amount = metadata.find(item => item.Name === 'Amount')?.Value;
            const mpesaReceipt = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            const transactionDate = metadata.find(item => item.Name === 'TransactionDate')?.Value;
            const phoneNumber = metadata.find(item => item.Name === 'PhoneNumber')?.Value;

            // Format transaction date
            let formattedDate = null;
            if (transactionDate) {
                const dateStr = transactionDate.toString();
                const year = dateStr.substring(0, 4);
                const month = dateStr.substring(4, 6);
                const day = dateStr.substring(6, 8);
                const hour = dateStr.substring(8, 10);
                const minute = dateStr.substring(10, 12);
                const second = dateStr.substring(12, 14);
                formattedDate = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
            }

            // Update payment record
            await promisePool.query(
                `UPDATE payments 
                 SET status = 'completed', 
                     mpesaReceipt = ?,
                     transactionDate = ?,
                     resultCode = ?,
                     resultDesc = ?
                 WHERE paymentID = ?`,
                [mpesaReceipt, formattedDate, ResultCode, ResultDesc, paymentRecord.paymentID]
            );

            // Update booking payment status
            await promisePool.query(
                `UPDATE bookings 
                 SET paymentStatus = 'paid', 
                     status = 'confirmed',
                     paymentReference = ?
                 WHERE bookingID = ?`,
                [mpesaReceipt, bookingId]
            );

            // Send SMS notification (if SMS service is configured)
            try {
                const [booking] = await promisePool.query(
                    `SELECT b.*, c.phoneNumber as customerPhone, c.customerName,
                            r.origin, r.destination
                     FROM bookings b
                     JOIN customers c ON b.customerID = c.custID
                     JOIN routes r ON b.routeID = r.routeID
                     WHERE b.bookingID = ?`,
                    [bookingId]
                );

                if (booking.length > 0) {
                    const bookingData = booking[0];
                    const message = `EasyRide: Payment of KES ${amount} received for booking ${bookingData.bookingReference}. Your trip from ${bookingData.origin} to ${bookingData.destination} on ${bookingData.travelDate} is confirmed. Receipt: ${mpesaReceipt}`;
                    
                    // Log SMS for later sending
                    await promisePool.query(
                        `INSERT INTO sms_logs (bookingID, phoneNumber, message, status)
                         VALUES (?, ?, ?, 'pending')`,
                        [bookingId, bookingData.customerPhone, message]
                    );
                }
            } catch (smsError) {
                console.error('❌ Failed to queue SMS:', smsError);
                // Don't fail the callback for SMS errors
            }

            console.log(`✅ Payment successful for booking ${bookingId}: ${mpesaReceipt}`);

        } else {
            // Payment failed
            await promisePool.query(
                `UPDATE payments 
                 SET status = 'failed',
                     resultCode = ?,
                     resultDesc = ?
                 WHERE paymentID = ?`,
                [ResultCode, ResultDesc, paymentRecord.paymentID]
            );

            console.log(`❌ Payment failed for booking ${bookingId}: ${ResultDesc}`);
        }

        // Always return success to Safaricom
        res.json({
            ResultCode: 0,
            ResultDesc: 'Success'
        });

    } catch (error) {
        console.error('❌ Callback processing error:', error);
        // Still return success to Safaricom
        res.json({
            ResultCode: 0,
            ResultDesc: 'Success'
        });
    }
};

/**
 * @desc    Query payment status
 * @route   POST /api/mpesa/query
 * @access  Private
 */
const queryStatus = async (req, res, next) => {
    try {
        const { checkoutRequestID } = req.body;

        if (!checkoutRequestID) {
            return res.status(400).json({ 
                success: false,
                message: 'CheckoutRequestID is required' 
            });
        }

        const result = await mpesaService.queryStatus(checkoutRequestID);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('❌ Query status error:', error);
        next(error);
    }
};

/**
 * @desc    Send money to customer (B2C)
 * @route   POST /api/mpesa/b2c
 * @access  Private (Admin/Operator only)
 */
const b2cPayment = async (req, res, next) => {
    try {
        const { phoneNumber, amount, occasion, remarks, bookingId } = req.body;
        const adminId = req.user.id;

        // Validate required fields
        if (!phoneNumber || !amount) {
            return res.status(400).json({ 
                success: false,
                message: 'Phone number and amount are required' 
            });
        }

        // Process B2C payment
        const result = await mpesaService.b2cPayment(
            phoneNumber,
            amount,
            occasion,
            remarks || 'Refund'
        );

        // If booking ID provided, create refund record
        if (bookingId && result.ConversationID) {
            await promisePool.query(
                `INSERT INTO payments (
                    bookingID, amount, phoneNumber, mpesaReference, 
                    status, paymentMethod
                ) VALUES (?, ?, ?, ?, 'refunded', 'mpesa')`,
                [bookingId, amount, phoneNumber, result.ConversationID]
            );

            // Update booking status
            await promisePool.query(
                `UPDATE bookings 
                 SET paymentStatus = 'refunded' 
                 WHERE bookingID = ?`,
                [bookingId]
            );
        }

        res.json({
            success: true,
            message: 'B2C payment initiated successfully',
            conversationID: result.ConversationID,
            responseCode: result.ResponseCode
        });

    } catch (error) {
        console.error('❌ B2C payment error:', error);
        next(error);
    }
};

/**
 * @desc    Handle B2C callback
 * @route   POST /api/mpesa/b2c-callback
 * @access  Public
 */
const b2cCallback = async (req, res, next) => {
    try {
        const callbackData = req.body;
        console.log('📥 B2C Callback Received:', JSON.stringify(callbackData, null, 2));

        // Process B2C callback
        const result = callbackData.Result;
        
        if (result?.ResultCode === 0) {
            // Payment successful
            console.log('✅ B2C payment successful:', result.TransactionID);
        } else {
            console.log('❌ B2C payment failed:', result?.ResultDesc);
        }

        res.json({
            ResultCode: 0,
            ResultDesc: 'Success'
        });

    } catch (error) {
        console.error('❌ B2C callback error:', error);
        res.json({
            ResultCode: 0,
            ResultDesc: 'Success'
        });
    }
};

/**
 * @desc    Check transaction status
 * @route   POST /api/mpesa/status
 * @access  Private (Admin only)
 */
const transactionStatus = async (req, res, next) => {
    try {
        const { transactionID } = req.body;

        if (!transactionID) {
            return res.status(400).json({ 
                success: false,
                message: 'Transaction ID is required' 
            });
        }

        const result = await mpesaService.checkTransactionStatus(transactionID);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('❌ Transaction status error:', error);
        next(error);
    }
};

/**
 * @desc    Process reversal/refund
 * @route   POST /api/mpesa/reversal
 * @access  Private (Admin only)
 */
const reversal = async (req, res, next) => {
    try {
        const { transactionID, amount, remarks } = req.body;

        if (!transactionID || !amount) {
            return res.status(400).json({ 
                success: false,
                message: 'Transaction ID and amount are required' 
            });
        }

        const result = await mpesaService.processReversal(transactionID, amount);

        res.json({
            success: true,
            message: 'Reversal initiated successfully',
            ...result
        });

    } catch (error) {
        console.error('❌ Reversal error:', error);
        next(error);
    }
};

/**
 * @desc    Simulate payment (for development only)
 * @route   POST /api/mpesa/simulate
 * @access  Development only
 */
const simulatePayment = async (req, res, next) => {
    try {
        const { bookingId, amount, phoneNumber, success = true } = req.body;

        if (!bookingId || !amount) {
            return res.status(400).json({ 
                success: false,
                message: 'Booking ID and amount are required' 
            });
        }

        // Simulate payment processing
        const checkoutRequestID = 'SIM' + Date.now().toString().slice(-8);
        const mpesaReceipt = 'SIM' + Math.random().toString(36).substring(2, 10).toUpperCase();

        // Create payment record
        await promisePool.query(
            `INSERT INTO payments (
                bookingID, amount, phoneNumber, mpesaReference, 
                mpesaReceipt, status, transactionDate
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
                bookingId, 
                amount, 
                phoneNumber || '254708374149', 
                checkoutRequestID,
                mpesaReceipt,
                success ? 'completed' : 'failed'
            ]
        );

        // Update booking status
        if (success) {
            await promisePool.query(
                `UPDATE bookings 
                 SET paymentStatus = 'paid', 
                     status = 'confirmed',
                     paymentReference = ?
                 WHERE bookingID = ?`,
                [mpesaReceipt, bookingId]
            );
        }

        res.json({
            success: true,
            message: success ? 'Payment simulated successfully' : 'Payment simulation failed',
            checkoutRequestID,
            mpesaReceipt: success ? mpesaReceipt : null
        });

    } catch (error) {
        console.error('❌ Simulation error:', error);
        next(error);
    }
};

module.exports = {
    stkPush,
    stkPushCallback,
    queryStatus,
    b2cPayment,
    b2cCallback,
    transactionStatus,
    reversal,
    simulatePayment
};