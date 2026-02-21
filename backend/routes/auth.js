const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// @route   POST /api/register
// @desc    Register a new customer
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { 
      customerName, 
      email, 
      dob, 
      gender, 
      phoneNumber, 
      address, 
      password 
    } = req.body;

    // Validate required fields
    if (!customerName || !email || !dob || !gender || !phoneNumber || !address || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM customers WHERE email = ? OR phoneNumber = ?',
      [email, phoneNumber]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email or phone number already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new customer
    const [result] = await pool.query(
      `INSERT INTO customers 
       (customerName, email, dob, gender, phoneNumber, address, password) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [customerName, email, dob, gender, phoneNumber, address, hashedPassword]
    );

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      customerId: result.insertId
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: 'Email or phone number already registered' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// @route   POST /api/login
// @desc    Login user (customer, operator, admin)
// @access  Public
router.post('/login', async (req, res) => {
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
    let emailField = '';

    // Select table based on role
    switch (role) {
      case 'customer':
        table = 'customers';
        idField = 'custID';
        nameField = 'customerName';
        emailField = 'email';
        [user] = await pool.query(
          `SELECT *, 'customer' as role FROM ${table} WHERE ${emailField} = ?`, 
          [email]
        );
        break;
        
      case 'operator':
        table = 'operators';
        idField = 'opID';
        nameField = 'operatorName';
        emailField = 'opEmail';
        [user] = await pool.query(
          `SELECT *, 'operator' as role FROM ${table} WHERE ${emailField} = ?`, 
          [email]
        );
        break;
        
      case 'admin':
        table = 'admins';
        idField = 'adminID';
        nameField = 'adminName';
        emailField = 'adminEmail';
        [user] = await pool.query(
          `SELECT *, 'admin' as role FROM ${table} WHERE ${emailField} = ?`, 
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

    // Check if account is active (for operators and admins)
    if ((role === 'operator' || role === 'admin') && user.isActive === 0) {
      return res.status(403).json({ 
        success: false,
        message: 'Your account has been deactivated. Please contact administrator.' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Update last login
    await pool.query(
      `UPDATE ${table} SET lastLogin = NOW() WHERE ${idField} = ?`,
      [user[idField]]
    );

    // Generate REAL JWT token
    const token = jwt.sign(
      { 
        id: user[idField], 
        role: user.role,
        email: user[emailField],
        name: user[nameField]
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Add role-specific fields to response
    const userResponse = {
      ...userWithoutPassword,
      id: user[idField],
      name: user[nameField],
      email: user[emailField],
      role: user.role
    };

    res.json({
      success: true,
      message: 'Login successful',
      token: token, // Now using real JWT token
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

module.exports = router;