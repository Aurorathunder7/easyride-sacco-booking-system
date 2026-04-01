const pool = require('../config/db');
const bcrypt = require('bcryptjs');

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
            // Check if routes table exists
            const [tables] = await pool.query(`SHOW TABLES LIKE 'routes'`);
            
            if (tables.length > 0) {
                // Check if status column exists
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

        // If no routes found in database, return sample routes
        if (routes.length === 0) {
            console.log('⚠️ No routes in database, returning sample routes');
            const sampleRoutes = [
                {
                    routeID: 1,
                    routeName: 'Nairobi-Mombasa Express',
                    origin: 'Nairobi',
                    destination: 'Mombasa',
                    distance: 485,
                    baseFare: 1500,
                    estimatedTime: '6 hours'
                },
                {
                    routeID: 2,
                    routeName: 'Nairobi-Kisumu Shuttle',
                    origin: 'Nairobi',
                    destination: 'Kisumu',
                    distance: 350,
                    baseFare: 1200,
                    estimatedTime: '5.5 hours'
                },
                {
                    routeID: 3,
                    routeName: 'Nairobi-Nakuru Route',
                    origin: 'Nairobi',
                    destination: 'Nakuru',
                    distance: 160,
                    baseFare: 500,
                    estimatedTime: '2.5 hours'
                }
            ];
            
            return res.json({
                success: true,
                routes: sampleRoutes,
                isSample: true,
                message: 'Showing sample routes. Please set up your database.'
            });
        }

        res.json({
            success: true,
            routes: routes
        });

    } catch (error) {
        console.error('❌ Get all routes error:', error);
        
        // Return sample routes as fallback
        const sampleRoutes = [
            {
                routeID: 1,
                routeName: 'Nairobi-Mombasa Express',
                origin: 'Nairobi',
                destination: 'Mombasa',
                distance: 485,
                baseFare: 1500,
                estimatedTime: '6 hours'
            },
            {
                routeID: 2,
                routeName: 'Nairobi-Kisumu Shuttle',
                origin: 'Nairobi',
                destination: 'Kisumu',
                distance: 350,
                baseFare: 1200,
                estimatedTime: '5.5 hours'
            },
            {
                routeID: 3,
                routeName: 'Nairobi-Nakuru Route',
                origin: 'Nairobi',
                destination: 'Nakuru',
                distance: 160,
                baseFare: 500,
                estimatedTime: '2.5 hours'
            }
        ];
        
        res.status(200).json({
            success: true,
            routes: sampleRoutes,
            isSample: true,
            message: 'Using sample routes due to database error',
            error: error.message
        });
    }
};

/**
 * @desc    Get available schedules for a route (ALWAYS returns schedules)
 * @route   GET /api/bookings/schedules
 * @access  Public
 */
const getAvailableSchedules = async (req, res, next) => {
    try {
        // Support both parameter names
        const routeId = req.query.routeId || req.query.route_id;
        const date = req.query.date;

        console.log('=================================');
        console.log('📡 getAvailableSchedules called');
        console.log('Query params:', req.query);
        console.log('routeId:', routeId);
        console.log('date:', date);
        console.log('=================================');

        // Validate inputs
        if (!routeId || !date) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide route ID and date',
                received: { routeId, date }
            });
        }

        // Get current time for comparison
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const isToday = date === now.toISOString().split('T')[0];
        
        console.log(`📅 Date: ${date}, Is today: ${isToday}, Current time: ${currentHour}:${currentMinute}`);

        // Get route details
        let route = null;
        try {
            const [routes] = await pool.query(
                `SELECT * FROM routes WHERE routeID = ?`,
                [routeId]
            );
            
            if (routes.length > 0) {
                route = routes[0];
                console.log(`✅ Route found: ${route.origin} → ${route.destination}, Base fare: ${route.baseFare}`);
            } else {
                console.log(`⚠️ No route found with ID: ${routeId}`);
            }
        } catch (error) {
            console.log('⚠️ Error fetching route:', error.message);
        }
        
        // If route not found in database, create a sample route
        if (!route) {
            console.log('⚠️ Route not found in database, creating sample route');
            route = {
                routeID: parseInt(routeId),
                origin: 'Nairobi',
                destination: 'Mombasa',
                baseFare: 1500,
                estimatedTime: '6'
            };
        }

        // Get all vehicles - no status column needed
        let vehicles = [];
        try {
            const [vehiclesResult] = await pool.query(`SELECT * FROM vehicles`);
            vehicles = vehiclesResult;
            console.log(`🚌 Found ${vehicles.length} vehicles in database`);
            console.log(`🚌 Vehicles details:`, vehicles);
        } catch (error) {
            console.log('⚠️ Error fetching vehicles:', error.message);
        }

        // Define departure times (8 times throughout the day)
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

        // Create vehicles to use (real or sample)
        let vehiclesToUse = [];
        
        if (vehicles.length > 0) {
            // Use real vehicles from database - handle missing columns gracefully
            vehiclesToUse = vehicles.map(v => ({
                vehicleID: v.vehicleID,
                vehicleNumber: v.vehicleNumber || `VEH${v.vehicleID}`,
                vehicleType: v.vehicleType || 'Standard',
                capacity: v.capacity || 14,
                driverName: 'Driver Assigned', // Default driver name
                isSample: false
            }));
            console.log(`✅ Using ${vehiclesToUse.length} real vehicles from database`);
            console.log(`✅ Vehicles to use:`, vehiclesToUse);
        } else {
            // Create sample vehicles for testing
            vehiclesToUse = [
                { vehicleID: 1, vehicleNumber: 'SAMPLE 001', vehicleType: 'Premium Shuttle', capacity: 14, driverName: 'John Doe', isSample: true },
                { vehicleID: 2, vehicleNumber: 'SAMPLE 002', vehicleType: 'Executive Bus', capacity: 33, driverName: 'Jane Smith', isSample: true },
                { vehicleID: 3, vehicleNumber: 'SAMPLE 003', vehicleType: 'Luxury Coach', capacity: 45, driverName: 'Mike Johnson', isSample: true }
            ];
            console.log(`⚠️ No vehicles found, using ${vehiclesToUse.length} sample vehicles for testing`);
        }

        // Generate schedules
        const schedules = [];
        const durationHours = parseInt(route.estimatedTime) || 6;
        console.log(`⏱️ Estimated duration: ${durationHours} hours`);
        console.log(`🔍 Starting schedule generation for ${vehiclesToUse.length} vehicles and ${departureTimes.length} times`);

        for (const vehicle of vehiclesToUse) {
            console.log(`🔄 Processing vehicle: ${vehicle.vehicleNumber} (ID: ${vehicle.vehicleID})`);
            
            for (const depTime of departureTimes) {
                // Skip past times for today
                if (isToday && (depTime.hour < currentHour || 
                    (depTime.hour === currentHour && depTime.minute <= currentMinute))) {
                    console.log(`⏰ Skipping past schedule: ${depTime.label} for vehicle ${vehicle.vehicleNumber}`);
                    continue;
                }

                const departureDateTime = `${date} ${depTime.time}`;
                const arrivalDateTime = new Date(departureDateTime);
                arrivalDateTime.setHours(arrivalDateTime.getHours() + durationHours);

                // Calculate available seats
                let availableSeats = vehicle.capacity;
                let bookedCount = 0;

                // Only check bookings for real vehicles
                if (!vehicle.isSample && vehicles.length > 0) {
                    try {
                        const [bookedSeats] = await pool.query(
                            `SELECT COUNT(*) as bookedCount 
                             FROM bookings 
                             WHERE vehicleID = ? 
                             AND DATE(travelDate) = ? 
                             AND status != 'cancelled'`,
                            [vehicle.vehicleID, date]
                        );
                        bookedCount = bookedSeats[0]?.bookedCount || 0;
                        availableSeats = vehicle.capacity - bookedCount;
                        console.log(`📊 Vehicle ${vehicle.vehicleNumber}: ${bookedCount} booked, ${availableSeats} available`);
                    } catch (err) {
                        console.log(`⚠️ Could not check bookings for vehicle ${vehicle.vehicleNumber}:`, err.message);
                    }
                }

                console.log(`🔍 Checking: ${depTime.label} - available seats: ${availableSeats}`);

                // Only add if seats are available
                if (availableSeats > 0) {
                    const scheduleId = vehicle.isSample 
                        ? `sample_${vehicle.vehicleID}_${depTime.time.replace(/:/g, '')}`
                        : `dynamic_${vehicle.vehicleID}_${depTime.time.replace(/:/g, '')}`;
                    
                    const schedule = {
                        scheduleID: scheduleId,
                        departureTime: departureDateTime,
                        departureTimeFormatted: depTime.label,
                        arrivalTime: arrivalDateTime.toISOString(),
                        arrivalTimeFormatted: arrivalDateTime.toLocaleTimeString(),
                        vehicleID: vehicle.vehicleID,
                        vehicleNumber: vehicle.vehicleNumber,
                        vehicleType: vehicle.vehicleType,
                        capacity: vehicle.capacity,
                        price: route.baseFare,
                        availableSeats: availableSeats,
                        bookedSeatsCount: bookedCount,
                        driverName: vehicle.driverName,
                        origin: route.origin,
                        destination: route.destination,
                        isSample: vehicle.isSample || vehicles.length === 0,
                        departureHour: depTime.hour,
                        departureMinute: depTime.minute
                    };
                    
                    schedules.push(schedule);
                    console.log(`✅ Added schedule: ${depTime.label} for ${vehicle.vehicleNumber}`);
                } else {
                    console.log(`❌ Skipped schedule: No seats available for ${vehicle.vehicleNumber} at ${depTime.label}`);
                }
            }
        }

        // Sort by departure time
        schedules.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));

        console.log(`✅ FINAL: Generated ${schedules.length} schedules total`);
        
        // If still no schedules, create emergency schedules
        if (schedules.length === 0) {
            console.log('🚨 No schedules generated, creating emergency schedules');
            
            const emergencyVehicle = { 
                vehicleID: 999, 
                vehicleNumber: 'EMERGENCY 001', 
                vehicleType: 'Emergency Shuttle', 
                capacity: 14, 
                driverName: 'Emergency Driver',
                isSample: true 
            };
            
            for (const depTime of departureTimes) {
                if (isToday && (depTime.hour < currentHour || 
                    (depTime.hour === currentHour && depTime.minute <= currentMinute))) {
                    continue;
                }
                
                const departureDateTime = `${date} ${depTime.time}`;
                const arrivalDateTime = new Date(departureDateTime);
                arrivalDateTime.setHours(arrivalDateTime.getHours() + durationHours);
                
                schedules.push({
                    scheduleID: `emergency_${depTime.time.replace(/:/g, '')}`,
                    departureTime: departureDateTime,
                    departureTimeFormatted: depTime.label,
                    arrivalTime: arrivalDateTime.toISOString(),
                    arrivalTimeFormatted: arrivalDateTime.toLocaleTimeString(),
                    vehicleID: emergencyVehicle.vehicleID,
                    vehicleNumber: emergencyVehicle.vehicleNumber,
                    vehicleType: emergencyVehicle.vehicleType,
                    capacity: emergencyVehicle.capacity,
                    price: route.baseFare,
                    availableSeats: emergencyVehicle.capacity,
                    bookedSeatsCount: 0,
                    driverName: emergencyVehicle.driverName,
                    origin: route.origin,
                    destination: route.destination,
                    isSample: true,
                    isEmergency: true,
                    departureHour: depTime.hour,
                    departureMinute: depTime.minute
                });
            }
            
            console.log(`✅ Created ${schedules.length} emergency schedules`);
        }

        // Prepare response message
        let message = '';
        if (schedules.length === 0) {
            message = 'No schedules available for this date. All departures are full or have passed.';
        } else if (vehicles.length === 0) {
            message = '⚠️ No vehicles in database. Showing sample schedules. Please add vehicles to enable real bookings.';
        } else if (schedules.some(s => s.isSample)) {
            message = 'Showing available schedules.';
        } else {
            message = `Found ${schedules.length} available schedules for ${route.origin} → ${route.destination}`;
        }

        console.log(`📤 Returning ${schedules.length} schedules to client`);

        // Return the schedules
        res.json({
            success: true,
            schedules: schedules,
            route: {
                routeID: route.routeID,
                origin: route.origin,
                destination: route.destination,
                baseFare: route.baseFare,
                estimatedTime: route.estimatedTime
            },
            message: message,
            metadata: {
                hasRealVehicles: vehicles.length > 0,
                totalVehiclesUsed: vehiclesToUse.length,
                schedulesGenerated: schedules.length,
                currentTime: {
                    hour: currentHour,
                    minute: currentMinute,
                    formatted: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
                },
                isToday: isToday,
                dateRequested: date
            }
        });

    } catch (error) {
        console.error('❌ Get available schedules error:', error);
        
        // Return sample schedules as fallback
        const sampleSchedules = generateSampleSchedules(req.query.routeId, req.query.date);
        
        res.status(200).json({
            success: true,
            schedules: sampleSchedules,
            message: 'Showing sample schedules due to database error. Please check your database configuration.',
            error: error.message
        });
    }
};

/**
 * Helper function to generate sample schedules as fallback
 */
const generateSampleSchedules = (routeId, date) => {
    const schedules = [];
    const departureTimes = [
        { time: '08:00:00', label: '8:00 AM' },
        { time: '10:00:00', label: '10:00 AM' },
        { time: '12:00:00', label: '12:00 PM' },
        { time: '14:00:00', label: '2:00 PM' },
        { time: '16:00:00', label: '4:00 PM' }
    ];
    
    const vehicles = [
        { id: 1, number: 'SAMPLE 001', type: 'Shuttle', capacity: 14, driver: 'John Doe' },
        { id: 2, number: 'SAMPLE 002', type: 'Bus', capacity: 33, driver: 'Jane Smith' }
    ];
    
    for (const vehicle of vehicles) {
        for (const depTime of departureTimes) {
            const departureDateTime = `${date} ${depTime.time}`;
            const arrivalDateTime = new Date(departureDateTime);
            arrivalDateTime.setHours(arrivalDateTime.getHours() + 6);
            
            schedules.push({
                scheduleID: `fallback_${vehicle.id}_${depTime.time.replace(/:/g, '')}`,
                departureTime: departureDateTime,
                departureTimeFormatted: depTime.label,
                arrivalTime: arrivalDateTime.toISOString(),
                vehicleID: vehicle.id,
                vehicleNumber: vehicle.number,
                vehicleType: vehicle.type,
                capacity: vehicle.capacity,
                price: 1500,
                availableSeats: vehicle.capacity,
                driverName: vehicle.driver,
                origin: 'Nairobi',
                destination: 'Mombasa',
                isSample: true
            });
        }
    }
    
    return schedules;
};

/**
 * @desc    Get seat availability for a specific schedule
 * @route   GET /api/bookings/seats/availability
 * @access  Public
 */
const getSeatAvailability = async (req, res, next) => {
    try {
        const { scheduleId, date, vehicleId } = req.query;

        console.log('🔍 Getting seat availability for:', { scheduleId, date, vehicleId });

        if ((!scheduleId && !vehicleId) || !date) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide vehicle ID and date' 
            });
        }

        // Extract vehicle ID from scheduleId if needed
        let actualVehicleId = vehicleId;
        if (!actualVehicleId && scheduleId) {
            if (scheduleId.startsWith('dynamic_')) {
                const parts = scheduleId.split('_');
                actualVehicleId = parseInt(parts[1]);
            } else if (scheduleId.startsWith('sample_')) {
                const parts = scheduleId.split('_');
                actualVehicleId = parseInt(parts[1]);
            } else if (scheduleId.startsWith('emergency_')) {
                actualVehicleId = 999;
            } else if (scheduleId.startsWith('fallback_')) {
                const parts = scheduleId.split('_');
                actualVehicleId = parseInt(parts[1]);
            }
        }

        if (!actualVehicleId) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid schedule ID' 
            });
        }

        // Get vehicle details
        let vehicle;
        
        if (actualVehicleId === 999) {
            // Emergency vehicle
            vehicle = {
                vehicleID: 999,
                vehicleNumber: 'EMERGENCY 001',
                vehicleType: 'Emergency Shuttle',
                capacity: 14
            };
        } else {
            try {
                const [vehicles] = await pool.query(
                    `SELECT * FROM vehicles WHERE vehicleID = ?`,
                    [actualVehicleId]
                );

                if (vehicles.length === 0 && (scheduleId?.startsWith('sample_') || scheduleId?.startsWith('fallback_'))) {
                    // Sample vehicle
                    vehicle = {
                        vehicleID: actualVehicleId,
                        vehicleNumber: `SAMPLE ${actualVehicleId.toString().padStart(3, '0')}`,
                        vehicleType: 'Sample Shuttle',
                        capacity: 14
                    };
                } else if (vehicles.length === 0) {
                    return res.status(404).json({ 
                        success: false,
                        message: 'Vehicle not found' 
                    });
                } else {
                    vehicle = vehicles[0];
                }
            } catch (error) {
                console.log('⚠️ Error fetching vehicle:', error.message);
                // Return sample vehicle as fallback
                vehicle = {
                    vehicleID: actualVehicleId,
                    vehicleNumber: `SAMPLE ${actualVehicleId.toString().padStart(3, '0')}`,
                    vehicleType: 'Sample Shuttle',
                    capacity: 14
                };
            }
        }

        // Get booked seats for this vehicle on this date
        let bookedSeatNumbers = [];
        
        if (actualVehicleId !== 999 && !scheduleId?.startsWith('sample_') && !scheduleId?.startsWith('fallback_')) {
            try {
                const [tables] = await pool.query(`SHOW TABLES LIKE 'bookings'`);
                if (tables.length > 0) {
                    const [bookedSeats] = await pool.query(
                        `SELECT seatNumber FROM bookings 
                         WHERE vehicleID = ? 
                         AND DATE(travelDate) = ? 
                         AND status != 'cancelled'`,
                        [actualVehicleId, date]
                    );
                    bookedSeatNumbers = bookedSeats.map(b => b.seatNumber);
                }
            } catch (error) {
                console.log('⚠️ Error fetching booked seats:', error.message);
            }
        }
        
        // Generate seat layout
        const seatLayout = generateSeatLayout(vehicle.capacity, vehicle.vehicleType);
        
        // Mark booked seats
        const seats = seatLayout.map(seat => ({
            ...seat,
            isBooked: bookedSeatNumbers.includes(seat.number),
            isAvailable: !bookedSeatNumbers.includes(seat.number)
        }));

        res.json({
            success: true,
            vehicle: {
                id: vehicle.vehicleID,
                number: vehicle.vehicleNumber,
                type: vehicle.vehicleType,
                capacity: vehicle.capacity
            },
            seats,
            availableCount: seats.filter(s => s.isAvailable).length,
            bookedSeats: bookedSeatNumbers
        });

    } catch (error) {
        console.error('❌ Get seat availability error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch seat availability',
            error: error.message 
        });
    }
};

/**
 * @desc    Create a new booking (allows customers and operators)
 * @route   POST /api/bookings
 * @access  Private (Customer or Operator)
 */
const createBooking = async (req, res, next) => {
    const connection = await pool.getConnection();
    
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        
        console.log(`📝 Creating booking for user ${userId} with role ${userRole}`);
        
        const {
            routeId,
            vehicleId,
            seatNumbers,
            travelDate,
            passengerDetails,
            existingCustomerId,
            newCustomer,
            paymentMethod = 'mpesa'
        } = req.body;

        // Validate required fields
        if (!routeId || !vehicleId || !seatNumbers || !travelDate) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing required booking information: routeId, vehicleId, seatNumbers, travelDate' 
            });
        }

        await connection.beginTransaction();

        // Get route details
        let routeData;
        try {
            const [routes] = await connection.query(
                `SELECT * FROM routes WHERE routeID = ?`,
                [routeId]
            );

            if (routes.length === 0) {
                // Use sample route data
                routeData = {
                    routeID: routeId,
                    origin: 'Nairobi',
                    destination: 'Mombasa',
                    baseFare: 1500,
                    estimatedTime: '6 hours'
                };
                console.log('⚠️ Using sample route data');
            } else {
                routeData = routes[0];
            }
        } catch (error) {
            console.log('⚠️ Error fetching route, using sample data:', error.message);
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
        let isSampleBooking = false;
        
        try {
            const [vehicles] = await connection.query(
                `SELECT * FROM vehicles WHERE vehicleID = ?`,
                [vehicleId]
            );

            if (vehicles.length === 0) {
                console.log('⚠️ Vehicle not found in database, creating sample vehicle for booking');
                isSampleBooking = true;
                
                if (vehicleId === 999) {
                    vehicleData = {
                        vehicleID: 999,
                        vehicleNumber: 'EMERGENCY 001',
                        vehicleType: 'Emergency Shuttle',
                        capacity: 14
                    };
                } else {
                    vehicleData = {
                        vehicleID: vehicleId,
                        vehicleNumber: `SAMPLE ${vehicleId.toString().padStart(3, '0')}`,
                        vehicleType: 'Sample Vehicle',
                        capacity: 14
                    };
                }
            } else {
                vehicleData = vehicles[0];
            }
        } catch (error) {
            console.log('⚠️ Error fetching vehicle, using sample data:', error.message);
            isSampleBooking = true;
            vehicleData = {
                vehicleID: vehicleId,
                vehicleNumber: `SAMPLE ${vehicleId.toString().padStart(3, '0')}`,
                vehicleType: 'Sample Vehicle',
                capacity: 14
            };
        }

        const seatArray = Array.isArray(seatNumbers) ? seatNumbers : [seatNumbers];
        const totalAmount = routeData.baseFare * seatArray.length;

        // Check seat availability for real vehicles only
        if (!isSampleBooking) {
            try {
                const [tables] = await connection.query(`SHOW TABLES LIKE 'bookings'`);
                if (tables.length > 0) {
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
                }
            } catch (error) {
                console.log('⚠️ Error checking seat availability:', error.message);
            }
        }

        // Get customer info
        let customerId = null;
        let customerName = '';
        let customerPhone = '';
        
        if (userRole === 'customer') {
            // Customer booking for themselves
            try {
                const [customer] = await connection.query(
                    `SELECT custID, customerName, phoneNumber FROM customers WHERE custID = ?`,
                    [userId]
                );
                
                if (customer.length === 0) {
                    await connection.rollback();
                    return res.status(404).json({ 
                        success: false,
                        message: 'Customer not found' 
                    });
                }
                
                customerId = customer[0].custID;
                customerName = passengerDetails?.name || customer[0].customerName;
                customerPhone = passengerDetails?.phone || customer[0].phoneNumber;
            } catch (error) {
                await connection.rollback();
                return res.status(500).json({ 
                    success: false,
                    message: 'Error fetching customer details',
                    error: error.message
                });
            }
            
        } else if (userRole === 'operator') {
            // Operator booking - handle existing or new customer
            if (existingCustomerId) {
                // Use existing customer
                try {
                    const [customer] = await connection.query(
                        `SELECT custID, customerName, phoneNumber FROM customers WHERE custID = ?`,
                        [existingCustomerId]
                    );
                    
                    if (customer.length === 0) {
                        await connection.rollback();
                        return res.status(404).json({ 
                            success: false,
                            message: 'Customer not found' 
                        });
                    }
                    
                    customerId = customer[0].custID;
                    customerName = customer[0].customerName;
                    customerPhone = customer[0].phoneNumber;
                    console.log(`✅ Using existing customer: ${customerId}`);
                } catch (error) {
                    await connection.rollback();
                    return res.status(500).json({ 
                        success: false,
                        message: 'Error fetching customer',
                        error: error.message
                    });
                }
                
            } else if (newCustomer) {
                // Create new customer with defaults for missing fields
                const { 
                    customerName: newName, 
                    phoneNumber, 
                    email, 
                    dob, 
                    gender, 
                    address 
                } = newCustomer;
                
                console.log('📝 Creating new customer with data:', { newName, phoneNumber, email, dob, gender, address });
                
                // Validate required fields (only name and phone are required)
                if (!newName || !phoneNumber) {
                    await connection.rollback();
                    return res.status(400).json({ 
                        success: false,
                        message: 'Missing required customer information: name and phone are required' 
                    });
                }
                
                try {
                    // First check if customer already exists by phone
                    let [existingByPhone] = await connection.query(
                        `SELECT custID, customerName, phoneNumber, email FROM customers WHERE phoneNumber = ?`,
                        [phoneNumber]
                    );
                    
                    if (existingByPhone.length > 0) {
                        customerId = existingByPhone[0].custID;
                        customerName = existingByPhone[0].customerName;
                        customerPhone = existingByPhone[0].phoneNumber;
                        console.log(`✅ Customer already exists with phone ${phoneNumber}, using existing: ${customerId}`);
                    } else {
                        // Check if customer already exists by email
                        if (email && email.trim()) {
                            const [existingByEmail] = await connection.query(
                                `SELECT custID, customerName, phoneNumber, email FROM customers WHERE email = ?`,
                                [email.trim()]
                            );
                            
                            if (existingByEmail.length > 0) {
                                customerId = existingByEmail[0].custID;
                                customerName = existingByEmail[0].customerName;
                                customerPhone = existingByEmail[0].phoneNumber;
                                console.log(`✅ Customer already exists with email ${email}, using existing: ${customerId}`);
                            }
                        }
                    }
                    
                    // If no existing customer found, create a new one
                    if (!customerId) {
                        // Generate a unique email if not provided or if it would cause a duplicate
                        let finalEmail = email && email.trim() ? email : `${phoneNumber}@temp.com`;
                        
                        // Check if email already exists and generate a unique one if needed
                        let emailExists = true;
                        let emailCounter = 1;
                        let uniqueEmail = finalEmail;
                        
                        while (emailExists) {
                            const [emailCheck] = await connection.query(
                                `SELECT email FROM customers WHERE email = ?`,
                                [uniqueEmail]
                            );
                            
                            if (emailCheck.length === 0) {
                                emailExists = false;
                            } else {
                                // Generate a unique email with a number suffix
                                const emailParts = finalEmail.split('@');
                                uniqueEmail = `${emailParts[0]}${emailCounter}@${emailParts[1]}`;
                                emailCounter++;
                                console.log(`⚠️ Email conflict, trying: ${uniqueEmail}`);
                            }
                        }
                        
                        // Use defaults for missing fields
                        const defaultPassword = 'default123';
                        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
                        const customerDob = dob || '2000-01-01';
                        const customerGender = gender || 'Other';
                        const customerAddress = address || 'N/A';
                        
                        const [result] = await connection.query(
                            `INSERT INTO customers (
                                customerName, 
                                phoneNumber, 
                                email, 
                                dob, 
                                gender, 
                                address, 
                                password, 
                                createdAt
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                            [
                                newName, 
                                phoneNumber, 
                                uniqueEmail, 
                                customerDob, 
                                customerGender, 
                                customerAddress, 
                                hashedPassword
                            ]
                        );
                        customerId = result.insertId;
                        console.log(`✅ Created new customer: ${customerId} with email: ${uniqueEmail}`);
                    }
                    
                    customerName = customerName || newName;
                    customerPhone = customerPhone || phoneNumber;
                } catch (error) {
                    console.error('❌ Error creating customer:', error);
                    await connection.rollback();
                    return res.status(500).json({ 
                        success: false,
                        message: 'Error creating customer: ' + error.message,
                        error: error.message
                    });
                }
            } else {
                await connection.rollback();
                return res.status(400).json({ 
                    success: false,
                    message: 'Please provide either existing customer ID or new customer details' 
                });
            }
        }

        if (!customerId) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false,
                message: 'Could not determine customer' 
            });
        }

        // Create booking
        let bookingId;
        try {
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
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', NOW())`,
                [
                    customerId,
                    customerName,
                    customerPhone,
                    vehicleData.vehicleID,
                    vehicleData.vehicleNumber,
                    seatArray.join(','),
                    routeId,
                    `${routeData.origin} → ${routeData.destination}`,
                    travelDate
                ]
            );
            bookingId = bookingResult.insertId;
            console.log(`✅ Booking record created with ID: ${bookingId}`);
            
        } catch (error) {
            await connection.rollback();
            console.error('❌ Error creating booking:', error);
            return res.status(500).json({ 
                success: false,
                message: 'Failed to create booking record',
                error: error.message
            });
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

        // Create payment record if payments table exists
        if (hasPaymentsTable) {
            try {
                const [columns] = await connection.query(`SHOW COLUMNS FROM payments`);
                const columnNames = columns.map(col => col.Field);
                
                let paymentFields = [];
                let paymentValues = [];
                
                if (columnNames.includes('bookingID')) {
                    paymentFields.push('bookingID');
                    paymentValues.push(bookingId);
                }
                if (columnNames.includes('custID')) {
                    paymentFields.push('custID');
                    paymentValues.push(customerId);
                }
                if (columnNames.includes('customerName')) {
                    paymentFields.push('customerName');
                    paymentValues.push(customerName);
                }
                if (columnNames.includes('phoneNumber')) {
                    paymentFields.push('phoneNumber');
                    paymentValues.push(customerPhone);
                }
                if (columnNames.includes('amount')) {
                    paymentFields.push('amount');
                    paymentValues.push(totalAmount);
                }
                if (columnNames.includes('paymentMethod')) {
                    paymentFields.push('paymentMethod');
                    paymentValues.push(paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod === 'cash' ? 'Cash' : 'Card');
                }
                if (columnNames.includes('mpesaCode')) {
                    const paymentReference = `MP${Date.now().toString().slice(-8)}`;
                    paymentFields.push('mpesaCode');
                    paymentValues.push(paymentReference);
                }
                if (columnNames.includes('status')) {
                    const paymentStatus = paymentMethod === 'mpesa' ? 'completed' : 'pending';
                    paymentFields.push('status');
                    paymentValues.push(paymentStatus);
                }
                if (columnNames.includes('paymentDate')) {
                    paymentFields.push('paymentDate');
                    paymentValues.push(new Date());
                }
                
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
 * @desc    Get booking details by ID
 * @route   GET /api/bookings/:id
 * @access  Private
 */
const getBookingDetails = async (req, res, next) => {
    try {
        const bookingId = req.params.id;
        const customerId = req.user.id;

        const [booking] = await pool.query(
            `SELECT 
                b.*,
                r.origin,
                r.destination,
                r.estimatedTime,
                v.vehicleNumber,
                v.vehicleType,
                p.amount as paidAmount,
                p.status as paymentStatus,
                p.paymentDate,
                p.mpesaCode
             FROM bookings b
             LEFT JOIN routes r ON b.routeID = r.routeID
             LEFT JOIN vehicles v ON b.vehicleID = v.vehicleID
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

        const bookingData = booking[0];
        const bookingReference = `ER${bookingData.bookingID}`;
        
        const [payment] = await pool.query(
            `SELECT amount FROM payments WHERE bookingID = ?`,
            [bookingId]
        );
        const amount = payment[0]?.amount || 0;
        
        // Format seats - handle different data types safely
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
                email: bookingData.passengerEmail,
                idNumber: bookingData.passengerIdNumber,
                route: {
                    origin: bookingData.origin || 'Nairobi',
                    destination: bookingData.destination || 'Mombasa',
                    duration: bookingData.estimatedTime || '6 hours'
                },
                vehicle: {
                    number: bookingData.vehicleNumber || 'SAMPLE 001',
                    type: bookingData.vehicleType || 'Shuttle'
                },
                seats: seats,
                travelDate: bookingData.travelDate,
                bookingDate: bookingData.bookingDate,
                amount: amount,
                status: bookingData.status,
                paymentStatus: bookingData.paymentStatus || 'pending',
                payment: bookingData.paidAmount ? {
                    amount: bookingData.paidAmount,
                    status: bookingData.paymentStatus,
                    date: bookingData.paymentDate,
                    mpesaCode: bookingData.mpesaCode
                } : null
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
 * @desc    Get booking by reference number
 * @route   GET /api/bookings/reference/:reference
 * @access  Public
 */
const getBookingByReference = async (req, res, next) => {
    try {
        const { reference } = req.params;
        const bookingId = parseInt(reference.replace('ER', ''));
        
        if (isNaN(bookingId)) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        const [booking] = await pool.query(
            `SELECT 
                b.*,
                c.customerName,
                c.phoneNumber,
                c.email,
                r.origin,
                r.destination,
                v.vehicleNumber,
                p.amount as paidAmount
             FROM bookings b
             LEFT JOIN customers c ON b.custID = c.custID
             LEFT JOIN routes r ON b.routeID = r.routeID
             LEFT JOIN vehicles v ON b.vehicleID = v.vehicleID
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
            `SELECT 
                b.bookingID as id,
                b.bookingID,
                CONCAT('ER', b.bookingID) as bookingReference,
                b.route,
                b.seatNumber,
                b.travelDate,
                COALESCE(p.amount, 0) as amount,
                b.status,
                b.bookingDate,
                v.vehicleNumber,
                p.status as paymentStatus,
                p.mpesaCode
             FROM bookings b
             LEFT JOIN vehicles v ON b.vehicleID = v.vehicleID
             LEFT JOIN payments p ON b.bookingID = p.bookingID
             WHERE b.custID = ?
             ORDER BY b.bookingDate DESC`,
            [customerId]
        );

        res.json({
            success: true,
            bookings: bookings || []
        });

    } catch (error) {
        console.error('❌ Get customer bookings error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch bookings',
            error: error.message 
        });
    }
};

/**
 * @desc    Cancel a booking (30 minute cancellation policy) - WITH CANCELLATION EMAIL
 * @route   PUT /api/bookings/:id/cancel
 * @access  Private (Customer or Operator)
 */
const cancelBooking = async (req, res, next) => {
    try {
        const bookingId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        console.log(`🔍 Attempting to cancel booking ${bookingId} for user ${userId} with role ${userRole}`);

        // Build query based on user role
        let query = `SELECT * FROM bookings WHERE bookingID = ?`;
        let queryParams = [bookingId];
        
        // If it's a customer, also check they own the booking
        if (userRole === 'customer') {
            query += ` AND custID = ?`;
            queryParams.push(userId);
        }

        const [booking] = await pool.query(query, queryParams);

        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        const bookingData = booking[0];
        const travelDate = new Date(bookingData.travelDate);
        const now = new Date();
        const minutesUntilTravel = (travelDate - now) / (1000 * 60);

        if (minutesUntilTravel < 30) {
            return res.status(400).json({ 
                success: false,
                message: `Bookings can only be cancelled at least 30 minutes before departure. You have ${Math.max(0, Math.floor(minutesUntilTravel))} minutes remaining.` 
            });
        }

        if (bookingData.status === 'cancelled') {
            return res.status(400).json({ 
                success: false,
                message: 'Booking is already cancelled' 
            });
        }

        // Get booking details for email before updating
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

        // Update booking status
        await pool.query(
            `UPDATE bookings SET status = 'cancelled' WHERE bookingID = ?`,
            [bookingId]
        );
        
        // Update payment status if exists
        await pool.query(
            `UPDATE payments SET status = 'cancelled' WHERE bookingID = ?`,
            [bookingId]
        );

        console.log(`✅ Booking ${bookingId} cancelled successfully by ${userRole}`);

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
 * @desc    Get customer payment history
 * @route   GET /api/bookings/payments
 * @access  Private
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
                b.travelDate,
                CONCAT('ER', b.bookingID) as bookingReference
             FROM payments p
             JOIN bookings b ON p.bookingID = b.bookingID
             WHERE b.custID = ?
             ORDER BY p.paymentDate DESC`,
            [customerId]
        );

        res.json({
            success: true,
            payments: payments || []
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
 * Helper function to generate seat layout
 */
const generateSeatLayout = (capacity, vehicleType) => {
    const seats = [];
    
    if (vehicleType === 'Shuttle' || capacity <= 14) {
        const rows = Math.ceil(capacity / 4);
        for (let row = 1; row <= rows; row++) {
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

/**
 * @desc    Get booking ticket (HTML view)
 * @route   GET /api/bookings/:id/ticket
 * @access  Private (Customer or Operator)
 */
const getBookingTicket = async (req, res, next) => {
    try {
        let userId = req.user?.id;
        let userRole = req.user?.role;
        
        // If no user in request, check for token in query params (for new window requests)
        if (!userId && req.query.token) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
                userId = decoded.id;
                userRole = decoded.role;
                console.log('✅ Token from query params verified for user:', userId);
            } catch (tokenError) {
                console.log('⚠️ Invalid token in query params:', tokenError.message);
            }
        }
        
        const bookingId = req.params.id;
        
        // If still no user, return unauthorized
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, no token'
            });
        }

        console.log(`📄 Fetching ticket for booking ${bookingId}, user ${userId}, role ${userRole}`);

        // Build query based on user role
        let query = `
            SELECT 
                b.*,
                c.customerName,
                c.phoneNumber,
                c.email,
                r.origin,
                r.destination,
                r.estimatedTime as duration,
                v.vehicleNumber,
                v.vehicleType,
                p.amount as paidAmount,
                p.mpesaCode,
                p.status as paymentStatus,
                p.paymentDate
            FROM bookings b
            LEFT JOIN customers c ON b.custID = c.custID
            LEFT JOIN routes r ON b.routeID = r.routeID
            LEFT JOIN vehicles v ON b.vehicleID = v.vehicleID
            LEFT JOIN payments p ON b.bookingID = p.bookingID
            WHERE b.bookingID = ?
        `;
        
        const queryParams = [bookingId];
        
        // If user is customer, ensure they own the booking
        if (userRole === 'customer') {
            query += ` AND b.custID = ?`;
            queryParams.push(userId);
        }

        const [booking] = await pool.query(query, queryParams);

        if (booking.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found or you do not have permission to view it'
            });
        }

        const bookingData = booking[0];
        const bookingReference = `ER${bookingData.bookingID}`;

        // Format seats - handle different data types safely
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
        
        // Format travel date safely
        let formattedDate = 'N/A';
        let formattedTime = 'N/A';
        if (bookingData.travelDate) {
            const travelDate = new Date(bookingData.travelDate);
            if (!isNaN(travelDate.getTime())) {
                formattedDate = travelDate.toLocaleDateString('en-KE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                formattedTime = travelDate.toLocaleTimeString('en-KE', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        }

        // Format booking date safely
        let formattedBookingDate = 'N/A';
        if (bookingData.bookingDate) {
            const bookingDate = new Date(bookingData.bookingDate);
            if (!isNaN(bookingDate.getTime())) {
                formattedBookingDate = bookingDate.toLocaleDateString('en-KE', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        }

        // Helper function to escape HTML
        const escapeHtml = (str) => {
            if (!str) return '';
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

        // Helper function for status class
        const getStatusClass = (status, paymentStatus) => {
            const statusLower = status?.toLowerCase() || '';
            if (statusLower === 'cancelled') return 'status-cancelled';
            if (paymentStatus === 'completed') return 'status-confirmed';
            return 'status-pending';
        };

        // Helper function for status text
        const getStatusText = (status, paymentStatus) => {
            const statusLower = status?.toLowerCase() || '';
            if (statusLower === 'cancelled') return '❌ CANCELLED';
            if (paymentStatus === 'completed') return '✅ PAID & CONFIRMED';
            return '⏳ PENDING PAYMENT';
        };

        // Return HTML ticket
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EasyRide Ticket - ${escapeHtml(bookingReference)}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #fef9e8 0%, #fff5e6 100%);
            min-height: 100vh;
            padding: 40px 20px;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .ticket {
            max-width: 600px;
            width: 100%;
            background: white;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 20px 40px -10px rgba(0,0,0,0.15);
            position: relative;
        }
        
        .ticket::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b);
        }
        
        .header {
            background: linear-gradient(135deg, #d97706, #f59e0b);
            color: white;
            padding: 30px 25px;
            text-align: center;
            position: relative;
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
        
        .reference {
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
        
        .section {
            margin-bottom: 25px;
        }
        
        .section-title {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #f59e0b;
            font-weight: 600;
            margin-bottom: 12px;
            border-left: 3px solid #f59e0b;
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
            margin-top: 10px;
            justify-content: flex-end;
        }
        
        .seat-badge {
            background: #10b981;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: bold;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 15px 0;
            margin-top: 10px;
            border-top: 2px solid #f59e0b;
            border-bottom: 2px solid #f59e0b;
        }
        
        .total-label {
            font-size: 18px;
            font-weight: bold;
            color: #78350f;
        }
        
        .total-amount {
            font-size: 24px;
            font-weight: bold;
            color: #d97706;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .status-confirmed {
            background: #d1fae5;
            color: #065f46;
        }
        
        .status-pending {
            background: #fed7aa;
            color: #92400e;
        }
        
        .status-cancelled {
            background: #fee2e2;
            color: #991b1b;
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
        
        .button-group {
            margin-top: 20px;
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        
        .print-btn {
            background: #f59e0b;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.3s;
        }
        
        .print-btn:hover {
            background: #d97706;
            transform: translateY(-2px);
        }
        
        .back-btn {
            background: #78350f;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.3s;
        }
        
        .back-btn:hover {
            background: #5a2a0c;
            transform: translateY(-2px);
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .print-btn, .back-btn {
                display: none;
            }
            .ticket {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="ticket">
        <div class="header">
            <h1>
                <span>🚌</span>
                EasyRide
                <span>🎫</span>
            </h1>
            <p>Your Travel Companion</p>
            <div class="reference">${escapeHtml(bookingReference)}</div>
        </div>
        
        <div class="content">
            <div class="section">
                <div class="section-title">PASSENGER DETAILS</div>
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${escapeHtml(bookingData.customerName || 'N/A')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${escapeHtml(bookingData.phoneNumber || 'N/A')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${escapeHtml(bookingData.email || 'N/A')}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">JOURNEY DETAILS</div>
                <div class="info-row">
                    <span class="info-label">Route:</span>
                    <span class="info-value">${escapeHtml(bookingData.origin || 'Nairobi')} → ${escapeHtml(bookingData.destination || 'Mombasa')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${formattedDate}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Time:</span>
                    <span class="info-value">${formattedTime}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Duration:</span>
                    <span class="info-value">${escapeHtml(bookingData.duration || '6 hours')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Booked On:</span>
                    <span class="info-value">${formattedBookingDate}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">VEHICLE & SEATS</div>
                <div class="info-row">
                    <span class="info-label">Vehicle:</span>
                    <span class="info-value">${escapeHtml(bookingData.vehicleNumber || 'SAMPLE 001')} (${escapeHtml(bookingData.vehicleType || 'Shuttle')})</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Seats:</span>
                    <span class="info-value">
                        <div class="seats">
                            ${seats.map(seat => `<span class="seat-badge">Seat ${escapeHtml(seat)}</span>`).join('')}
                        </div>
                    </span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">PAYMENT DETAILS</div>
                <div class="info-row">
                    <span class="info-label">Amount:</span>
                    <span class="info-value">KSh ${bookingData.paidAmount || 0}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">M-Pesa Code:</span>
                    <span class="info-value">${escapeHtml(bookingData.mpesaCode || 'N/A')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value">
                        <span class="status-badge ${getStatusClass(bookingData.status, bookingData.paymentStatus)}">
                            ${getStatusText(bookingData.status, bookingData.paymentStatus)}
                        </span>
                    </span>
                </div>
            </div>
            
            <div class="total-row">
                <span class="total-label">Total Paid:</span>
                <span class="total-amount">KSh ${bookingData.paidAmount || 0}</span>
            </div>
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
</html>
        `;
        
        res.send(html);

    } catch (error) {
        console.error('❌ Get booking ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ticket',
            error: error.message
        });
    }
};

/**
 * @desc    Update booking status (for operators and admins)
 * @route   PUT /api/bookings/:id/status
 * @access  Private (Operator/Admin only)
 */
const updateBookingStatus = async (req, res, next) => {
    try {
        const bookingId = req.params.id;
        const { status } = req.body;
        const userRole = req.user.role;
        const userId = req.user.id;
        
        // Only operators and admins can update status
        if (userRole !== 'operator' && userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update booking status'
            });
        }
        
        // Valid statuses
        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }
        
        // Check if booking exists
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
        
        // Update booking status
        await pool.query(
            'UPDATE bookings SET status = ? WHERE bookingID = ?',
            [status, bookingId]
        );
        
        console.log(`✅ Booking ${bookingId} status updated to ${status} by ${userRole} (ID: ${userId})`);
        
        res.json({
            success: true,
            message: `Booking status updated to ${status}`,
            bookingId: parseInt(bookingId),
            status: status
        });
        
    } catch (error) {
        console.error('❌ Update booking status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booking status',
            error: error.message
        });
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