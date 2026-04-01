const express = require('express');
const router = express.Router();
const {
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
    
    // System Analytics
    getSystemStats,
    getRevenueAnalytics,
    getPopularRoutes
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ====================
// DEBUG ROUTES - Add these BEFORE auth middleware for testing
// ====================

// Simple test route to verify admin routes are working
router.get('/test-debug', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Admin routes are working!',
        timestamp: new Date().toISOString(),
        availableEndpoints: [
            '/stats',
            '/dashboard',
            '/operators',
            '/routes',
            '/vehicles',
            '/bookings',
            '/payments',
            '/sms-logs',
            '/reports',
            '/analytics/revenue',
            '/analytics/popular-routes',
            '/debug-bookings'
        ]
    });
});

// Debug bookings route - This will show you what's in your database
router.get('/debug-bookings', debugBookings);

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// ====================
// Dashboard
// ====================
router.get('/dashboard', getDashboard);

// ====================
// System Stats (For dashboard cards)
// ====================
router.get('/stats', getSystemStats);

// ====================
// Operator Management
// ====================
router.get('/operators', getOperators);
router.get('/operators/:id', getOperatorById);
router.post('/operators', createOperator);
router.put('/operators/:id', updateOperator);
router.delete('/operators/:id', deleteOperator);

// ====================
// Customer Management
// ====================
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerById);

// ====================
// Route Management
// ====================
router.get('/routes', getRoutes);
router.get('/routes/:id', getRouteById);
router.post('/routes', createRoute);
router.put('/routes/:id', updateRoute);
router.delete('/routes/:id', deleteRoute);

// ====================
// Vehicle Management
// ====================
router.get('/vehicles', getVehicles);
router.get('/vehicles/:id', getVehicleById);
router.post('/vehicles', createVehicle);
router.put('/vehicles/:id', updateVehicle);
router.delete('/vehicles/:id', deleteVehicle);
router.patch('/vehicles/:id/toggle-status', toggleVehicleStatus);

// ====================
// Booking Management
// ====================
router.get('/bookings', getBookings);
router.patch('/bookings/:id/status', updateBookingStatus);

// ====================
// Payment Management
// ====================
router.get('/payments', getPayments);
router.patch('/payments/:id/status', updatePaymentStatus);

// ====================
// SMS Logs Management
// ====================
router.get('/sms-logs', getSmsLogs);
router.get('/sms-logs/:id', getSmsLogById);
router.post('/sms-logs/:id/resend', resendSms);
router.get('/sms-logs/stats/summary', getSmsStats);

// ====================
// Reports
// ====================
router.get('/reports', getSystemReports);
router.get('/reports/daily', getDailyReport);
router.get('/reports/weekly', getWeeklyReport);
router.get('/reports/monthly', getMonthlyReport);
router.get('/reports/export/:type', exportReport);

// ====================
// System Analytics
// ====================
router.get('/analytics/revenue', getRevenueAnalytics);
router.get('/analytics/popular-routes', getPopularRoutes);

module.exports = router;