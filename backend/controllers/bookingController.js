const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const Schedule = require('../models/scheduleModel');

/**
 * @desc    Get all available routes (public - for customers)
 * @route   GET /api/bookings/routes
 * @access  Public (Customer)
 */
const getAllRoutes = async (req, res, next) => {
    try {
        console.log('📡 Fetching all routes for customers...')
        
        let routes = [];
        
        try {
            const [tables] = await pool.query(`SHOW TABLES LIKE 'routes'`);
            
            if (tables.length > 0) {
                const [columns] = await pool.query(`SHOW COLUMNS FROM routes LIKE 'status'`);
                
                let query = `
                    SELECT 
                        routeID,
                        routeName,
                        origin,
                        destination,
                        distance,
                        baseFare,
                        estimatedTime
                    FROM routes`;
                
                if (columns.length > 0) {
                    query += ` WHERE status = 'active'`;
                }
                
                query += ` ORDER BY origin, destination`;
                
                const [routesResult] = await pool.query(query);
                routes = routesResult;
                console.log(`✅ Found ${routes.length} routes in database`);
            }
        } catch (dbError) {
            console.log('⚠️ Database error when fetching routes:', dbError.message);
        }

        if (routes.length === 0) {
            console.log('⚠️ No routes in database, returning sample routes');
            const sampleRoutes = [
                { routeID: 1, routeName: 'Nairobi-Mombasa Express', origin: 'Nairobi', destination: 'Mombasa', distance: 485, baseFare: 1500, estimatedTime: '6 hours' },
                { routeID: 2, routeName: 'Nairobi-Kisumu Shuttle', origin: 'Nairobi', destination: 'Kisumu', distance: 350, baseFare: 1200, estimatedTime: '5.5 hours' },
                { routeID: 3, routeName: 'Nairobi-Nakuru Route', origin: 'Nairobi', destination: 'Nakuru', distance: 160, baseFare: 500, estimatedTime: '2.5 hours' }
            ];
            
            return res.json({ success: true, routes: sampleRoutes, isSample: true, message: 'Showing sample routes. Please set up your database.' });
        }

        res.json({ success: true, routes: routes });

    } catch (error) {
        console.error('❌ Get all routes error:', error);
        const sampleRoutes = [
            { routeID: 1, routeName: 'Nairobi-Mombasa Express', origin: 'Nairobi', destination: 'Mombasa', distance: 485, baseFare: 1500, estimatedTime: '6 hours' },
            { routeID: 2, routeName: 'Nairobi-Kisumu Shuttle', origin: 'Nairobi', destination: 'Kisumu', distance: 350, baseFare: 1200, estimatedTime: '5.5 hours' },
            { routeID: 3, routeName: 'Nairobi-Nakuru Route', origin: 'Nairobi', destination: 'Nakuru', distance: 160, baseFare: 500, estimatedTime: '2.5 hours' }
        ];
        
        res.status(200).json({ success: true, routes: sampleRoutes, isSample: true, message: 'Using sample routes due to database error', error: error.message });
    }
};

/**
 * Helper function to generate dynamic schedules (fallback when no persistent schedules exist)
 */
async function generateDynamicSchedules(routeId, date, dbPool) {
    const schedules = [];
    const now = new Date();
    const isToday = date === now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    let route = null;
    try {
        const [routes] = await dbPool.query(`SELECT * FROM routes WHERE routeID = ?`, [routeId]);
        if (routes.length > 0) route = routes[0];
    } catch (error) {
        console.log('⚠️ Error fetching route:', error.message);
    }
    
    if (!route) {
        route = { routeID: routeId, origin: 'Nairobi', destination: 'Mombasa', baseFare: 1500, estimatedTime: '6' };
    }
    
    let vehicles = [];
    try {
        const [vehiclesResult] = await dbPool.query(`SELECT * FROM vehicles`);
        vehicles = vehiclesResult;
    } catch (error) {
        console.log('⚠️ Error fetching vehicles:', error.message);
    }
    
    if (vehicles.length === 0) {
        vehicles = [
            { vehicleID: 1, vehicleNumber: 'SAMPLE 001', vehicleType: 'Shuttle', capacity: 14 },
            { vehicleID: 2, vehicleNumber: 'SAMPLE 002', vehicleType: 'Bus', capacity: 33 }
        ];
    }
    
    const departureTimes = [
        { time: '06:00:00', hour: 6, minute: 0, label: '6:00 AM' },
        { time: '08:00:00', hour: 8, minute: 0, label: '8:00 AM' },
        { time: '10:00:00', hour: 10, minute: 0, label: '10:00 AM' },
        { time: '12:00:00', hour: 12, minute: 0, label: '12:00 PM' },
        { time: '14:00:00', hour: 14, minute: 0, label: '2:00 PM' },
        { time: '16:00:00', hour: 16, minute: 0, label: '4:00 PM' },
        { time: '18:00:00', hour: 18, minute: 0, label: '6:00 PM' },
        { time: '20:00:00', hour: 20, minute: 0, label: '8:00 PM' }
    ];
    
    const durationHours = parseInt(route.estimatedTime) || 6;
    
    for (const vehicle of vehicles) {
        for (const depTime of departureTimes) {
            if (isToday && (depTime.hour < currentHour || (depTime.hour === currentHour && depTime.minute <= currentMinute))) {
                continue;
            }
            
            const departureDateTime = `${date} ${depTime.time}`;
            const arrivalDateTime = new Date(departureDateTime);
            arrivalDateTime.setHours(arrivalDateTime.getHours() + durationHours);
            
            schedules.push({
                scheduleID: `dynamic_${vehicle.vehicleID}_${depTime.time.replace(/:/g, '')}`,
                departureTime: departureDateTime,
                departureTimeFormatted: depTime.label,
                arrivalTime: arrivalDateTime.toISOString(),
                arrivalTimeFormatted: arrivalDateTime.toLocaleTimeString(),
                vehicleID: vehicle.vehicleID,
                vehicleNumber: vehicle.vehicleNumber,
                vehicleType: vehicle.vehicleType,
                capacity: vehicle.capacity,
                price: route.baseFare,
                availableSeats: vehicle.capacity,
                bookedSeatsCount: 0,
                bookedSeatsList: [],
                origin: route.origin,
                destination: route.destination,
                isSample: true,
                fromDatabase: false,
                departureHour: depTime.hour,
                departureMinute: depTime.minute
            });
        }
    }
    
    return schedules;
}

/**
 * @desc    Get available schedules for a route (UPDATED - Uses persistent schedules)
 * @route   GET /api/bookings/schedules
 * @access  Public
 */
const getAvailableSchedules = async (req, res, next) => {
    try {
        const routeId = req.query.routeId || req.query.route_id;
        const date = req.query.date;

        console.log('=================================');
        console.log('📡 getAvailableSchedules called');
        console.log('routeId:', routeId);
        console.log('date:', date);

        if (!routeId || !date) {
            return res.status(400).json({ success: false, message: 'Please provide route ID and date', received: { routeId, date } });
        }

        let schedules = [];
        let fromDatabase = false;
        
        try {
            const dbSchedules = await Schedule.getByRouteAndDate(routeId, date);
            
            if (dbSchedules && dbSchedules.length > 0) {
                schedules = dbSchedules.map(schedule => {
                    const departureDateTime = new Date(schedule.departureTime);
                    const allSeats = Schedule.generateSeatNumbers(schedule.capacity || 14);
                    const bookedSeats = schedule.bookedSeats || [];
                    const availableSeats = allSeats.filter(seat => !bookedSeats.includes(seat));
                    
                    return {
                        scheduleID: schedule.scheduleID,
                        departureTime: schedule.departureTime,
                        departureTimeFormatted: departureDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        arrivalTime: schedule.arrivalTime,
                        arrivalTimeFormatted: new Date(schedule.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        vehicleID: schedule.vehicleID,
                        vehicleNumber: schedule.vehicleNumber,
                        vehicleType: schedule.vehicleType,
                        capacity: schedule.capacity || 14,
                        price: schedule.price,
                        availableSeats: availableSeats.length,
                        bookedSeatsCount: bookedSeats.length,
                        bookedSeatsList: bookedSeats,
                        origin: schedule.origin,
                        destination: schedule.destination,
                        isSample: false,
                        fromDatabase: true,
                        departureHour: departureDateTime.getHours(),
                        departureMinute: departureDateTime.getMinutes(),
                        status: schedule.status
                    };
                });
                fromDatabase = true;
                console.log(`✅ Found ${schedules.length} persistent schedules in database`);
            }
        } catch (dbError) {
            console.log('⚠️ Error fetching from schedules table:', dbError.message);
        }
        
        if (schedules.length === 0) {
            console.log('⚠️ No persistent schedules found, generating dynamic schedules...');
            schedules = await generateDynamicSchedules(routeId, date, pool);
            console.log(`✅ Generated ${schedules.length} dynamic schedules as fallback`);
        }

        const now = new Date();
        const isToday = date === now.toISOString().split('T')[0];
        
        if (isToday) {
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const filteredSchedules = schedules.filter(schedule => {
                if (schedule.departureHour !== undefined) {
                    return (schedule.departureHour > currentHour) || (schedule.departureHour === currentHour && schedule.departureMinute > currentMinute);
                }
                const depTime = new Date(schedule.departureTime);
                return depTime > now;
            });
            
            if (filteredSchedules.length !== schedules.length) {
                console.log(`⏰ Filtered out ${schedules.length - filteredSchedules.length} past schedules for today`);
                schedules = filteredSchedules;
            }
        }

        schedules.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));

        let message = '';
        if (schedules.length === 0) {
            message = 'No schedules available for this date. All departures are full or have passed.';
        } else if (!fromDatabase) {
            message = '⚠️ Showing sample schedules. Please add schedules to the database for real availability.';
        } else {
            message = `Found ${schedules.length} available schedules`;
        }

        console.log(`📤 Returning ${schedules.length} schedules to client`);

        res.json({
            success: true,
            schedules: schedules,
            message: message,
            metadata: { fromDatabase: fromDatabase, schedulesGenerated: schedules.length, isToday: isToday, dateRequested: date }
        });

    } catch (error) {
        console.error('❌ Get available schedules error:', error);
        const sampleSchedules = await generateDynamicSchedules(req.query.routeId, req.query.date, pool);
        res.status(200).json({ success: true, schedules: sampleSchedules, message: 'Showing sample schedules due to database error.', error: error.message });
    }
};

/**
 * Helper function to generate seat layout
 */
const generateSeatLayout = (capacity, vehicleType) => {
    const seats = [];
    
    if (vehicleType === 'Shuttle' || capacity <= 14) {
        const rows = Math.ceil(capacity / 4);
        for (let row = 1; row <= rows; row++) {
            seats.push({ number: `${String.fromCharCode(64 + row)}1`, row, column: 1, type: 'window' });
            seats.push({ number: `${String.fromCharCode(64 + row)}2`, row, column: 2, type: 'aisle' });
            seats.push({ number: `${String.fromCharCode(64 + row)}3`, row, column: 3, type: 'aisle' });
            seats.push({ number: `${String.fromCharCode(64 + row)}4`, row, column: 4, type: 'window' });
        }
    } else {
        for (let i = 1; i <= capacity; i++) {
            seats.push({ number: i.toString(), row: Math.ceil(i / 4), column: ((i - 1) % 4) + 1, type: 'standard' });
        }
    }
    
    return seats.slice(0, capacity);
};

/**
 * @desc    Get seat availability for a specific schedule (UPDATED - Uses schedule model)
 * @route   GET /api/bookings/seats/availability
 * @access  Public
 */
const getSeatAvailability = async (req, res, next) => {
    try {
        const { scheduleId, date, vehicleId } = req.query;

        console.log('🔍 Getting seat availability for:', { scheduleId, date, vehicleId });

        if (!scheduleId && !vehicleId) {
            return res.status(400).json({ success: false, message: 'Please provide schedule ID or vehicle ID' });
        }

        let schedule = null;
        let bookedSeatNumbers = [];
        let capacity = 14;
        let vehicleInfo = {};

        if (scheduleId && !scheduleId.startsWith('dynamic_') && !scheduleId.startsWith('sample_')) {
            try {
                schedule = await Schedule.getById(scheduleId);
                if (schedule) {
                    bookedSeatNumbers = schedule.bookedSeats || [];
                    capacity = schedule.capacity || 14;
                    vehicleInfo = { id: schedule.vehicleID, number: schedule.vehicleNumber, type: schedule.vehicleType };
                    console.log(`✅ Found schedule in database with ${bookedSeatNumbers.length} booked seats`);
                }
            } catch (error) {
                console.log('⚠️ Error fetching schedule from database:', error.message);
            }
        }

        if (!schedule) {
            console.log('⚠️ Schedule not in database, using fallback method');
            
            let actualVehicleId = vehicleId;
            if (!actualVehicleId && scheduleId) {
                if (scheduleId.startsWith('dynamic_')) {
                    const parts = scheduleId.split('_');
                    actualVehicleId = parseInt(parts[1]);
                } else if (scheduleId.startsWith('sample_')) {
                    const parts = scheduleId.split('_');
                    actualVehicleId = parseInt(parts[1]);
                }
            }

            if (!actualVehicleId) {
                return res.status(400).json({ success: false, message: 'Invalid schedule ID' });
            }

            try {
                const [vehicles] = await pool.query(`SELECT * FROM vehicles WHERE vehicleID = ?`, [actualVehicleId]);
                if (vehicles.length > 0) {
                    vehicleInfo = { id: vehicles[0].vehicleID, number: vehicles[0].vehicleNumber, type: vehicles[0].vehicleType };
                    capacity = vehicles[0].capacity || 14;
                } else {
                    vehicleInfo = { id: actualVehicleId, number: `VEH${actualVehicleId}`, type: 'Standard' };
                    capacity = 14;
                }
            } catch (error) {
                vehicleInfo = { id: actualVehicleId, number: `VEH${actualVehicleId}`, type: 'Standard' };
                capacity = 14;
            }

            if (date) {
                try {
                    const [bookedSeats] = await pool.query(
                        `SELECT seatNumber FROM bookings WHERE vehicleID = ? AND DATE(travelDate) = ? AND status != 'cancelled'`,
                        [actualVehicleId, date]
                    );
                    bookedSeatNumbers = bookedSeats.map(b => b.seatNumber);
                } catch (error) {
                    console.log('⚠️ Error fetching booked seats:', error.message);
                }
            }
        }
        
        const seatLayout = generateSeatLayout(capacity, vehicleInfo.type);
        const seats = seatLayout.map(seat => ({
            ...seat,
            isBooked: bookedSeatNumbers.includes(seat.number),
            isAvailable: !bookedSeatNumbers.includes(seat.number)
        }));

        res.json({
            success: true,
            vehicle: vehicleInfo,
            seats,
            availableCount: seats.filter(s => s.isAvailable).length,
            bookedSeats: bookedSeatNumbers,
            fromDatabase: !!schedule
        });

    } catch (error) {
        console.error('❌ Get seat availability error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch seat availability', error: error.message });
    }
};

/**
 * @desc    Create a new booking (UPDATED - Uses schedule model to prevent double booking)
 * @route   POST /api/bookings
 * @access  Private (Customer or Operator)
 */
const createBooking = async (req, res, next) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const userId = req.user.id;
        const userRole = req.user.role;
        
        console.log(`📝 Creating booking for user ${userId} with role ${userRole}`);
        
        const {
            routeId,
            vehicleId,
            scheduleId,
            seatNumbers,
            travelDate,
            passengerDetails,
            existingCustomerId,
            newCustomer,
            paymentMethod = 'mpesa'
        } = req.body;

        if (!routeId || !vehicleId || !seatNumbers || !travelDate) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Missing required booking information' });
        }

        const seatArray = Array.isArray(seatNumbers) ? seatNumbers : [seatNumbers];
        
        let scheduleData = null;
        let isFromDatabase = false;

        if (scheduleId && !scheduleId.startsWith('dynamic_') && !scheduleId.startsWith('sample_')) {
            try {
                await Schedule.bookSeats(scheduleId, seatArray, connection);
                isFromDatabase = true;
                
                const [scheduleRows] = await connection.query(
                    `SELECT s.*, r.origin, r.destination, r.baseFare, v.vehicleNumber, v.vehicleType
                     FROM schedules s
                     JOIN routes r ON s.routeID = r.routeID
                     JOIN vehicles v ON s.vehicleID = v.vehicleID
                     WHERE s.scheduleID = ?`,
                    [scheduleId]
                );
                
                if (scheduleRows.length > 0) {
                    scheduleData = scheduleRows[0];
                }
                
                console.log(`✅ Booked seats using persistent schedule: ${scheduleId}`);
            } catch (bookingError) {
                await connection.rollback();
                return res.status(409).json({ success: false, message: bookingError.message || 'Failed to book seats. Please try again.' });
            }
        }
        
        if (!isFromDatabase) {
            console.log('⚠️ Using fallback booking method (no persistent schedule)');
            
            try {
                const [existingBookings] = await connection.query(
                    `SELECT seatNumber FROM bookings WHERE vehicleID = ? AND DATE(travelDate) = ? AND status != 'cancelled' AND seatNumber IN (?)`,
                    [vehicleId, travelDate, seatArray]
                );

                const bookedSeats = existingBookings.map(b => b.seatNumber);
                const unavailableSeats = seatArray.filter(seat => bookedSeats.includes(seat.toString()));

                if (unavailableSeats.length > 0) {
                    await connection.rollback();
                    return res.status(400).json({ success: false, message: `Seats ${unavailableSeats.join(', ')} are already booked`, unavailableSeats });
                }
            } catch (error) {
                console.log('⚠️ Error checking seat availability:', error.message);
            }
        }

        let routeData = scheduleData || null;
        if (!routeData) {
            try {
                const [routes] = await connection.query(`SELECT * FROM routes WHERE routeID = ?`, [routeId]);
                if (routes.length > 0) {
                    routeData = routes[0];
                } else {
                    routeData = { routeID: routeId, origin: 'Nairobi', destination: 'Mombasa', baseFare: 1500, estimatedTime: '6 hours' };
                }
            } catch (error) {
                routeData = { routeID: routeId, origin: 'Nairobi', destination: 'Mombasa', baseFare: 1500, estimatedTime: '6 hours' };
            }
        }

        let vehicleData = scheduleData || null;
        if (!vehicleData) {
            try {
                const [vehicles] = await connection.query(`SELECT * FROM vehicles WHERE vehicleID = ?`, [vehicleId]);
                if (vehicles.length > 0) {
                    vehicleData = vehicles[0];
                } else {
                    vehicleData = { vehicleID: vehicleId, vehicleNumber: `VEH${vehicleId}`, vehicleType: 'Standard', capacity: 14 };
                }
            } catch (error) {
                vehicleData = { vehicleID: vehicleId, vehicleNumber: `VEH${vehicleId}`, vehicleType: 'Standard', capacity: 14 };
            }
        }

        const totalAmount = routeData.baseFare * seatArray.length;

        // Customer handling
        let customerId = null;
        let customerName = '';
        let customerPhone = '';
        
        if (userRole === 'customer') {
            const [customer] = await connection.query(`SELECT custID, customerName, phoneNumber FROM customers WHERE custID = ?`, [userId]);
            if (customer.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Customer not found' });
            }
            customerId = customer[0].custID;
            customerName = passengerDetails?.name || customer[0].customerName;
            customerPhone = passengerDetails?.phone || customer[0].phoneNumber;
        } else if (userRole === 'operator') {
            if (existingCustomerId) {
                const [customer] = await connection.query(`SELECT custID, customerName, phoneNumber FROM customers WHERE custID = ?`, [existingCustomerId]);
                if (customer.length === 0) {
                    await connection.rollback();
                    return res.status(404).json({ success: false, message: 'Customer not found' });
                }
                customerId = customer[0].custID;
                customerName = customer[0].customerName;
                customerPhone = customer[0].phoneNumber;
            } else if (newCustomer) {
                const { customerName: newName, phoneNumber, email, dob, gender, address } = newCustomer;
                
                if (!newName || !phoneNumber) {
                    await connection.rollback();
                    return res.status(400).json({ success: false, message: 'Missing required customer information' });
                }
                
                const [existingByPhone] = await connection.query(`SELECT custID, customerName, phoneNumber FROM customers WHERE phoneNumber = ?`, [phoneNumber]);
                
                if (existingByPhone.length > 0) {
                    customerId = existingByPhone[0].custID;
                    customerName = existingByPhone[0].customerName;
                    customerPhone = existingByPhone[0].phoneNumber;
                } else {
                    const defaultPassword = 'default123';
                    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
                    const customerDob = dob || '2000-01-01';
                    const customerGender = gender || 'Other';
                    const customerAddress = address || 'N/A';
                    const finalEmail = (email && email.trim()) ? email : `${phoneNumber}@temp.com`;
                    
                    const [result] = await connection.query(
                        `INSERT INTO customers (customerName, phoneNumber, email, dob, gender, address, password, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                        [newName, phoneNumber, finalEmail, customerDob, customerGender, customerAddress, hashedPassword]
                    );
                    customerId = result.insertId;
                    customerName = newName;
                    customerPhone = phoneNumber;
                }
            } else {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Please provide either existing customer ID or new customer details' });
            }
        }

        if (!customerId) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Could not determine customer' });
        }

        // Create booking record
        let bookingId;
        try {
            const [bookingResult] = await connection.query(
                `INSERT INTO bookings (custID, customerName, phoneNumber, vehicleID, vehicleNumber, seatNumber, routeID, route, travelDate, status, bookingDate, scheduleID)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', NOW(), ?)`,
                [customerId, customerName, customerPhone, vehicleData.vehicleID, vehicleData.vehicleNumber, seatArray.join(','), routeId, `${routeData.origin} → ${routeData.destination}`, travelDate, scheduleId || null]
            );
            bookingId = bookingResult.insertId;
            console.log(`✅ Booking record created with ID: ${bookingId}`);
        } catch (error) {
            await connection.rollback();
            console.error('❌ Error creating booking:', error);
            return res.status(500).json({ success: false, message: 'Failed to create booking record', error: error.message });
        }

        const bookingReference = `ER${bookingId}`;

        // Check if payments table exists
        let hasPaymentsTable = false;
        try {
            const [tables] = await connection.query(`SHOW TABLES LIKE 'payments'`);
            hasPaymentsTable = tables.length > 0;
        } catch (error) {
            console.log('⚠️ Could not check for payments table:', error.message);
        }

        if (hasPaymentsTable) {
            try {
                const [columns] = await connection.query(`SHOW COLUMNS FROM payments`);
                const columnNames = columns.map(col => col.Field);
                
                let paymentFields = [];
                let paymentValues = [];
                
                if (columnNames.includes('bookingID')) { paymentFields.push('bookingID'); paymentValues.push(bookingId); }
                if (columnNames.includes('custID')) { paymentFields.push('custID'); paymentValues.push(customerId); }
                if (columnNames.includes('customerName')) { paymentFields.push('customerName'); paymentValues.push(customerName); }
                if (columnNames.includes('phoneNumber')) { paymentFields.push('phoneNumber'); paymentValues.push(customerPhone); }
                if (columnNames.includes('amount')) { paymentFields.push('amount'); paymentValues.push(totalAmount); }
                if (columnNames.includes('paymentMethod')) { paymentFields.push('paymentMethod'); paymentValues.push(paymentMethod === 'mpesa' ? 'M-Pesa' : 'Cash'); }
                if (columnNames.includes('mpesaCode')) { paymentFields.push('mpesaCode'); paymentValues.push(`MP${Date.now().toString().slice(-8)}`); }
                if (columnNames.includes('status')) { paymentFields.push('status'); paymentValues.push(paymentMethod === 'mpesa' ? 'completed' : 'pending'); }
                if (columnNames.includes('paymentDate')) { paymentFields.push('paymentDate'); paymentValues.push(new Date()); }
                
                if (paymentFields.length > 0) {
                    const paymentQuery = `INSERT INTO payments (${paymentFields.join(', ')}) VALUES (${paymentValues.map(() => '?').join(', ')})`;
                    await connection.query(paymentQuery, paymentValues);
                    console.log('✅ Payment record created');
                }
            } catch (error) {
                console.log('⚠️ Error creating payment record:', error.message);
            }
        }

        await connection.commit();

        console.log(`✅ Booking created successfully: ${bookingReference}`);

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking: {
                id: bookingId,
                reference: bookingReference,
                seats: seatArray,
                amount: totalAmount,
                travelDate: travelDate,
                fromPersistentSchedule: isFromDatabase,
                vehicle: { id: vehicleData.vehicleID, number: vehicleData.vehicleNumber, type: vehicleData.vehicleType },
                route: { origin: routeData.origin, destination: routeData.destination, fare: routeData.baseFare }
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Create booking error:', error);
        res.status(500).json({ success: false, message: 'Failed to create booking', error: error.message });
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

        const [booking] = await pool.query(
            `SELECT b.*, r.origin, r.destination, r.estimatedTime, v.vehicleNumber, v.vehicleType, p.amount as paidAmount, p.status as paymentStatus, p.paymentDate, p.mpesaCode
             FROM bookings b
             LEFT JOIN routes r ON b.routeID = r.routeID
             LEFT JOIN vehicles v ON b.vehicleID = v.vehicleID
             LEFT JOIN payments p ON b.bookingID = p.bookingID
             WHERE b.bookingID = ? AND b.custID = ?`,
            [bookingId, customerId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const bookingData = booking[0];
        const bookingReference = `ER${bookingData.bookingID}`;
        
        let seats = [];
        if (bookingData.seatNumber) {
            if (Array.isArray(bookingData.seatNumber)) {
                seats = bookingData.seatNumber;
            } else if (typeof bookingData.seatNumber === 'string') {
                seats = bookingData.seatNumber.split(',');
            } else {
                seats = [bookingData.seatNumber.toString()];
            }
        }
        
        res.json({
            success: true,
            booking: {
                id: bookingData.bookingID,
                reference: bookingReference,
                customerName: bookingData.customerName,
                phoneNumber: bookingData.phoneNumber,
                route: { origin: bookingData.origin || 'Nairobi', destination: bookingData.destination || 'Mombasa', duration: bookingData.estimatedTime || '6 hours' },
                vehicle: { number: bookingData.vehicleNumber || 'SAMPLE 001', type: bookingData.vehicleType || 'Shuttle' },
                seats: seats,
                travelDate: bookingData.travelDate,
                bookingDate: bookingData.bookingDate,
                amount: bookingData.paidAmount || 0,
                status: bookingData.status,
                paymentStatus: bookingData.paymentStatus || 'pending',
                payment: bookingData.paidAmount ? { amount: bookingData.paidAmount, status: bookingData.paymentStatus, date: bookingData.paymentDate, mpesaCode: bookingData.mpesaCode } : null
            }
        });

    } catch (error) {
        console.error('❌ Get booking details error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch booking details', error: error.message });
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
        const bookingId = parseInt(reference.replace('ER', ''));
        
        if (isNaN(bookingId)) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const [booking] = await pool.query(
            `SELECT b.*, c.customerName, c.phoneNumber, c.email, r.origin, r.destination, v.vehicleNumber, p.amount as paidAmount
             FROM bookings b
             LEFT JOIN customers c ON b.custID = c.custID
             LEFT JOIN routes r ON b.routeID = r.routeID
             LEFT JOIN vehicles v ON b.vehicleID = v.vehicleID
             LEFT JOIN payments p ON b.bookingID = p.bookingID
             WHERE b.bookingID = ?`,
            [bookingId]
        );

        if (booking.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        res.json({ success: true, booking: booking[0] });

    } catch (error) {
        console.error('❌ Get booking by reference error:', error);
        next(error);
    }
};

/**
 * @desc    Get customer bookings
 * @route   GET /api/bookings/customer
 * @access  Private
 */
const getCustomerBookings = async (req, res, next) => {
    try {
        const customerId = req.user.id;

        const [bookings] = await pool.query(
            `SELECT b.bookingID as id, b.bookingID, CONCAT('ER', b.bookingID) as bookingReference, b.route, b.seatNumber, b.travelDate, COALESCE(p.amount, 0) as amount, b.status, b.bookingDate, v.vehicleNumber, p.status as paymentStatus, p.mpesaCode
             FROM bookings b
             LEFT JOIN vehicles v ON b.vehicleID = v.vehicleID
             LEFT JOIN payments p ON b.bookingID = p.bookingID
             WHERE b.custID = ?
             ORDER BY b.bookingDate DESC`,
            [customerId]
        );

        res.json({ success: true, bookings: bookings || [] });

    } catch (error) {
        console.error('❌ Get customer bookings error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch bookings', error: error.message });
    }
};

/**
 * @desc    Cancel a booking (30 minute cancellation policy)
 * @route   PUT /api/bookings/:id/cancel
 * @access  Private (Customer or Operator)
 */
const cancelBooking = async (req, res, next) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const bookingId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        console.log(`🔍 Attempting to cancel booking ${bookingId}`);

        let query = `SELECT * FROM bookings WHERE bookingID = ?`;
        let queryParams = [bookingId];
        
        if (userRole === 'customer') {
            query += ` AND custID = ?`;
            queryParams.push(userId);
        }

        const [booking] = await connection.query(query, queryParams);

        if (booking.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const bookingData = booking[0];
        const travelDate = new Date(bookingData.travelDate);
        const now = new Date();
        const minutesUntilTravel = (travelDate - now) / (1000 * 60);

        if (minutesUntilTravel < 30 && userRole !== 'admin') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: `Bookings can only be cancelled at least 30 minutes before departure. You have ${Math.max(0, Math.floor(minutesUntilTravel))} minutes remaining.` });
        }

        if (bookingData.status === 'cancelled') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Booking is already cancelled' });
        }

        // Release seats back to schedule if using persistent schedules
        if (bookingData.scheduleID) {
            try {
                const seatNumbers = bookingData.seatNumber.split(',');
                await Schedule.releaseSeats(bookingData.scheduleID, seatNumbers, connection);
                console.log(`✅ Released seats ${seatNumbers.join(', ')} back to schedule ${bookingData.scheduleID}`);
            } catch (releaseError) {
                console.log('⚠️ Error releasing seats:', releaseError.message);
            }
        }

        await connection.query(`UPDATE bookings SET status = 'cancelled' WHERE bookingID = ?`, [bookingId]);
        await connection.query(`UPDATE payments SET status = 'cancelled' WHERE bookingID = ?`, [bookingId]);

        await connection.commit();

        console.log(`✅ Booking ${bookingId} cancelled successfully`);

        res.json({ success: true, message: 'Booking cancelled successfully' });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Cancel booking error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel booking', error: error.message });
    } finally {
        connection.release();
    }
};

/**
 * @desc    Get customer payment history
 * @route   GET /api/bookings/payments
 * @access  Private
 */
const getPaymentHistory = async (req, res, next) => {
    try {
        const customerId = req.user.id;

        const [payments] = await pool.query(
            `SELECT p.paymentID, p.amount, p.paymentMethod, p.mpesaCode, p.status, p.paymentDate, b.bookingID, b.route, b.travelDate, CONCAT('ER', b.bookingID) as bookingReference
             FROM payments p
             JOIN bookings b ON p.bookingID = b.bookingID
             WHERE b.custID = ?
             ORDER BY p.paymentDate DESC`,
            [customerId]
        );

        res.json({ success: true, payments: payments || [] });

    } catch (error) {
        console.error('❌ Get payment history error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch payment history', error: error.message });
    }
};

/**
 * @desc    Get booking ticket (HTML view)
 * @route   GET /api/bookings/:id/ticket
 * @access  Private (Customer or Operator)
 */
const getBookingTicket = async (req, res, next) => {
    try {
        let userId = req.user?.id;
        let userRole = req.user?.role;
        
        if (!userId && req.query.token) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
                userId = decoded.id;
                userRole = decoded.role;
            } catch (tokenError) {
                console.log('⚠️ Invalid token in query params:', tokenError.message);
            }
        }
        
        const bookingId = req.params.id;
        
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authorized, no token' });
        }

        console.log(`📄 Fetching ticket for booking ${bookingId}`);

        let query = `
            SELECT b.*, c.customerName, c.phoneNumber, c.email, r.origin, r.destination, r.estimatedTime as duration, v.vehicleNumber, v.vehicleType, p.amount as paidAmount, p.mpesaCode, p.status as paymentStatus, p.paymentDate
            FROM bookings b
            LEFT JOIN customers c ON b.custID = c.custID
            LEFT JOIN routes r ON b.routeID = r.routeID
            LEFT JOIN vehicles v ON b.vehicleID = v.vehicleID
            LEFT JOIN payments p ON b.bookingID = p.bookingID
            WHERE b.bookingID = ?
        `;
        
        const queryParams = [bookingId];
        
        if (userRole === 'customer') {
            query += ` AND b.custID = ?`;
            queryParams.push(userId);
        }

        const [booking] = await pool.query(query, queryParams);

        if (booking.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found or you do not have permission to view it' });
        }

        const bookingData = booking[0];
        const bookingReference = `ER${bookingData.bookingID}`;

        let seats = [];
        if (bookingData.seatNumber) {
            if (Array.isArray(bookingData.seatNumber)) {
                seats = bookingData.seatNumber;
            } else if (typeof bookingData.seatNumber === 'string') {
                seats = bookingData.seatNumber.split(',');
            } else {
                seats = [bookingData.seatNumber.toString()];
            }
        }
        
        let formattedDate = 'N/A';
        let formattedTime = 'N/A';
        if (bookingData.travelDate) {
            const travelDate = new Date(bookingData.travelDate);
            if (!isNaN(travelDate.getTime())) {
                formattedDate = travelDate.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                formattedTime = travelDate.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
            }
        }

        let formattedBookingDate = 'N/A';
        if (bookingData.bookingDate) {
            const bookingDate = new Date(bookingData.bookingDate);
            if (!isNaN(bookingDate.getTime())) {
                formattedBookingDate = bookingDate.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            }
        }

        const escapeHtml = (str) => {
            if (!str) return '';
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        };

        const getStatusClass = (status, paymentStatus) => {
            const statusLower = status?.toLowerCase() || '';
            if (statusLower === 'cancelled') return 'status-cancelled';
            if (paymentStatus === 'completed') return 'status-confirmed';
            return 'status-pending';
        };

        const getStatusText = (status, paymentStatus) => {
            const statusLower = status?.toLowerCase() || '';
            if (statusLower === 'cancelled') return '❌ CANCELLED';
            if (paymentStatus === 'completed') return '✅ PAID & CONFIRMED';
            return '⏳ PENDING PAYMENT';
        };

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EasyRide Ticket - ${escapeHtml(bookingReference)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #fef9e8 0%, #fff5e6 100%); min-height: 100vh; padding: 40px 20px; display: flex; justify-content: center; align-items: center; }
        .ticket { max-width: 600px; width: 100%; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.15); position: relative; }
        .ticket::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b); }
        .header { background: linear-gradient(135deg, #d97706, #f59e0b); color: white; padding: 30px 25px; text-align: center; }
        .header h1 { font-size: 28px; margin-bottom: 5px; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .header p { font-size: 14px; opacity: 0.9; }
        .reference { background: rgba(255,255,255,0.2); display: inline-block; padding: 5px 15px; border-radius: 20px; margin-top: 10px; font-size: 14px; font-weight: bold; }
        .content { padding: 30px 25px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #f59e0b; font-weight: 600; margin-bottom: 12px; border-left: 3px solid #f59e0b; padding-left: 10px; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #fed7aa; }
        .info-label { color: #b45309; font-weight: 500; font-size: 14px; }
        .info-value { color: #78350f; font-weight: 500; font-size: 14px; text-align: right; }
        .seats { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; justify-content: flex-end; }
        .seat-badge { background: #10b981; color: white; padding: 5px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }
        .total-row { display: flex; justify-content: space-between; padding: 15px 0; margin-top: 10px; border-top: 2px solid #f59e0b; border-bottom: 2px solid #f59e0b; }
        .total-label { font-size: 18px; font-weight: bold; color: #78350f; }
        .total-amount { font-size: 24px; font-weight: bold; color: #d97706; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status-confirmed { background: #d1fae5; color: #065f46; }
        .status-pending { background: #fed7aa; color: #92400e; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        .footer { background: #fffbef; padding: 20px 25px; text-align: center; border-top: 1px solid #fed7aa; }
        .footer p { color: #b45309; font-size: 12px; margin: 5px 0; }
        .button-group { margin-top: 20px; display: flex; gap: 10px; justify-content: center; }
        .print-btn { background: #f59e0b; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; transition: all 0.3s; }
        .print-btn:hover { background: #d97706; transform: translateY(-2px); }
        .back-btn { background: #78350f; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; transition: all 0.3s; }
        .back-btn:hover { background: #5a2a0c; transform: translateY(-2px); }
        @media print { body { background: white; padding: 0; } .print-btn, .back-btn { display: none; } .ticket { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="ticket">
        <div class="header">
            <h1><span>🚌</span> EasyRide <span>🎫</span></h1>
            <p>Your Travel Companion</p>
            <div class="reference">${escapeHtml(bookingReference)}</div>
        </div>
        <div class="content">
            <div class="section">
                <div class="section-title">PASSENGER DETAILS</div>
                <div class="info-row"><span class="info-label">Name:</span><span class="info-value">${escapeHtml(bookingData.customerName || 'N/A')}</span></div>
                <div class="info-row"><span class="info-label">Phone:</span><span class="info-value">${escapeHtml(bookingData.phoneNumber || 'N/A')}</span></div>
                <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${escapeHtml(bookingData.email || 'N/A')}</span></div>
            </div>
            <div class="section">
                <div class="section-title">JOURNEY DETAILS</div>
                <div class="info-row"><span class="info-label">Route:</span><span class="info-value">${escapeHtml(bookingData.origin || 'Nairobi')} → ${escapeHtml(bookingData.destination || 'Mombasa')}</span></div>
                <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${formattedDate}</span></div>
                <div class="info-row"><span class="info-label">Time:</span><span class="info-value">${formattedTime}</span></div>
                <div class="info-row"><span class="info-label">Duration:</span><span class="info-value">${escapeHtml(bookingData.duration || '6 hours')}</span></div>
                <div class="info-row"><span class="info-label">Booked On:</span><span class="info-value">${formattedBookingDate}</span></div>
            </div>
            <div class="section">
                <div class="section-title">VEHICLE & SEATS</div>
                <div class="info-row"><span class="info-label">Vehicle:</span><span class="info-value">${escapeHtml(bookingData.vehicleNumber || 'SAMPLE 001')} (${escapeHtml(bookingData.vehicleType || 'Shuttle')})</span></div>
                <div class="info-row"><span class="info-label">Seats:</span><span class="info-value"><div class="seats">${seats.map(seat => `<span class="seat-badge">Seat ${escapeHtml(seat)}</span>`).join('')}</div></span></div>
            </div>
            <div class="section">
                <div class="section-title">PAYMENT DETAILS</div>
                <div class="info-row"><span class="info-label">Amount:</span><span class="info-value">KSh ${bookingData.paidAmount || 0}</span></div>
                <div class="info-row"><span class="info-label">M-Pesa Code:</span><span class="info-value">${escapeHtml(bookingData.mpesaCode || 'N/A')}</span></div>
                <div class="info-row"><span class="info-label">Status:</span><span class="info-value"><span class="status-badge ${getStatusClass(bookingData.status, bookingData.paymentStatus)}">${getStatusText(bookingData.status, bookingData.paymentStatus)}</span></span></div>
            </div>
            <div class="total-row"><span class="total-label">Total Paid:</span><span class="total-amount">KSh ${bookingData.paidAmount || 0}</span></div>
        </div>
        <div class="footer">
            <p>✨ Thank you for choosing EasyRide! ✨</p>
            <p>Please arrive 30 minutes before departure</p>
            <p>For assistance, call: 0700 000 000</p>
            <div class="button-group">
                <button class="print-btn" onclick="window.print()">🖨️ Print Ticket</button>
                <button class="back-btn" onclick="window.close()">✖️ Close</button>
            </div>
        </div>
    </div>
</body>
</html>`;
        
        res.send(html);

    } catch (error) {
        console.error('❌ Get booking ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch ticket', error: error.message });
    }
};

/**
 * @desc    Update booking status (for operators and admins)
 * @route   PUT /api/bookings/:id/status
 * @access  Private (Operator/Admin only)
 */
const updateBookingStatus = async (req, res, next) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const bookingId = req.params.id;
        const { status } = req.body;
        const userRole = req.user.role;
        const userId = req.user.id;
        
        if (userRole !== 'operator' && userRole !== 'admin') {
            await connection.rollback();
            return res.status(403).json({ success: false, message: 'Not authorized to update booking status' });
        }
        
        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }
        
        const [booking] = await connection.query('SELECT * FROM bookings WHERE bookingID = ?', [bookingId]);
        
        if (booking.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        
        const bookingData = booking[0];
        const oldStatus = bookingData.status;
        
        // If changing from confirmed to cancelled, release seats
        if (oldStatus === 'confirmed' && status === 'cancelled' && bookingData.scheduleID) {
            try {
                const seatNumbers = bookingData.seatNumber.split(',');
                await Schedule.releaseSeats(bookingData.scheduleID, seatNumbers, connection);
                console.log(`✅ Released seats from schedule ${bookingData.scheduleID} due to status change`);
            } catch (releaseError) {
                console.log('⚠️ Error releasing seats:', releaseError.message);
            }
        }
        
        await connection.query('UPDATE bookings SET status = ? WHERE bookingID = ?', [status, bookingId]);
        
        await connection.commit();
        
        console.log(`✅ Booking ${bookingId} status updated to ${status} by ${userRole}`);
        
        res.json({ success: true, message: `Booking status updated to ${status}`, bookingId: parseInt(bookingId), status: status });
        
    } catch (error) {
        await connection.rollback();
        console.error('❌ Update booking status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update booking status', error: error.message });
    } finally {
        connection.release();
    }
};

module.exports = {
    getAllRoutes,
    getAvailableSchedules,
    getSeatAvailability,
    createBooking,
    getBookingDetails,
    getBookingByReference,
    getCustomerBookings,
    cancelBooking,
    getPaymentHistory,
    getBookingTicket,
    updateBookingStatus
};