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

    console.log('📝 Registration attempt:', { email, customerName });

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

    console.log('✅ Registration successful, ID:', result.insertId);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      customerId: result.insertId
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
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

    console.log('🔐 Login attempt:', { email, role });

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email, password and role' 
      });
    }

    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not set in environment variables!');
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error' 
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
        break;
        
      case 'operator':
        table = 'operators';
        idField = 'opID';
        nameField = 'operatorName';
        emailField = 'opEmail';
        break;
        
      case 'admin':
        table = 'admins';
        idField = 'adminID';
        nameField = 'adminName';
        emailField = 'adminEmail';
        break;
        
      default:
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid role. Must be customer, operator, or admin.' 
        });
    }

    // Query user
    const [rows] = await pool.query(
      `SELECT * FROM ${table} WHERE ${emailField} = ?`, 
      [email]
    );

    // Check if user exists
    if (!rows || rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    user = rows[0];
    console.log('✅ User found:', user[emailField]);

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log('❌ Password mismatch for:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    console.log('✅ Password matched for:', email);

    // Generate JWT token using ONLY environment variable
    const token = jwt.sign(
      { 
        id: user[idField], 
        role: role,
        email: user[emailField],
        name: user[nameField]
      },
      process.env.JWT_SECRET,  // ← ONLY use environment variable, no fallback
      { expiresIn: '30d' }
    );

    console.log('✅ Token generated successfully');

    // Create safe user object without password
    const userResponse = {
      id: user[idField],
      name: user[nameField],
      email: user[emailField],
      phone: user.phoneNumber || user.phoneNum,
      role: role
    };

    console.log('✅ Login successful for:', email);

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login: ' + error.message 
    });
  }
});

module.exports = router;