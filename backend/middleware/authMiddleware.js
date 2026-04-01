const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const protect = async (req, res, next) => {
    let token;

    console.log('🔐 Auth Middleware - Checking authorization');

    // Check for token in headers
    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        console.log('📌 Token found in Authorization header');
    }
    // Check for token in query parameters (for ticket viewing in new window)
    else if (req.query.token) {
        token = req.query.token;
        console.log('📌 Token found in query params');
    }
    
    if (!token) {
        console.log('❌ No authorization token found');
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        // Check if JWT_SECRET exists
        if (!process.env.JWT_SECRET) {
            console.error('❌ JWT_SECRET is not defined in environment!');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Token verified for user:', decoded.email, 'Role:', decoded.role);

        // Get user from database based on role
        let query = '';
        let queryParams = [];

        switch (decoded.role) {
            case 'customer':
                query = 'SELECT custID as id, customerName as name, email, phoneNumber, ? as role FROM customers WHERE custID = ?';
                queryParams = ['customer', decoded.id];
                break;
            case 'operator':
                query = 'SELECT opID as id, operatorName as name, opEmail as email, phoneNum as phoneNumber, ? as role FROM operators WHERE opID = ?';
                queryParams = ['operator', decoded.id];
                break;
            case 'admin':
                query = 'SELECT adminID as id, adminName as name, adminEmail as email, ? as role FROM admins WHERE adminID = ?';
                queryParams = ['admin', decoded.id];
                break;
            default:
                console.log('❌ Invalid role in token:', decoded.role);
                return res.status(401).json({ message: 'Invalid role in token' });
        }

        console.log('🔍 Querying database for user ID:', decoded.id, 'with role:', decoded.role);
        
        // Execute query with parameters
        try {
            const [rows] = await pool.query(query, queryParams);
            
            if (rows.length === 0) {
                console.log('❌ User not found in database for ID:', decoded.id);
                return res.status(401).json({ message: 'User not found' });
            }

            console.log('✅ User found in database:', rows[0].email, 'Role:', rows[0].role);
            req.user = rows[0];
            next();
        } catch (dbError) {
            console.error('❌ Database query error:', dbError.message);
            console.error('❌ SQL Query:', query);
            console.error('❌ Query Params:', queryParams);
            return res.status(500).json({ 
                message: 'Database error', 
                error: dbError.message 
            });
        }

    } catch (error) {
        console.error('❌ Auth error:', error.message);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Not authorized, invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Not authorized, token expired' });
        }
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access denied. Required role: ${roles.join(' or ')}` 
            });
        }
        
        next();
    };
};

module.exports = { protect, authorize };