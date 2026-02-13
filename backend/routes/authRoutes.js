const express = require('express');
const router = express.Router();
const {
    registerCustomer,
    login,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword,
    changePassword  // Add this
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register/customer', registerCustomer);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// Protected routes
router.post('/logout', protect, logout);
router.put('/change-password', protect, changePassword);  // Add this

module.exports = router;