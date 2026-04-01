const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Configure email transporter
        // You can use Gmail, SendGrid, or any SMTP service
        this.transporter = nodemailer.createTransport({
            service: 'gmail', // or 'sendgrid', 'outlook', etc.
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        console.log('✅ Email service initialized');
    }

    /**
     * Send email with ticket attachment
     */
    async sendTicketEmail(bookingId, bookingDetails, ticketHTML) {
        try {
            const { customerName, customerEmail, bookingReference } = bookingDetails;
            
            if (!customerEmail) {
                console.log('⚠️ No email address provided, skipping email');
                return { success: false, error: 'No email address' };
            }
            
            const mailOptions = {
                from: `"EasyRide SACCO" <${process.env.EMAIL_USER}>`,
                to: customerEmail,
                subject: `Your EasyRide Ticket - ${bookingReference}`,
                html: this.getEmailTemplate(bookingDetails, ticketHTML),
                attachments: [
                    {
                        filename: `EasyRide_Ticket_${bookingReference}.html`,
                        content: ticketHTML,
                        contentType: 'text/html'
                    }
                ]
            };
            
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Ticket email sent to ${customerEmail}`);
            return { success: true, messageId: info.messageId };
            
        } catch (error) {
            console.error('❌ Email sending error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send booking confirmation email
     */
    async sendBookingConfirmation(bookingDetails) {
        try {
            const mailOptions = {
                from: `"EasyRide SACCO" <${process.env.EMAIL_USER}>`,
                to: bookingDetails.customerEmail,
                subject: `Booking Confirmed - ${bookingDetails.bookingReference}`,
                html: this.getBookingConfirmationHTML(bookingDetails)
            };
            
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Booking confirmation email sent to ${bookingDetails.customerEmail}`);
            return { success: true, messageId: info.messageId };
            
        } catch (error) {
            console.error('❌ Email sending error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send payment receipt email
     */
    async sendPaymentReceipt(bookingDetails, paymentDetails) {
        try {
            const mailOptions = {
                from: `"EasyRide SACCO" <${process.env.EMAIL_USER}>`,
                to: bookingDetails.customerEmail,
                subject: `Payment Receipt - ${bookingDetails.bookingReference}`,
                html: this.getPaymentReceiptHTML(bookingDetails, paymentDetails)
            };
            
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Payment receipt email sent to ${bookingDetails.customerEmail}`);
            return { success: true, messageId: info.messageId };
            
        } catch (error) {
            console.error('❌ Email sending error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send cancellation email to customer
     */
    async sendCancellationEmail(bookingDetails) {
        try {
            const { customerName, customerEmail, bookingReference, origin, destination, travelDate, seats, amount, vehicleNumber } = bookingDetails;
            
            if (!customerEmail) {
                console.log('⚠️ No email address provided, skipping cancellation email');
                return { success: false, error: 'No email address' };
            }
            
            const cancellationHTML = this.getCancellationEmailHTML(bookingDetails);
            
            const mailOptions = {
                from: `"EasyRide SACCO" <${process.env.EMAIL_USER}>`,
                to: customerEmail,
                subject: `Booking Cancelled - ${bookingReference}`,
                html: cancellationHTML
            };
            
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Cancellation email sent to ${customerEmail}`);
            return { success: true, messageId: info.messageId };
            
        } catch (error) {
            console.error('❌ Cancellation email error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get beautiful email template
     */
    getEmailTemplate(bookingDetails, ticketHTML) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>EasyRide Ticket</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #fef9e8; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #d97706, #f59e0b); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚌 EasyRide SACCO</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Your Travel Companion</p>
        </div>
        
        <div style="padding: 30px;">
            <p style="color: #78350f; font-size: 16px; margin-bottom: 20px;">
                Dear <strong>${bookingDetails.customerName}</strong>,
            </p>
            <p style="color: #78350f; margin-bottom: 20px;">
                Thank you for choosing EasyRide! Your booking has been confirmed. Please find your ticket attached to this email.
            </p>
            
            <div style="background: #fffbef; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #d97706; margin: 0 0 15px;">📋 Booking Summary</h3>
                <p style="margin: 8px 0;"><strong style="color: #b45309;">Booking Reference:</strong> <span style="color: #78350f;">${bookingDetails.bookingReference}</span></p>
                <p style="margin: 8px 0;"><strong style="color: #b45309;">Route:</strong> <span style="color: #78350f;">${bookingDetails.origin} → ${bookingDetails.destination}</span></p>
                <p style="margin: 8px 0;"><strong style="color: #b45309;">Travel Date:</strong> <span style="color: #78350f;">${new Date(bookingDetails.travelDate).toLocaleString('en-KE')}</span></p>
                <p style="margin: 8px 0;"><strong style="color: #b45309;">Seats:</strong> <span style="color: #78350f;">${bookingDetails.seats}</span></p>
                <p style="margin: 8px 0;"><strong style="color: #b45309;">Vehicle:</strong> <span style="color: #78350f;">${bookingDetails.vehicleNumber}</span></p>
                <p style="margin: 8px 0;"><strong style="color: #b45309;">Amount Paid:</strong> <span style="color: #d97706; font-size: 18px; font-weight: bold;">KES ${bookingDetails.amount}</span></p>
            </div>
            
            <p style="color: #78350f; font-size: 14px; margin-bottom: 10px;">
                <strong>📌 Important Information:</strong>
            </p>
            <ul style="color: #92400e; font-size: 14px; margin-bottom: 20px;">
                <li>Please arrive at the departure point 30 minutes before departure</li>
                <li>Present your ticket (printed or on mobile) to the conductor</li>
                <li>For any inquiries, contact us at 0700 000 000</li>
            </ul>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="cid:ticket" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    View Your Ticket
                </a>
            </div>
        </div>
        
        <div style="background: #fffbef; padding: 20px; text-align: center; border-top: 1px solid #fed7aa;">
            <p style="color: #b45309; font-size: 12px; margin: 0;">
                ✨ Thank you for choosing EasyRide! ✨<br>
                Safe travels!
            </p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Get booking confirmation HTML
     */
    getBookingConfirmationHTML(booking) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Booking Confirmed - EasyRide</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #fef9e8; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #10b981, #34d399); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ Booking Confirmed!</h1>
        </div>
        
        <div style="padding: 30px;">
            <p style="color: #78350f; font-size: 16px;">Hello <strong>${booking.customerName}</strong>,</p>
            <p style="color: #78350f;">Your booking has been successfully confirmed!</p>
            
            <div style="background: #fffbef; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #10b981;">📋 Booking Details</h3>
                <p><strong>Reference:</strong> ${booking.bookingReference}</p>
                <p><strong>Route:</strong> ${booking.origin} → ${booking.destination}</p>
                <p><strong>Date:</strong> ${new Date(booking.travelDate).toLocaleString('en-KE')}</p>
                <p><strong>Seats:</strong> ${booking.seats}</p>
                <p><strong>Amount:</strong> KES ${booking.amount}</p>
            </div>
            
            <p style="text-align: center; margin-top: 20px;">
                <a href="${process.env.BASE_URL}/bookings/${booking.bookingId}/ticket" 
                   style="background: #f59e0b; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
                    View Full Ticket
                </a>
            </p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Get payment receipt HTML
     */
    getPaymentReceiptHTML(booking, payment) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Payment Receipt - EasyRide</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #fef9e8; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">💰 Payment Receipt</h1>
        </div>
        
        <div style="padding: 30px;">
            <p style="color: #78350f;">Dear <strong>${booking.customerName}</strong>,</p>
            <p style="color: #78350f;">We have received your payment. Thank you!</p>
            
            <div style="background: #fffbef; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #059669;">💵 Payment Details</h3>
                <p><strong>Receipt No:</strong> ${payment.mpesaReceipt}</p>
                <p><strong>Amount:</strong> KES ${payment.amount}</p>
                <p><strong>Date:</strong> ${new Date(payment.transactionDate).toLocaleString('en-KE')}</p>
                <p><strong>Booking Reference:</strong> ${booking.bookingReference}</p>
            </div>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Get cancellation email HTML template
     */
    getCancellationEmailHTML(booking) {
        const travelDateFormatted = new Date(booking.travelDate).toLocaleString('en-KE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Format seats for display
        const seatsArray = booking.seats ? booking.seats.split(',').map(s => s.trim()) : [];
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Cancelled - ${booking.bookingReference}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #fef9e8 0%, #fff5e6 100%);
            padding: 40px 20px;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 20px 40px -10px rgba(0,0,0,0.15);
            position: relative;
        }
        .email-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #ef4444, #f97316, #ef4444);
        }
        .header {
            background: linear-gradient(135deg, #ef4444, #f97316);
            color: white;
            padding: 30px 25px;
            text-align: center;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        .header p {
            font-size: 14px;
            opacity: 0.9;
        }
        .cancellation-badge {
            background: rgba(255,255,255,0.2);
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            margin-top: 10px;
            font-size: 14px;
            font-weight: bold;
        }
        .content {
            padding: 30px 25px;
        }
        .message {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin-bottom: 25px;
            border-radius: 8px;
        }
        .message p {
            color: #991b1b;
            margin: 0;
        }
        .booking-details {
            background: #fffbef;
            border-radius: 16px;
            padding: 20px;
            margin: 20px 0;
            border: 1px solid #fed7aa;
        }
        .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #ef4444;
            margin-bottom: 15px;
            border-left: 3px solid #ef4444;
            padding-left: 10px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #fed7aa;
        }
        .info-label {
            color: #b45309;
            font-weight: 500;
            font-size: 14px;
        }
        .info-value {
            color: #78350f;
            font-weight: 500;
            font-size: 14px;
            text-align: right;
        }
        .seats {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: flex-end;
        }
        .seat-badge {
            background: #ef4444;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: bold;
        }
        .refund-section {
            background: #fef2f2;
            border-radius: 12px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            border: 1px solid #fecaca;
        }
        .refund-section p {
            color: #991b1b;
            margin: 5px 0;
        }
        .footer {
            background: #fffbef;
            padding: 20px 25px;
            text-align: center;
            border-top: 1px solid #fed7aa;
        }
        .footer p {
            color: #b45309;
            font-size: 12px;
            margin: 5px 0;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>
                <span>🚌</span>
                EasyRide SACCO
                <span>❌</span>
            </h1>
            <p>Booking Cancellation Notice</p>
            <div class="cancellation-badge">CANCELLED</div>
        </div>
        
        <div class="content">
            <div class="message">
                <p>Dear <strong>${booking.customerName}</strong>,</p>
                <p>We regret to inform you that your booking has been cancelled as requested.</p>
            </div>
            
            <div class="booking-details">
                <div class="section-title">CANCELLED BOOKING DETAILS</div>
                <div class="info-row">
                    <span class="info-label">Booking Reference:</span>
                    <span class="info-value">${booking.bookingReference}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Route:</span>
                    <span class="info-value">${booking.origin} → ${booking.destination}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Travel Date & Time:</span>
                    <span class="info-value">${travelDateFormatted}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Seats:</span>
                    <span class="info-value">
                        <div class="seats">
                            ${seatsArray.map(seat => `<span class="seat-badge">Seat ${seat}</span>`).join('')}
                        </div>
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">Vehicle:</span>
                    <span class="info-value">${booking.vehicleNumber || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Amount Paid:</span>
                    <span class="info-value">KES ${booking.amount.toLocaleString()}</span>
                </div>
            </div>
            
            <div class="refund-section">
                <p><strong>💰 Refund Information</strong></p>
                <p>Your refund of <strong>KES ${booking.amount.toLocaleString()}</strong> will be processed within 24-48 hours.</p>
                <p>The refund will be sent to your M-Pesa account.</p>
                <p style="font-size: 12px; margin-top: 8px;">If you have any questions, please contact our support team.</p>
            </div>
            
            <p style="color: #78350f; margin-top: 20px; text-align: center;">
                We hope to serve you again in the future!
            </p>
        </div>
        
        <div class="footer">
            <p>✨ EasyRide SACCO - Your Travel Companion ✨</p>
            <p>For inquiries, call: 0700 000 000 | email: info@easyride.co.ke</p>
            <p>We apologize for any inconvenience caused.</p>
        </div>
    </div>
</body>
</html>
        `;
    }
}

module.exports = new EmailService();