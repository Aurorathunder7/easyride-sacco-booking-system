const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// Import routes (make sure these files exist)
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const operatorRoutes = require('./routes/operatorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const mpesaRoutes = require('./routes/mpesaRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/pdf', require('./routes/pdfRoutes'));

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'EasyRide SACCO API is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});