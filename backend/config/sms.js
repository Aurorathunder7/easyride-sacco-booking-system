const africastalking = require('africastalking');

// Initialize Africa's Talking
const credentials = {
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME || 'sandbox'
};

const at = africastalking(credentials);
const sms = at.SMS;

class SMSService {
    /**
     * Send SMS to a single recipient
     */
    async sendSMS(phoneNumber, message) {
        try {
            // Format phone number (remove any non-digits and ensure it's in international format)
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            
            const options = {
                to: [formattedNumber],
                message: message,
                from: process.env.AT_SENDER_ID || 'EASY-RIDE'
            };

            console.log(`📤 Sending SMS to ${formattedNumber}: ${message}`);

            const response = await sms.send(options);
            
            console.log('📥 SMS Response:', response);
            
            return {
                success: true,
                messageId: response.SMSMessageData?.Recipients?.[0]?.messageId,
                status: response.SMSMessageData?.Recipients?.[0]?.status
            };

        } catch (error) {
            console.error('❌ SMS sending error:', error);
            throw new Error('Failed to send SMS');
        }
    }

    /**
     * Send SMS to multiple recipients
     */
    async sendBulkSMS(phoneNumbers, message) {
        try {
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
                recipients: response.SMSMessageData?.Recipients || []
            };

        } catch (error) {
            console.error('❌ Bulk SMS error:', error);
            throw new Error('Failed to send bulk SMS');
        }
    }

    /**
     * Send booking confirmation SMS
     */
    async sendBookingConfirmation(bookingDetails) {
        const message = this.formatBookingMessage(bookingDetails);
        return this.sendSMS(bookingDetails.customerPhone, message);
    }

    /**
     * Send payment receipt SMS
     */
    async sendPaymentReceipt(paymentDetails) {
        const message = this.formatPaymentMessage(paymentDetails);
        return this.sendSMS(paymentDetails.customerPhone, message);
    }

    /**
     * Send trip reminder SMS
     */
    async sendTripReminder(bookingDetails) {
        const message = this.formatReminderMessage(bookingDetails);
        return this.sendSMS(bookingDetails.customerPhone, message);
    }

    /**
     * Send cancellation notification
     */
    async sendCancellationNotice(bookingDetails) {
        const message = this.formatCancellationMessage(bookingDetails);
        return this.sendSMS(bookingDetails.customerPhone, message);
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
        return `EasyRide: Your booking from ${booking.origin} to ${booking.destination} is confirmed! 
Booking Ref: ${booking.bookingReference}
Date: ${new Date(booking.travelDate).toLocaleDateString('en-KE')}
Time: ${new Date(booking.travelDate).toLocaleTimeString('en-KE')}
Seat: ${booking.seatNumber}
Amount: KES ${booking.amount}
Vehicle: ${booking.vehicleNumber}
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
M-Pesa Confirmation: ${payment.mpesaReceipt}
Thank you for riding with us!`;
    }

    /**
     * Format trip reminder message
     */
    formatReminderMessage(booking) {
        return `EasyRide Reminder: Your trip from ${booking.origin} to ${booking.destination} is tomorrow at ${new Date(booking.travelDate).toLocaleTimeString('en-KE')}.
Booking Ref: ${booking.bookingReference}
Seat: ${booking.seatNumber}
Vehicle: ${booking.vehicleNumber}
Please arrive 30 minutes before departure.
Safe travels!`;
    }

    /**
     * Format cancellation notice
     */
    formatCancellationMessage(booking) {
        return `EasyRide: Your booking from ${booking.origin} to ${booking.destination} has been cancelled.
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
            const response = await sms.fetchBalance();
            return {
                success: true,
                balance: response.balance
            };
        } catch (error) {
            console.error('❌ Balance check error:', error);
            throw new Error('Failed to check SMS balance');
        }
    }

    /**
     * Fetch SMS delivery reports
     */
    async fetchDeliveryReports() {
        try {
            const response = await sms.fetchMessages();
            return {
                success: true,
                messages: response.SMSMessageData?.Messages || []
            };
        } catch (error) {
            console.error('❌ Fetch delivery reports error:', error);
            throw new Error('Failed to fetch delivery reports');
        }
    }
}

module.exports = new SMSService();