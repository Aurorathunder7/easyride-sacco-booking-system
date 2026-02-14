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
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const [users] = await pool.query(
      'SELECT * FROM customers WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Return user info (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword
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