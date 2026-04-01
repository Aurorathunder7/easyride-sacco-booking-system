const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const mpesaService = require('../config/mpesa');
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
 * Helper function to generate cash payment email HTML
 */
function generateCashPaymentEmail(customerName, bookingReference, routeData, travelDate, seatArray, totalAmount) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>EasyRide Booking - Cash Payment Required</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fef9e8; padding: 20px; }
        .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #f59e0b, #fbbf24); padding: 30px; text-align: center; }
        .header h1 { color: white; font-size: 28px; margin-bottom: 5px; }
        .header p { color: rgba(255,255,255,0.9); }
        .content { padding: 30px; }
        .booking-details { background: #fffbef; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #fed7aa; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #fed7aa; }
        .label { font-weight: 600; color: #b45309; }
        .value { color: #78350f; }
        .cash-instructions { background: #fff8e7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px; }
        .cash-instructions p { margin: 5px 0; color: #92400e; }
        .footer { background: #fffbef; padding: 20px; text-align: center; border-top: 1px solid #fed7aa; font-size: 12px; color: #b45309; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>💰 EasyRide Booking</h1>
            <p>Cash Payment Required</p>
        </div>
        <div class="content">
            <p>Dear <strong>${customerName}</strong>,</p>
            <p>Your booking has been created! However, payment is pending as you selected Cash payment.</p>
            
            <div class="booking-details">
                <h3 style="color: #d97706; margin-bottom: 15px;">📋 Booking Details</h3>
                <div class="info-row">
                    <span class="label">Booking Reference:</span>
                    <span class="value">${bookingReference}</span>
                </div>
                <div class="info-row">
                    <span class="label">Route:</span>
                    <span class="value">${routeData.origin} → ${routeData.destination}</span>
                </div>
                <div class="info-row">
                    <span class="label">Travel Date:</span>
                    <span class="value">${new Date(travelDate).toLocaleString('en-KE')}</span>
                </div>
                <div class="info-row">
                    <span class="label">Seats:</span>
                    <span class="value">${seatArray.join(', ')}</span>
                </div>
                <div class="info-row">
                    <span class="label">Amount:</span>
                    <span class="value" style="font-size: 18px; font-weight: bold; color: #d97706;">KES ${totalAmount.toLocaleString()}</span>
                </div>
            </div>
            
            <div class="cash-instructions">
                <p><strong>⚠️ Payment Instructions:</strong></p>
                <p>Please visit our office with <strong>KES ${totalAmount.toLocaleString()}</strong> to complete your payment.</p>
                <p>Your seats are reserved and will be held until <strong>30 minutes before departure</strong>.</p>
                <p>After payment, the operator will mark your booking as completed.</p>
            </div>
            
            <p style="margin-top: 20px;">Thank you for choosing EasyRide!</p>
        </div>
        <div class="footer">
            <p>✨ EasyRide SACCO - Your Travel Companion ✨</p>
            <p>For assistance, call: 0700 000 000</p>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * @desc    Get operator dashboard data
 * @route   GET /api/operators/dashboard
 * @access  Private (Operator only)
 */
const getDashboard = async (req, res, next) => {
    try {
        const operatorId = req.user.id;

        console.log('📊 Fetching operator dashboard for ID:', operatorId);

        // Get today's bookings count
        const [todayBookings] = await pool.query(
            `SELECT COUNT(*) as count 
             FROM bookings 
             WHERE DATE(bookingDate) = CURDATE()`,
            []
        );

        // Get total revenue (from payments table)
        const [totalRevenue] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total 
             FROM payments 
             WHERE status = 'completed'`,
            []
        );

        // Get pending payments
        const [pendingPayments] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total 
             FROM payments 
             WHERE status = 'pending'`,
            []
        );

        // Get available seats across all vehicles for today
        const [availableSeats] = await pool.query(
            `SELECT SUM(v.capacity) - (
                SELECT COUNT(*) FROM bookings 
                WHERE DATE(travelDate) = CURDATE() 
                AND status != 'cancelled'
            ) as available
             FROM vehicles v
             WHERE v.status = 'active'`,
            []
        );

        // Get recent bookings (last 10)
        const [recentBookings] = await pool.query(
            `SELECT 
                b.bookingID,
                CONCAT('ER', b.bookingID) as bookingReference,
                b.customerName,
                b.phoneNumber as customerPhone,
                b.route,
                b.seatNumber as seats,
                COALESCE(p.amount, 0) as amount,
                b.status,
                b.bookingDate
             FROM bookings b
             LEFT JOIN payments p ON b.bookingID = p.bookingID
             ORDER BY b.bookingDate DESC
             LIMIT 10`,
            []
        );

        // Format stats
        const stats = {
            todayBookings: todayBookings[0]?.count || 0,
            totalRevenue: totalRevenue[0]?.total || 0,
            pendingPayments: pendingPayments[0]?.total || 0,
            availableSeats: availableSeats[0]?.available || 0
        };

        // Format bookings for frontend
        const formattedBookings = recentBookings.map(booking => ({
            id: booking.bookingID,
            bookingReference: booking.bookingReference,
            customerName: booking.customerName,
            customerPhone: booking.customerPhone,
            route: booking.route,
            seats: booking.seats,
            amount: booking.amount,
            status: booking.status,
            time: formatTimeAgo(booking.bookingDate)
        }));

        res.json({
            success: true,
            stats,
            recentBookings: formattedBookings
        });

    } catch (error) {
        console.error('❌ Operator dashboard error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch dashboard data',
            error: error.message 
        });
    }
};

/**
 * @desc    Get all bookings with filters
 * @route   GET /api/operators/bookings
 * @access  Private (Operator only)
 */
const getBookings = async (req, res, next) => {
    try {
        const { 
            status, 
            search,
            page = 1, 
            limit = 20 
        } = req.query;

        let query = `
            SELECT 
                b.bookingID,
                CONCAT('ER', b.bookingID) as bookingReference,
                b.customerName,
                b.phoneNumber as customerPhone,
                b.route,
                b.seatNumber as seats,
                COALESCE(p.amount, 0) as amount,
                b.status,
                b.bookingDate,
                b.travelDate
            FROM bookings b
            LEFT JOIN payments p ON b.bookingID = p.bookingID
            WHERE 1=1
        `;

        const queryParams = [];

        if (status && status !== 'all') {
            query += ` AND b.status = ?`;
            queryParams.push(status);
        }

        if (search) {
            query += ` AND (b.customerName LIKE ? OR b.phoneNumber LIKE ? OR b.route LIKE ?)`;
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        let countQuery = `SELECT COUNT(*) as total FROM bookings WHERE 1=1`;
        const countParams = [];
        
        if (status && status !== 'all') {
            countQuery += ` AND status = ?`;
            countParams.push(status);
        }
        if (search) {
            countQuery += ` AND (customerName LIKE ? OR phoneNumber LIKE ? OR route LIKE ?)`;
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }
        
        const [countResult] = await pool.query(countQuery, countParams);
        const total = countResult[0]?.total || 0;

        const offset = (page - 1) * limit;
        query += ` ORDER BY b.bookingDate DESC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const [bookings] = await pool.query(query, queryParams);

        res.json({
            success: true,
            bookings: bookings || [],
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit) || 1,
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Get operator bookings error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch bookings',
            error: error.message 
        });
    }
};

/**
 * @desc    Get single booking details
 * @route   GET /api/operators/bookings/:id
 * @access  Private (Operator only)
 */
const getBookingDetails = async (req, res, next) => {
    try {
        const bookingId = req.params.id;

        const [booking] = await pool.query(
            `SELECT 
                b.*,
                CONCAT('ER', b.bookingID) as bookingReference,
                p.amount as paidAmount,
                p.status as paymentStatus,
                p.paymentDate,
                p.mpesaCode
             FROM bookings b
             LEFT JOIN payments p ON b.bookingID = p.bookingID
             WHERE b.bookingID = ?`,
            [bookingId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        res.json({
            success: true,
            booking: booking[0]
        });

    } catch (error) {
        console.error('❌ Get booking details error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch booking details',
            error: error.message 
        });
    }
};

/**
 * @desc    Search customers by phone number
 * @route   GET /api/operators/customers/search
 * @access  Private (Operator only)
 */
const searchCustomer = async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 3) {
            return res.status(400).json({ 
                success: false,
                message: 'Search query must be at least 3 characters' 
            });
        }

        const [customers] = await pool.query(
            `SELECT 
                custID,
                customerName,
                email,
                phoneNumber
             FROM customers 
             WHERE customerName LIKE ? OR phoneNumber LIKE ?
             LIMIT 10`,
            [`%${q}%`, `%${q}%`]
        );

        res.json({
            success: true,
            customers: customers || []
        });

    } catch (error) {
        console.error('❌ Search customer error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to search customers',
            error: error.message 
        });
    }
};

/**
 * @desc    Get customer by phone number
 * @route   GET /api/operators/customers/phone/:phone
 * @access  Private (Operator only)
 */
const getCustomerByPhone = async (req, res, next) => {
    try {
        const { phone } = req.params;

        const [customer] = await pool.query(
            `SELECT 
                custID,
                customerName,
                email,
                phoneNumber
             FROM customers 
             WHERE phoneNumber = ?`,
            [phone]
        );

        if (customer.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Customer not found' 
            });
        }

        res.json({
            success: true,
            customer: customer[0]
        });

    } catch (error) {
        console.error('❌ Get customer by phone error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch customer',
            error: error.message 
        });
    }
};

/**
 * @desc    Update booking status (with cash payment handling)
 * @route   PUT /api/operators/bookings/:id/status
 * @access  Private (Operator only)
 */
const updateBookingStatus = async (req, res, next) => {
    try {
        const bookingId = req.params.id;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ 
                success: false,
                message: 'Status is required' 
            });
        }

        const [booking] = await pool.query(
            'SELECT * FROM bookings WHERE bookingID = ?',
            [bookingId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        // If marking as completed (for cash payments)
        if (status === 'completed') {
            // Update booking status to confirmed
            await pool.query(
                `UPDATE bookings SET status = 'confirmed' WHERE bookingID = ?`,
                [bookingId]
            );
            
            // Update payment status to completed
            await pool.query(
                `UPDATE payments SET status = 'completed', paymentDate = NOW() WHERE bookingID = ?`,
                [bookingId]
            );
            
            console.log(`✅ Booking ${bookingId} marked as completed and payment confirmed`);
            
            // Send confirmation email
            const [customer] = await pool.query(
                `SELECT email, customerName FROM customers WHERE custID = ?`,
                [booking[0].custID]
            );
            
            if (customer.length > 0 && customer[0].email) {
                console.log(`📧 Payment confirmation email would be sent to ${customer[0].email}`);
            }
            
            res.json({
                success: true,
                message: 'Payment confirmed and booking completed'
            });
        } else {
            // Regular status update
            await pool.query(
                `UPDATE bookings SET status = ? WHERE bookingID = ?`,
                [status, bookingId]
            );
            
            res.json({
                success: true,
                message: `Booking status updated to ${status}`
            });
        }

    } catch (error) {
        console.error('❌ Update booking status error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update booking status',
            error: error.message 
        });
    }
};

/**
 * @desc    Cancel booking (with cancellation email)
 * @route   POST /api/operators/bookings/:id/cancel
 * @access  Private (Operator only)
 */
const cancelBooking = async (req, res, next) => {
    try {
        const bookingId = req.params.id;

        // Get booking details for email before cancelling
        const [bookingDetails] = await pool.query(
            `SELECT b.*, c.email, c.customerName, r.origin, r.destination, v.vehicleNumber,
                    COALESCE(p.amount, 0) as amount
             FROM bookings b
             LEFT JOIN customers c ON b.custID = c.custID
             LEFT JOIN routes r ON b.routeID = r.routeID
             LEFT JOIN vehicles v ON b.vehicleID = v.vehicleID
             LEFT JOIN payments p ON b.bookingID = p.bookingID
             WHERE b.bookingID = ?`,
            [bookingId]
        );

        const [booking] = await pool.query(
            'SELECT * FROM bookings WHERE bookingID = ?',
            [bookingId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        await pool.query(
            `UPDATE bookings SET status = 'cancelled' WHERE bookingID = ?`,
            [bookingId]
        );
        
        // Also update payment status if exists
        await pool.query(
            `UPDATE payments SET status = 'cancelled' WHERE bookingID = ?`,
            [bookingId]
        );

        console.log(`✅ Booking ${bookingId} cancelled successfully by operator`);

        // Send cancellation email
        try {
            const emailService = require('../services/emailService');
            
            if (bookingDetails.length > 0) {
                const booking = bookingDetails[0];
                
                if (booking.email) {
                    // Format seats for email
                    let seatsFormatted = booking.seatNumber;
                    if (booking.seatNumber && typeof booking.seatNumber === 'number') {
                        seatsFormatted = booking.seatNumber.toString();
                    }
                    
                    const emailDetails = {
                        customerName: booking.customerName,
                        customerEmail: booking.email,
                        bookingReference: `ER${bookingId}`,
                        origin: booking.origin || 'Nairobi',
                        destination: booking.destination || 'Mombasa',
                        travelDate: booking.travelDate,
                        seats: seatsFormatted,
                        vehicleNumber: booking.vehicleNumber || 'N/A',
                        amount: booking.amount || 0
                    };
                    
                    const emailResult = await emailService.sendCancellationEmail(emailDetails);
                    
                    if (emailResult.success) {
                        console.log(`✅ Cancellation email sent to ${booking.email}`);
                    } else {
                        console.log(`⚠️ Failed to send cancellation email: ${emailResult.error}`);
                    }
                } else {
                    console.log(`⚠️ No email found for customer, skipping cancellation email`);
                }
            }
        } catch (emailError) {
            console.error('❌ Failed to send cancellation email:', emailError.message);
            // Don't fail the cancellation for email errors
        }

        res.json({
            success: true,
            message: 'Booking cancelled successfully'
        });

    } catch (error) {
        console.error('❌ Cancel booking error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to cancel booking',
            error: error.message 
        });
    }
};

/**
 * @desc    Generate daily report
 * @route   GET /api/operators/reports/daily
 * @access  Private (Operator only)
 */
const generateDailyReport = async (req, res, next) => {
    try {
        const { date } = req.query;
        const reportDate = date || new Date().toISOString().split('T')[0];

        const [summary] = await pool.query(
            `SELECT 
                COUNT(*) as totalBookings,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmedBookings,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledBookings,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingBookings
             FROM bookings 
             WHERE DATE(bookingDate) = ?`,
            [reportDate]
        );

        const [revenue] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as totalRevenue
             FROM payments 
             WHERE DATE(paymentDate) = ? AND status = 'completed'`,
            [reportDate]
        );

        res.json({
            success: true,
            date: reportDate,
            summary: {
                totalBookings: summary[0]?.totalBookings || 0,
                confirmedBookings: summary[0]?.confirmedBookings || 0,
                cancelledBookings: summary[0]?.cancelledBookings || 0,
                pendingBookings: summary[0]?.pendingBookings || 0,
                totalRevenue: revenue[0]?.totalRevenue || 0
            }
        });

    } catch (error) {
        console.error('❌ Generate daily report error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate report',
            error: error.message 
        });
    }
};

/**
 * @desc    Print ticket
 * @route   GET /api/operators/bookings/:id/ticket
 * @access  Private (Operator only)
 */
const printTicket = async (req, res, next) => {
    try {
        const bookingId = req.params.id;

        const [booking] = await pool.query(
            `SELECT 
                b.*,
                CONCAT('ER', b.bookingID) as bookingReference,
                COALESCE(p.amount, 0) as paidAmount
             FROM bookings b
             LEFT JOIN payments p ON b.bookingID = p.bookingID
             WHERE b.bookingID = ?`,
            [bookingId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        res.json({
            success: true,
            ticket: booking[0]
        });

    } catch (error) {
        console.error('❌ Print ticket error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to print ticket',
            error: error.message 
        });
    }
};

/**
 * @desc    Send SMS reminder
 * @route   POST /api/operators/bookings/:id/reminder
 * @access  Private (Operator only)
 */
const sendSMSReminder = async (req, res, next) => {
    try {
        const bookingId = req.params.id;

        const [booking] = await pool.query(
            `SELECT phoneNumber, customerName, route, travelDate, seatNumber
             FROM bookings 
             WHERE bookingID = ?`,
            [bookingId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        const details = booking[0];
        const message = `EasyRide: Your booking from ${details.route} on ${details.travelDate} (Seat ${details.seatNumber}) is confirmed. Thank you!`;

        console.log(`📱 SMS would be sent to ${details.phoneNumber}: ${message}`);

        res.json({
            success: true,
            message: 'Reminder sent successfully'
        });

    } catch (error) {
        console.error('❌ Send SMS reminder error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send reminder',
            error: error.message 
        });
    }
};

/**
 * @desc    Get today's schedule
 * @route   GET /api/operators/schedule/today
 * @access  Private (Operator only)
 */
const getTodaySchedule = async (req, res, next) => {
    try {
        res.json({
            success: true,
            schedules: []
        });

    } catch (error) {
        console.error('❌ Get today schedule error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch schedule',
            error: error.message 
        });
    }
};

/**
 * @desc    Create booking for customer (Operator)
 * @route   POST /api/operators/bookings
 * @access  Private (Operator only)
 */
const createBooking = async (req, res, next) => {
    const connection = await pool.getConnection();
    
    try {
        const operatorId = req.user.id;
        const {
            customerId,
            routeId,
            vehicleId,
            seatNumbers,
            travelDate,
            customerDetails,
            paymentMethod = 'mpesa'
        } = req.body;

        console.log(`📝 Operator ${operatorId} creating booking for customer with payment method: ${paymentMethod}`);

        // Validate required fields
        if (!routeId || !vehicleId || !seatNumbers || !travelDate) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing required booking information: routeId, vehicleId, seatNumbers, travelDate' 
            });
        }

        await connection.beginTransaction();

        // Get or create customer
        let customerId_final = customerId;
        let customerName = '';
        let customerPhone = '';
        let customerEmail = '';

        if (customerId_final) {
            // Use existing customer
            const [customer] = await connection.query(
                `SELECT custID, customerName, phoneNumber, email FROM customers WHERE custID = ?`,
                [customerId_final]
            );
            
            if (customer.length === 0) {
                await connection.rollback();
                return res.status(404).json({ 
                    success: false,
                    message: 'Customer not found' 
                });
            }
            
            customerName = customer[0].customerName;
            customerPhone = customer[0].phoneNumber;
            customerEmail = customer[0].email;
        } else if (customerDetails) {
            // Create new customer
            const { name, phone, email } = customerDetails;
            
            if (!name || !phone) {
                await connection.rollback();
                return res.status(400).json({ 
                    success: false,
                    message: 'Customer name and phone are required' 
                });
            }
            
            // Check if customer already exists by phone OR email
            let existingCustomer = null;
            
            // Check by phone
            const [existingByPhone] = await connection.query(
                `SELECT custID, customerName, phoneNumber, email FROM customers WHERE phoneNumber = ?`,
                [phone]
            );
            
            if (existingByPhone.length > 0) {
                existingCustomer = existingByPhone[0];
            }
            
            // If not found by phone and email is provided, check by email
            if (!existingCustomer && email) {
                const [existingByEmail] = await connection.query(
                    `SELECT custID, customerName, phoneNumber, email FROM customers WHERE email = ?`,
                    [email]
                );
                
                if (existingByEmail.length > 0) {
                    existingCustomer = existingByEmail[0];
                }
            }
            
            if (existingCustomer) {
                // Use existing customer
                customerId_final = existingCustomer.custID;
                customerName = existingCustomer.customerName;
                customerPhone = existingCustomer.phoneNumber;
                customerEmail = existingCustomer.email;
                console.log(`✅ Using existing customer: ${customerId_final} (${customerName})`);
            } else {
                // Create new customer - include all required fields
                const defaultPassword = 'default123';
                const hashedPassword = await bcrypt.hash(defaultPassword, 10);
                
                // Generate a unique email if not provided or if it would cause a duplicate
                let uniqueEmail = email;
                if (!uniqueEmail) {
                    uniqueEmail = `${phone}@temp.com`;
                }
                
                // Check if the generated email already exists
                let emailExists = true;
                let emailCounter = 1;
                let finalEmail = uniqueEmail;
                
                while (emailExists) {
                    const [emailCheck] = await connection.query(
                        `SELECT email FROM customers WHERE email = ?`,
                        [finalEmail]
                    );
                    
                    if (emailCheck.length === 0) {
                        emailExists = false;
                    } else {
                        // Generate a unique email with a number suffix
                        const emailParts = uniqueEmail.split('@');
                        finalEmail = `${emailParts[0]}${emailCounter}@${emailParts[1]}`;
                        emailCounter++;
                        console.log(`⚠️ Email conflict, trying: ${finalEmail}`);
                    }
                }
                
                // Add default values for required fields
                const customerDob = '2000-01-01'; // Default date of birth
                const customerGender = 'Other'; // Default gender
                const customerAddress = 'N/A'; // Default address
                
                const [result] = await connection.query(
                    `INSERT INTO customers (customerName, phoneNumber, email, password, dob, gender, address, createdAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [name, phone, finalEmail, hashedPassword, customerDob, customerGender, customerAddress]
                );
                
                customerId_final = result.insertId;
                customerName = name;
                customerPhone = phone;
                customerEmail = finalEmail;
                console.log(`✅ Created new customer: ${customerId_final} (${customerName}) with email: ${finalEmail}`);
            }
        } else {
            await connection.rollback();
            return res.status(400).json({ 
                success: false,
                message: 'Please provide either customer ID or customer details' 
            });
        }

        // Get route details
        let routeData;
        try {
            const [routes] = await connection.query(
                `SELECT * FROM routes WHERE routeID = ?`,
                [routeId]
            );

            if (routes.length === 0) {
                routeData = {
                    routeID: routeId,
                    origin: 'Nairobi',
                    destination: 'Mombasa',
                    baseFare: 1500,
                    estimatedTime: '6 hours'
                };
            } else {
                routeData = routes[0];
            }
        } catch (error) {
            routeData = {
                routeID: routeId,
                origin: 'Nairobi',
                destination: 'Mombasa',
                baseFare: 1500,
                estimatedTime: '6 hours'
            };
        }

        // Get vehicle details
        let vehicleData;
        try {
            const [vehicles] = await connection.query(
                `SELECT * FROM vehicles WHERE vehicleID = ?`,
                [vehicleId]
            );

            if (vehicles.length === 0) {
                vehicleData = {
                    vehicleID: vehicleId,
                    vehicleNumber: `VEH${vehicleId}`,
                    vehicleType: 'Standard',
                    capacity: 14
                };
            } else {
                vehicleData = vehicles[0];
            }
        } catch (error) {
            vehicleData = {
                vehicleID: vehicleId,
                vehicleNumber: `VEH${vehicleId}`,
                vehicleType: 'Standard',
                capacity: 14
            };
        }

        const seatArray = Array.isArray(seatNumbers) ? seatNumbers : [seatNumbers];
        const totalAmount = routeData.baseFare * seatArray.length;

        // Check seat availability
        const [existingBookings] = await connection.query(
            `SELECT seatNumber FROM bookings 
             WHERE vehicleID = ? 
             AND DATE(travelDate) = ? 
             AND status != 'cancelled'
             AND seatNumber IN (?)`,
            [vehicleData.vehicleID, travelDate, seatArray]
        );

        const bookedSeats = existingBookings.map(b => b.seatNumber);
        const unavailableSeats = seatArray.filter(seat => bookedSeats.includes(seat.toString()));

        if (unavailableSeats.length > 0) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false,
                message: `Seats ${unavailableSeats.join(', ')} are already booked`,
                unavailableSeats
            });
        }

        // Determine booking status based on payment method
        const bookingStatus = paymentMethod === 'cash' ? 'pending' : 'pending';
        
        // Create booking
        const [bookingResult] = await connection.query(
            `INSERT INTO bookings (
                custID, 
                customerName, 
                phoneNumber,
                vehicleID, 
                vehicleNumber, 
                seatNumber, 
                routeID, 
                route,
                travelDate, 
                status, 
                bookingDate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                customerId_final,
                customerName,
                customerPhone,
                vehicleData.vehicleID,
                vehicleData.vehicleNumber,
                seatArray.join(','),
                routeId,
                `${routeData.origin} → ${routeData.destination}`,
                travelDate,
                bookingStatus
            ]
        );
        
        const bookingId = bookingResult.insertId;
        const bookingReference = `ER${bookingId}`;

        // Create payment record with appropriate status
        const paymentStatus = paymentMethod === 'cash' ? 'pending' : 'pending';
        
        await connection.query(
            `INSERT INTO payments (
                bookingID, custID, customerName, phoneNumber, amount, status, paymentMethod
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [bookingId, customerId_final, customerName, customerPhone, totalAmount, paymentStatus, paymentMethod === 'cash' ? 'Cash' : 'M-Pesa']
        );

        await connection.commit();

        console.log(`✅ Booking created: ${bookingReference} with payment method: ${paymentMethod}`);

        // Handle M-Pesa or Cash flow
        let mpesaInitiated = false;
        let mpesaError = null;
        let emailSent = false;

        if (paymentMethod === 'cash') {
            // Cash payment flow - send email with instructions
            console.log(`💰 Cash payment selected for booking ${bookingId}`);
            
            if (customerEmail) {
                try {
                    const cashEmailHTML = generateCashPaymentEmail(
                        customerName,
                        bookingReference,
                        routeData,
                        travelDate,
                        seatArray,
                        totalAmount
                    );
                    
                    const emailDetails = {
                        customerName: customerName,
                        customerEmail: customerEmail,
                        bookingReference: bookingReference,
                        origin: routeData.origin,
                        destination: routeData.destination,
                        travelDate: travelDate,
                        seats: seatArray.join(', '),
                        vehicleNumber: vehicleData.vehicleNumber || 'N/A',
                        amount: totalAmount,
                        bookingId: bookingId,
                        paymentMethod: 'cash'
                    };
                    
                    const emailResult = await emailService.sendTicketEmail(bookingId, emailDetails, cashEmailHTML);
                    
                    if (emailResult.success) {
                        console.log(`✅ Cash payment instruction email sent to ${customerEmail}`);
                        emailSent = true;
                    } else {
                        console.log(`⚠️ Failed to send cash payment email: ${emailResult.error}`);
                    }
                } catch (emailError) {
                    console.error(`❌ Email error: ${emailError.message}`);
                }
            }
        } else {
            // M-Pesa payment flow
            try {
                const mpesaResult = await mpesaService.stkPush(
                    customerPhone,
                    totalAmount,
                    bookingReference,
                    'EasyRide Booking Payment'
                );
                
                console.log(`📱 M-Pesa STK Push initiated for booking ${bookingId}`);
                mpesaInitiated = true;
            } catch (mpesaErr) {
                console.error(`❌ M-Pesa STK Push failed: ${mpesaErr.message}`);
                mpesaError = mpesaErr.message;
            }
            
            // Send email for M-Pesa bookings
            if (customerEmail) {
                try {
                    const [booking] = await connection.query(
                        `SELECT b.*, v.vehicleNumber, v.vehicleType
                         FROM bookings b
                         LEFT JOIN vehicles v ON b.vehicleID = v.vehicleID
                         WHERE b.bookingID = ?`,
                        [bookingId]
                    );
                    
                    if (booking.length > 0) {
                        const bookingData = booking[0];
                        const ticketHTML = generateTicketHTML(bookingData, null, totalAmount);
                        
                        const emailDetails = {
                            customerName: customerName,
                            customerEmail: customerEmail,
                            bookingReference: bookingReference,
                            origin: routeData.origin,
                            destination: routeData.destination,
                            travelDate: travelDate,
                            seats: seatArray.join(', '),
                            vehicleNumber: vehicleData.vehicleNumber || 'N/A',
                            amount: totalAmount,
                            bookingId: bookingId,
                            paymentMethod: 'mpesa'
                        };
                        
                        const emailResult = await emailService.sendTicketEmail(bookingId, emailDetails, ticketHTML);
                        
                        if (emailResult.success) {
                            console.log(`✅ Ticket email sent to ${customerEmail}`);
                            emailSent = true;
                        } else {
                            console.log(`⚠️ Failed to send email: ${emailResult.error}`);
                        }
                    }
                } catch (emailError) {
                    console.error(`❌ Email error: ${emailError.message}`);
                }
            }
        }

        res.status(201).json({
            success: true,
            message: paymentMethod === 'cash' 
                ? 'Booking created successfully. Customer will pay cash at the office. Email instructions sent.'
                : 'Booking created successfully. M-Pesa prompt sent to customer.',
            booking: {
                id: bookingId,
                reference: bookingReference,
                seats: seatArray,
                amount: totalAmount,
                travelDate: travelDate,
                vehicle: {
                    id: vehicleData.vehicleID,
                    number: vehicleData.vehicleNumber,
                    type: vehicleData.vehicleType
                },
                route: {
                    origin: routeData.origin,
                    destination: routeData.destination,
                    fare: routeData.baseFare
                }
            },
            payment: {
                method: paymentMethod,
                initiated: mpesaInitiated,
                error: mpesaError,
                customerPhone: customerPhone
            },
            email: {
                sent: emailSent,
                customerEmail: customerEmail
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Create booking error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create booking',
            error: error.message 
        });
    } finally {
        connection.release();
    }
};

/**
 * Helper function to format time ago
 */
const formatTimeAgo = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
};

module.exports = {
    getDashboard,
    getBookings,
    getBookingDetails,
    searchCustomer,
    createBooking,
    updateBookingStatus,
    cancelBooking,
    getTodaySchedule,
    generateDailyReport,
    printTicket,
    sendSMSReminder,
    getCustomerByPhone
};