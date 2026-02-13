const { promisePool } = require('../config/db');

/**
 * @desc    Get customer dashboard data
 * @route   GET /api/customers/dashboard
 * @access  Private (Customer only)
 */
const getDashboard = async (req, res, next) => {
    try {
        const customerId = req.user.id;

        // Get total bookings count
        const [totalBookings] = await promisePool.query(
            `SELECT COUNT(*) as count 
             FROM bookings 
             WHERE customerID = ?`,
            [customerId]
        );

        // Get upcoming trips (future travel dates)
        const [upcomingTrips] = await promisePool.query(
            `SELECT COUNT(*) as count 
             FROM bookings 
             WHERE customerID = ? 
             AND travelDate >= CURDATE() 
             AND status IN ('confirmed', 'pending')`,
            [customerId]
        );

        // Get completed trips (past travel dates)
        const [completedTrips] = await promisePool.query(
            `SELECT COUNT(*) as count 
             FROM bookings 
             WHERE customerID = ? 
             AND travelDate < CURDATE() 
             AND status = 'completed'`,
            [customerId]
        );

        // Get total spent (from paid bookings)
        const [totalSpent] = await promisePool.query(
            `SELECT COALESCE(SUM(b.totalAmount), 0) as total 
             FROM bookings b
             WHERE b.customerID = ? 
             AND b.paymentStatus = 'paid'`,
            [customerId]
        );

        // Get recent bookings (last 5)
        const [recentBookings] = await promisePool.query(
            `SELECT 
                b.bookingID,
                b.bookingReference,
                b.seatNumber,
                b.travelDate,
                b.totalAmount as amount,
                b.status,
                b.paymentStatus,
                r.origin,
                r.destination,
                v.vehicleNumber
             FROM bookings b
             JOIN routes r ON b.routeID = r.routeID
             JOIN vehicles v ON b.vehicleID = v.vehicleID
             WHERE b.customerID = ?
             ORDER BY b.createdAt DESC
             LIMIT 5`,
            [customerId]
        );

        // Format the response
        const stats = {
            totalBookings: totalBookings[0].count,
            upcomingTrips: upcomingTrips[0].count,
            completedTrips: completedTrips[0].count,
            totalSpent: totalSpent[0].total || 0
        };

        // Format bookings for frontend
        const formattedBookings = recentBookings.map(booking => ({
            id: booking.bookingID,
            bookingReference: booking.bookingReference,
            route: `${booking.origin} → ${booking.destination}`,
            origin: booking.origin,
            destination: booking.destination,
            date: booking.travelDate,
            seat: booking.seatNumber,
            amount: booking.amount,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            vehicleNumber: booking.vehicleNumber
        }));

        res.json({
            success: true,
            stats,
            recentBookings: formattedBookings
        });

    } catch (error) {
        console.error('❌ Dashboard error:', error);
        next(error);
    }
};

/**
 * @desc    Get all customer bookings with filters
 * @route   GET /api/customers/bookings
 * @access  Private (Customer only)
 */
const getBookings = async (req, res, next) => {
    try {
        const customerId = req.user.id;
        const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

        // Build query with filters
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
                r.origin,
                r.destination,
                r.routeCode,
                v.vehicleNumber,
                v.vehicleType,
                p.mpesaReceipt,
                p.transactionDate
            FROM bookings b
            JOIN routes r ON b.routeID = r.routeID
            JOIN vehicles v ON b.vehicleID = v.vehicleID
            LEFT JOIN payments p ON b.bookingID = p.bookingID
            WHERE b.customerID = ?
        `;

        const queryParams = [customerId];

        // Add status filter
        if (status && status !== 'all') {
            query += ` AND b.status = ?`;
            queryParams.push(status);
        }

        // Add date range filters
        if (startDate) {
            query += ` AND DATE(b.travelDate) >= ?`;
            queryParams.push(startDate);
        }
        if (endDate) {
            query += ` AND DATE(b.travelDate) <= ?`;
            queryParams.push(endDate);
        }

        // Add pagination
        const offset = (page - 1) * limit;
        query += ` ORDER BY b.travelDate DESC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), offset);

        // Get total count for pagination
        const [countResult] = await promisePool.query(
            `SELECT COUNT(*) as total FROM bookings WHERE customerID = ?`,
            [customerId]
        );
        const total = countResult[0].total;

        // Execute main query
        const [bookings] = await promisePool.query(query, queryParams);

        // Format bookings for frontend
        const formattedBookings = bookings.map(booking => ({
            id: booking.bookingID,
            bookingReference: booking.bookingReference,
            route: `${booking.origin} → ${booking.destination}`,
            routeCode: booking.routeCode,
            origin: booking.origin,
            destination: booking.destination,
            travelDate: booking.travelDate,
            seatNumber: booking.seatNumber,
            amount: booking.amount,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            vehicleNumber: booking.vehicleNumber,
            vehicleType: booking.vehicleType,
            bookingDate: booking.createdAt,
            mpesaReceipt: booking.mpesaReceipt,
            paymentDate: booking.transactionDate
        }));

        res.json({
            success: true,
            bookings: formattedBookings,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Get bookings error:', error);
        next(error);
    }
};

/**
 * @desc    Get single booking details
 * @route   GET /api/customers/bookings/:id
 * @access  Private (Customer only)
 */
const getBookingDetails = async (req, res, next) => {
    try {
        const customerId = req.user.id;
        const bookingId = req.params.id;

        const [booking] = await promisePool.query(
            `SELECT 
                b.*,
                r.origin,
                r.destination,
                r.routeCode,
                r.distance,
                r.estimatedTime,
                v.vehicleNumber,
                v.vehicleType,
                v.capacity,
                op.operatorName,
                op.phoneNum as operatorPhone,
                p.mpesaReceipt,
                p.transactionDate,
                p.amount as paidAmount
             FROM bookings b
             JOIN routes r ON b.routeID = r.routeID
             JOIN vehicles v ON b.vehicleID = v.vehicleID
             LEFT JOIN operators op ON v.operatorID = op.opID
             LEFT JOIN payments p ON b.bookingID = p.bookingID
             WHERE b.bookingID = ? AND b.customerID = ?`,
            [bookingId, customerId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        const details = booking[0];

        // Format response
        const formattedBooking = {
            id: details.bookingID,
            bookingReference: details.bookingReference,
            route: {
                origin: details.origin,
                destination: details.destination,
                code: details.routeCode,
                distance: details.distance,
                estimatedTime: details.estimatedTime
            },
            vehicle: {
                number: details.vehicleNumber,
                type: details.vehicleType,
                capacity: details.capacity,
                operator: details.operatorName,
                operatorContact: details.operatorPhone
            },
            seatNumber: details.seatNumber,
            travelDate: details.travelDate,
            bookingDate: details.createdAt,
            amount: details.totalAmount,
            status: details.status,
            paymentStatus: details.paymentStatus,
            payment: details.mpesaReceipt ? {
                receipt: details.mpesaReceipt,
                date: details.transactionDate,
                amount: details.paidAmount
            } : null,
            specialRequests: details.specialRequests
        };

        res.json({
            success: true,
            booking: formattedBooking
        });

    } catch (error) {
        console.error('❌ Get booking details error:', error);
        next(error);
    }
};

/**
 * @desc    Cancel a booking
 * @route   PUT /api/customers/bookings/:id/cancel
 * @access  Private (Customer only)
 */
const cancelBooking = async (req, res, next) => {
    try {
        const customerId = req.user.id;
        const bookingId = req.params.id;
        const { reason } = req.body;

        // Check if booking exists and belongs to customer
        const [booking] = await promisePool.query(
            `SELECT * FROM bookings 
             WHERE bookingID = ? AND customerID = ?`,
            [bookingId, customerId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        const bookingDetails = booking[0];

        // Check if booking can be cancelled
        const travelDate = new Date(bookingDetails.travelDate);
        const now = new Date();
        const hoursUntilTravel = (travelDate - now) / (1000 * 60 * 60);

        if (hoursUntilTravel < 2) {
            return res.status(400).json({ 
                success: false,
                message: 'Bookings can only be cancelled at least 2 hours before departure' 
            });
        }

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
                 cancelledAt = NOW()
             WHERE bookingID = ?`,
            [reason || 'Cancelled by customer', bookingId]
        );

        // If payment was made, initiate refund process
        if (bookingDetails.paymentStatus === 'paid') {
            // In a real app, you would initiate M-Pesa refund here
            console.log(`💰 Refund initiated for booking ${bookingDetails.bookingReference}`);
        }

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
 * @desc    Get customer profile
 * @route   GET /api/customers/profile
 * @access  Private (Customer only)
 */
const getProfile = async (req, res, next) => {
    try {
        const customerId = req.user.id;

        const [customer] = await promisePool.query(
            `SELECT 
                custID,
                customerName,
                email,
                phoneNumber,
                dob,
                gender,
                address,
                idNumber,
                isVerified,
                createdAt,
                lastLogin
             FROM customers 
             WHERE custID = ?`,
            [customerId]
        );

        if (customer.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Customer not found' 
            });
        }

        const profile = customer[0];

        // Get additional stats
        const [stats] = await promisePool.query(
            `SELECT 
                COUNT(*) as totalBookings,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedTrips,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelledBookings
             FROM bookings 
             WHERE customerID = ?`,
            [customerId]
        );

        res.json({
            success: true,
            profile: {
                id: profile.custID,
                name: profile.customerName,
                email: profile.email,
                phoneNumber: profile.phoneNumber,
                dob: profile.dob,
                gender: profile.gender,
                address: profile.address,
                idNumber: profile.idNumber,
                isVerified: profile.isVerified === 1,
                memberSince: profile.createdAt,
                lastLogin: profile.lastLogin,
                stats: stats[0]
            }
        });

    } catch (error) {
        console.error('❌ Get profile error:', error);
        next(error);
    }
};

/**
 * @desc    Update customer profile
 * @route   PUT /api/customers/profile
 * @access  Private (Customer only)
 */
const updateProfile = async (req, res, next) => {
    try {
        const customerId = req.user.id;
        const { customerName, phoneNumber, address, idNumber } = req.body;

        // Build update query dynamically
        const updates = [];
        const params = [];

        if (customerName) {
            updates.push('customerName = ?');
            params.push(customerName);
        }
        if (phoneNumber) {
            // Check if phone number is already taken
            const [existing] = await promisePool.query(
                'SELECT * FROM customers WHERE phoneNumber = ? AND custID != ?',
                [phoneNumber, customerId]
            );
            if (existing.length > 0) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Phone number already in use' 
                });
            }
            updates.push('phoneNumber = ?');
            params.push(phoneNumber);
        }
        if (address) {
            updates.push('address = ?');
            params.push(address);
        }
        if (idNumber) {
            updates.push('idNumber = ?');
            params.push(idNumber);
        }

        if (updates.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'No fields to update' 
            });
        }

        params.push(customerId);

        await promisePool.query(
            `UPDATE customers SET ${updates.join(', ')} WHERE custID = ?`,
            params
        );

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('❌ Update profile error:', error);
        next(error);
    }
};

/**
 * @desc    Get customer payment history
 * @route   GET /api/customers/payments
 * @access  Private (Customer only)
 */
const getPaymentHistory = async (req, res, next) => {
    try {
        const customerId = req.user.id;

        const [payments] = await promisePool.query(
            `SELECT 
                p.paymentID,
                p.amount,
                p.mpesaReceipt,
                p.status as paymentStatus,
                p.transactionDate,
                b.bookingReference,
                b.travelDate,
                r.origin,
                r.destination
             FROM payments p
             JOIN bookings b ON p.bookingID = b.bookingID
             JOIN routes r ON b.routeID = r.routeID
             WHERE b.customerID = ?
             ORDER BY p.transactionDate DESC`,
            [customerId]
        );

        res.json({
            success: true,
            payments: payments.map(p => ({
                id: p.paymentID,
                amount: p.amount,
                receipt: p.mpesaReceipt,
                status: p.paymentStatus,
                date: p.transactionDate,
                bookingReference: p.bookingReference,
                travelDate: p.travelDate,
                route: `${p.origin} → ${p.destination}`
            }))
        });

    } catch (error) {
        console.error('❌ Get payment history error:', error);
        next(error);
    }
};

/**
 * @desc    Download ticket PDF
 * @route   GET /api/customers/bookings/:id/ticket
 * @access  Private (Customer only)
 */
const downloadTicket = async (req, res, next) => {
    try {
        const customerId = req.user.id;
        const bookingId = req.params.id;

        // Verify booking belongs to customer
        const [booking] = await promisePool.query(
            `SELECT b.*, r.origin, r.destination, v.vehicleNumber 
             FROM bookings b
             JOIN routes r ON b.routeID = r.routeID
             JOIN vehicles v ON b.vehicleID = v.vehicleID
             WHERE b.bookingID = ? AND b.customerID = ?`,
            [bookingId, customerId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        // In a real app, generate PDF here
        // For now, return booking details
        const ticket = booking[0];

        res.json({
            success: true,
            message: 'Ticket download would be generated here',
            ticket: {
                bookingReference: ticket.bookingReference,
                customer: req.user.name,
                route: `${ticket.origin} → ${ticket.destination}`,
                date: ticket.travelDate,
                seat: ticket.seatNumber,
                vehicle: ticket.vehicleNumber,
                amount: ticket.totalAmount
            }
        });

    } catch (error) {
        console.error('❌ Download ticket error:', error);
        next(error);
    }
};

module.exports = {
    getDashboard,
    getBookings,
    getBookingDetails,
    getProfile,
    updateProfile,
    cancelBooking,
    getPaymentHistory,
    downloadTicket
};