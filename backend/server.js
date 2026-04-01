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

// Import all route files
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/adminRoutes');
const operatorRoutes = require('./routes/operatorRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const customerRoutes = require('./routes/customerRoutes');
const mpesaRoutes = require('./routes/mpesaRoutes');
const pdfRoutes = require('./routes/pdfRoutes');

// Middleware
app.use(cors());
app.use(express.json());

// Routes - Mount all API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/pdf', pdfRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('EasyRide SACCO API is running 🚀');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});