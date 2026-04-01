require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmail() {
    console.log('🧪 TESTING EMAIL SERVICE');
    console.log('=======================');
    console.log('Email User:', process.env.EMAIL_USER);
    console.log('Email Pass:', process.env.EMAIL_PASS ? '✅ Set (hidden)' : '❌ Not set');
    console.log('');
    
    const testDetails = {
        customerName: 'Test User',
        customerEmail: process.env.EMAIL_USER, // Send to yourself
        bookingReference: 'TEST001',
        origin: 'Nairobi',
        destination: 'Mombasa',
        travelDate: new Date(),
        seats: 'A1, A2',
        vehicleNumber: 'TEST 001',
        amount: 1000,
        bookingId: 999
    };
    
    const testHTML = `
        <h1>Test Ticket</h1>
        <p>This is a test email from EasyRide.</p>
        <p>If you received this, your email configuration is working!</p>
        <p>Booking Reference: TEST001</p>
        <p>Amount: KES 1000</p>
        <p>Route: Nairobi → Mombasa</p>
    `;
    
    console.log('📧 Sending test email to:', testDetails.customerEmail);
    
    const result = await emailService.sendTicketEmail(999, testDetails, testHTML);
    
    if (result.success) {
        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', result.messageId);
        console.log('Check your inbox (and spam folder)');
    } else {
        console.error('❌ Test email failed:', result.error);
    }
}

testEmail();