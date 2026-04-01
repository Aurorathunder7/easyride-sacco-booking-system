const pool = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * Helper function to generate HTML report
 */
function generateReportHTML(reportData, reportType, startDate, endDate) {
    const reportDate = new Date().toLocaleDateString('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const reportTime = new Date().toLocaleTimeString('en-KE');
    
    let dateRangeText = '';
    if (reportType === 'daily') {
        dateRangeText = `Date: ${startDate}`;
    } else if (reportType === 'weekly') {
        dateRangeText = `Week of: ${startDate} to ${endDate}`;
    } else {
        dateRangeText = `Period: ${startDate} to ${endDate}`;
    }
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EasyRide ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</title>
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
        }
        
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .report-header {
            background: linear-gradient(135deg, #d97706, #f59e0b);
            color: white;
            padding: 30px;
            border-radius: 16px 16px 0 0;
            text-align: center;
        }
        
        .report-header h1 {
            font-size: 32px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .report-header .date {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .report-header .generated {
            font-size: 12px;
            opacity: 0.7;
            margin-top: 10px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: white;
            border-bottom: 1px solid #fed7aa;
        }
        
        .stat-card {
            background: #fffbef;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid #fed7aa;
        }
        
        .stat-card .stat-icon {
            font-size: 40px;
            margin-bottom: 10px;
        }
        
        .stat-card .stat-label {
            font-size: 14px;
            color: #b45309;
            margin-bottom: 8px;
        }
        
        .stat-card .stat-value {
            font-size: 28px;
            font-weight: bold;
            color: #d97706;
        }
        
        .section {
            background: white;
            padding: 30px;
            border-bottom: 1px solid #fed7aa;
        }
        
        .section:last-child {
            border-radius: 0 0 16px 16px;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #78350f;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f59e0b;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .data-table th {
            background: #fffbef;
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #b45309;
            text-transform: uppercase;
            border-bottom: 1px solid #fed7aa;
        }
        
        .data-table td {
            padding: 12px;
            font-size: 14px;
            color: #78350f;
            border-bottom: 1px solid #fed7aa;
        }
        
        .data-table tr:hover {
            background: #fffbef;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
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
        
        .status-completed {
            background: #e0e7ff;
            color: #3730a3;
        }
        
        .daily-breakdown {
            margin-top: 20px;
        }
        
        .daily-breakdown h3 {
            color: #78350f;
            margin-bottom: 15px;
            font-size: 18px;
        }
        
        .footer {
            margin-top: 20px;
            text-align: center;
            padding: 20px;
            color: #b45309;
            font-size: 12px;
        }
        
        .print-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #f59e0b;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(245,158,11,0.3);
            transition: all 0.3s;
        }
        
        .print-btn:hover {
            background: #d97706;
            transform: translateY(-2px);
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .print-btn {
                display: none;
            }
            .stats-grid {
                break-inside: avoid;
            }
            .data-table tr {
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <h1>
                <span>🚌</span>
                EasyRide SACCO
                <span>📊</span>
            </h1>
            <p class="date">${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</p>
            <p class="date">${dateRangeText}</p>
            <p class="generated">Generated on: ${reportDate} at ${reportTime}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">📅</div>
                <div class="stat-label">Total Bookings</div>
                <div class="stat-value">${reportData.summary?.totalBookings || 0}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-label">Total Revenue</div>
                <div class="stat-value">KES ${(reportData.summary?.totalRevenue || 0).toLocaleString()}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-label">Confirmed</div>
                <div class="stat-value">${reportData.summary?.confirmedBookings || 0}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">❌</div>
                <div class="stat-label">Cancelled</div>
                <div class="stat-value">${reportData.summary?.cancelledBookings || 0}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">⏳</div>
                <div class="stat-label">Pending</div>
                <div class="stat-value">${reportData.summary?.pendingBookings || 0}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-label">Customers</div>
                <div class="stat-value">${reportData.summary?.totalCustomers || 0}</div>
            </div>
        </div>
        
        ${reportType === 'weekly' && reportData.dailyBreakdown && reportData.dailyBreakdown.length > 0 ? `
        <div class="section">
            <h2 class="section-title">📊 Daily Breakdown</h2>
            <div class="daily-breakdown">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Bookings</th>
                            <th>Completed</th>
                            <th>Cancelled</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.dailyBreakdown.map(day => `
                        <tr>
                            <td>${new Date(day.date).toLocaleDateString('en-KE')}</td>
                            <td>${day.bookings}</td>
                            <td>${day.completed}</td>
                            <td>${day.cancelled}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}
        
        <div class="section">
            <h2 class="section-title">📋 Booking Details</h2>
            ${reportData.bookings && reportData.bookings.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Booking ID</th>
                        <th>Customer</th>
                        <th>Route</th>
                        <th>Seats</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.bookings.map(booking => {
                        const statusClass = booking.status === 'confirmed' ? 'status-confirmed' : 
                                          booking.status === 'cancelled' ? 'status-cancelled' :
                                          booking.status === 'completed' ? 'status-completed' : 'status-pending';
                        return `
                        <tr>
                            <td>ER${booking.bookingID}</td>
                            <td>${booking.customerName || 'N/A'}</td>
                            <td>${booking.route || 'N/A'}</td>
                            <td>${booking.seatNumber || 'N/A'}</td>
                            <td><strong>KES ${(booking.amount || 0).toLocaleString()}</strong></td>
                            <td><span class="status-badge ${statusClass}">${booking.status || 'pending'}</span></td>
                            <td>${new Date(booking.bookingDate).toLocaleString()}</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            ` : '<p style="text-align: center; color: #b45309;">No bookings found for this period.</p>'}
        </div>
        
        <div class="footer">
            <p>✨ EasyRide SACCO - Your Travel Companion ✨</p>
            <p>This report is system-generated and shows ${reportType} data</p>
            <p>For inquiries, contact: 0700 000 000 | info@easyride.co.ke</p>
        </div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ Print Report</button>
    <script>
        window.scrollTo(0, 0);
    </script>
</body>
</html>
    `;
}

/**
 * @desc    Get admin dashboard data
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
const getDashboard = async (req, res, next) => {
    try {
        // Get counts - using actual column names
        const [counts] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM operators) as totalOperators,
                (SELECT COUNT(*) FROM customers) as totalCustomers,
                (SELECT COUNT(*) FROM routes) as totalRoutes,
                (SELECT COUNT(*) FROM vehicles) as totalVehicles,
                (SELECT COUNT(*) FROM bookings WHERE DATE(bookingDate) = CURDATE()) as todayBookings,
                (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pendingBookings,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') as totalRevenue,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE DATE(paymentDate) = CURDATE() AND status = 'completed') as todayRevenue
        `);

        // Get recent activities - Fixed column names
        const [recentActivities] = await pool.query(`
            SELECT 
                'booking' as type,
                CONCAT('New booking: ', b.customerName, ' for route ', b.route) as description,
                b.bookingDate as timestamp,
                b.customerName as user
            FROM bookings b
            ORDER BY b.bookingDate DESC
            LIMIT 10
        `);

        // Get system alerts - vehicles with low capacity
        const [alerts] = await pool.query(`
            SELECT 
                'warning' as severity,
                CONCAT('Vehicle ', vehicleNumber, ' has low capacity') as message,
                1 as count
            FROM vehicles v
            WHERE v.status = 'active'
            AND v.capacity < 10
            LIMIT 5
        `);

        res.json({
            success: true,
            stats: counts[0] || {
                totalOperators: 0,
                totalCustomers: 0,
                totalRoutes: 0,
                totalVehicles: 0,
                todayBookings: 0,
                pendingBookings: 0,
                totalRevenue: 0,
                todayRevenue: 0
            },
            recentActivities: recentActivities || [],
            alerts: alerts || []
        });

    } catch (error) {
        console.error('❌ Admin dashboard error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load dashboard',
            error: error.message 
        });
    }
};

// ====================
// DEBUG FUNCTION
// ====================

/**
 * @desc    Debug - Show all booking-related data
 * @route   GET /api/admin/debug-bookings
 * @access  Private (Admin only)
 */
const debugBookings = async (req, res, next) => {
    try {
        const results = {};
        
        // Show all tables
        const [tables] = await pool.query("SHOW TABLES");
        results.allTables = tables.map(t => Object.values(t)[0]);
        
        // Find all booking-related tables
        const bookingTables = results.allTables.filter(t => 
            t.toLowerCase().includes('booking') || 
            t.toLowerCase().includes('trip') || 
            t.toLowerCase().includes('reservation')
        );
        results.bookingTables = bookingTables;
        
        // Check each booking-related table
        for (const tableName of bookingTables) {
            // Get column structure
            const [columns] = await pool.query(`SHOW COLUMNS FROM ${tableName}`);
            results[`${tableName}_columns`] = columns.map(c => c.Field);
            
            // Get count
            const [count] = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            results[`${tableName}_count`] = count[0].count;
            
            // Get sample data if exists
            if (count[0].count > 0) {
                const [sample] = await pool.query(`SELECT * FROM ${tableName} LIMIT 3`);
                results[`${tableName}_sample`] = sample;
            }
        }
        
        // Also check the operator bookings table directly
        try {
            const [operatorBookings] = await pool.query(`
                SELECT * FROM bookings LIMIT 5
            `);
            results.bookingsSample = operatorBookings;
        } catch (err) {
            results.bookingsError = err.message;
        }
        
        res.json({
            success: true,
            debug: results,
            message: 'Check the console for detailed logs'
        });
        
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            sqlMessage: error.sqlMessage
        });
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
        const { page = 1, limit = 20, search } = req.query;

        let query = `
            SELECT 
                opID,
                operatorName,
                opEmail,
                phoneNum,
                dob,
                gender,
                address,
                createdAt
            FROM operators
            WHERE 1=1
        `;

        const queryParams = [];

        if (search) {
            query += ` AND (operatorName LIKE ? OR opEmail LIKE ? OR phoneNum LIKE ?)`;
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM operators');
        const total = countResult[0]?.total || 0;

        const offset = (page - 1) * limit;
        query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const [operators] = await pool.query(query, queryParams);

        res.json({
            success: true,
            operators: operators || [],
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit) || 1,
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Get operators error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch operators',
            error: error.message 
        });
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

        const [operator] = await pool.query(
            `SELECT 
                opID,
                operatorName,
                opEmail,
                phoneNum,
                dob,
                gender,
                address,
                createdAt
             FROM operators 
             WHERE opID = ?`,
            [id]
        );

        if (!operator || operator.length === 0) {
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
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch operator',
            error: error.message 
        });
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
            operatorName,
            opEmail,
            phoneNum,
            dob,
            gender,
            address,
            password
        } = req.body;

        if (!operatorName || !opEmail || !phoneNum || !dob || !gender || !address) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide all required fields: name, email, phone, dob, gender, address' 
            });
        }

        const [existingEmail] = await pool.query(
            'SELECT * FROM operators WHERE opEmail = ?',
            [opEmail]
        );
        if (existingEmail.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Email already in use' 
            });
        }

        const [existingPhone] = await pool.query(
            'SELECT * FROM operators WHERE phoneNum = ?',
            [phoneNum]
        );
        if (existingPhone.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Phone number already in use' 
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password || 'default123', salt);

        const [result] = await pool.query(
            `INSERT INTO operators (
                operatorName, opEmail, phoneNum, dob, gender, address, password
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [operatorName, opEmail, phoneNum, dob, gender, address, hashedPassword]
        );

        res.status(201).json({
            success: true,
            message: 'Operator created successfully',
            operatorId: result.insertId
        });

    } catch (error) {
        console.error('❌ Create operator error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create operator',
            error: error.message 
        });
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

        delete updates.opID;
        delete updates.password;
        delete updates.createdAt;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'No fields to update' 
            });
        }

        const [operator] = await pool.query(
            'SELECT * FROM operators WHERE opID = ?',
            [id]
        );
        if (operator.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Operator not found' 
            });
        }

        const allowedFields = ['operatorName', 'opEmail', 'phoneNum', 'dob', 'gender', 'address'];
        const allowedUpdates = {};
        
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                allowedUpdates[key] = updates[key];
            }
        });

        if (Object.keys(allowedUpdates).length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'No valid fields to update' 
            });
        }

        const setClause = Object.keys(allowedUpdates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(allowedUpdates), id];

        await pool.query(
            `UPDATE operators SET ${setClause} WHERE opID = ?`,
            values
        );

        res.json({
            success: true,
            message: 'Operator updated successfully'
        });

    } catch (error) {
        console.error('❌ Update operator error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update operator',
            error: error.message 
        });
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

        const [operator] = await pool.query(
            'SELECT * FROM operators WHERE opID = ?',
            [id]
        );
        if (operator.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Operator not found' 
            });
        }

        await pool.query('DELETE FROM operators WHERE opID = ?', [id]);

        res.json({
            success: true,
            message: 'Operator deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete operator error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete operator',
            error: error.message 
        });
    }
};

// ====================
// CUSTOMER MANAGEMENT
// ====================

/**
 * @desc    Get all customers
 * @route   GET /api/admin/customers
 * @access  Private (Admin only)
 */
const getCustomers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search } = req.query;

        let query = `
            SELECT 
                custID,
                customerName,
                email,
                phoneNumber,
                dob,
                gender,
                address,
                createdAt
            FROM customers
            WHERE 1=1
        `;

        const queryParams = [];

        if (search) {
            query += ` AND (customerName LIKE ? OR email LIKE ? OR phoneNumber LIKE ?)`;
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM customers');
        const total = countResult[0]?.total || 0;

        const offset = (page - 1) * limit;
        query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const [customers] = await pool.query(query, queryParams);

        res.json({
            success: true,
            customers: customers || [],
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit) || 1,
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Get customers error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch customers',
            error: error.message 
        });
    }
};

/**
 * @desc    Get single customer by ID
 * @route   GET /api/admin/customers/:id
 * @access  Private (Admin only)
 */
const getCustomerById = async (req, res, next) => {
    try {
        const { id } = req.params;

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
            [id]
        );

        if (!customer || customer.length === 0) {
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
        console.error('❌ Get customer by ID error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch customer',
            error: error.message 
        });
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
        const { page = 1, limit = 20, search } = req.query;

        let query = `
            SELECT 
                routeID,
                routeName,
                origin,
                destination,
                distance,
                baseFare,
                estimatedTime,
                createdAt
            FROM routes
            WHERE 1=1
        `;

        const queryParams = [];

        if (search) {
            query += ` AND (routeName LIKE ? OR origin LIKE ? OR destination LIKE ?)`;
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        const [routes] = await pool.query(query, queryParams);

        res.json({
            success: true,
            routes: routes || []
        });

    } catch (error) {
        console.error('❌ Get routes error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch routes',
            error: error.message 
        });
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

        const [route] = await pool.query(
            `SELECT * FROM routes WHERE routeID = ?`,
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
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch route',
            error: error.message 
        });
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
            routeName,
            origin,
            destination,
            distance,
            baseFare,
            estimatedTime
        } = req.body;

        if (!routeName || !origin || !destination || !baseFare) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide route name, origin, destination and fare' 
            });
        }

        const [existing] = await pool.query(
            'SELECT * FROM routes WHERE routeName = ? OR (origin = ? AND destination = ?)',
            [routeName, origin, destination]
        );
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Route already exists' 
            });
        }

        const [result] = await pool.query(
            `INSERT INTO routes (
                routeName, origin, destination, distance, baseFare, estimatedTime
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [routeName, origin, destination, distance || null, baseFare, estimatedTime || null]
        );

        res.status(201).json({
            success: true,
            message: 'Route created successfully',
            routeId: result.insertId
        });

    } catch (error) {
        console.error('❌ Create route error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create route',
            error: error.message 
        });
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

        const [route] = await pool.query(
            'SELECT * FROM routes WHERE routeID = ?',
            [id]
        );
        if (route.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Route not found' 
            });
        }

        const allowedFields = ['routeName', 'origin', 'destination', 'distance', 'baseFare', 'estimatedTime'];
        const allowedUpdates = {};
        
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                allowedUpdates[key] = updates[key];
            }
        });

        if (Object.keys(allowedUpdates).length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'No valid fields to update' 
            });
        }

        const setClause = Object.keys(allowedUpdates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(allowedUpdates), id];

        await pool.query(
            `UPDATE routes SET ${setClause} WHERE routeID = ?`,
            values
        );

        res.json({
            success: true,
            message: 'Route updated successfully'
        });

    } catch (error) {
        console.error('❌ Update route error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update route',
            error: error.message 
        });
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

        const [vehicles] = await pool.query(
            'SELECT * FROM vehicles WHERE routeID = ? LIMIT 1',
            [id]
        );
        if (vehicles.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Cannot delete route - has vehicles assigned' 
            });
        }

        const [bookings] = await pool.query(
            'SELECT * FROM bookings WHERE routeID = ? LIMIT 1',
            [id]
        );
        if (bookings.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Cannot delete route - has booking history' 
            });
        }

        await pool.query('DELETE FROM routes WHERE routeID = ?', [id]);

        res.json({
            success: true,
            message: 'Route deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete route error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete route',
            error: error.message 
        });
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
        const [vehicles] = await pool.query(`
            SELECT 
                v.vehicleID,
                v.vehicleNumber,
                v.vehicleType,
                v.capacity,
                v.operatorID,
                v.routeID,
                v.status,
                v.createdAt,
                op.operatorName as operatorName,
                r.routeName as routeName
            FROM vehicles v
            LEFT JOIN operators op ON v.operatorID = op.opID
            LEFT JOIN routes r ON v.routeID = r.routeID
            ORDER BY v.createdAt DESC
        `);

        res.json({
            success: true,
            vehicles: vehicles || []
        });

    } catch (error) {
        console.error('❌ Get vehicles error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch vehicles',
            error: error.message 
        });
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

        const [vehicle] = await pool.query(`
            SELECT 
                v.vehicleID,
                v.vehicleNumber,
                v.vehicleType,
                v.capacity,
                v.operatorID,
                v.routeID,
                v.status,
                v.createdAt,
                op.operatorName as operatorName,
                r.routeName as routeName
            FROM vehicles v
            LEFT JOIN operators op ON v.operatorID = op.opID
            LEFT JOIN routes r ON v.routeID = r.routeID
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
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch vehicle',
            error: error.message 
        });
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
            vehicleType,
            capacity,
            operatorID,
            routeID
        } = req.body;

        if (!vehicleNumber || !vehicleType || !capacity) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide vehicle number, type and capacity' 
            });
        }

        const [existing] = await pool.query(
            'SELECT * FROM vehicles WHERE vehicleNumber = ?',
            [vehicleNumber]
        );
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Vehicle number already exists' 
            });
        }

        const [result] = await pool.query(
            `INSERT INTO vehicles (
                vehicleNumber, vehicleType, capacity, operatorID, routeID, status
            ) VALUES (?, ?, ?, ?, ?, 'active')`,
            [vehicleNumber, vehicleType, capacity, operatorID || null, routeID || null]
        );

        res.status(201).json({
            success: true,
            message: 'Vehicle created successfully',
            vehicleId: result.insertId
        });

    } catch (error) {
        console.error('❌ Create vehicle error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create vehicle',
            error: error.message 
        });
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

        const [vehicle] = await pool.query(
            'SELECT * FROM vehicles WHERE vehicleID = ?',
            [id]
        );
        if (vehicle.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Vehicle not found' 
            });
        }

        const allowedFields = ['vehicleNumber', 'vehicleType', 'capacity', 'operatorID', 'routeID', 'status'];
        const allowedUpdates = {};
        
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                allowedUpdates[key] = updates[key];
            }
        });

        if (Object.keys(allowedUpdates).length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'No valid fields to update' 
            });
        }

        const setClause = Object.keys(allowedUpdates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(allowedUpdates), id];

        await pool.query(
            `UPDATE vehicles SET ${setClause} WHERE vehicleID = ?`,
            values
        );

        res.json({
            success: true,
            message: 'Vehicle updated successfully'
        });

    } catch (error) {
        console.error('❌ Update vehicle error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update vehicle',
            error: error.message 
        });
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

        const [bookings] = await pool.query(
            'SELECT * FROM bookings WHERE vehicleID = ? LIMIT 1',
            [id]
        );
        if (bookings.length > 0) {
            await pool.query(
                'UPDATE vehicles SET status = "inactive" WHERE vehicleID = ?',
                [id]
            );
            return res.json({
                success: true,
                message: 'Vehicle deactivated (has booking history)'
            });
        }

        await pool.query('DELETE FROM vehicles WHERE vehicleID = ?', [id]);

        res.json({
            success: true,
            message: 'Vehicle deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete vehicle error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete vehicle',
            error: error.message 
        });
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

        const [vehicle] = await pool.query(
            'SELECT status FROM vehicles WHERE vehicleID = ?',
            [id]
        );
        if (vehicle.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Vehicle not found' 
            });
        }

        const newStatus = vehicle[0].status === 'active' ? 'inactive' : 'active';

        await pool.query(
            'UPDATE vehicles SET status = ? WHERE vehicleID = ?',
            [newStatus, id]
        );

        res.json({
            success: true,
            message: `Vehicle ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
        });

    } catch (error) {
        console.error('❌ Toggle vehicle status error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to toggle vehicle status',
            error: error.message 
        });
    }
};

// ====================
// BOOKING MANAGEMENT
// ====================

/**
 * @desc    Get all bookings
 * @route   GET /api/admin/bookings
 * @access  Private (Admin only)
 */
const getBookings = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        
        console.log('📋 Fetching bookings with params:', { page, limit, status, search });

        // First, check if bookings table exists
        const [tables] = await pool.query("SHOW TABLES LIKE 'bookings'");
        if (tables.length === 0) {
            return res.json({
                success: true,
                bookings: [],
                message: 'No bookings table found',
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: 1,
                    totalItems: 0,
                    itemsPerPage: parseInt(limit)
                }
            });
        }

        // Build the query - using all columns that exist in your table
        let query = `
            SELECT 
                bookingID,
                custID,
                customerName,
                phoneNumber,
                vehicleID,
                vehicleNumber,
                seatNumber,
                routeID,
                route,
                bookingDate,
                travelDate,
                status
            FROM bookings
            WHERE 1=1
        `;

        const queryParams = [];

        if (status) {
            query += ` AND status = ?`;
            queryParams.push(status);
        }

        if (search) {
            query += ` AND (customerName LIKE ? OR route LIKE ? OR CAST(bookingID AS CHAR) LIKE ?)`;
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        // Get total count
        let countQuery = `SELECT COUNT(*) as total FROM bookings WHERE 1=1`;
        if (status) {
            countQuery += ` AND status = ?`;
        }
        const [countResult] = await pool.query(countQuery, status ? [status] : []);
        const total = countResult[0]?.total || 0;

        // Add pagination
        const offset = (page - 1) * limit;
        query += ` ORDER BY bookingDate DESC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const [bookings] = await pool.query(query, queryParams);
        
        // Format the bookings
        const formattedBookings = bookings.map(booking => ({
            bookingID: booking.bookingID,
            customerName: booking.customerName,
            phoneNumber: booking.phoneNumber,
            route: booking.route,
            seatNumber: booking.seatNumber,
            vehicleNumber: booking.vehicleNumber,
            travelDate: booking.travelDate,
            travelDateFormatted: booking.travelDate ? new Date(booking.travelDate).toLocaleString() : 'N/A',
            bookingDate: booking.bookingDate,
            bookingDateFormatted: booking.bookingDate ? new Date(booking.bookingDate).toLocaleString() : 'N/A',
            status: booking.status,
            custID: booking.custID,
            vehicleID: booking.vehicleID,
            routeID: booking.routeID
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
 * @desc    Update booking status
 * @route   PATCH /api/admin/bookings/:id/status
 * @access  Private (Admin only)
 */
const updateBookingStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['confirmed', 'pending', 'cancelled', 'completed'].includes(status)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid status. Must be confirmed, pending, cancelled, or completed' 
            });
        }

        const [booking] = await pool.query(
            'SELECT * FROM bookings WHERE bookingID = ?',
            [id]
        );
        if (booking.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        await pool.query(
            'UPDATE bookings SET status = ? WHERE bookingID = ?',
            [status, id]
        );

        res.json({
            success: true,
            message: `Booking status updated to ${status}`
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

// ====================
// PAYMENT MANAGEMENT
// ====================

/**
 * @desc    Get all payments
 * @route   GET /api/admin/payments
 * @access  Private (Admin only)
 */
const getPayments = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status } = req.query;

        let query = `
            SELECT 
                paymentID,
                bookingID,
                custID,
                customerName,
                amount,
                paymentMethod,
                mpesaCode,
                status,
                paymentDate
            FROM payments
            WHERE 1=1
        `;

        const queryParams = [];

        if (status) {
            query += ` AND status = ?`;
            queryParams.push(status);
        }

        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM payments');
        const total = countResult[0]?.total || 0;

        const offset = (page - 1) * limit;
        query += ` ORDER BY paymentDate DESC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const [payments] = await pool.query(query, queryParams);

        res.json({
            success: true,
            payments: payments || [],
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit) || 1,
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Get payments error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch payments',
            error: error.message 
        });
    }
};

/**
 * @desc    Update payment status
 * @route   PATCH /api/admin/payments/:id/status
 * @access  Private (Admin only)
 */
const updatePaymentStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['completed', 'pending', 'failed'].includes(status)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid status. Must be completed, pending, or failed' 
            });
        }

        const [payment] = await pool.query(
            'SELECT * FROM payments WHERE paymentID = ?',
            [id]
        );
        if (payment.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Payment not found' 
            });
        }

        await pool.query(
            'UPDATE payments SET status = ? WHERE paymentID = ?',
            [status, id]
        );

        res.json({
            success: true,
            message: `Payment status updated to ${status}`
        });

    } catch (error) {
        console.error('❌ Update payment status error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update payment status',
            error: error.message 
        });
    }
};

// ====================
// SMS LOGS MANAGEMENT
// ====================

/**
 * @desc    Get all SMS logs
 * @route   GET /api/admin/sms-logs
 * @access  Private (Admin only)
 */
const getSmsLogs = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, status, phoneNumber } = req.query;

        let query = `
            SELECT 
                smsID,
                bookingID,
                phoneNumber,
                message,
                messageType,
                status,
                providerReference,
                errorMessage,
                retryCount,
                sentAt,
                createdAt
            FROM sms_logs
            WHERE 1=1
        `;

        const queryParams = [];

        if (status) {
            query += ` AND status = ?`;
            queryParams.push(status);
        }

        if (phoneNumber) {
            query += ` AND phoneNumber LIKE ?`;
            queryParams.push(`%${phoneNumber}%`);
        }

        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM sms_logs');
        const total = countResult[0]?.total || 0;

        const offset = (page - 1) * limit;
        query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const [smsLogs] = await pool.query(query, queryParams);

        res.json({
            success: true,
            smsLogs: smsLogs || [],
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit) || 1,
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Get SMS logs error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch SMS logs',
            error: error.message 
        });
    }
};

/**
 * @desc    Get single SMS log by ID
 * @route   GET /api/admin/sms-logs/:id
 * @access  Private (Admin only)
 */
const getSmsLogById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [smsLog] = await pool.query(
            `SELECT 
                smsID,
                bookingID,
                phoneNumber,
                message,
                messageType,
                status,
                providerReference,
                errorMessage,
                retryCount,
                sentAt,
                createdAt
            FROM sms_logs 
            WHERE smsID = ?`,
            [id]
        );

        if (!smsLog || smsLog.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'SMS log not found' 
            });
        }

        res.json({
            success: true,
            smsLog: smsLog[0]
        });

    } catch (error) {
        console.error('❌ Get SMS log by ID error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch SMS log',
            error: error.message 
        });
    }
};

/**
 * @desc    Resend failed SMS
 * @route   POST /api/admin/sms-logs/:id/resend
 * @access  Private (Admin only)
 */
const resendSms = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [smsLog] = await pool.query(
            'SELECT * FROM sms_logs WHERE smsID = ?',
            [id]
        );

        if (!smsLog || smsLog.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'SMS log not found' 
            });
        }

        await pool.query(
            `UPDATE sms_logs 
             SET retryCount = retryCount + 1,
                 status = 'pending',
                 sentAt = NULL
             WHERE smsID = ?`,
            [id]
        );

        res.json({
            success: true,
            message: 'SMS queued for resend'
        });

    } catch (error) {
        console.error('❌ Resend SMS error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to resend SMS',
            error: error.message 
        });
    }
};

/**
 * @desc    Get SMS statistics
 * @route   GET /api/admin/sms-logs/stats/summary
 * @access  Private (Admin only)
 */
const getSmsStats = async (req, res, next) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as totalSMS,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sentCount,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedCount,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
                AVG(CASE WHEN sentAt IS NOT NULL AND createdAt IS NOT NULL 
                    THEN TIMESTAMPDIFF(SECOND, createdAt, sentAt) 
                    ELSE NULL END) as avgDeliveryTimeSeconds
            FROM sms_logs
            WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        const [dailyStats] = await pool.query(`
            SELECT 
                DATE(createdAt) as date,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM sms_logs
            WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(createdAt)
            ORDER BY date DESC
        `);

        res.json({
            success: true,
            summary: stats[0] || {
                totalSMS: 0,
                sentCount: 0,
                failedCount: 0,
                pendingCount: 0,
                avgDeliveryTimeSeconds: null
            },
            dailyStats: dailyStats || []
        });

    } catch (error) {
        console.error('❌ Get SMS stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch SMS statistics',
            error: error.message 
        });
    }
};

// ====================
// REPORTS & ANALYTICS - UPDATED
// ====================

/**
 * @desc    Get system reports overview
 * @route   GET /api/admin/reports
 * @access  Private (Admin only)
 */
const getSystemReports = async (req, res, next) => {
    try {
        res.json({
            success: true,
            daily: [],
            popularRoutes: []
        });

    } catch (error) {
        console.error('❌ Get system reports error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch reports',
            error: error.message 
        });
    }
};

/**
 * @desc    Get daily report (HTML)
 * @route   GET /api/admin/reports/daily
 * @access  Private (Admin only)
 */
const getDailyReport = async (req, res, next) => {
    try {
        const { date } = req.query;
        const reportDate = date || new Date().toISOString().split('T')[0];
        
        console.log(`📊 Generating daily report for ${reportDate}`);
        
        // Get summary stats
        const [summary] = await pool.query(`
            SELECT 
                COUNT(*) as totalBookings,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmedBookings,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledBookings,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingBookings,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedBookings
            FROM bookings 
            WHERE DATE(bookingDate) = ?
        `, [reportDate]);
        
        // Get total revenue
        const [revenue] = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as totalRevenue
            FROM payments 
            WHERE DATE(paymentDate) = ? AND status = 'completed'
        `, [reportDate]);
        
        // Get total customers
        const [customers] = await pool.query(`
            SELECT COUNT(*) as totalCustomers
            FROM customers
        `);
        
        // Get bookings for the date
        const [bookings] = await pool.query(`
            SELECT 
                bookingID,
                customerName,
                route,
                seatNumber,
                status,
                bookingDate,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE bookingID = b.bookingID AND status = 'completed') as amount
            FROM bookings b
            WHERE DATE(bookingDate) = ?
            ORDER BY bookingDate DESC
        `, [reportDate]);
        
        const reportData = {
            summary: {
                totalBookings: summary[0]?.totalBookings || 0,
                confirmedBookings: summary[0]?.confirmedBookings || 0,
                cancelledBookings: summary[0]?.cancelledBookings || 0,
                pendingBookings: summary[0]?.pendingBookings || 0,
                completedBookings: summary[0]?.completedBookings || 0,
                totalRevenue: revenue[0]?.totalRevenue || 0,
                totalCustomers: customers[0]?.totalCustomers || 0
            },
            bookings: bookings || []
        };
        
        const reportHTML = generateReportHTML(reportData, 'daily', reportDate, reportDate);
        
        res.send(reportHTML);
        
    } catch (error) {
        console.error('❌ Get daily report error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch daily report',
            error: error.message 
        });
    }
};

/**
 * @desc    Get weekly report (HTML)
 * @route   GET /api/admin/reports/weekly
 * @access  Private (Admin only)
 */
const getWeeklyReport = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        let weekStart, weekEnd;
        
        if (startDate && endDate) {
            weekStart = startDate;
            weekEnd = endDate;
        } else {
            // Default to current week (Monday to Sunday)
            const today = new Date();
            const dayOfWeek = today.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            
            weekStart = new Date(today);
            weekStart.setDate(today.getDate() - daysToMonday);
            weekStart = weekStart.toISOString().split('T')[0];
            
            weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd = weekEnd.toISOString().split('T')[0];
        }
        
        console.log(`📊 Generating weekly report from ${weekStart} to ${weekEnd}`);
        
        // Get summary stats
        const [summary] = await pool.query(`
            SELECT 
                COUNT(*) as totalBookings,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmedBookings,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledBookings,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingBookings,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedBookings
            FROM bookings 
            WHERE DATE(bookingDate) BETWEEN ? AND ?
        `, [weekStart, weekEnd]);
        
        // Get total revenue
        const [revenue] = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as totalRevenue
            FROM payments 
            WHERE DATE(paymentDate) BETWEEN ? AND ? AND status = 'completed'
        `, [weekStart, weekEnd]);
        
        // Get total customers
        const [customers] = await pool.query(`
            SELECT COUNT(*) as totalCustomers
            FROM customers
        `);
        
        // Get daily breakdown
        const [dailyBreakdown] = await pool.query(`
            SELECT 
                DATE(bookingDate) as date,
                COUNT(*) as bookings,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM bookings 
            WHERE DATE(bookingDate) BETWEEN ? AND ?
            GROUP BY DATE(bookingDate)
            ORDER BY date
        `, [weekStart, weekEnd]);
        
        // Get bookings for the week
        const [bookings] = await pool.query(`
            SELECT 
                bookingID,
                customerName,
                route,
                seatNumber,
                status,
                bookingDate,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE bookingID = b.bookingID AND status = 'completed') as amount
            FROM bookings b
            WHERE DATE(bookingDate) BETWEEN ? AND ?
            ORDER BY bookingDate DESC
        `, [weekStart, weekEnd]);
        
        const reportData = {
            summary: {
                totalBookings: summary[0]?.totalBookings || 0,
                confirmedBookings: summary[0]?.confirmedBookings || 0,
                cancelledBookings: summary[0]?.cancelledBookings || 0,
                pendingBookings: summary[0]?.pendingBookings || 0,
                completedBookings: summary[0]?.completedBookings || 0,
                totalRevenue: revenue[0]?.totalRevenue || 0,
                totalCustomers: customers[0]?.totalCustomers || 0
            },
            dailyBreakdown: dailyBreakdown || [],
            bookings: bookings || []
        };
        
        const reportHTML = generateReportHTML(reportData, 'weekly', weekStart, weekEnd);
        
        res.send(reportHTML);
        
    } catch (error) {
        console.error('❌ Get weekly report error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch weekly report',
            error: error.message 
        });
    }
};

/**
 * @desc    Get monthly report
 * @route   GET /api/admin/reports/monthly
 * @access  Private (Admin only)
 */
const getMonthlyReport = async (req, res, next) => {
    try {
        const { month, year } = req.query;
        
        const currentDate = new Date();
        const reportYear = year || currentDate.getFullYear();
        const reportMonth = month || (currentDate.getMonth() + 1);
        
        // Get first and last day of the month
        const firstDay = new Date(reportYear, reportMonth - 1, 1).toISOString().split('T')[0];
        const lastDay = new Date(reportYear, reportMonth, 0).toISOString().split('T')[0];
        
        console.log(`📊 Generating monthly report for ${reportYear}-${reportMonth} (${firstDay} to ${lastDay})`);
        
        // Get summary stats
        const [summary] = await pool.query(`
            SELECT 
                COUNT(*) as totalBookings,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmedBookings,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledBookings,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingBookings,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedBookings
            FROM bookings 
            WHERE DATE(bookingDate) BETWEEN ? AND ?
        `, [firstDay, lastDay]);
        
        // Get total revenue
        const [revenue] = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as totalRevenue
            FROM payments 
            WHERE DATE(paymentDate) BETWEEN ? AND ? AND status = 'completed'
        `, [firstDay, lastDay]);
        
        // Get total customers
        const [customers] = await pool.query(`
            SELECT COUNT(*) as totalCustomers
            FROM customers
        `);
        
        // Get weekly breakdown
        const [weeklyBreakdown] = await pool.query(`
            SELECT 
                WEEK(bookingDate) as week,
                MIN(DATE(bookingDate)) as weekStart,
                COUNT(*) as bookings,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM bookings 
            WHERE DATE(bookingDate) BETWEEN ? AND ?
            GROUP BY WEEK(bookingDate)
            ORDER BY week
        `, [firstDay, lastDay]);
        
        // Get bookings for the month
        const [bookings] = await pool.query(`
            SELECT 
                bookingID,
                customerName,
                route,
                seatNumber,
                status,
                bookingDate,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE bookingID = b.bookingID AND status = 'completed') as amount
            FROM bookings b
            WHERE DATE(bookingDate) BETWEEN ? AND ?
            ORDER BY bookingDate DESC
        `, [firstDay, lastDay]);
        
        const reportData = {
            summary: {
                totalBookings: summary[0]?.totalBookings || 0,
                confirmedBookings: summary[0]?.confirmedBookings || 0,
                cancelledBookings: summary[0]?.cancelledBookings || 0,
                pendingBookings: summary[0]?.pendingBookings || 0,
                completedBookings: summary[0]?.completedBookings || 0,
                totalRevenue: revenue[0]?.totalRevenue || 0,
                totalCustomers: customers[0]?.totalCustomers || 0
            },
            weeklyBreakdown: weeklyBreakdown || [],
            bookings: bookings || []
        };
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const periodText = `${monthNames[reportMonth - 1]} ${reportYear}`;
        
        const reportHTML = generateReportHTML(reportData, 'monthly', periodText, periodText);
        
        res.send(reportHTML);
        
    } catch (error) {
        console.error('❌ Get monthly report error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch monthly report',
            error: error.message 
        });
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

        res.json({
            success: true,
            message: `Exporting ${type} report from ${startDate} to ${endDate}`,
            format: 'CSV/PDF would be generated here'
        });

    } catch (error) {
        console.error('❌ Export report error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to export report',
            error: error.message 
        });
    }
};

/**
 * @desc    Get system statistics
 * @route   GET /api/admin/stats
 * @access  Private (Admin only)
 */
const getSystemStats = async (req, res, next) => {
    try {
        console.log('📊 Fetching system stats...');
        
        // Check if tables exist first
        const [bookingsTable] = await pool.query("SHOW TABLES LIKE 'bookings'");
        const hasBookings = bookingsTable.length > 0;
        
        let stats = {
            totalCustomers: 0,
            totalOperators: 0,
            totalRoutes: 0,
            activeVehicles: 0,
            todayBookings: 0,
            pendingBookings: 0,
            totalRevenue: 0,
            todayRevenue: 0
        };
        
        // Get counts from tables
        const [customers] = await pool.query("SELECT COUNT(*) as count FROM customers");
        stats.totalCustomers = customers[0]?.count || 0;
        
        const [operators] = await pool.query("SELECT COUNT(*) as count FROM operators");
        stats.totalOperators = operators[0]?.count || 0;
        
        const [routes] = await pool.query("SELECT COUNT(*) as count FROM routes");
        stats.totalRoutes = routes[0]?.count || 0;
        
        const [vehicles] = await pool.query("SELECT COUNT(*) as count FROM vehicles WHERE status = 'active'");
        stats.activeVehicles = vehicles[0]?.count || 0;
        
        // Only get booking stats if table exists
        if (hasBookings) {
            const [todayBookings] = await pool.query(
                "SELECT COUNT(*) as count FROM bookings WHERE DATE(bookingDate) = CURDATE()"
            );
            stats.todayBookings = todayBookings[0]?.count || 0;
            
            const [pendingBookings] = await pool.query(
                "SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'"
            );
            stats.pendingBookings = pendingBookings[0]?.count || 0;
        }
        
        // Get revenue stats
        const [totalRevenue] = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'"
        );
        stats.totalRevenue = totalRevenue[0]?.total || 0;
        
        const [todayRevenue] = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE DATE(paymentDate) = CURDATE() AND status = 'completed'"
        );
        stats.todayRevenue = todayRevenue[0]?.total || 0;
        
        console.log('✅ Stats fetched:', stats);

        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        console.error('❌ Get system stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch stats',
            error: error.message 
        });
    }
};

/**
 * @desc    Get revenue analytics
 * @route   GET /api/admin/analytics/revenue
 * @access  Private (Admin only)
 */
const getRevenueAnalytics = async (req, res, next) => {
    try {
        // Get monthly revenue for last 6 months
        const [monthlyRevenue] = await pool.query(`
            SELECT 
                DATE_FORMAT(paymentDate, '%Y-%m') as month,
                COALESCE(SUM(amount), 0) as revenue,
                COUNT(*) as transactionCount
            FROM payments
            WHERE status = 'completed' AND paymentDate >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(paymentDate, '%Y-%m')
            ORDER BY month DESC
        `);
        
        // Get payment method breakdown
        const [paymentMethods] = await pool.query(`
            SELECT 
                paymentMethod,
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total
            FROM payments
            WHERE status = 'completed'
            GROUP BY paymentMethod
        `);
        
        res.json({
            success: true,
            monthlyRevenue: monthlyRevenue || [],
            paymentMethods: paymentMethods || []
        });

    } catch (error) {
        console.error('❌ Get revenue analytics error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch revenue analytics',
            error: error.message 
        });
    }
};

/**
 * @desc    Get popular routes analytics
 * @route   GET /api/admin/analytics/popular-routes
 * @access  Private (Admin only)
 */
const getPopularRoutes = async (req, res, next) => {
    try {
        const [routes] = await pool.query(`
            SELECT 
                r.routeName,
                r.origin,
                r.destination,
                COUNT(b.bookingID) as totalBookings,
                COALESCE(SUM(p.amount), 0) as totalRevenue
            FROM routes r
            LEFT JOIN bookings b ON r.routeID = b.routeID
            LEFT JOIN payments p ON b.bookingID = p.bookingID AND p.status = 'completed'
            GROUP BY r.routeID
            ORDER BY totalBookings DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            popularRoutes: routes || []
        });

    } catch (error) {
        console.error('❌ Get popular routes error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch popular routes',
            error: error.message 
        });
    }
};

module.exports = {
    // Dashboard
    getDashboard,
    
    // Debug
    debugBookings,
    
    // Operator Management
    getOperators,
    getOperatorById,
    createOperator,
    updateOperator,
    deleteOperator,
    
    // Customer Management
    getCustomers,
    getCustomerById,
    
    // Route Management
    getRoutes,
    getRouteById,
    createRoute,
    updateRoute,
    deleteRoute,
    
    // Vehicle Management
    getVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    toggleVehicleStatus,
    
    // Booking Management
    getBookings,
    updateBookingStatus,
    
    // Payment Management
    getPayments,
    updatePaymentStatus,
    
    // SMS Logs Management
    getSmsLogs,
    getSmsLogById,
    resendSms,
    getSmsStats,
    
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