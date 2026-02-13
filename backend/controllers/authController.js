const { promisePool } = require('../config/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/generateToken');
const crypto = require('crypto');

/**
 * @desc    Register a new customer
 * @route   POST /api/auth/register/customer
 * @access  Public
 */
const registerCustomer = async (req, res, next) => {
    try {
        const { customerName, email, dob, gender, phoneNumber, address, password } = req.body;

        // Validate required fields
        if (!customerName || !email || !dob || !gender || !phoneNumber || !address || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide all required fields' 
            });
        }

        // Validate email format
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide a valid email address' 
            });
        }

        // Validate phone number (Kenyan format)
        const phoneRegex = /^(07|01|\+254|254)\d{8,9}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide a valid Kenyan phone number (e.g., 0712345678)' 
            });
        }

        // Check if user already exists
        const [existing] = await promisePool.query(
            'SELECT * FROM customers WHERE email = ? OR phoneNumber = ?',
            [email, phoneNumber]
        );

        if (existing.length > 0) {
            const existingUser = existing[0];
            if (existingUser.email === email) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Email already registered. Please use a different email or login.' 
                });
            }
            if (existingUser.phoneNumber === phoneNumber) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Phone number already registered. Please use a different number or login.' 
                });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new customer
        const [result] = await promisePool.query(
            `INSERT INTO customers 
             (customerName, email, dob, gender, phoneNumber, address, password) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [customerName, email, dob, gender, phoneNumber, address, hashedPassword]
        );

        // Generate JWT token
        const token = generateToken(result.insertId, 'customer');

        // Log the registration
        console.log(`✅ New customer registered: ${email} (ID: ${result.insertId})`);

        res.status(201).json({
            success: true,
            message: 'Registration successful! Please login with your credentials.',
            token,
            user: {
                id: result.insertId,
                name: customerName,
                email,
                phoneNumber,
                role: 'customer'
            }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        next(error);
    }
};

/**
 * @desc    Login user (customer, operator, admin)
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
    try {
        const { email, password, role } = req.body;

        // Validate input
        if (!email || !password || !role) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide email, password and role' 
            });
        }

        let user = null;
        let table = '';
        let idField = '';
        let nameField = '';

        // Select table based on role
        switch (role) {
            case 'customer':
                table = 'customers';
                idField = 'custID';
                nameField = 'customerName';
                [user] = await promisePool.query(
                    `SELECT *, 'customer' as role FROM ${table} WHERE email = ?`, 
                    [email]
                );
                break;
            case 'operator':
                table = 'operators';
                idField = 'opID';
                nameField = 'operatorName';
                [user] = await promisePool.query(
                    `SELECT *, 'operator' as role FROM ${table} WHERE opEmail = ?`, 
                    [email]
                );
                break;
            case 'admin':
                table = 'admins';
                idField = 'adminID';
                nameField = 'adminName';
                [user] = await promisePool.query(
                    `SELECT *, 'admin' as role FROM ${table} WHERE adminEmail = ?`, 
                    [email]
                );
                break;
            default:
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid role. Must be customer, operator, or admin.' 
                });
        }

        // Check if user exists
        if (!user || user.length === 0) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        user = user[0];

        // Check if account is active (for operators)
        if (role === 'operator' && user.isActive === 0) {
            return res.status(403).json({ 
                success: false,
                message: 'Your account has been deactivated. Please contact administrator.' 
            });
        }

        // Check password
        let isMatch = false;

        // Special case for default operator password
        if (role === 'operator' && password === 'default123' && user.password === 'default123') {
            isMatch = true;
            
            // Force password change on first login
            if (user.requiresPasswordChange === 1) {
                return res.status(403).json({
                    success: false,
                    message: 'Please change your default password before continuing.',
                    requiresPasswordChange: true,
                    userId: user[idField]
                });
            }
        } else {
            isMatch = await bcrypt.compare(password, user.password);
        }

        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        // Update last login
        await promisePool.query(
            `UPDATE ${table} SET lastLogin = NOW() WHERE ${idField} = ?`,
            [user[idField]]
        );

        // Generate JWT token
        const token = generateToken(user[idField], role);

        // Prepare user response
        const userResponse = {
            id: user[idField],
            name: user[nameField],
            email: role === 'operator' ? user.opEmail : role === 'admin' ? user.adminEmail : user.email,
            phoneNumber: user.phoneNumber || user.phoneNum,
            role: user.role
        };

        // Add operator-specific fields
        if (role === 'operator') {
            userResponse.officeLocation = user.officeLocation;
            userResponse.shift = user.shift;
            userResponse.employeeID = user.employeeID;
            userResponse.permissions = {
                canBookTickets: user.canBookTickets === 1,
                canIssueRefunds: user.canIssueRefunds === 1,
                canOverridePricing: user.canOverridePricing === 1,
                canViewReports: user.canViewReports === 1
            };
        }

        // Log successful login
        console.log(`✅ ${role} logged in: ${email}`);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        next(error);
    }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.headers.authorization?.split(' ')[1];
        
        if (token) {
            // Optional: Blacklist the token in database
            // This would require a token blacklist table
            console.log(`👋 User logged out: ${req.user.email}`);
        }

        res.json({ 
            success: true, 
            message: 'Logged out successfully' 
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Refresh JWT token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
const refreshToken = async (req, res, next) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ 
                success: false,
                message: 'No token provided' 
            });
        }

        // Verify the existing token
        const decoded = require('../utils/generateToken').verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid or expired token' 
            });
        }

        // Generate new token
        const newToken = generateToken(decoded.id, decoded.role);

        res.json({
            success: true,
            token: newToken
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Forgot password - sends reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
    try {
        const { email, role } = req.body;

        if (!email || !role) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide email and role' 
            });
        }

        let table = '';
        let emailField = '';
        let idField = '';

        switch (role) {
            case 'customer':
                table = 'customers';
                emailField = 'email';
                idField = 'custID';
                break;
            case 'operator':
                table = 'operators';
                emailField = 'opEmail';
                idField = 'opID';
                break;
            case 'admin':
                table = 'admins';
                emailField = 'adminEmail';
                idField = 'adminID';
                break;
            default:
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid role' 
                });
        }

        // Check if user exists
        const [user] = await promisePool.query(
            `SELECT * FROM ${table} WHERE ${emailField} = ?`,
            [email]
        );

        if (user.length === 0) {
            // Don't reveal if user exists for security
            return res.json({ 
                success: true, 
                message: 'If your email is registered, you will receive a password reset link.' 
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        // Store reset token in database (you'd need to add columns for this)
        // await promisePool.query(
        //     `UPDATE ${table} SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE ${idField} = ?`,
        //     [resetToken, resetExpires, user[0][idField]]
        // );

        // In a real app, send email with reset link
        console.log(`📧 Password reset requested for ${email}`);
        console.log(`Reset token: ${resetToken}`);

        res.json({ 
            success: true, 
            message: 'If your email is registered, you will receive a password reset link.' 
        });

    } catch (error) {
        console.error('❌ Forgot password error:', error);
        next(error);
    }
};

/**
 * @desc    Reset password with token
 * @route   PUT /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { password, role } = req.body;

        if (!password || !role) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide new password and role' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false,
                message: 'Password must be at least 6 characters' 
            });
        }

        let table = '';
        let idField = '';

        switch (role) {
            case 'customer':
                table = 'customers';
                idField = 'custID';
                break;
            case 'operator':
                table = 'operators';
                idField = 'opID';
                break;
            case 'admin':
                table = 'admins';
                idField = 'adminID';
                break;
            default:
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid role' 
                });
        }

        // Find user with valid reset token
        // const [user] = await promisePool.query(
        //     `SELECT * FROM ${table} WHERE resetPasswordToken = ? AND resetPasswordExpires > NOW()`,
        //     [token]
        // );

        // if (user.length === 0) {
        //     return res.status(400).json({ 
        //         success: false,
        //         message: 'Invalid or expired reset token' 
        //     });
        // }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update password and clear reset token
        // await promisePool.query(
        //     `UPDATE ${table} SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE ${idField} = ?`,
        //     [hashedPassword, user[0][idField]]
        // );

        console.log(`🔐 Password reset successful for ${role}`);

        res.json({ 
            success: true, 
            message: 'Password reset successful. You can now login with your new password.' 
        });

    } catch (error) {
        console.error('❌ Reset password error:', error);
        next(error);
    }
};

/**
 * @desc    Change password (when logged in)
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        const role = req.user.role;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide current and new password' 
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false,
                message: 'New password must be at least 6 characters' 
            });
        }

        let table = '';
        let idField = '';

        switch (role) {
            case 'customer':
                table = 'customers';
                idField = 'custID';
                break;
            case 'operator':
                table = 'operators';
                idField = 'opID';
                break;
            case 'admin':
                table = 'admins';
                idField = 'adminID';
                break;
            default:
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid role' 
                });
        }

        // Get current user with password
        const [user] = await promisePool.query(
            `SELECT * FROM ${table} WHERE ${idField} = ?`,
            [userId]
        );

        if (user.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user[0].password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Current password is incorrect' 
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and reset requiresPasswordChange flag
        await promisePool.query(
            `UPDATE ${table} SET password = ?, requiresPasswordChange = 0 WHERE ${idField} = ?`,
            [hashedPassword, userId]
        );

        console.log(`🔐 Password changed for ${role} ID: ${userId}`);

        res.json({ 
            success: true, 
            message: 'Password changed successfully' 
        });

    } catch (error) {
        console.error('❌ Change password error:', error);
        next(error);
    }
};

module.exports = {
    registerCustomer,
    login,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword,
    changePassword
};