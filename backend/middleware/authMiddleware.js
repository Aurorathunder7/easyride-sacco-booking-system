const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/db');

const protect = async (req, res, next) => {
    let token;

    console.log('🔐 Auth Middleware - Headers:', req.headers.authorization ? 'Has Authorization' : 'No Authorization');

    if (req.headers.authorization?.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('✅ Token extracted, length:', token.length);
            
            // Log JWT_SECRET existence (but not the value)
            console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
            
            // Try to decode without verification first to see token structure
            const decodedWithoutVerify = jwt.decode(token);
            console.log('📦 Token payload (unverified):', decodedWithoutVerify);
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('✅ Token verified successfully:', decoded);

            // Get user based on role
            let user = null;
            let query = '';

            switch (decoded.role) {
                case 'customer':
                    query = 'SELECT custID as id, customerName as name, email, phoneNumber, "customer" as role FROM customers WHERE custID = ?';
                    break;
                case 'operator':
                    query = 'SELECT opID as id, operatorName as name, opEmail as email, phoneNum as phoneNumber, "operator" as role FROM operators WHERE opID = ?';
                    break;
                case 'admin':
                    query = 'SELECT adminID as id, adminName as name, adminEmail as email, "admin" as role FROM admins WHERE adminID = ?';
                    break;
                default:
                    console.log('❌ Invalid role in token:', decoded.role);
                    return res.status(401).json({ message: 'Invalid role' });
            }

            console.log('🔍 Querying database for user ID:', decoded.id);
            const [rows] = await promisePool.query(query, [decoded.id]);
            
            if (rows.length === 0) {
                console.log('❌ User not found in database for ID:', decoded.id);
                return res.status(401).json({ message: 'User not found' });
            }

            console.log('✅ User found in database:', rows[0].email);
            req.user = rows[0];
            next();
        } catch (error) {
            console.error('❌ Auth error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Not authorized, invalid token' });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Not authorized, token expired' });
            }
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        console.log('❌ No authorization header or not Bearer token');
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        console.log('🔐 Authorize middleware - User role:', req.user?.role, 'Required roles:', roles);
        
        if (!req.user) {
            console.log('❌ No user in request');
            return res.status(401).json({ message: 'Not authorized' });
        }
        
        if (!roles.includes(req.user.role)) {
            console.log(`❌ Role ${req.user.role} not authorized. Required: ${roles.join(' or ')}`);
            return res.status(403).json({ 
                message: `Access denied. Required role: ${roles.join(' or ')}` 
            });
        }
        
        console.log('✅ Authorization successful');
        next();
    };
};

module.exports = { protect, authorize };