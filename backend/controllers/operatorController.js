const { promisePool } = require('../config/db');

/**
 * @desc    Get operator dashboard data
 * @route   GET /api/operators/dashboard
 * @access  Private (Operator only)
 */
const getDashboard = async (req, res, next) => {
    try {
        const operatorId = req.user.id;

        // Get today's bookings count
        const [todayBookings] = await promisePool.query(
            `SELECT COUNT(*) as count 
             FROM bookings 
             WHERE DATE(createdAt) = CURDATE()`,
            []
        );

        // Get total revenue (paid bookings)
        const [totalRevenue] = await promisePool.query(
            `SELECT COALESCE(SUM(totalAmount), 0) as total 
             FROM bookings 
             WHERE paymentStatus = 'paid'`,
            []
        );

        // Get pending payments
        const [pendingPayments] = await promisePool.query(
            `SELECT COALESCE(SUM(totalAmount), 0) as total 
             FROM bookings 
             WHERE paymentStatus = 'pending'`,
            []
        );

        // Get available seats across all vehicles for today
        const [availableSeats] = await promisePool.query(
            `SELECT SUM(v.capacity) - COUNT(b.bookingID) as available
             FROM vehicles v
             LEFT JOIN bookings b ON v.vehicleID = b.vehicleID 
                 AND DATE(b.travelDate) = CURDATE()
                 AND b.status != 'cancelled'
             WHERE v.isActive = 1`,
            []
        );

        // Get recent bookings (last 10)
        const [recentBookings] = await promisePool.query(
            `SELECT 
                b.bookingID,
                b.bookingReference,
                b.seatNumber,
                b.travelDate,
                b.totalAmount as amount,
                b.status,
                b.paymentStatus,
                b.createdAt,
                c.customerName,
                c.phoneNumber as customerPhone,
                r.origin,
                r.destination,
                v.vehicleNumber
             FROM bookings b
             JOIN customers c ON b.customerID = c.custID
             JOIN routes r ON b.routeID = r.routeID
             JOIN vehicles v ON b.vehicleID = v.vehicleID
             ORDER BY b.createdAt DESC
             LIMIT 10`,
            []
        );

        // Get upcoming departures (next 5)
        const [upcomingDepartures] = await promisePool.query(
            `SELECT 
                b.bookingID,
                b.bookingReference,
                c.customerName,
                c.phoneNumber,
                b.seatNumber,
                b.travelDate,
                r.origin,
                r.destination,
                v.vehicleNumber
             FROM bookings b
             JOIN customers c ON b.customerID = c.custID
             JOIN routes r ON b.routeID = r.routeID
             JOIN vehicles v ON b.vehicleID = v.vehicleID
             WHERE b.travelDate >= NOW() 
                 AND b.status = 'confirmed'
             ORDER BY b.travelDate ASC
             LIMIT 5`,
            []
        );

        // Format response
        const stats = {
            todayBookings: todayBookings[0].count,
            totalRevenue: totalRevenue[0].total,
            pendingPayments: pendingPayments[0].total,
            availableSeats: availableSeats[0].available || 0
        };

        // Format bookings for frontend
        const formattedBookings = recentBookings.map(booking => ({
            id: booking.bookingID,
            bookingReference: booking.bookingReference,
            customerName: booking.customerName,
            customerPhone: booking.customerPhone,
            route: `${booking.origin} → ${booking.destination}`,
            seats: booking.seatNumber,
            amount: booking.amount,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            time: formatTimeAgo(booking.createdAt)
        }));

        res.json({
            success: true,
            stats,
            recentBookings: formattedBookings,
            upcomingDepartures
        });

    } catch (error) {
        console.error('❌ Operator dashboard error:', error);
        next(error);
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
            paymentStatus, 
            startDate, 
            endDate, 
            search,
            page = 1, 
            limit = 20 
        } = req.query;

        let query = `
            SELECT 
                b.bookingID,
                b.bookingReference,
                b.seatNumber,
                b.travelDate,
                b.totalAmount as amount,
                b.status,
                b.paymentStatus,
                b.createdAt,
                b.specialRequests,
                c.customerName,
                c.phoneNumber as customerPhone,
                c.email as customerEmail,
                r.origin,
                r.destination,
                r.routeCode,
                v.vehicleNumber,
                v.vehicleType,
                op.operatorName as bookedBy,
                p.mpesaReceipt
            FROM bookings b
            JOIN customers c ON b.customerID = c.custID
            JOIN routes r ON b.routeID = r.routeID
            JOIN vehicles v ON b.vehicleID = v.vehicleID
            LEFT JOIN operators op ON b.bookedBy = op.opID
            LEFT JOIN payments p ON b.bookingID = p.bookingID
            WHERE 1=1
        `;

        const queryParams = [];

        // Apply filters
        if (status && status !== 'all') {
            query += ` AND b.status = ?`;
            queryParams.push(status);
        }

        if (paymentStatus && paymentStatus !== 'all') {
            query += ` AND b.paymentStatus = ?`;
            queryParams.push(paymentStatus);
        }

        if (startDate) {
            query += ` AND DATE(b.travelDate) >= ?`;
            queryParams.push(startDate);
        }

        if (endDate) {
            query += ` AND DATE(b.travelDate) <= ?`;
            queryParams.push(endDate);
        }

        if (search) {
            query += ` AND (
                c.customerName LIKE ? OR 
                c.phoneNumber LIKE ? OR 
                b.bookingReference LIKE ? OR
                CONCAT(r.origin, ' ', r.destination) LIKE ?
            )`;
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Get total count for pagination
        const [countResult] = await promisePool.query(
            `SELECT COUNT(*) as total FROM (${query}) as countQuery`,
            queryParams
        );
        const total = countResult[0].total;

        // Add pagination
        const offset = (page - 1) * limit;
        query += ` ORDER BY b.createdAt DESC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), offset);

        // Execute main query
        const [bookings] = await promisePool.query(query, queryParams);

        res.json({
            success: true,
            bookings,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Get operator bookings error:', error);
        next(error);
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

        const [booking] = await promisePool.query(
            `SELECT 
                b.*,
                c.customerName,
                c.phoneNumber as customerPhone,
                c.email as customerEmail,
                c.idNumber as customerIdNumber,
                r.origin,
                r.destination,
                r.routeCode,
                r.distance,
                r.estimatedTime,
                r.basePrice,
                v.vehicleNumber,
                v.vehicleType,
                v.capacity,
                v.features,
                op.operatorName as bookedByName,
                op.phoneNum as bookedByPhone,
                p.paymentID,
                p.mpesaReceipt,
                p.transactionDate,
                p.amount as paidAmount
             FROM bookings b
             JOIN customers c ON b.customerID = c.custID
             JOIN routes r ON b.routeID = r.routeID
             JOIN vehicles v ON b.vehicleID = v.vehicleID
             LEFT JOIN operators op ON b.bookedBy = op.opID
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
        next(error);
    }
};

/**
 * @desc    Search customers by name or phone
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

        const [customers] = await promisePool.query(
            `SELECT 
                custID,
                customerName,
                email,
                phoneNumber,
                idNumber
             FROM customers 
             WHERE customerName LIKE ? OR phoneNumber LIKE ?
             LIMIT 10`,
            [`%${q}%`, `%${q}%`]
        );

        res.json({
            success: true,
            customers
        });

    } catch (error) {
        console.error('❌ Search customer error:', error);
        next(error);
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

        const [customer] = await promisePool.query(
            `SELECT 
                custID,
                customerName,
                email,
                phoneNumber,
                idNumber
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
        next(error);
    }
};

/**
 * @desc    Create booking for customer (operator does this)
 * @route   POST /api/operators/bookings
 * @access  Private (Operator only)
 */
const createBooking = async (req, res, next) => {
    try {
        const operatorId = req.user.id;
        const {
            customerId,
            scheduleId,
            routeId,
            vehicleId,
            seatNumbers,
            travelDate,
            amount,
            paymentMethod,
            notes
        } = req.body;

        // Validate required fields
        if (!customerId || !routeId || !vehicleId || !seatNumbers || !travelDate || !amount) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing required fields' 
            });
        }

        // Generate unique booking reference
        const bookingReference = 'ER' + Date.now().toString().slice(-8) + Math.random().toString(36).substring(2, 5).toUpperCase();

        // Start transaction
        const connection = await promisePool.getConnection();
        await connection.beginTransaction();

        try {
            // Check seat availability
            const [existingBookings] = await connection.query(
                `SELECT seatNumber FROM bookings 
                 WHERE vehicleID = ? AND travelDate = ? AND status != 'cancelled'`,
                [vehicleId, travelDate]
            );

            const bookedSeats = existingBookings.map(b => b.seatNumber);
            const seatArray = Array.isArray(seatNumbers) ? seatNumbers : [seatNumbers];
            
            // Check if any selected seats are already booked
            const unavailableSeats = seatArray.filter(seat => bookedSeats.includes(seat));
            if (unavailableSeats.length > 0) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ 
                    success: false,
                    message: `Seats ${unavailableSeats.join(', ')} are already booked`,
                    unavailableSeats
                });
            }

            // Create booking
            const [bookingResult] = await connection.query(
                `INSERT INTO bookings (
                    bookingReference, customerID, vehicleID, routeID, 
                    seatNumber, travelDate, totalAmount, status, 
                    paymentStatus, bookingSource, bookedBy, specialRequests
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', 'operator', ?, ?)`,
                [
                    bookingReference,
                    customerId,
                    vehicleId,
                    routeId,
                    seatArray.join(','),
                    travelDate,
                    amount,
                    operatorId,
                    notes || null
                ]
            );

            const bookingId = bookingResult.insertId;

            // If payment method is cash, mark as paid
            if (paymentMethod === 'cash') {
                await connection.query(
                    `UPDATE bookings SET paymentStatus = 'paid' WHERE bookingID = ?`,
                    [bookingId]
                );
            }

            await connection.commit();
            connection.release();

            // Log the booking
            console.log(`✅ Operator ${operatorId} created booking ${bookingReference} for customer ${customerId}`);

            res.status(201).json({
                success: true,
                message: 'Booking created successfully',
                booking: {
                    id: bookingId,
                    reference: bookingReference,
                    seats: seatArray
                }
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('❌ Create booking error:', error);
        next(error);
    }
};

/**
 * @desc    Update booking status
 * @route   PUT /api/operators/bookings/:id/status
 * @access  Private (Operator only)
 */
const updateBookingStatus = async (req, res, next) => {
    try {
        const bookingId = req.params.id;
        const { status } = req.body;
        const operatorId = req.user.id;

        if (!status) {
            return res.status(400).json({ 
                success: false,
                message: 'Status is required' 
            });
        }

        // Check if booking exists
        const [booking] = await promisePool.query(
            'SELECT * FROM bookings WHERE bookingID = ?',
            [bookingId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        // Update status
        await promisePool.query(
            `UPDATE bookings SET status = ? WHERE bookingID = ?`,
            [status, bookingId]
        );

        // If status is 'confirmed', update payment status if needed
        if (status === 'confirmed' && booking[0].paymentStatus === 'pending') {
            await promisePool.query(
                `UPDATE bookings SET paymentStatus = 'paid' WHERE bookingID = ?`,
                [bookingId]
            );
        }

        // Log the action
        console.log(`✅ Operator ${operatorId} updated booking ${bookingId} status to ${status}`);

        res.json({
            success: true,
            message: `Booking status updated to ${status}`
        });

    } catch (error) {
        console.error('❌ Update booking status error:', error);
        next(error);
    }
};

/**
 * @desc    Cancel booking
 * @route   POST /api/operators/bookings/:id/cancel
 * @access  Private (Operator only)
 */
const cancelBooking = async (req, res, next) => {
    try {
        const bookingId = req.params.id;
        const { reason } = req.body;
        const operatorId = req.user.id;

        // Check if booking exists
        const [booking] = await promisePool.query(
            'SELECT * FROM bookings WHERE bookingID = ?',
            [bookingId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        const bookingDetails = booking[0];

        // Check if booking can be cancelled
        if (bookingDetails.status === 'cancelled') {
            return res.status(400).json({ 
                success: false,
                message: 'Booking is already cancelled' 
            });
        }

        if (bookingDetails.status === 'completed') {
            return res.status(400).json({ 
                success: false,
                message: 'Completed bookings cannot be cancelled' 
            });
        }

        // Update booking status
        await promisePool.query(
            `UPDATE bookings 
             SET status = 'cancelled', 
                 cancellationReason = ?,
                 cancelledAt = NOW(),
                 cancelledBy = ?
             WHERE bookingID = ?`,
            [reason || 'Cancelled by operator', operatorId, bookingId]
        );

        // If payment was made, update payment status
        if (bookingDetails.paymentStatus === 'paid') {
            await promisePool.query(
                `UPDATE bookings SET paymentStatus = 'refunded' WHERE bookingID = ?`,
                [bookingId]
            );
            // In a real app, initiate M-Pesa refund here
            console.log(`💰 Refund needed for booking ${bookingDetails.bookingReference}`);
        }

        console.log(`✅ Operator ${operatorId} cancelled booking ${bookingId}`);

        res.json({
            success: true,
            message: 'Booking cancelled successfully'
        });

    } catch (error) {
        console.error('❌ Cancel booking error:', error);
        next(error);
    }
};

/**
 * @desc    Get today's schedule
 * @route   GET /api/operators/schedule/today
 * @access  Private (Operator only)
 */
const getTodaySchedule = async (req, res, next) => {
    try {
        const [schedules] = await promisePool.query(
            `SELECT 
                s.scheduleID,
                s.departureTime,
                s.arrivalTime,
                r.origin,
                r.destination,
                r.routeCode,
                v.vehicleID,
                v.vehicleNumber,
                v.vehicleType,
                v.capacity,
                (v.capacity - COUNT(b.bookingID)) as availableSeats,
                op.operatorName as driverName
             FROM schedules s
             JOIN routes r ON s.routeID = r.routeID
             JOIN vehicles v ON s.vehicleID = v.vehicleID
             LEFT JOIN operators op ON v.operatorID = op.opID
             LEFT JOIN bookings b ON v.vehicleID = b.vehicleID 
                 AND DATE(b.travelDate) = CURDATE()
                 AND b.status != 'cancelled'
             WHERE s.isActive = 1
             GROUP BY s.scheduleID
             ORDER BY s.departureTime ASC`,
            []
        );

        res.json({
            success: true,
            schedules
        });

    } catch (error) {
        console.error('❌ Get today schedule error:', error);
        next(error);
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

        // Get summary stats
        const [summary] = await promisePool.query(
            `SELECT 
                COUNT(*) as totalBookings,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmedBookings,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledBookings,
                SUM(CASE WHEN paymentStatus = 'paid' THEN totalAmount ELSE 0 END) as totalRevenue,
                SUM(CASE WHEN paymentStatus = 'pending' THEN totalAmount ELSE 0 END) as pendingRevenue,
                COUNT(DISTINCT customerID) as uniqueCustomers
             FROM bookings 
             WHERE DATE(createdAt) = ?`,
            [reportDate]
        );

        // Get bookings by route
        const [bookingsByRoute] = await promisePool.query(
            `SELECT 
                r.routeCode,
                r.origin,
                r.destination,
                COUNT(*) as bookings,
                SUM(b.totalAmount) as revenue
             FROM bookings b
             JOIN routes r ON b.routeID = r.routeID
             WHERE DATE(b.createdAt) = ?
             GROUP BY r.routeID`,
            [reportDate]
        );

        // Get payment methods breakdown
        const [paymentsByMethod] = await promisePool.query(
            `SELECT 
                paymentMethod,
                COUNT(*) as count,
                SUM(amount) as total
             FROM payments p
             JOIN bookings b ON p.bookingID = b.bookingID
             WHERE DATE(p.createdAt) = ?
             GROUP BY paymentMethod`,
            [reportDate]
        );

        // Get hourly breakdown
        const [hourlyBreakdown] = await promisePool.query(
            `SELECT 
                HOUR(createdAt) as hour,
                COUNT(*) as bookings,
                SUM(totalAmount) as revenue
             FROM bookings 
             WHERE DATE(createdAt) = ?
             GROUP BY HOUR(createdAt)
             ORDER BY hour`,
            [reportDate]
        );

        res.json({
            success: true,
            date: reportDate,
            summary: summary[0],
            breakdown: {
                byRoute: bookingsByRoute,
                byPaymentMethod: paymentsByMethod,
                hourly: hourlyBreakdown
            }
        });

    } catch (error) {
        console.error('❌ Generate daily report error:', error);
        next(error);
    }
};

/**
 * @desc    Print ticket (generate PDF)
 * @route   GET /api/operators/bookings/:id/ticket
 * @access  Private (Operator only)
 */
const printTicket = async (req, res, next) => {
    try {
        const bookingId = req.params.id;

        // Get booking details for ticket
        const [booking] = await promisePool.query(
            `SELECT 
                b.bookingReference,
                b.seatNumber,
                b.travelDate,
                b.totalAmount,
                c.customerName,
                c.phoneNumber,
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
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        // In a real app, generate PDF here
        // For now, return ticket data
        res.json({
            success: true,
            message: 'Ticket PDF would be generated here',
            ticket: booking[0]
        });

    } catch (error) {
        console.error('❌ Print ticket error:', error);
        next(error);
    }
};

/**
 * @desc    Send SMS reminder to customer
 * @route   POST /api/operators/bookings/:id/reminder
 * @access  Private (Operator only)
 */
const sendSMSReminder = async (req, res, next) => {
    try {
        const bookingId = req.params.id;

        // Get customer phone number
        const [booking] = await promisePool.query(
            `SELECT 
                c.phoneNumber,
                c.customerName,
                b.travelDate,
                b.seatNumber,
                r.origin,
                r.destination
             FROM bookings b
             JOIN customers c ON b.customerID = c.custID
             JOIN routes r ON b.routeID = r.routeID
             WHERE b.bookingID = ?`,
            [bookingId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        const details = booking[0];

        // In a real app, send SMS via Africa's Talking or similar service
        const message = `EasyRide: Your booking from ${details.origin} to ${details.destination} on ${details.travelDate} (Seat ${details.seatNumber}) is confirmed. Thank you for choosing EasyRide!`;

        console.log(`📱 SMS would be sent to ${details.phoneNumber}: ${message}`);

        // Log the SMS
        await promisePool.query(
            `INSERT INTO sms_logs (bookingID, phoneNumber, message, status) 
             VALUES (?, ?, ?, 'sent')`,
            [bookingId, details.phoneNumber, message]
        );

        res.json({
            success: true,
            message: 'Reminder sent successfully'
        });

    } catch (error) {
        console.error('❌ Send SMS reminder error:', error);
        next(error);
    }
};

/**
 * Helper function to format time ago
 */
const formatTimeAgo = (dateString) => {
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