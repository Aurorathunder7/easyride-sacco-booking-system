const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables FIRST
dotenv.config();

// Verify JWT_SECRET is loaded
console.log('🔑 JWT_SECRET loaded:', process.env.JWT_SECRET ? 'Yes' : 'No');
if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not set in .env file!');
    process.exit(1);
}

const app = express();

// ====================
// CORS CONFIGURATION - FIX for Vercel + ngrok
// ====================

// Define allowed origins
const allowedOrigins = [
    'http://localhost:5173',                                      // Local Vite dev
    'http://localhost:3000',                                      // Alternative local port
    'http://localhost:5000',                                      // Local backend
    'https://easyride-sacco-booking-system.vercel.app',           // Your Vercel frontend
    'https://easyride-sacco-booking-system.vercel.app/',          // Vercel with trailing slash
    'https://handwrought-rafaela-cymotrichous.ngrok-free.dev',    // Your ngrok backend
    'https://handwrought-rafaela-cymotrichous.ngrok-free.dev/'    // ngrok with trailing slash
];

// CORS options
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        // Check if origin is allowed
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // For development, we can still allow the request but log it
            console.log('⚠️ CORS request from origin:', origin);
            // Allow all origins during development (remove in production)
            callback(null, true);
        }
    },
    credentials: true,  // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'ngrok-skip-browser-warning',
        'X-Requested-With',
        'Accept'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Add middleware to handle ngrok warning bypass for all requests
app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    // Also add CORS headers for preflight
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Parse JSON bodies
app.use(express.json());

// ====================
// IMPORT ROUTES
// ====================
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/adminRoutes');
const operatorRoutes = require('./routes/operatorRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const customerRoutes = require('./routes/customerRoutes');
const mpesaRoutes = require('./routes/mpesaRoutes');
const pdfRoutes = require('./routes/pdfRoutes');

// ====================
// MOUNT ROUTES
// ====================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/pdf', pdfRoutes);

// Test route to check CORS
app.get('/', (req, res) => {
    res.json({ 
        message: 'EasyRide SACCO API is running 🚀',
        cors: 'Enabled',
        allowedOrigins: allowedOrigins
    });
});

// Test CORS endpoint
app.get('/api/test-cors', (req, res) => {
    res.json({
        success: true,
        message: 'CORS is working!',
        origin: req.headers.origin,
        method: req.method
    });
});

// ====================
// SCHEDULE GENERATOR
// ====================

// Import schedule generator
const { generateFutureSchedules, generateTodaySchedules } = require('./utils/scheduleGenerator');

// Function to initialize schedules on server start
async function initializeSchedules() {
    try {
        console.log('📅 Checking and generating schedules...');
        
        // First, generate schedules for today
        const todayCount = await generateTodaySchedules();
        console.log(`✅ Today: ${todayCount} schedules added`);
        
        // Then generate for next 14 days
        const total = await generateFutureSchedules(14);
        console.log(`✅ Schedule initialization complete: ${total} total schedules added`);
        
    } catch (error) {
        console.error('❌ Failed to initialize schedules:', error.message);
        // Don't exit the server, just log the error
    }
}

// Run schedule initialization after database is ready
setTimeout(() => {
    initializeSchedules();
}, 5000);

// Optional: Start daily cron job for automatic schedule generation
try {
    // Check if node-cron is installed
    const cron = require('node-cron');
    const { generateSchedulesForDate } = require('./utils/scheduleGenerator');
    
    // Run every day at 12:01 AM
    cron.schedule('1 0 * * *', async () => {
        console.log('🕐 Running daily schedule generation...');
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        await generateSchedulesForDate(tomorrowStr);
        
        // Also ensure schedules for the next 7 days exist
        for (let i = 2; i <= 7; i++) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + i);
            const dateStr = futureDate.toISOString().split('T')[0];
            await generateSchedulesForDate(dateStr);
        }
        
        console.log('✅ Daily schedule generation complete');
    });
    
    console.log('📅 Daily schedule job started - will run at 12:01 AM');
} catch (error) {
    console.log('⚠️ Daily schedule job not configured (node-cron not installed). Run: npm install node-cron');
}

// ====================
// ERROR HANDLING
// ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: `Route not found: ${req.method} ${req.url}` 
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ====================
// START SERVER
// ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 API URL: http://localhost:${PORT}`);
    console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
});