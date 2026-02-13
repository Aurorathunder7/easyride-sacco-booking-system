const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/db');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
                    return res.status(401).json({ message: 'Invalid role' });
            }

            const [rows] = await promisePool.query(query, [decoded.id]);
            
            if (rows.length === 0) {
                return res.status(401).json({ message: 'User not found' });
            }

            req.user = rows[0];
            next();
        } catch (error) {
            console.error('Auth error:', error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token' });
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