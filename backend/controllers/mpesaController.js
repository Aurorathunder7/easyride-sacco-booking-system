const mpesaService = require('../config/mpesa');
const pool = require('../config/db');
const emailService = require('../services/emailService');

/**
 * Helper function to generate ticket HTML
 */
function generateTicketHTML(booking, mpesaReceipt, amount) {
    // Format seats - handle different data types safely
    let seats = [];
    if (booking.seatNumber) {
        if (Array.isArray(booking.seatNumber)) {
            seats = booking.seatNumber;
        } else if (typeof booking.seatNumber === 'string') {
            seats = booking.seatNumber.split(',');
        } else {
            // If it's a number, convert to string and then to array
            seats = [booking.seatNumber.toString()];
        }
    }
    
    const travelDate = new Date(booking.travelDate);
    
    // Parse route
    let origin = 'Nairobi';
    let destination = 'Mombasa';
    if (booking.route) {
        const routeParts = booking.route.split(' → ');
        if (routeParts.length === 2) {
            origin = routeParts[0];
            destination = routeParts[1];
        }
    } else if (booking.origin && booking.destination) {
        origin = booking.origin;
        destination = booking.destination;
    }
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>EasyRide Ticket - ER${booking.bookingID}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fef9e8; padding: 20px; }
        .ticket { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #d97706, #f59e0b); color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 28px; margin-bottom: 5px; }
        .reference { background: rgba(255,255,255,0.2); display: inline-block; padding: 5px 15px; border-radius: 20px; margin-top: 10px; font-size: 14px; font-weight: bold; }
        .content { padding: 30px; }
        .section-title { font-size: 14px; text-transform: uppercase; color: #f59e0b; font-weight: 600; margin-bottom: 15px; border-left: 3px solid #f59e0b; padding-left: 10px; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #fed7aa; }
        .label { color: #b45309; font-weight: 500; font-size: 14px; }
        .value { color: #78350f; font-weight: 500; font-size: 14px; text-align: right; }
        .seats { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
        .seat-badge { background: #10b981; color: white; padding: 5px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }
        .total-row { display: flex; justify-content: space-between; padding: 15px 0; margin-top: 10px; border-top: 2px solid #f59e0b; border-bottom: 2px solid #f59e0b; }
        .total-label { font-size: 18px; font-weight: bold; color: #78350f; }
        .total-amount { font-size: 24px; font-weight: bold; color: #d97706; }
        .footer { background: #fffbef; padding: 20px; text-align: center; border-top: 1px solid #fed7aa; }
        .footer p { color: #b45309; font-size: 12px; margin: 5px 0; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background: #d1fae5; color: #065f46; }
        @media print {
            body { background: white; padding: 0; }
            .ticket { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="ticket">
        <div class="header">
            <h1>🚌 EasyRide SACCO</h1>
            <p>Your Travel Companion</p>
            <div class="reference">ER${booking.bookingID}</div>
        </div>
        
        <div class="content">
            <div class="section">
                <div class="section-title">PASSENGER DETAILS</div>
                <div class="info-row">
                    <span class="label">Name:</span>
                    <span class="value">${booking.customerName || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Phone:</span>
                    <span class="value">${booking.phoneNumber || 'N/A'}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">JOURNEY DETAILS</div>
                <div class="info-row">
                    <span class="label">Route:</span>
                    <span class="value">${origin} → ${destination}</span>
                </div>
                <div class="info-row">
                    <span class="label">Date:</span>
                    <span class="value">${travelDate.toLocaleDateString('en-KE')}</span>
                </div>
                <div class="info-row">
                    <span class="label">Time:</span>
                    <span class="value">${travelDate.toLocaleTimeString('en-KE')}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">VEHICLE & SEATS</div>
                <div class="info-row">
                    <span class="label">Vehicle:</span>
                    <span class="value">${booking.vehicleNumber || 'SAMPLE 001'} (${booking.vehicleType || 'Shuttle'})</span>
                </div>
                <div class="info-row">
                    <span class="label">Seats:</span>
                    <span class="value">
                        <div class="seats">
                            ${seats.map(seat => `<span class="seat-badge">Seat ${seat}</span>`).join('')}
                        </div>
                    </span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">PAYMENT DETAILS</div>
                <div class="info-row">
                    <span class="label">Amount:</span>
                    <span class="value">KES ${amount || 0}</span>
                </div>
                <div class="info-row">
                    <span class="label">M-Pesa Receipt:</span>
                    <span class="value">${mpesaReceipt || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Status:</span>
                    <span class="value"><span class="status-badge">✅ PAID & CONFIRMED</span></span>
                </div>
            </div>
            
            <div class="total-row">
                <span class="total-label">Total Paid:</span>
                <span class="total-amount">KES ${amount || 0}</span>
            </div>
        </div>
        
        <div class="footer">
            <p>✨ Thank you for choosing EasyRide! ✨</p>
            <p>Please arrive 30 minutes before departure</p>
            <p>For assistance, call: 0700 000 000</p>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * @desc    Initiate STK Push payment
 * @route   POST /api/mpesa/stkpush
 * @access  Private
 */
const stkPush = async (req, res, next) => {
    try {
        const { phoneNumber, amount, bookingId, accountReference } = req.body;
        const userId = req.user.id;
        const userName = req.user.name || req.user.customerName || 'Customer';

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
            const [existing] = await pool.query(
                'SELECT * FROM payments WHERE bookingID = ?',
                [bookingId]
            );

            if (existing.length > 0) {
                // Update existing payment - using mpesaCode column
                await pool.query(
                    `UPDATE payments 
                     SET mpesaCode = ?, status = 'pending' 
                     WHERE bookingID = ?`,
                    [result.CheckoutRequestID, bookingId]
                );
            } else {
                // Create new payment record - using actual table columns
                await pool.query(
                    `INSERT INTO payments (
                        bookingID, custID, customerName, phoneNumber, amount, mpesaCode, status, paymentMethod
                    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'M-Pesa')`,
                    [bookingId, userId, userName, phoneNumber, amount, result.CheckoutRequestID]
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

        // Find payment record - using mpesaCode column
        const [payment] = await pool.query(
            'SELECT * FROM payments WHERE mpesaCode = ?',
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
            await pool.query(
                `UPDATE payments 
                 SET status = 'completed',
                     paymentDate = NOW()
                 WHERE paymentID = ?`,
                [paymentRecord.paymentID]
            );

            // Update booking status - Use only status column
            await pool.query(
                `UPDATE bookings 
                 SET status = 'confirmed'
                 WHERE bookingID = ?`,
                [bookingId]
            );

            console.log(`✅ Payment successful for booking ${bookingId}: ${mpesaReceipt}`);

            // ========== SEND EMAIL WITH TICKET ==========
            try {
                console.log('📧 ===== STARTING EMAIL SEND PROCESS =====');
                console.log('   Booking ID:', bookingId);
                console.log('   Payment Record custID:', paymentRecord.custID);
                
                // Get customer email and booking details
                const [customer] = await pool.query(
                    `SELECT email, customerName, phoneNumber 
                     FROM customers 
                     WHERE custID = ?`,
                    [paymentRecord.custID]
                );
                
                console.log('   Customer query result:', customer.length > 0 ? 'Found' : 'Not found');
                if (customer.length > 0) {
                    console.log('   Customer Name:', customer[0].customerName);
                    console.log('   Customer Email:', customer[0].email);
                    console.log('   Customer Phone:', customer[0].phoneNumber);
                }
                
                // Check if customer has email
                if (customer.length > 0 && customer[0].email && customer[0].email !== 'null' && customer[0].email !== '') {
                    console.log('✅ Email found, proceeding to send...');
                    
                    // Get full booking details for ticket
                    const [booking] = await pool.query(
                        `SELECT b.*, v.vehicleNumber, v.vehicleType
                         FROM bookings b
                         LEFT JOIN vehicles v ON b.vehicleID = v.vehicleID
                         WHERE b.bookingID = ?`,
                        [bookingId]
                    );
                    
                    console.log('   Booking query result:', booking.length > 0 ? 'Found' : 'Not found');
                    
                    if (booking.length > 0) {
                        const bookingData = booking[0];
                        console.log('   Booking Route:', bookingData.route);
                        console.log('   Booking Seats:', bookingData.seatNumber);
                        
                        // Generate ticket HTML (now with fixed seat handling)
                        const ticketHTML = generateTicketHTML(bookingData, mpesaReceipt, amount);
                        
                        // Parse route for email
                        let origin = 'Nairobi';
                        let destination = 'Mombasa';
                        if (bookingData.route) {
                            const routeParts = bookingData.route.split(' → ');
                            if (routeParts.length === 2) {
                                origin = routeParts[0];
                                destination = routeParts[1];
                            }
                        }
                        
                        const emailDetails = {
                            customerName: customer[0].customerName,
                            customerEmail: customer[0].email,
                            bookingReference: `ER${bookingId}`,
                            origin: origin,
                            destination: destination,
                            travelDate: bookingData.travelDate,
                            seats: bookingData.seatNumber,
                            vehicleNumber: bookingData.vehicleNumber || 'N/A',
                            amount: amount || 0,
                            bookingId: bookingId
                        };
                        
                        console.log('📧 Sending ticket email to:', customer[0].email);
                        
                        const emailResult = await emailService.sendTicketEmail(bookingId, emailDetails, ticketHTML);
                        
                        if (emailResult.success) {
                            console.log(`✅ Ticket email sent successfully for booking ${bookingId}`);
                            console.log('   Message ID:', emailResult.messageId);
                        } else {
                            console.log(`⚠️ Ticket email failed for booking ${bookingId}: ${emailResult.error}`);
                        }
                    } else {
                        console.log('⚠️ Booking not found for email - booking ID:', bookingId);
                    }
                } else {
                    console.log(`⚠️ No valid email found for customer ID: ${paymentRecord.custID}`);
                    if (customer.length > 0) {
                        console.log('   Customer email value:', customer[0].email);
                    } else {
                        console.log('   Customer record not found in database');
                    }
                    console.log('💡 To receive tickets by email, please add an email address for this customer.');
                }
                console.log('📧 ===== END EMAIL SEND PROCESS =====');
                
            } catch (emailError) {
                console.error('❌ Failed to send email:', emailError.message);
                console.error('❌ Error stack:', emailError.stack);
                // Don't fail the callback for email errors
            }

        } else {
            // Payment failed
            await pool.query(
                `UPDATE payments 
                 SET status = 'failed'
                 WHERE paymentID = ?`,
                [paymentRecord.paymentID]
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

        // If booking ID provided, create refund record - using mpesaCode
        if (bookingId && result.ConversationID) {
            await pool.query(
                `INSERT INTO payments (
                    bookingID, custID, customerName, phoneNumber, amount, mpesaCode, 
                    status, paymentMethod
                ) VALUES (?, ?, ?, ?, ?, ?, 'refunded', 'M-Pesa')`,
                [bookingId, adminId, 'Admin Refund', phoneNumber, amount, result.ConversationID]
            );

            // Update booking status
            await pool.query(
                `UPDATE bookings 
                 SET status = 'cancelled'
                 WHERE bookingID = ?`,
                [bookingId]
            );
            
            // Send cancellation email
            try {
                const [customer] = await pool.query(
                    `SELECT email, customerName FROM customers WHERE custID = ?`,
                    [adminId]
                );
                
                if (customer.length > 0 && customer[0].email && customer[0].email !== 'null' && customer[0].email !== '') {
                    const emailDetails = {
                        customerName: customer[0].customerName,
                        customerEmail: customer[0].email,
                        bookingReference: `ER${bookingId}`,
                        refundAmount: amount
                    };
                    
                    await emailService.sendCancellationEmail(emailDetails);
                    console.log(`✅ Cancellation email sent for booking ${bookingId}`);
                }
            } catch (emailError) {
                console.error('❌ Failed to send cancellation email:', emailError.message);
            }
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
        const userId = req.user.id;
        const userName = req.user.name || req.user.customerName || 'Customer';

        if (!bookingId || !amount) {
            return res.status(400).json({ 
                success: false,
                message: 'Booking ID and amount are required' 
            });
        }

        // Simulate payment processing
        const checkoutRequestID = 'SIM' + Date.now().toString().slice(-8);
        const mpesaReceipt = 'SIM' + Math.random().toString(36).substring(2, 10).toUpperCase();

        // Create payment record - using actual table columns
        await pool.query(
            `INSERT INTO payments (
                bookingID, custID, customerName, phoneNumber, amount, mpesaCode, status, paymentMethod, paymentDate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'M-Pesa', NOW())`,
            [bookingId, userId, userName, phoneNumber || '254708374149', amount, checkoutRequestID, success ? 'completed' : 'failed']
        );

        // Update booking status
        if (success) {
            await pool.query(
                `UPDATE bookings 
                 SET status = 'confirmed'
                 WHERE bookingID = ?`,
                [bookingId]
            );
            
            // Send simulation email
            try {
                const [customer] = await pool.query(
                    `SELECT email, customerName FROM customers WHERE custID = ?`,
                    [userId]
                );
                
                if (customer.length > 0 && customer[0].email && customer[0].email !== 'null' && customer[0].email !== '') {
                    const [booking] = await pool.query(
                        `SELECT b.*, v.vehicleNumber, v.vehicleType
                         FROM bookings b
                         LEFT JOIN vehicles v ON b.vehicleID = v.vehicleID
                         WHERE b.bookingID = ?`,
                        [bookingId]
                    );
                    
                    if (booking.length > 0) {
                        const bookingData = booking[0];
                        const ticketHTML = generateTicketHTML(bookingData, mpesaReceipt, amount);
                        
                        let origin = 'Nairobi';
                        let destination = 'Mombasa';
                        if (bookingData.route) {
                            const routeParts = bookingData.route.split(' → ');
                            if (routeParts.length === 2) {
                                origin = routeParts[0];
                                destination = routeParts[1];
                            }
                        }
                        
                        const emailDetails = {
                            customerName: customer[0].customerName,
                            customerEmail: customer[0].email,
                            bookingReference: `ER${bookingId}`,
                            origin: origin,
                            destination: destination,
                            travelDate: bookingData.travelDate,
                            seats: bookingData.seatNumber,
                            vehicleNumber: bookingData.vehicleNumber || 'N/A',
                            amount: amount,
                            bookingId: bookingId
                        };
                        
                        await emailService.sendTicketEmail(bookingId, emailDetails, ticketHTML);
                        console.log(`📧 Simulation email sent for booking ${bookingId}`);
                    }
                }
            } catch (emailError) {
                console.error('❌ Failed to send simulation email:', emailError.message);
            }
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

/**
 * @desc    Test endpoint to verify ngrok is working
 * @route   GET /api/mpesa/test-endpoint
 * @access  Public
 */
const testEndpoint = async (req, res) => {
    console.log('🧪 Test endpoint hit at:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    // Test database connection
    let dbStatus = 'Not tested';
    try {
        if (pool) {
            const [result] = await pool.query('SELECT 1 as test');
            dbStatus = '✅ Database connected and working';
        } else {
            dbStatus = '❌ Database pool not available';
        }
    } catch (err) {
        dbStatus = '❌ Database error: ' + err.message;
    }
    
    res.json({
        success: true,
        message: '✅ Your callback endpoint is working!',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        url: req.protocol + '://' + req.get('host') + req.originalUrl
    });
};

module.exports = {
    stkPush,
    stkPushCallback,
    queryStatus,
    b2cPayment,
    b2cCallback,
    transactionStatus,
    reversal,
    simulatePayment,
    testEndpoint
};