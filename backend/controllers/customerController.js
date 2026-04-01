const pool = require('../config/db');

/**
 * @desc    Search customer by phone number
 * @route   GET /api/customers/search
 * @access  Private (Customer or Operator)
 */
const searchCustomer = async (req, res, next) => {
    try {
        const { phone } = req.query;
        
        console.log('🔍 Searching for customer with phone:', phone);
        
        if (!phone) {
            return res.status(400).json({ 
                success: false,
                message: 'Phone number is required' 
            });
        }
        
        // Format phone number (remove any non-digit characters)
        const formattedPhone = phone.replace(/\D/g, '');
        
        // Search for customer by phone number
        const [customers] = await pool.query(
            `SELECT 
                custID,
                customerName,
                email,
                phoneNumber,
                dob,
                gender,
                address,
                createdAt
             FROM customers 
             WHERE phoneNumber = ? OR phoneNumber LIKE ?`,
            [formattedPhone, `%${formattedPhone.slice(-9)}%`]
        );
        
        if (customers.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Customer not found' 
            });
        }
        
        const customer = customers[0];
        
        res.json({
            success: true,
            customer: {
                custID: customer.custID,
                customerName: customer.customerName,
                email: customer.email,
                phoneNumber: customer.phoneNumber,
                dob: customer.dob,
                gender: customer.gender,
                address: customer.address,
                memberSince: customer.createdAt
            }
        });
        
    } catch (error) {
        console.error('❌ Search customer error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to search customer',
            error: error.message 
        });
    }
};

/**
 * @desc    Get customer dashboard data
 * @route   GET /api/customers/dashboard
 * @access  Private (Customer only)
 */
const getDashboard = async (req, res, next) => {
    try {
        const customerId = req.user.id;

        console.log('📊 Fetching dashboard for customer ID:', customerId);

        // Get total bookings count
        const [totalBookings] = await pool.query(
            `SELECT COUNT(*) as count 
             FROM bookings 
             WHERE custID = ?`,
            [customerId]
        );

        // Get upcoming trips (future travel dates)
        const [upcomingTrips] = await pool.query(
            `SELECT COUNT(*) as count 
             FROM bookings 
             WHERE custID = ? 
             AND travelDate >= CURDATE() 
             AND status IN ('confirmed', 'pending')`,
            [customerId]
        );

        // Get completed trips (past travel dates)
        const [completedTrips] = await pool.query(
            `SELECT COUNT(*) as count 
             FROM bookings 
             WHERE custID = ? 
             AND travelDate < CURDATE() 
             AND status = 'confirmed'`,
            [customerId]
        );

        // Get total spent - from payments table
        const [totalSpent] = await pool.query(
            `SELECT COALESCE(SUM(p.amount), 0) as total 
             FROM payments p
             JOIN bookings b ON p.bookingID = b.bookingID
             WHERE b.custID = ? 
             AND p.status = 'completed'`,
            [customerId]
        );

        // Get pending bookings count
        const [pendingBookings] = await pool.query(
            `SELECT COUNT(*) as count 
             FROM bookings 
             WHERE custID = ? 
             AND status = 'pending'`,
            [customerId]
        );

        // Get cancelled bookings count
        const [cancelledBookings] = await pool.query(
            `SELECT COUNT(*) as count 
             FROM bookings 
             WHERE custID = ? 
             AND status = 'cancelled'`,
            [customerId]
        );

        // Get recent bookings (last 5)
        const [recentBookings] = await pool.query(
            `SELECT 
                b.bookingID,
                b.route,
                b.seatNumber,
                b.travelDate,
                b.status,
                b.bookingDate,
                COALESCE(r.baseFare, 0) as amount
             FROM bookings b
             LEFT JOIN routes r ON b.routeID = r.routeID
             WHERE b.custID = ?
             ORDER BY b.bookingDate DESC
             LIMIT 5`,
            [customerId]
        );

        // Format the response
        const stats = {
            totalBookings: totalBookings[0]?.count || 0,
            upcomingTrips: upcomingTrips[0]?.count || 0,
            completedTrips: completedTrips[0]?.count || 0,
            totalSpent: totalSpent[0]?.total || 0,
            pendingBookings: pendingBookings[0]?.count || 0,
            cancelledBookings: cancelledBookings[0]?.count || 0
        };

        // Format bookings for frontend
        const formattedBookings = recentBookings.map(booking => ({
            id: booking.bookingID,
            route: booking.route,
            travelDate: booking.travelDate,
            seatNumber: booking.seatNumber,
            amount: booking.amount || 0,
            status: booking.status,
            bookingDate: booking.bookingDate
        }));

        res.json({
            success: true,
            stats,
            recentBookings: formattedBookings
        });

    } catch (error) {
        console.error('❌ Dashboard error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch dashboard data',
            error: error.message 
        });
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
        const { status, page = 1, limit = 10 } = req.query;

        console.log('📋 Fetching bookings for customer:', customerId);

        let query = `
            SELECT 
                b.bookingID as id,
                b.bookingID,
                b.route,
                b.seatNumber,
                b.travelDate,
                b.status,
                b.bookingDate,
                b.vehicleNumber,
                COALESCE(r.baseFare, 0) as amount,
                p.status as paymentStatus,
                p.mpesaCode
            FROM bookings b
            LEFT JOIN routes r ON b.routeID = r.routeID
            LEFT JOIN payments p ON b.bookingID = p.bookingID
            WHERE b.custID = ?
        `;

        const queryParams = [customerId];

        if (status && status !== 'all') {
            query += ` AND b.status = ?`;
            queryParams.push(status);
        }

        const offset = (page - 1) * limit;
        query += ` ORDER BY b.travelDate DESC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM bookings WHERE custID = ?`,
            [customerId]
        );
        const total = countResult[0]?.total || 0;

        const [bookings] = await pool.query(query, queryParams);

        console.log('✅ Found bookings:', bookings.length);

        const formattedBookings = bookings.map(booking => ({
            id: booking.id,
            bookingID: booking.bookingID,
            route: booking.route,
            travelDate: booking.travelDate,
            seatNumber: booking.seatNumber,
            amount: booking.amount || 0,
            status: booking.status,
            bookingDate: booking.bookingDate,
            vehicleNumber: booking.vehicleNumber || 'N/A',
            paymentStatus: booking.paymentStatus || 'pending',
            mpesaCode: booking.mpesaCode || null
        }));

        res.json({
            success: true,
            bookings: formattedBookings,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit) || 1,
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Get bookings error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch bookings',
            error: error.message 
        });
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

        const [booking] = await pool.query(
            `SELECT 
                b.*,
                r.baseFare as fare,
                p.amount as paidAmount,
                p.paymentMethod,
                p.mpesaCode,
                p.status as paymentStatus,
                p.paymentDate
             FROM bookings b
             LEFT JOIN routes r ON b.routeID = r.routeID
             LEFT JOIN payments p ON b.bookingID = p.bookingID
             WHERE b.bookingID = ? AND b.custID = ?`,
            [bookingId, customerId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        const details = booking[0];

        res.json({
            success: true,
            booking: {
                id: details.bookingID,
                bookingID: details.bookingID,
                customerName: details.customerName,
                phoneNumber: details.phoneNumber,
                route: details.route,
                vehicleNumber: details.vehicleNumber,
                seatNumber: details.seatNumber,
                travelDate: details.travelDate,
                bookingDate: details.bookingDate,
                fare: details.fare,
                amount: details.paidAmount || details.fare,
                status: details.status,
                paymentStatus: details.paymentStatus || 'pending',
                paymentMethod: details.paymentMethod,
                mpesaCode: details.mpesaCode
            }
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
 * @desc    Cancel a booking (30 minute cancellation policy)
 * @route   PUT /api/customers/bookings/:id/cancel
 * @access  Private (Customer only)
 */
const cancelBooking = async (req, res, next) => {
    try {
        const customerId = req.user.id;
        const bookingId = req.params.id;
        const { reason } = req.body;

        console.log(`🔍 Attempting to cancel booking ${bookingId} for customer ${customerId}`);

        // Check if booking exists and belongs to customer
        const [booking] = await pool.query(
            `SELECT * FROM bookings WHERE bookingID = ? AND custID = ?`,
            [bookingId, customerId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        const bookingDetails = booking[0];
        const travelDate = new Date(bookingDetails.travelDate);
        const now = new Date();
        
        // Calculate minutes until travel
        const minutesUntilTravel = (travelDate - now) / (1000 * 60);
        
        console.log(`📅 Travel Date: ${travelDate}`);
        console.log(`🕐 Current Time: ${now}`);
        console.log(`⏰ Minutes until travel: ${minutesUntilTravel.toFixed(2)} minutes`);

        // ✅ CHANGED: From 2 hours (120 minutes) to 30 minutes
        if (minutesUntilTravel < 30) {
            console.log(`❌ Cancellation blocked: Only ${minutesUntilTravel.toFixed(2)} minutes until departure`);
            return res.status(400).json({ 
                success: false,
                message: `Bookings can only be cancelled at least 30 minutes before departure. You have ${Math.max(0, Math.floor(minutesUntilTravel))} minutes remaining.` 
            });
        }

        if (bookingDetails.status === 'cancelled') {
            return res.status(400).json({ 
                success: false,
                message: 'Booking is already cancelled' 
            });
        }

        // Update booking status
        await pool.query(
            `UPDATE bookings SET status = 'cancelled' WHERE bookingID = ?`,
            [bookingId]
        );
        
        // Also update payment status if exists
        await pool.query(
            `UPDATE payments SET status = 'cancelled' WHERE bookingID = ?`,
            [bookingId]
        );

        console.log(`✅ Booking ${bookingId} cancelled successfully`);

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
 * @desc    Get customer profile
 * @route   GET /api/customers/profile
 * @access  Private (Customer only)
 */
const getProfile = async (req, res, next) => {
    try {
        const customerId = req.user.id;

        const [customer] = await pool.query(
            `SELECT 
                custID,
                customerName,
                email,
                phoneNumber,
                dob,
                gender,
                address,
                createdAt
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
                memberSince: profile.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Get profile error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch profile',
            error: error.message 
        });
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
        const { customerName, phoneNumber, address } = req.body;

        const updates = [];
        const params = [];

        if (customerName) {
            updates.push('customerName = ?');
            params.push(customerName);
        }
        if (phoneNumber) {
            const [existing] = await pool.query(
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

        if (updates.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'No fields to update' 
            });
        }

        params.push(customerId);

        await pool.query(
            `UPDATE customers SET ${updates.join(', ')} WHERE custID = ?`,
            params
        );

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('❌ Update profile error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update profile',
            error: error.message 
        });
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

        const [payments] = await pool.query(
            `SELECT 
                p.paymentID,
                p.amount,
                p.paymentMethod,
                p.mpesaCode,
                p.status,
                p.paymentDate,
                b.bookingID,
                b.route,
                b.travelDate
             FROM payments p
             JOIN bookings b ON p.bookingID = b.bookingID
             WHERE b.custID = ?
             ORDER BY p.paymentDate DESC`,
            [customerId]
        );

        res.json({
            success: true,
            payments: payments.map(p => ({
                id: p.paymentID,
                amount: p.amount,
                method: p.paymentMethod,
                mpesaCode: p.mpesaCode,
                status: p.status,
                date: p.paymentDate,
                bookingId: p.bookingID,
                route: p.route,
                travelDate: p.travelDate
            }))
        });

    } catch (error) {
        console.error('❌ Get payment history error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch payment history',
            error: error.message 
        });
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

        const [booking] = await pool.query(
            `SELECT 
                b.*,
                r.baseFare as fare,
                p.amount as paidAmount 
             FROM bookings b
             LEFT JOIN routes r ON b.routeID = r.routeID
             LEFT JOIN payments p ON b.bookingID = p.bookingID
             WHERE b.bookingID = ? AND b.custID = ?`,
            [bookingId, customerId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        const ticket = booking[0];

        res.json({
            success: true,
            ticket: {
                bookingId: ticket.bookingID,
                customerName: ticket.customerName,
                phoneNumber: ticket.phoneNumber,
                route: ticket.route,
                vehicleNumber: ticket.vehicleNumber,
                seatNumber: ticket.seatNumber,
                travelDate: ticket.travelDate,
                fare: ticket.fare,
                amount: ticket.paidAmount || ticket.fare,
                status: ticket.status
            }
        });

    } catch (error) {
        console.error('❌ Download ticket error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate ticket',
            error: error.message 
        });
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
    downloadTicket,
    searchCustomer  // Added searchCustomer to exports
};