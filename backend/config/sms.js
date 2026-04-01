const africastalking = require('africastalking');

// Initialize Africa's Talking
const credentials = {
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME || 'sandbox'
};

let at;
try {
    at = africastalking(credentials);
    console.log('✅ Africa\'s Talking initialized');
} catch (error) {
    console.error('❌ Failed to initialize Africa\'s Talking:', error.message);
}

const sms = at ? at.SMS : null;

class SMSService {
    /**
     * Send SMS to a single recipient
     */
    async sendSMS(phoneNumber, message) {
        try {
            if (!sms) {
                console.log('⚠️ SMS service not initialized, logging message only');
                console.log('📱 SMS would be sent to:', phoneNumber);
                console.log('📝 Message:', message);
                return {
                    success: true,
                    messageId: 'SIMULATED_' + Date.now(),
                    status: 'simulated',
                    isSimulation: true
                };
            }
            
            // Format phone number (remove any non-digits and ensure it's in international format)
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            
            const options = {
                to: [formattedNumber],
                message: message,
                from: process.env.AT_SENDER_ID || 'EASY-RIDE'
            };

            console.log(`📤 Sending SMS to ${formattedNumber}`);

            const response = await sms.send(options);
            
            console.log('📥 SMS Response:', response);
            
            return {
                success: true,
                messageId: response.SMSMessageData?.Recipients?.[0]?.messageId,
                status: response.SMSMessageData?.Recipients?.[0]?.status,
                isSimulation: false
            };

        } catch (error) {
            console.error('❌ SMS sending error:', error);
            return {
                success: false,
                error: error.message,
                isSimulation: false
            };
        }
    }

    /**
     * Send SMS to multiple recipients
     */
    async sendBulkSMS(phoneNumbers, message) {
        try {
            if (!sms) {
                console.log('⚠️ SMS service not initialized');
                return { success: true, isSimulation: true };
            }
            
            const formattedNumbers = phoneNumbers.map(num => this.formatPhoneNumber(num));
            
            const options = {
                to: formattedNumbers,
                message: message,
                from: process.env.AT_SENDER_ID || 'EASY-RIDE'
            };

            console.log(`📤 Sending bulk SMS to ${formattedNumbers.length} recipients`);

            const response = await sms.send(options);
            
            return {
                success: true,
                recipients: response.SMSMessageData?.Recipients || [],
                isSimulation: false
            };

        } catch (error) {
            console.error('❌ Bulk SMS error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send booking confirmation SMS
     */
    async sendBookingConfirmation(bookingDetails) {
        const message = this.formatBookingMessage(bookingDetails);
        const phoneNumber = bookingDetails.phoneNumber || bookingDetails.customerPhone;
        return this.sendSMS(phoneNumber, message);
    }

    /**
     * Send payment receipt SMS (updated to accept bookingId and paymentDetails)
     */
    async sendPaymentReceipt(bookingId, paymentDetails) {
        try {
            // Get booking details if not provided
            let bookingInfo = paymentDetails.bookingInfo;
            let phoneNumber = paymentDetails.customerPhone;
            let bookingReference = paymentDetails.bookingReference;
            
            // If bookingId is provided, fetch from database
            if (bookingId && (!bookingInfo || !phoneNumber)) {
                const { pool } = require('../config/db');
                const [booking] = await pool.query(
                    `SELECT phoneNumber, customerName, route, travelDate, seatNumber 
                     FROM bookings 
                     WHERE bookingID = ?`,
                    [bookingId]
                );
                
                if (booking.length > 0) {
                    phoneNumber = booking[0].phoneNumber;
                    bookingInfo = booking[0];
                }
            }
            
            // Format message
            const message = this.formatPaymentMessage({
                mpesaReceipt: paymentDetails.mpesaReceipt,
                amount: paymentDetails.amount,
                transactionDate: paymentDetails.transactionDate || new Date(),
                bookingReference: bookingReference || `ER${bookingId}`,
                customerPhone: phoneNumber
            });
            
            return this.sendSMS(phoneNumber, message);
            
        } catch (error) {
            console.error('❌ Send payment receipt SMS error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send trip reminder SMS
     */
    async sendTripReminder(bookingDetails) {
        const message = this.formatReminderMessage(bookingDetails);
        const phoneNumber = bookingDetails.phoneNumber || bookingDetails.customerPhone;
        return this.sendSMS(phoneNumber, message);
    }

    /**
     * Send cancellation notification
     */
    async sendCancellationNotice(bookingDetails) {
        const message = this.formatCancellationMessage(bookingDetails);
        const phoneNumber = bookingDetails.phoneNumber || bookingDetails.customerPhone;
        return this.sendSMS(phoneNumber, message);
    }

    /**
     * Format phone number to international format
     */
    formatPhoneNumber(phoneNumber) {
        if (!phoneNumber) return null;
        
        // Remove all non-digit characters
        let cleaned = phoneNumber.toString().replace(/\D/g, '');
        
        // If starts with 0, replace with 254
        if (cleaned.startsWith('0')) {
            cleaned = '254' + cleaned.slice(1);
        }
        // If starts with 7, add 254
        else if (cleaned.startsWith('7')) {
            cleaned = '254' + cleaned;
        }
        // If already in 254 format, ensure it has the correct length
        else if (cleaned.startsWith('254')) {
            // Ensure it's 12 digits (254 + 9 digits)
            if (cleaned.length > 12) {
                cleaned = cleaned.slice(0, 12);
            }
        }
        // Default: assume Kenyan number, add 254
        else {
            cleaned = '254' + cleaned;
        }
        
        return cleaned;
    }

    /**
     * Format booking confirmation message
     */
    formatBookingMessage(booking) {
        // Parse route if it's a string
        let origin = booking.origin;
        let destination = booking.destination;
        if (booking.route && !origin) {
            const routeParts = booking.route.split(' → ');
            if (routeParts.length === 2) {
                origin = routeParts[0];
                destination = routeParts[1];
            }
        }
        
        return `EasyRide: Your booking from ${origin || 'Nairobi'} to ${destination || 'Mombasa'} is confirmed! 
Booking Ref: ${booking.bookingReference}
Date: ${new Date(booking.travelDate).toLocaleDateString('en-KE')}
Time: ${new Date(booking.travelDate).toLocaleTimeString('en-KE')}
Seat: ${booking.seatNumber}
Amount: KES ${booking.amount}
Vehicle: ${booking.vehicleNumber || 'N/A'}
Thank you for choosing EasyRide!`;
    }

    /**
     * Format payment receipt message
     */
    formatPaymentMessage(payment) {
        return `EasyRide: Payment received!
Receipt No: ${payment.mpesaReceipt}
Amount: KES ${payment.amount}
Date: ${new Date(payment.transactionDate).toLocaleString('en-KE')}
Booking Ref: ${payment.bookingReference}
Thank you for riding with us!`;
    }

    /**
     * Format trip reminder message
     */
    formatReminderMessage(booking) {
        // Parse route if it's a string
        let origin = booking.origin;
        let destination = booking.destination;
        if (booking.route && !origin) {
            const routeParts = booking.route.split(' → ');
            if (routeParts.length === 2) {
                origin = routeParts[0];
                destination = routeParts[1];
            }
        }
        
        return `EasyRide Reminder: Your trip from ${origin || 'Nairobi'} to ${destination || 'Mombasa'} is tomorrow at ${new Date(booking.travelDate).toLocaleTimeString('en-KE')}.
Booking Ref: ${booking.bookingReference}
Seat: ${booking.seatNumber}
Vehicle: ${booking.vehicleNumber || 'N/A'}
Please arrive 30 minutes before departure.
Safe travels!`;
    }

    /**
     * Format cancellation notice
     */
    formatCancellationMessage(booking) {
        // Parse route if it's a string
        let origin = booking.origin;
        let destination = booking.destination;
        if (booking.route && !origin) {
            const routeParts = booking.route.split(' → ');
            if (routeParts.length === 2) {
                origin = routeParts[0];
                destination = routeParts[1];
            }
        }
        
        return `EasyRide: Your booking from ${origin || 'Nairobi'} to ${destination || 'Mombasa'} has been cancelled.
Booking Ref: ${booking.bookingReference}
Refund will be processed within 24 hours.
Contact us if you have any questions.
We hope to serve you again soon!`;
    }

    /**
     * Check SMS balance
     */
    async checkBalance() {
        try {
            if (!sms) {
                return { success: true, balance: 'Simulation - N/A', isSimulation: true };
            }
            
            const response = await sms.fetchBalance();
            return {
                success: true,
                balance: response.balance
            };
        } catch (error) {
            console.error('❌ Balance check error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Fetch SMS delivery reports
     */
    async fetchDeliveryReports() {
        try {
            if (!sms) {
                return { success: true, messages: [], isSimulation: true };
            }
            
            const response = await sms.fetchMessages();
            return {
                success: true,
                messages: response.SMSMessageData?.Messages || []
            };
        } catch (error) {
            console.error('❌ Fetch delivery reports error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Process pending SMS from database
     */
    async processPendingSMS() {
        try {
            const { pool } = require('../config/db');
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
                
                const result = await this.sendSMS(smsLog.phoneNumber, smsLog.message);
                
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

module.exports = new SMSService();