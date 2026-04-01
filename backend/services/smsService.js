const smsConfig = require('../config/sms');
const { pool } = require('../config/db');

class SMSNotificationService {
    
    /**
     * Send booking confirmation and save to database
     */
    async sendBookingConfirmation(bookingId) {
        try {
            // Get booking details from database - FIXED to match your schema
            const [booking] = await pool.query(
                `SELECT 
                    b.bookingID,
                    CONCAT('ER', b.bookingID) as bookingReference,
                    b.seatNumber,
                    b.travelDate,
                    b.totalAmount as amount,
                    b.phoneNumber as customerPhone,
                    b.customerName,
                    b.route as route,
                    v.vehicleNumber
                 FROM bookings b
                 LEFT JOIN vehicles v ON b.vehicleID = v.vehicleID
                 WHERE b.bookingID = ?`,
                [bookingId]
            );

            if (booking.length === 0) {
                throw new Error('Booking not found');
            }

            const bookingData = booking[0];
            
            // Parse route to get origin and destination
            let origin = 'Nairobi';
            let destination = 'Mombasa';
            if (bookingData.route) {
                const routeParts = bookingData.route.split(' → ');
                if (routeParts.length === 2) {
                    origin = routeParts[0];
                    destination = routeParts[1];
                }
            }
            
            // Format phone number
            const phoneNumber = smsConfig.formatPhoneNumber(bookingData.customerPhone);
            
            // Generate message
            const message = smsConfig.formatBookingMessage({
                bookingReference: bookingData.bookingReference,
                origin: origin,
                destination: destination,
                travelDate: bookingData.travelDate,
                seatNumber: bookingData.seatNumber,
                amount: bookingData.amount,
                vehicleNumber: bookingData.vehicleNumber || 'N/A'
            });

            // Send SMS
            const result = await smsConfig.sendSMS(phoneNumber, message);

            // Log to database - check if sms_logs table exists
            try {
                const [tables] = await pool.query(`SHOW TABLES LIKE 'sms_logs'`);
                if (tables.length > 0) {
                    await pool.query(
                        `INSERT INTO sms_logs (
                            bookingID, phoneNumber, message, messageType, 
                            status, providerReference, sentAt
                        ) VALUES (?, ?, ?, 'booking_confirmation', ?, ?, NOW())`,
                        [bookingId, phoneNumber, message, result.status, result.messageId || null]
                    );
                }
            } catch (logError) {
                console.log('⚠️ Could not log SMS to database:', logError.message);
            }

            console.log(`✅ Booking confirmation SMS sent for booking ${bookingData.bookingReference}`);

            return result;

        } catch (error) {
            console.error('❌ Send booking confirmation SMS error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send payment receipt
     */
    async sendPaymentReceipt(bookingId, paymentDetails) {
        try {
            // Get booking details
            const [booking] = await pool.query(
                `SELECT 
                    b.bookingID,
                    CONCAT('ER', b.bookingID) as bookingReference,
                    b.phoneNumber as customerPhone,
                    b.customerName
                 FROM bookings b
                 WHERE b.bookingID = ?`,
                [bookingId]
            );

            if (booking.length === 0) {
                throw new Error('Booking not found');
            }

            const bookingData = booking[0];
            const phoneNumber = smsConfig.formatPhoneNumber(bookingData.customerPhone);
            
            const message = smsConfig.formatPaymentMessage({
                mpesaReceipt: paymentDetails.mpesaReceipt || 'SIMULATION',
                amount: paymentDetails.amount,
                transactionDate: new Date(),
                bookingReference: bookingData.bookingReference
            });

            const result = await smsConfig.sendSMS(phoneNumber, message);

            // Log to database
            try {
                const [tables] = await pool.query(`SHOW TABLES LIKE 'sms_logs'`);
                if (tables.length > 0) {
                    await pool.query(
                        `INSERT INTO sms_logs (
                            bookingID, phoneNumber, message, messageType, 
                            status, providerReference, sentAt
                        ) VALUES (?, ?, ?, 'payment_receipt', ?, ?, NOW())`,
                        [bookingId, phoneNumber, message, result.status, result.messageId || null]
                    );
                }
            } catch (logError) {
                console.log('⚠️ Could not log SMS:', logError.message);
            }

            console.log(`✅ Payment receipt SMS sent for booking ${bookingId}`);

            return result;

        } catch (error) {
            console.error('❌ Send payment receipt SMS error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send cancellation notice
     */
    async sendCancellationNotice(bookingId) {
        try {
            const [booking] = await pool.query(
                `SELECT 
                    b.bookingID,
                    CONCAT('ER', b.bookingID) as bookingReference,
                    b.seatNumber,
                    b.travelDate,
                    b.phoneNumber as customerPhone,
                    b.customerName,
                    b.route
                 FROM bookings b
                 WHERE b.bookingID = ?`,
                [bookingId]
            );

            if (booking.length === 0) {
                throw new Error('Booking not found');
            }

            const bookingData = booking[0];
            
            // Parse route
            let origin = 'Nairobi';
            let destination = 'Mombasa';
            if (bookingData.route) {
                const routeParts = bookingData.route.split(' → ');
                if (routeParts.length === 2) {
                    origin = routeParts[0];
                    destination = routeParts[1];
                }
            }
            
            const phoneNumber = smsConfig.formatPhoneNumber(bookingData.customerPhone);
            
            const message = smsConfig.formatCancellationMessage({
                bookingReference: bookingData.bookingReference,
                origin: origin,
                destination: destination,
                travelDate: bookingData.travelDate
            });

            const result = await smsConfig.sendSMS(phoneNumber, message);

            // Log to database
            try {
                const [tables] = await pool.query(`SHOW TABLES LIKE 'sms_logs'`);
                if (tables.length > 0) {
                    await pool.query(
                        `INSERT INTO sms_logs (
                            bookingID, phoneNumber, message, messageType, 
                            status, providerReference, sentAt
                        ) VALUES (?, ?, ?, 'cancellation', ?, ?, NOW())`,
                        [bookingId, phoneNumber, message, result.status, result.messageId || null]
                    );
                }
            } catch (logError) {
                console.log('⚠️ Could not log SMS:', logError.message);
            }

            console.log(`✅ Cancellation notice sent for booking ${bookingData.bookingReference}`);

            return result;

        } catch (error) {
            console.error('❌ Send cancellation notice error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Process pending SMS from database
     */
    async processPendingSMS() {
        try {
            const [tables] = await pool.query(`SHOW TABLES LIKE 'sms_logs'`);
            if (tables.length === 0) {
                console.log('⚠️ sms_logs table does not exist');
                return { processed: 0 };
            }
            
            // Get pending SMS
            const [pending] = await pool.query(
                `SELECT * FROM sms_logs 
                 WHERE status = 'pending' 
                 AND retryCount < 3 
                 ORDER BY createdAt ASC 
                 LIMIT 10`
            );
            
            let processed = 0;
            for (const smsLog of pending) {
                console.log(`📱 Processing pending SMS ${smsLog.smsID}`);
                
                const result = await smsConfig.sendSMS(smsLog.phoneNumber, smsLog.message);
                
                if (result.success) {
                    await pool.query(
                        `UPDATE sms_logs 
                         SET status = 'sent', 
                             providerReference = ?,
                             sentAt = NOW()
                         WHERE smsID = ?`,
                        [result.messageId, smsLog.smsID]
                    );
                    processed++;
                    console.log(`✅ SMS ${smsLog.smsID} sent successfully`);
                } else {
                    await pool.query(
                        `UPDATE sms_logs 
                         SET status = 'failed', 
                             errorMessage = ?,
                             retryCount = retryCount + 1
                         WHERE smsID = ?`,
                        [result.error, smsLog.smsID]
                    );
                    console.log(`❌ SMS ${smsLog.smsID} failed: ${result.error}`);
                }
            }
            
            return { processed };

        } catch (error) {
            console.error('❌ Error processing pending SMS:', error);
            return { error: error.message };
        }
    }
}

module.exports = new SMSNotificationService();