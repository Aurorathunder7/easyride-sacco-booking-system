const express = require('express');
const router = express.Router();
const {
    // Dashboard
    getDashboard,
    
    // Operator Management
    getOperators,
    getOperatorById,
    createOperator,
    updateOperator,
    deleteOperator,
    toggleOperatorStatus,
    
    // Route Management
    getRoutes,
    getRouteById,
    createRoute,
    updateRoute,
    deleteRoute,
    toggleRouteStatus,
    
    // Vehicle Management
    getVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    toggleVehicleStatus,
    
    // Reports
    getSystemReports,
    getDailyReport,
    getWeeklyReport,
    getMonthlyReport,
    exportReport,
    
    // System Stats
    getSystemStats,
    getRevenueAnalytics,
    getPopularRoutes
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboard);

// ====================
// Operator Management
// ====================
router.get('/operators', getOperators);
router.get('/operators/:id', getOperatorById);
router.post('/operators', createOperator);
router.put('/operators/:id', updateOperator);
router.delete('/operators/:id', deleteOperator);
router.patch('/operators/:id/toggle-status', toggleOperatorStatus);

// ====================
// Route Management
// ====================
router.get('/routes', getRoutes);
router.get('/routes/:id', getRouteById);
router.post('/routes', createRoute);
router.put('/routes/:id', updateRoute);
router.delete('/routes/:id', deleteRoute);
router.patch('/routes/:id/toggle-status', toggleRouteStatus);

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
router.get('/stats', getSystemStats);
router.get('/analytics/revenue', getRevenueAnalytics);
router.get('/analytics/popular-routes', getPopularRoutes);

module.exports = router;