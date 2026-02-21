const smsConfig = require('../config/sms');
const { promisePool } = require('../config/db');

class SMSNotificationService {
    
    /**
     * Send booking confirmation and save to database
     */
    async sendBookingConfirmation(bookingId) {
        try {
            // Get booking details from database
            const [booking] = await promisePool.query(
                `SELECT 
                    b.bookingID,
                    b.bookingReference,
                    b.seatNumber,
                    b.travelDate,
                    b.totalAmount as amount,
                    c.phoneNumber as customerPhone,
                    c.customerName,
                    r.origin,
                    r.destination,
                    v.vehicleNumber
                 FROM bookings b
                 JOIN customers c ON b.customerID = c.custID
                 JOIN routes r ON b.routeID = r.routeID
                 JOIN vehicles v ON b.vehicleID = v.vehicleID
                 WHERE b.bookingID = ?`,
                [bookingId]
            );

            if (booking.length === 0) {
                throw new Error('Booking not found');
            }

            const bookingData = booking[0];
            
            // Format phone number
            const phoneNumber = smsConfig.formatPhoneNumber(bookingData.customerPhone);
            
            // Generate message
            const message = smsConfig.formatBookingMessage({
                ...bookingData,
                origin: bookingData.origin,
                destination: bookingData.destination,
                travelDate: bookingData.travelDate,
                seatNumber: bookingData.seatNumber,
                amount: bookingData.amount,
                vehicleNumber: bookingData.vehicleNumber,
                bookingReference: bookingData.bookingReference
            });

            // Send SMS
            const result = await smsConfig.sendSMS(phoneNumber, message);

            // Log to database
            await promisePool.query(
                `INSERT INTO sms_logs (
                    bookingID, phoneNumber, message, messageType, 
                    status, providerReference, sentAt
                ) VALUES (?, ?, ?, 'booking_confirmation', ?, ?, NOW())`,
                [bookingId, phoneNumber, message, result.status, result.messageId || null]
            );

            console.log(`✅ Booking confirmation SMS sent for booking ${bookingData.bookingReference}`);

            return result;

        } catch (error) {
            console.error('❌ Send booking confirmation SMS error:', error);
            
            // Log failed attempt
            await this.logFailedSMS(bookingId, 'booking_confirmation', error.message);
            
            throw error;
        }
    }

    /**
     * Send payment receipt
     */
    async sendPaymentReceipt(paymentId) {
        try {
            // Get payment details
            const [payment] = await promisePool.query(
                `SELECT 
                    p.*,
                    b.bookingReference,
                    c.phoneNumber as customerPhone,
                    c.customerName
                 FROM payments p
                 JOIN bookings b ON p.bookingID = b.bookingID
                 JOIN customers c ON b.customerID = c.custID
                 WHERE p.paymentID = ?`,
                [paymentId]
            );

            if (payment.length === 0) {
                throw new Error('Payment not found');
            }

            const paymentData = payment[0];
            const phoneNumber = smsConfig.formatPhoneNumber(paymentData.customerPhone);
            
            const message = smsConfig.formatPaymentMessage({
                mpesaReceipt: paymentData.mpesaReceipt,
                amount: paymentData.amount,
                transactionDate: paymentData.transactionDate,
                bookingReference: paymentData.bookingReference
            });

            const result = await smsConfig.sendSMS(phoneNumber, message);

            await promisePool.query(
                `INSERT INTO sms_logs (
                    bookingID, phoneNumber, message, messageType, 
                    status, providerReference, sentAt
                ) VALUES (?, ?, ?, 'payment_receipt', ?, ?, NOW())`,
                [paymentData.bookingID, phoneNumber, message, result.status, result.messageId || null]
            );

            console.log(`✅ Payment receipt SMS sent for payment ${paymentId}`);

            return result;

        } catch (error) {
            console.error('❌ Send payment receipt SMS error:', error);
            throw error;
        }
    }

    /**
     * Send trip reminder (to be called by cron job)
     */
    async sendTripReminders() {
        try {
            // Find bookings for tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowDate = tomorrow.toISOString().split('T')[0];

            const [bookings] = await promisePool.query(
                `SELECT 
                    b.bookingID,
                    b.bookingReference,
                    b.seatNumber,
                    b.travelDate,
                    c.phoneNumber as customerPhone,
                    c.customerName,
                    r.origin,
                    r.destination,
                    v.vehicleNumber
                 FROM bookings b
                 JOIN customers c ON b.customerID = c.custID
                 JOIN routes r ON b.routeID = r.routeID
                 JOIN vehicles v ON b.vehicleID = v.vehicleID
                 WHERE DATE(b.travelDate) = ? 
                    AND b.status = 'confirmed'
                    AND b.bookingID NOT IN (
                        SELECT bookingID FROM sms_logs 
                        WHERE messageType = 'reminder' 
                        AND DATE(sentAt) = CURDATE()
                    )`,
                [tomorrowDate]
            );

            const results = [];

            for (const booking of bookings) {
                try {
                    const phoneNumber = smsConfig.formatPhoneNumber(booking.customerPhone);
                    const message = smsConfig.formatReminderMessage({
                        ...booking,
                        origin: booking.origin,
                        destination: booking.destination,
                        travelDate: booking.travelDate
                    });

                    const result = await smsConfig.sendSMS(phoneNumber, message);

                    await promisePool.query(
                        `INSERT INTO sms_logs (
                            bookingID, phoneNumber, message, messageType, 
                            status, providerReference, sentAt
                        ) VALUES (?, ?, ?, 'reminder', ?, ?, NOW())`,
                        [booking.bookingID, phoneNumber, message, result.status, result.messageId || null]
                    );

                    results.push({ bookingId: booking.bookingID, success: true });
                    
                } catch (error) {
                    console.error(`❌ Failed to send reminder for booking ${booking.bookingID}:`, error);
                    results.push({ bookingId: booking.bookingID, success: false, error: error.message });
                }
            }

            console.log(`✅ Sent ${results.filter(r => r.success).length} trip reminders`);

            return results;

        } catch (error) {
            console.error('❌ Send trip reminders error:', error);
            throw error;
        }
    }

    /**
     * Send cancellation notice
     */
    async sendCancellationNotice(bookingId) {
        try {
            const [booking] = await promisePool.query(
                `SELECT 
                    b.bookingID,
                    b.bookingReference,
                    b.seatNumber,
                    b.travelDate,
                    c.phoneNumber as customerPhone,
                    c.customerName,
                    r.origin,
                    r.destination,
                    v.vehicleNumber
                 FROM bookings b
                 JOIN customers c ON b.customerID = c.custID
                 JOIN routes r ON b.routeID = r.routeID
                 JOIN vehicles v ON b.vehicleID = v.vehicleID
                 WHERE b.bookingID = ?`,
                [bookingId]
            );

            if (booking.length === 0) {
                throw new Error('Booking not found');
            }

            const bookingData = booking[0];
            const phoneNumber = smsConfig.formatPhoneNumber(bookingData.customerPhone);
            
            const message = smsConfig.formatCancellationMessage(bookingData);

            const result = await smsConfig.sendSMS(phoneNumber, message);

            await promisePool.query(
                `INSERT INTO sms_logs (
                    bookingID, phoneNumber, message, messageType, 
                    status, providerReference, sentAt
                ) VALUES (?, ?, ?, 'cancellation', ?, ?, NOW())`,
                [bookingId, phoneNumber, message, result.status, result.messageId || null]
            );

            console.log(`✅ Cancellation notice sent for booking ${bookingData.bookingReference}`);

            return result;

        } catch (error) {
            console.error('❌ Send cancellation notice error:', error);
            throw error;
        }
    }

    /**
     * Log failed SMS attempt
     */
    async logFailedSMS(bookingId, messageType, error) {
        try {
            await promisePool.query(
                `INSERT INTO sms_logs (
                    bookingID, messageType, status, errorMessage
                ) VALUES (?, ?, 'failed', ?)`,
                [bookingId, messageType, error]
            );
        } catch (logError) {
            console.error('❌ Failed to log SMS error:', logError);
        }
    }

    /**
     * Get SMS logs for a booking
     */
    async getSMSLogs(bookingId) {
        try {
            const [logs] = await promisePool.query(
                `SELECT * FROM sms_logs 
                 WHERE bookingID = ? 
                 ORDER BY createdAt DESC`,
                [bookingId]
            );

            return logs;
        } catch (error) {
            console.error('❌ Get SMS logs error:', error);
            throw error;
        }
    }

    /**
     * Retry failed SMS
     */
    async retryFailedSMS(smsId) {
        try {
            const [sms] = await promisePool.query(
                'SELECT * FROM sms_logs WHERE smsID = ?',
                [smsId]
            );

            if (sms.length === 0) {
                throw new Error('SMS log not found');
            }

            const smsData = sms[0];
            
            // Try sending again
            const result = await smsConfig.sendSMS(smsData.phoneNumber, smsData.message);

            // Update log
            await promisePool.query(
                `UPDATE sms_logs 
                 SET status = ?, providerReference = ?, sentAt = NOW(), retryCount = retryCount + 1
                 WHERE smsID = ?`,
                [result.status, result.messageId || null, smsId]
            );

            return result;

        } catch (error) {
            console.error('❌ Retry SMS error:', error);
            throw error;
        }
    }
}

module.exports = new SMSNotificationService();