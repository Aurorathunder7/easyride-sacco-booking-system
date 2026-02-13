const { promisePool } = require('../config/db');

/**
 * @desc    Search for available routes
 * @route   GET /api/bookings/routes/search
 * @access  Public
 */
const searchRoutes = async (req, res, next) => {
    try {
        const { from, to, date } = req.query;

        if (!from || !to || !date) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide origin, destination and travel date' 
            });
        }

        // Search for routes matching origin and destination
        const [routes] = await promisePool.query(
            `SELECT 
                r.routeID,
                r.routeCode,
                r.origin,
                r.destination,
                r.distance,
                r.basePrice,
                r.estimatedTime,
                COUNT(DISTINCT v.vehicleID) as availableVehicles
             FROM routes r
             LEFT JOIN vehicles v ON r.routeID = v.routeID AND v.isActive = 1
             WHERE r.origin LIKE ? AND r.destination LIKE ? AND r.isActive = 1
             GROUP BY r.routeID`,
            [`%${from}%`, `%${to}%`]
        );

        if (routes.length === 0) {
            return res.json({
                success: true,
                message: 'No routes found for the specified locations',
                routes: []
            });
        }

        // For each route, find available schedules on the given date
        const routesWithSchedules = await Promise.all(routes.map(async (route) => {
            const [schedules] = await promisePool.query(
                `SELECT 
                    s.scheduleID,
                    s.departureTime,
                    s.arrivalTime,
                    v.vehicleID,
                    v.vehicleNumber,
                    v.vehicleType,
                    v.capacity,
                    v.features,
                    (v.capacity - COUNT(b.bookingID)) as availableSeats
                 FROM schedules s
                 JOIN vehicles v ON s.vehicleID = v.vehicleID
                 LEFT JOIN bookings b ON v.vehicleID = b.vehicleID 
                     AND DATE(b.travelDate) = ? 
                     AND b.status != 'cancelled'
                 WHERE s.routeID = ? AND s.isActive = 1
                 GROUP BY s.scheduleID
                 HAVING availableSeats > 0`,
                [date, route.routeID]
            );

            return {
                ...route,
                schedules: schedules.map(s => ({
                    ...s,
                    departureTime: formatTime(s.departureTime),
                    arrivalTime: formatTime(s.arrivalTime),
                    price: route.basePrice
                }))
            };
        }));

        res.json({
            success: true,
            routes: routesWithSchedules.filter(r => r.schedules.length > 0)
        });

    } catch (error) {
        console.error('❌ Search routes error:', error);
        next(error);
    }
};

/**
 * @desc    Get route details by ID
 * @route   GET /api/bookings/routes/:id
 * @access  Public
 */
const getRouteDetails = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [route] = await promisePool.query(
            `SELECT 
                r.*,
                COUNT(DISTINCT v.vehicleID) as totalVehicles
             FROM routes r
             LEFT JOIN vehicles v ON r.routeID = v.routeID AND v.isActive = 1
             WHERE r.routeID = ?
             GROUP BY r.routeID`,
            [id]
        );

        if (route.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Route not found' 
            });
        }

        res.json({
            success: true,
            route: route[0]
        });

    } catch (error) {
        console.error('❌ Get route details error:', error);
        next(error);
    }
};

/**
 * @desc    Get available schedules for a route
 * @route   GET /api/bookings/schedules
 * @access  Public
 */
const getAvailableSchedules = async (req, res, next) => {
    try {
        const { routeId, date } = req.query;

        if (!routeId || !date) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide route ID and date' 
            });
        }

        const [schedules] = await promisePool.query(
            `SELECT 
                s.scheduleID,
                s.departureTime,
                s.arrivalTime,
                v.vehicleID,
                v.vehicleNumber,
                v.vehicleType,
                v.capacity,
                v.features,
                r.basePrice,
                (v.capacity - COUNT(b.bookingID)) as availableSeats
             FROM schedules s
             JOIN vehicles v ON s.vehicleID = v.vehicleID
             JOIN routes r ON s.routeID = r.routeID
             LEFT JOIN bookings b ON v.vehicleID = b.vehicleID 
                 AND DATE(b.travelDate) = ? 
                 AND b.status != 'cancelled'
             WHERE s.routeID = ? AND s.isActive = 1
             GROUP BY s.scheduleID
             HAVING availableSeats > 0
             ORDER BY s.departureTime ASC`,
            [date, routeId]
        );

        res.json({
            success: true,
            schedules: schedules.map(s => ({
                ...s,
                departureTime: formatTime(s.departureTime),
                arrivalTime: formatTime(s.arrivalTime)
            }))
        });

    } catch (error) {
        console.error('❌ Get available schedules error:', error);
        next(error);
    }
};

/**
 * @desc    Get seat availability for a specific schedule
 * @route   GET /api/bookings/seats/availability
 * @access  Public
 */
const getSeatAvailability = async (req, res, next) => {
    try {
        const { scheduleId, date } = req.query;

        if (!scheduleId || !date) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide schedule ID and date' 
            });
        }

        // Get vehicle details and booked seats
        const [result] = await promisePool.query(
            `SELECT 
                v.vehicleID,
                v.vehicleNumber,
                v.vehicleType,
                v.capacity,
                v.features,
                GROUP_CONCAT(b.seatNumber) as bookedSeats
             FROM schedules s
             JOIN vehicles v ON s.vehicleID = v.vehicleID
             LEFT JOIN bookings b ON v.vehicleID = b.vehicleID 
                 AND DATE(b.travelDate) = ? 
                 AND b.status != 'cancelled'
             WHERE s.scheduleID = ?
             GROUP BY v.vehicleID`,
            [date, scheduleId]
        );

        if (result.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Schedule not found' 
            });
        }

        const vehicle = result[0];
        
        // Generate seat layout based on vehicle type
        const seatLayout = generateSeatLayout(vehicle.capacity, vehicle.vehicleType);
        
        // Mark booked seats
        const bookedSeatsArray = vehicle.bookedSeats ? vehicle.bookedSeats.split(',') : [];
        const seats = seatLayout.map(seat => ({
            ...seat,
            isBooked: bookedSeatsArray.includes(seat.number),
            isAvailable: !bookedSeatsArray.includes(seat.number)
        }));

        res.json({
            success: true,
            vehicle: {
                id: vehicle.vehicleID,
                number: vehicle.vehicleNumber,
                type: vehicle.vehicleType,
                capacity: vehicle.capacity,
                features: JSON.parse(vehicle.features || '{}')
            },
            seats,
            availableCount: seats.filter(s => s.isAvailable).length
        });

    } catch (error) {
        console.error('❌ Get seat availability error:', error);
        next(error);
    }
};

/**
 * @desc    Check availability for multiple seats
 * @route   GET /api/bookings/check-availability
 * @access  Public
 */
const checkAvailability = async (req, res, next) => {
    try {
        const { scheduleId, date, seats } = req.query;

        if (!scheduleId || !date || !seats) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide schedule ID, date and seats' 
            });
        }

        const seatArray = seats.split(',');

        // Get booked seats
        const [booked] = await promisePool.query(
            `SELECT seatNumber 
             FROM bookings 
             WHERE vehicleID = (SELECT vehicleID FROM schedules WHERE scheduleID = ?)
                 AND DATE(travelDate) = ? 
                 AND status != 'cancelled'
                 AND seatNumber IN (?)`,
            [scheduleId, date, seatArray]
        );

        const bookedSeats = booked.map(b => b.seatNumber);
        const unavailableSeats = seatArray.filter(seat => bookedSeats.includes(seat));

        res.json({
            success: true,
            available: unavailableSeats.length === 0,
            unavailableSeats,
            message: unavailableSeats.length > 0 
                ? `Seats ${unavailableSeats.join(', ')} are already booked` 
                : 'All selected seats are available'
        });

    } catch (error) {
        console.error('❌ Check availability error:', error);
        next(error);
    }
};

/**
 * @desc    Create a new booking
 * @route   POST /api/bookings
 * @access  Private
 */
const createBooking = async (req, res, next) => {
    const connection = await promisePool.getConnection();
    
    try {
        const customerId = req.user.id;
        const {
            scheduleId,
            routeId,
            seatNumbers,
            travelDate,
            passengers,
            passengerDetails,
            specialRequests
        } = req.body;

        // Validate required fields
        if (!scheduleId || !routeId || !seatNumbers || !travelDate) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing required booking information' 
            });
        }

        await connection.beginTransaction();

        // Get schedule and vehicle details
        const [schedule] = await connection.query(
            `SELECT s.*, v.vehicleID, v.capacity, r.basePrice 
             FROM schedules s
             JOIN vehicles v ON s.vehicleID = v.vehicleID
             JOIN routes r ON s.routeID = r.routeID
             WHERE s.scheduleID = ?`,
            [scheduleId]
        );

        if (schedule.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false,
                message: 'Schedule not found' 
            });
        }

        const scheduleData = schedule[0];
        const seatArray = Array.isArray(seatNumbers) ? seatNumbers : [seatNumbers];
        const totalAmount = scheduleData.basePrice * seatArray.length;

        // Check seat availability
        const [bookedSeats] = await connection.query(
            `SELECT seatNumber FROM bookings 
             WHERE vehicleID = ? AND DATE(travelDate) = ? AND status != 'cancelled'`,
            [scheduleData.vehicleID, travelDate]
        );

        const bookedSeatNumbers = bookedSeats.map(b => b.seatNumber);
        const unavailableSeats = seatArray.filter(seat => bookedSeatNumbers.includes(seat));

        if (unavailableSeats.length > 0) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false,
                message: `Seats ${unavailableSeats.join(', ')} are already booked`,
                unavailableSeats
            });
        }

        // Generate unique booking reference
        const bookingReference = 'ER' + Date.now().toString().slice(-8) + 
                                Math.random().toString(36).substring(2, 5).toUpperCase();

        // Create booking
        const [bookingResult] = await connection.query(
            `INSERT INTO bookings (
                bookingReference, customerID, vehicleID, routeID,
                seatNumber, travelDate, passengers, totalAmount,
                status, paymentStatus, specialRequests, bookingSource
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, 'web')`,
            [
                bookingReference,
                customerId,
                scheduleData.vehicleID,
                routeId,
                seatArray.join(','),
                travelDate,
                passengers || seatArray.length,
                totalAmount,
                specialRequests || null
            ]
        );

        const bookingId = bookingResult.insertId;

        // Store passenger details if provided
        if (passengerDetails) {
            await connection.query(
                `UPDATE bookings SET 
                    passengerName = ?,
                    passengerPhone = ?,
                    passengerEmail = ?,
                    passengerIdNumber = ?
                 WHERE bookingID = ?`,
                [
                    passengerDetails.name || null,
                    passengerDetails.phone || null,
                    passengerDetails.email || null,
                    passengerDetails.idNumber || null,
                    bookingId
                ]
            );
        }

        await connection.commit();

        // Log the booking
        console.log(`✅ Booking created: ${bookingReference} for customer ${customerId}`);

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking: {
                id: bookingId,
                reference: bookingReference,
                seats: seatArray,
                amount: totalAmount,
                travelDate
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Create booking error:', error);
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * @desc    Get booking details by ID
 * @route   GET /api/bookings/:id
 * @access  Private
 */
const getBookingDetails = async (req, res, next) => {
    try {
        const bookingId = req.params.id;
        const customerId = req.user.id;

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
                v.features,
                p.mpesaReceipt,
                p.transactionDate,
                p.status as paymentStatus
             FROM bookings b
             JOIN routes r ON b.routeID = r.routeID
             JOIN vehicles v ON b.vehicleID = v.vehicleID
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

        const bookingData = booking[0];
        
        // Format response
        const formattedBooking = {
            id: bookingData.bookingID,
            reference: bookingData.bookingReference,
            route: {
                origin: bookingData.origin,
                destination: bookingData.destination,
                code: bookingData.routeCode,
                distance: bookingData.distance,
                duration: bookingData.estimatedTime
            },
            vehicle: {
                number: bookingData.vehicleNumber,
                type: bookingData.vehicleType,
                features: JSON.parse(bookingData.features || '{}')
            },
            seats: bookingData.seatNumber.split(','),
            travelDate: bookingData.travelDate,
            bookingDate: bookingData.createdAt,
            amount: bookingData.totalAmount,
            status: bookingData.status,
            payment: bookingData.mpesaReceipt ? {
                receipt: bookingData.mpesaReceipt,
                date: bookingData.transactionDate,
                status: bookingData.paymentStatus
            } : null,
            specialRequests: bookingData.specialRequests,
            passengerDetails: {
                name: bookingData.passengerName,
                phone: bookingData.passengerPhone,
                email: bookingData.passengerEmail,
                idNumber: bookingData.passengerIdNumber
            }
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
 * @desc    Get booking by reference number
 * @route   GET /api/bookings/reference/:reference
 * @access  Public
 */
const getBookingByReference = async (req, res, next) => {
    try {
        const { reference } = req.params;

        const [booking] = await promisePool.query(
            `SELECT 
                b.*,
                c.customerName,
                c.phoneNumber,
                c.email,
                r.origin,
                r.destination,
                v.vehicleNumber
             FROM bookings b
             JOIN customers c ON b.customerID = c.custID
             JOIN routes r ON b.routeID = r.routeID
             JOIN vehicles v ON b.vehicleID = v.vehicleID
             WHERE b.bookingReference = ?`,
            [reference]
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
        console.error('❌ Get booking by reference error:', error);
        next(error);
    }
};

/**
 * @desc    Initiate payment for a booking
 * @route   POST /api/bookings/:id/payment
 * @access  Private
 */
const initiatePayment = async (req, res, next) => {
    try {
        const bookingId = req.params.id;
        const customerId = req.user.id;
        const { paymentMethod } = req.body;

        // Get booking details
        const [booking] = await promisePool.query(
            `SELECT * FROM bookings WHERE bookingID = ? AND customerID = ?`,
            [bookingId, customerId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        const bookingData = booking[0];

        if (bookingData.paymentStatus === 'paid') {
            return res.status(400).json({ 
                success: false,
                message: 'Booking is already paid' 
            });
        }

        // In a real app, initiate M-Pesa payment here
        // For now, simulate payment initiation
        const paymentReference = 'MP' + Date.now().toString().slice(-8);

        // Create payment record
        await promisePool.query(
            `INSERT INTO payments (
                bookingID, amount, phoneNumber, mpesaReference, status
            ) VALUES (?, ?, ?, ?, 'pending')`,
            [bookingId, bookingData.totalAmount, req.user.phoneNumber, paymentReference]
        );

        res.json({
            success: true,
            message: 'Payment initiated. Please check your phone for M-Pesa prompt.',
            paymentReference,
            amount: bookingData.totalAmount
        });

    } catch (error) {
        console.error('❌ Initiate payment error:', error);
        next(error);
    }
};

/**
 * @desc    Confirm booking after successful payment
 * @route   POST /api/bookings/:id/confirm
 * @access  Private
 */
const confirmBooking = async (req, res, next) => {
    try {
        const bookingId = req.params.id;
        const customerId = req.user.id;

        const [booking] = await promisePool.query(
            `SELECT * FROM bookings WHERE bookingID = ? AND customerID = ?`,
            [bookingId, customerId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        // Update booking status
        await promisePool.query(
            `UPDATE bookings SET status = 'confirmed' WHERE bookingID = ?`,
            [bookingId]
        );

        res.json({
            success: true,
            message: 'Booking confirmed successfully'
        });

    } catch (error) {
        console.error('❌ Confirm booking error:', error);
        next(error);
    }
};

/**
 * Helper function to format time
 */
const formatTime = (time) => {
    if (!time) return null;
    // If time is in HH:MM:SS format, convert to readable format
    const parts = time.split(':');
    if (parts.length >= 2) {
        const hour = parseInt(parts[0]);
        const minute = parts[1];
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minute} ${ampm}`;
    }
    return time;
};

/**
 * Helper function to generate seat layout
 */
const generateSeatLayout = (capacity, vehicleType) => {
    const seats = [];
    
    if (vehicleType === 'Shuttle' || capacity <= 14) {
        // 14 seater layout: 4 rows, 2-2-2-2 configuration
        const rows = Math.ceil(capacity / 4);
        for (let row = 1; row <= rows; row++) {
            // Left side seats
            seats.push({
                number: `${String.fromCharCode(64 + row)}1`,
                row,
                column: 1,
                type: 'window'
            });
            seats.push({
                number: `${String.fromCharCode(64 + row)}2`,
                row,
                column: 2,
                type: 'aisle'
            });
            // Right side seats
            seats.push({
                number: `${String.fromCharCode(64 + row)}3`,
                row,
                column: 3,
                type: 'aisle'
            });
            seats.push({
                number: `${String.fromCharCode(64 + row)}4`,
                row,
                column: 4,
                type: 'window'
            });
        }
    } else {
        // Bus layout: more complex, but simplified for now
        for (let i = 1; i <= capacity; i++) {
            seats.push({
                number: i.toString(),
                row: Math.ceil(i / 4),
                column: ((i - 1) % 4) + 1,
                type: 'standard'
            });
        }
    }
    
    return seats.slice(0, capacity);
};

module.exports = {
    searchRoutes,
    getRouteDetails,
    getAvailableSchedules,
    getSeatAvailability,
    createBooking,
    getBookingDetails,
    getBookingByReference,
    checkAvailability,
    initiatePayment,
    confirmBooking
};