const { promisePool } = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * @desc    Get admin dashboard data
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
const getDashboard = async (req, res, next) => {
    try {
        // Get counts
        const [counts] = await promisePool.query(`
            SELECT 
                (SELECT COUNT(*) FROM operators) as totalOperators,
                (SELECT COUNT(*) FROM customers) as totalCustomers,
                (SELECT COUNT(*) FROM routes WHERE isActive = 1) as activeRoutes,
                (SELECT COUNT(*) FROM vehicles WHERE isActive = 1) as activeVehicles,
                (SELECT COUNT(*) FROM bookings WHERE DATE(createdAt) = CURDATE()) as todayBookings,
                (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pendingBookings,
                (SELECT COALESCE(SUM(totalAmount), 0) FROM bookings WHERE paymentStatus = 'paid') as totalRevenue,
                (SELECT COALESCE(SUM(totalAmount), 0) FROM bookings WHERE DATE(createdAt) = CURDATE() AND paymentStatus = 'paid') as todayRevenue
        `);

        // Get recent activities
        const [recentActivities] = await promisePool.query(`
            SELECT 
                'booking' as type,
                CONCAT('New booking: ', b.bookingReference) as description,
                b.createdAt as timestamp,
                c.customerName as user
            FROM bookings b
            JOIN customers c ON b.customerID = c.custID
            ORDER BY b.createdAt DESC
            LIMIT 10
        `);

        // Get system alerts
        const [alerts] = await promisePool.query(`
            SELECT 
                'warning' as severity,
                'Low vehicle capacity' as message,
                COUNT(*) as count
            FROM vehicles v
            LEFT JOIN bookings b ON v.vehicleID = b.vehicleID AND DATE(b.travelDate) = CURDATE()
            WHERE v.isActive = 1
            GROUP BY v.vehicleID
            HAVING (v.capacity - COUNT(b.bookingID)) < 5
        `);

        res.json({
            success: true,
            stats: counts[0],
            recentActivities,
            alerts
        });

    } catch (error) {
        console.error('❌ Admin dashboard error:', error);
        next(error);
    }
};

// ====================
// OPERATOR MANAGEMENT
// ====================

/**
 * @desc    Get all operators
 * @route   GET /api/admin/operators
 * @access  Private (Admin only)
 */
const getOperators = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;

        let query = `
            SELECT 
                opID,
                employeeID,
                operatorName,
                opEmail,
                phoneNum,
                officeLocation,
                shift,
                isActive,
                canBookTickets,
                canIssueRefunds,
                canOverridePricing,
                canViewReports,
                employmentDate,
                lastLogin,
                createdAt
            FROM operators
            WHERE 1=1
        `;

        const queryParams = [];

        if (search) {
            query += ` AND (operatorName LIKE ? OR opEmail LIKE ? OR employeeID LIKE ?)`;
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        if (status === 'active') {
            query += ` AND isActive = 1`;
        } else if (status === 'inactive') {
            query += ` AND isActive = 0`;
        }

        // Get total count
        const [countResult] = await promisePool.query(
            `SELECT COUNT(*) as total FROM (${query}) as countQuery`,
            queryParams
        );
        const total = countResult[0].total;

        // Add pagination
        const offset = (page - 1) * limit;
        query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), offset);

        const [operators] = await promisePool.query(query, queryParams);

        res.json({
            success: true,
            operators,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Get operators error:', error);
        next(error);
    }
};

/**
 * @desc    Get single operator by ID
 * @route   GET /api/admin/operators/:id
 * @access  Private (Admin only)
 */
const getOperatorById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [operator] = await promisePool.query(
            `SELECT 
                opID,
                employeeID,
                operatorName,
                opEmail,
                phoneNum,
                dob,
                gender,
                address,
                idNumber,
                officeLocation,
                shift,
                employmentDate,
                emergencyContact,
                emergencyName,
                isActive,
                canBookTickets,
                canIssueRefunds,
                canOverridePricing,
                canViewReports,
                lastLogin,
                createdAt
             FROM operators 
             WHERE opID = ?`,
            [id]
        );

        if (operator.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Operator not found' 
            });
        }

        res.json({
            success: true,
            operator: operator[0]
        });

    } catch (error) {
        console.error('❌ Get operator by ID error:', error);
        next(error);
    }
};

/**
 * @desc    Create new operator
 * @route   POST /api/admin/operators
 * @access  Private (Admin only)
 */
const createOperator = async (req, res, next) => {
    try {
        const {
            employeeID,
            operatorName,
            opEmail,
            phoneNum,
            dob,
            gender,
            address,
            idNumber,
            officeLocation,
            shift,
            employmentDate,
            emergencyContact,
            emergencyName,
            canBookTickets,
            canIssueRefunds,
            canOverridePricing,
            canViewReports
        } = req.body;

        // Validate required fields
        if (!employeeID || !operatorName || !opEmail || !phoneNum || !dob || !gender || !address || !officeLocation || !shift || !employmentDate) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide all required fields' 
            });
        }

        // Check if email already exists
        const [existingEmail] = await promisePool.query(
            'SELECT * FROM operators WHERE opEmail = ?',
            [opEmail]
        );
        if (existingEmail.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Email already in use' 
            });
        }

        // Check if employee ID already exists
        const [existingEmpId] = await promisePool.query(
            'SELECT * FROM operators WHERE employeeID = ?',
            [employeeID]
        );
        if (existingEmpId.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Employee ID already in use' 
            });
        }

        // Insert new operator with default password
        const defaultPassword = 'default123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        const [result] = await promisePool.query(
            `INSERT INTO operators (
                employeeID, operatorName, opEmail, phoneNum, dob, gender,
                address, idNumber, officeLocation, shift, employmentDate,
                emergencyContact, emergencyName, password,
                canBookTickets, canIssueRefunds, canOverridePricing, canViewReports,
                requiresPasswordChange
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                employeeID, operatorName, opEmail, phoneNum, dob, gender,
                address, idNumber || null, officeLocation, shift, employmentDate,
                emergencyContact || null, emergencyName || null, hashedPassword,
                canBookTickets || 1, canIssueRefunds || 0, canOverridePricing || 0, canViewReports || 0
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Operator created successfully',
            operatorId: result.insertId,
            defaultPassword: 'default123'
        });

    } catch (error) {
        console.error('❌ Create operator error:', error);
        next(error);
    }
};

/**
 * @desc    Update operator
 * @route   PUT /api/admin/operators/:id
 * @access  Private (Admin only)
 */
const updateOperator = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Remove fields that shouldn't be updated directly
        delete updates.opID;
        delete updates.password;
        delete updates.createdAt;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'No fields to update' 
            });
        }

        // Check if operator exists
        const [operator] = await promisePool.query(
            'SELECT * FROM operators WHERE opID = ?',
            [id]
        );
        if (operator.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Operator not found' 
            });
        }

        // Build update query
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        await promisePool.query(
            `UPDATE operators SET ${setClause} WHERE opID = ?`,
            values
        );

        res.json({
            success: true,
            message: 'Operator updated successfully'
        });

    } catch (error) {
        console.error('❌ Update operator error:', error);
        next(error);
    }
};

/**
 * @desc    Delete operator
 * @route   DELETE /api/admin/operators/:id
 * @access  Private (Admin only)
 */
const deleteOperator = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if operator exists
        const [operator] = await promisePool.query(
            'SELECT * FROM operators WHERE opID = ?',
            [id]
        );
        if (operator.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Operator not found' 
            });
        }

        // Check if operator has any bookings
        const [bookings] = await promisePool.query(
            'SELECT * FROM bookings WHERE bookedBy = ? LIMIT 1',
            [id]
        );
        if (bookings.length > 0) {
            // Soft delete - just deactivate
            await promisePool.query(
                'UPDATE operators SET isActive = 0 WHERE opID = ?',
                [id]
            );
            return res.json({
                success: true,
                message: 'Operator deactivated (has existing bookings)'
            });
        }

        // Hard delete if no bookings
        await promisePool.query('DELETE FROM operators WHERE opID = ?', [id]);

        res.json({
            success: true,
            message: 'Operator deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete operator error:', error);
        next(error);
    }
};

/**
 * @desc    Toggle operator active status
 * @route   PATCH /api/admin/operators/:id/toggle-status
 * @access  Private (Admin only)
 */
const toggleOperatorStatus = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [operator] = await promisePool.query(
            'SELECT isActive FROM operators WHERE opID = ?',
            [id]
        );
        if (operator.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Operator not found' 
            });
        }

        const newStatus = operator[0].isActive ? 0 : 1;

        await promisePool.query(
            'UPDATE operators SET isActive = ? WHERE opID = ?',
            [newStatus, id]
        );

        res.json({
            success: true,
            message: `Operator ${newStatus ? 'activated' : 'deactivated'} successfully`
        });

    } catch (error) {
        console.error('❌ Toggle operator status error:', error);
        next(error);
    }
};

// ====================
// ROUTE MANAGEMENT
// ====================

/**
 * @desc    Get all routes
 * @route   GET /api/admin/routes
 * @access  Private (Admin only)
 */
const getRoutes = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;

        let query = `
            SELECT 
                routeID,
                routeCode,
                origin,
                destination,
                distance,
                basePrice,
                estimatedTime,
                isActive,
                createdAt
            FROM routes
            WHERE 1=1
        `;

        const queryParams = [];

        if (search) {
            query += ` AND (routeCode LIKE ? OR origin LIKE ? OR destination LIKE ?)`;
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        if (status === 'active') {
            query += ` AND isActive = 1`;
        } else if (status === 'inactive') {
            query += ` AND isActive = 0`;
        }

        const [routes] = await promisePool.query(query, queryParams);

        res.json({
            success: true,
            routes
        });

    } catch (error) {
        console.error('❌ Get routes error:', error);
        next(error);
    }
};

/**
 * @desc    Get single route by ID
 * @route   GET /api/admin/routes/:id
 * @access  Private (Admin only)
 */
const getRouteById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [route] = await promisePool.query(
            'SELECT * FROM routes WHERE routeID = ?',
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
        console.error('❌ Get route by ID error:', error);
        next(error);
    }
};

/**
 * @desc    Create new route
 * @route   POST /api/admin/routes
 * @access  Private (Admin only)
 */
const createRoute = async (req, res, next) => {
    try {
        const {
            routeCode,
            origin,
            destination,
            distance,
            basePrice,
            estimatedTime
        } = req.body;

        // Validate required fields
        if (!routeCode || !origin || !destination || !basePrice || !estimatedTime) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide all required fields' 
            });
        }

        // Check if route code already exists
        const [existing] = await promisePool.query(
            'SELECT * FROM routes WHERE routeCode = ?',
            [routeCode]
        );
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Route code already exists' 
            });
        }

        const [result] = await promisePool.query(
            `INSERT INTO routes (
                routeCode, origin, destination, distance, basePrice, estimatedTime
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [routeCode, origin, destination, distance || null, basePrice, estimatedTime]
        );

        res.status(201).json({
            success: true,
            message: 'Route created successfully',
            routeId: result.insertId
        });

    } catch (error) {
        console.error('❌ Create route error:', error);
        next(error);
    }
};

/**
 * @desc    Update route
 * @route   PUT /api/admin/routes/:id
 * @access  Private (Admin only)
 */
const updateRoute = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        delete updates.routeID;
        delete updates.createdAt;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'No fields to update' 
            });
        }

        const [route] = await promisePool.query(
            'SELECT * FROM routes WHERE routeID = ?',
            [id]
        );
        if (route.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Route not found' 
            });
        }

        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        await promisePool.query(
            `UPDATE routes SET ${setClause} WHERE routeID = ?`,
            values
        );

        res.json({
            success: true,
            message: 'Route updated successfully'
        });

    } catch (error) {
        console.error('❌ Update route error:', error);
        next(error);
    }
};

/**
 * @desc    Delete route
 * @route   DELETE /api/admin/routes/:id
 * @access  Private (Admin only)
 */
const deleteRoute = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if route has any vehicles assigned
        const [vehicles] = await promisePool.query(
            'SELECT * FROM vehicles WHERE routeID = ? LIMIT 1',
            [id]
        );
        if (vehicles.length > 0) {
            // Soft delete
            await promisePool.query(
                'UPDATE routes SET isActive = 0 WHERE routeID = ?',
                [id]
            );
            return res.json({
                success: true,
                message: 'Route deactivated (has vehicles assigned)'
            });
        }

        await promisePool.query('DELETE FROM routes WHERE routeID = ?', [id]);

        res.json({
            success: true,
            message: 'Route deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete route error:', error);
        next(error);
    }
};

/**
 * @desc    Toggle route active status
 * @route   PATCH /api/admin/routes/:id/toggle-status
 * @access  Private (Admin only)
 */
const toggleRouteStatus = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [route] = await promisePool.query(
            'SELECT isActive FROM routes WHERE routeID = ?',
            [id]
        );
        if (route.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Route not found' 
            });
        }

        const newStatus = route[0].isActive ? 0 : 1;

        await promisePool.query(
            'UPDATE routes SET isActive = ? WHERE routeID = ?',
            [newStatus, id]
        );

        res.json({
            success: true,
            message: `Route ${newStatus ? 'activated' : 'deactivated'} successfully`
        });

    } catch (error) {
        console.error('❌ Toggle route status error:', error);
        next(error);
    }
};

// ====================
// VEHICLE MANAGEMENT
// ====================

/**
 * @desc    Get all vehicles
 * @route   GET /api/admin/vehicles
 * @access  Private (Admin only)
 */
const getVehicles = async (req, res, next) => {
    try {
        const [vehicles] = await promisePool.query(`
            SELECT 
                v.*,
                r.origin,
                r.destination,
                r.routeCode,
                op.operatorName as assignedOperator
            FROM vehicles v
            LEFT JOIN routes r ON v.routeID = r.routeID
            LEFT JOIN operators op ON v.operatorID = op.opID
            ORDER BY v.createdAt DESC
        `);

        res.json({
            success: true,
            vehicles
        });

    } catch (error) {
        console.error('❌ Get vehicles error:', error);
        next(error);
    }
};

/**
 * @desc    Get single vehicle by ID
 * @route   GET /api/admin/vehicles/:id
 * @access  Private (Admin only)
 */
const getVehicleById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [vehicle] = await promisePool.query(`
            SELECT 
                v.*,
                r.origin,
                r.destination,
                r.routeCode,
                op.operatorName as assignedOperator
            FROM vehicles v
            LEFT JOIN routes r ON v.routeID = r.routeID
            LEFT JOIN operators op ON v.operatorID = op.opID
            WHERE v.vehicleID = ?
        `, [id]);

        if (vehicle.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Vehicle not found' 
            });
        }

        res.json({
            success: true,
            vehicle: vehicle[0]
        });

    } catch (error) {
        console.error('❌ Get vehicle by ID error:', error);
        next(error);
    }
};

/**
 * @desc    Create new vehicle
 * @route   POST /api/admin/vehicles
 * @access  Private (Admin only)
 */
const createVehicle = async (req, res, next) => {
    try {
        const {
            vehicleNumber,
            registrationNumber,
            vehicleType,
            capacity,
            operatorID,
            routeID,
            make,
            model,
            year,
            ownerName,
            driverName,
            driverContact,
            driverLicense,
            insuranceExpiry,
            inspectionExpiry,
            features
        } = req.body;

        // Validate required fields
        if (!vehicleNumber || !registrationNumber || !vehicleType || !capacity) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide vehicle number, registration, type and capacity' 
            });
        }

        // Check if vehicle number already exists
        const [existing] = await promisePool.query(
            'SELECT * FROM vehicles WHERE vehicleNumber = ? OR registrationNumber = ?',
            [vehicleNumber, registrationNumber]
        );
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Vehicle number or registration already exists' 
            });
        }

        const [result] = await promisePool.query(
            `INSERT INTO vehicles (
                vehicleNumber, registrationNumber, vehicleType, capacity,
                operatorID, routeID, make, model, year, ownerName,
                driverName, driverContact, driverLicense,
                insuranceExpiry, inspectionExpiry, features
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                vehicleNumber, registrationNumber, vehicleType, capacity,
                operatorID || null, routeID || null, make || null, model || null, year || null,
                ownerName || null, driverName || null, driverContact || null, driverLicense || null,
                insuranceExpiry || null, inspectionExpiry || null, JSON.stringify(features || {})
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Vehicle created successfully',
            vehicleId: result.insertId
        });

    } catch (error) {
        console.error('❌ Create vehicle error:', error);
        next(error);
    }
};

/**
 * @desc    Update vehicle
 * @route   PUT /api/admin/vehicles/:id
 * @access  Private (Admin only)
 */
const updateVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        delete updates.vehicleID;
        delete updates.createdAt;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'No fields to update' 
            });
        }

        if (updates.features) {
            updates.features = JSON.stringify(updates.features);
        }

        const [vehicle] = await promisePool.query(
            'SELECT * FROM vehicles WHERE vehicleID = ?',
            [id]
        );
        if (vehicle.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Vehicle not found' 
            });
        }

        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        await promisePool.query(
            `UPDATE vehicles SET ${setClause} WHERE vehicleID = ?`,
            values
        );

        res.json({
            success: true,
            message: 'Vehicle updated successfully'
        });

    } catch (error) {
        console.error('❌ Update vehicle error:', error);
        next(error);
    }
};

/**
 * @desc    Delete vehicle
 * @route   DELETE /api/admin/vehicles/:id
 * @access  Private (Admin only)
 */
const deleteVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if vehicle has any bookings
        const [bookings] = await promisePool.query(
            'SELECT * FROM bookings WHERE vehicleID = ? LIMIT 1',
            [id]
        );
        if (bookings.length > 0) {
            // Soft delete
            await promisePool.query(
                'UPDATE vehicles SET isActive = 0 WHERE vehicleID = ?',
                [id]
            );
            return res.json({
                success: true,
                message: 'Vehicle deactivated (has booking history)'
            });
        }

        await promisePool.query('DELETE FROM vehicles WHERE vehicleID = ?', [id]);

        res.json({
            success: true,
            message: 'Vehicle deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete vehicle error:', error);
        next(error);
    }
};

/**
 * @desc    Toggle vehicle active status
 * @route   PATCH /api/admin/vehicles/:id/toggle-status
 * @access  Private (Admin only)
 */
const toggleVehicleStatus = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [vehicle] = await promisePool.query(
            'SELECT isActive FROM vehicles WHERE vehicleID = ?',
            [id]
        );
        if (vehicle.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Vehicle not found' 
            });
        }

        const newStatus = vehicle[0].isActive ? 0 : 1;

        await promisePool.query(
            'UPDATE vehicles SET isActive = ? WHERE vehicleID = ?',
            [newStatus, id]
        );

        res.json({
            success: true,
            message: `Vehicle ${newStatus ? 'activated' : 'deactivated'} successfully`
        });

    } catch (error) {
        console.error('❌ Toggle vehicle status error:', error);
        next(error);
    }
};

// ====================
// REPORTS & ANALYTICS
// ====================

/**
 * @desc    Get system reports overview
 * @route   GET /api/admin/reports
 * @access  Private (Admin only)
 */
const getSystemReports = async (req, res, next) => {
    try {
        const [daily] = await promisePool.query(`
            SELECT 
                DATE(createdAt) as date,
                COUNT(*) as bookings,
                SUM(totalAmount) as revenue,
                COUNT(DISTINCT customerID) as customers
            FROM bookings
            WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(createdAt)
            ORDER BY date DESC
        `);

        const [popularRoutes] = await promisePool.query(`
            SELECT 
                r.routeCode,
                r.origin,
                r.destination,
                COUNT(*) as bookingCount,
                SUM(b.totalAmount) as revenue
            FROM bookings b
            JOIN routes r ON b.routeID = r.routeID
            WHERE b.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY r.routeID
            ORDER BY bookingCount DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            daily,
            popularRoutes
        });

    } catch (error) {
        console.error('❌ Get system reports error:', error);
        next(error);
    }
};

/**
 * @desc    Get daily report
 * @route   GET /api/admin/reports/daily
 * @access  Private (Admin only)
 */
const getDailyReport = async (req, res, next) => {
    try {
        const { date } = req.query;
        const reportDate = date || new Date().toISOString().split('T')[0];

        const [report] = await promisePool.query(`
            SELECT 
                DATE(createdAt) as date,
                COUNT(*) as totalBookings,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN paymentStatus = 'paid' THEN totalAmount ELSE 0 END) as revenue,
                COUNT(DISTINCT customerID) as uniqueCustomers
            FROM bookings
            WHERE DATE(createdAt) = ?
            GROUP BY DATE(createdAt)
        `, [reportDate]);

        const [byRoute] = await promisePool.query(`
            SELECT 
                r.routeCode,
                r.origin,
                r.destination,
                COUNT(*) as bookings,
                SUM(b.totalAmount) as revenue
            FROM bookings b
            JOIN routes r ON b.routeID = r.routeID
            WHERE DATE(b.createdAt) = ?
            GROUP BY r.routeID
        `, [reportDate]);

        res.json({
            success: true,
            summary: report[0] || { date: reportDate, totalBookings: 0, revenue: 0 },
            breakdown: byRoute
        });

    } catch (error) {
        console.error('❌ Get daily report error:', error);
        next(error);
    }
};

/**
 * @desc    Get weekly report
 * @route   GET /api/admin/reports/weekly
 * @access  Private (Admin only)
 */
const getWeeklyReport = async (req, res, next) => {
    try {
        const [report] = await promisePool.query(`
            SELECT 
                WEEK(createdAt) as week,
                YEAR(createdAt) as year,
                COUNT(*) as bookings,
                SUM(totalAmount) as revenue,
                AVG(totalAmount) as avgTicketPrice
            FROM bookings
            WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 4 WEEK)
            GROUP BY WEEK(createdAt), YEAR(createdAt)
            ORDER BY year DESC, week DESC
        `);

        res.json({
            success: true,
            weekly: report
        });

    } catch (error) {
        console.error('❌ Get weekly report error:', error);
        next(error);
    }
};

/**
 * @desc    Get monthly report
 * @route   GET /api/admin/reports/monthly
 * @access  Private (Admin only)
 */
const getMonthlyReport = async (req, res, next) => {
    try {
        const [report] = await promisePool.query(`
            SELECT 
                DATE_FORMAT(createdAt, '%Y-%m') as month,
                COUNT(*) as bookings,
                SUM(totalAmount) as revenue,
                COUNT(DISTINCT customerID) as customers
            FROM bookings
            WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
            ORDER BY month DESC
        `);

        res.json({
            success: true,
            monthly: report
        });

    } catch (error) {
        console.error('❌ Get monthly report error:', error);
        next(error);
    }
};

/**
 * @desc    Export report
 * @route   GET /api/admin/reports/export/:type
 * @access  Private (Admin only)
 */
const exportReport = async (req, res, next) => {
    try {
        const { type } = req.params;
        const { startDate, endDate } = req.query;

        // In a real app, generate CSV/PDF
        res.json({
            success: true,
            message: `Exporting ${type} report from ${startDate} to ${endDate}`,
            format: 'CSV/PDF would be generated here'
        });

    } catch (error) {
        console.error('❌ Export report error:', error);
        next(error);
    }
};

/**
 * @desc    Get system statistics
 * @route   GET /api/admin/stats
 * @access  Private (Admin only)
 */
const getSystemStats = async (req, res, next) => {
    try {
        const [stats] = await promisePool.query(`
            SELECT 
                (SELECT COUNT(*) FROM customers) as totalCustomers,
                (SELECT COUNT(*) FROM operators WHERE isActive = 1) as activeOperators,
                (SELECT COUNT(*) FROM routes WHERE isActive = 1) as activeRoutes,
                (SELECT COUNT(*) FROM vehicles WHERE isActive = 1) as activeVehicles,
                (SELECT COUNT(*) FROM bookings WHERE DATE(createdAt) = CURDATE()) as todayBookings,
                (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pendingBookings,
                (SELECT COALESCE(SUM(totalAmount), 0) FROM bookings WHERE paymentStatus = 'paid') as totalRevenue,
                (SELECT COALESCE(SUM(totalAmount), 0) FROM bookings WHERE DATE(createdAt) = CURDATE() AND paymentStatus = 'paid') as todayRevenue
        `);

        res.json({
            success: true,
            stats: stats[0]
        });

    } catch (error) {
        console.error('❌ Get system stats error:', error);
        next(error);
    }
};

/**
 * @desc    Get revenue analytics
 * @route   GET /api/admin/analytics/revenue
 * @access  Private (Admin only)
 */
const getRevenueAnalytics = async (req, res, next) => {
    try {
        const [monthly] = await promisePool.query(`
            SELECT 
                DATE_FORMAT(createdAt, '%Y-%m') as month,
                SUM(totalAmount) as revenue
            FROM bookings
            WHERE paymentStatus = 'paid'
                AND createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
            ORDER BY month ASC
        `);

        res.json({
            success: true,
            monthly
        });

    } catch (error) {
        console.error('❌ Get revenue analytics error:', error);
        next(error);
    }
};

/**
 * @desc    Get popular routes analytics
 * @route   GET /api/admin/analytics/popular-routes
 * @access  Private (Admin only)
 */
const getPopularRoutes = async (req, res, next) => {
    try {
        const [routes] = await promisePool.query(`
            SELECT 
                r.routeCode,
                r.origin,
                r.destination,
                COUNT(*) as totalBookings,
                SUM(b.totalAmount) as totalRevenue,
                AVG(b.totalAmount) as avgTicketPrice
            FROM bookings b
            JOIN routes r ON b.routeID = r.routeID
            WHERE b.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY r.routeID
            ORDER BY totalBookings DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            popularRoutes: routes
        });

    } catch (error) {
        console.error('❌ Get popular routes error:', error);
        next(error);
    }
};

module.exports = {
    // Dashboard
    getDashboard,
    
    // Operator Management
    getOperators,
    getOperatorById,
    createOperator,
    updateOperator,
    deleteOperator,
    toggleOperatorStatus,
    
    // Route Management
    getRoutes,
    getRouteById,
    createRoute,
    updateRoute,
    deleteRoute,
    toggleRouteStatus,
    
    // Vehicle Management
    getVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    toggleVehicleStatus,
    
    // Reports
    getSystemReports,
    getDailyReport,
    getWeeklyReport,
    getMonthlyReport,
    exportReport,
    
    // Analytics
    getSystemStats,
    getRevenueAnalytics,
    getPopularRoutes
};