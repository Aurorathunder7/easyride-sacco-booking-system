const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔧 Loading database configuration...');
console.log('📊 Environment variables:');
console.log('  DB_HOST:', process.env.DB_HOST || '❌ NOT SET');
console.log('  DB_PORT:', process.env.DB_PORT || '❌ NOT SET');
console.log('  DB_USER:', process.env.DB_USER || '❌ NOT SET');
console.log('  DB_NAME:', process.env.DB_NAME || '❌ NOT SET');
console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ Set (hidden)' : '❌ NOT SET');

// Path to CA certificate
const caCertPath = path.join(__dirname, '../ca.pem');
console.log('🔐 Looking for CA certificate at:', caCertPath);

// Check if CA certificate exists
let sslConfig = {};
if (fs.existsSync(caCertPath)) {
  const caCert = fs.readFileSync(caCertPath);
  console.log('✅ CA certificate found and loaded');
  sslConfig = {
    ssl: {
      ca: caCert,
      rejectUnauthorized: true
    }
  };
} else {
  console.warn('⚠️ CA certificate not found at:', caCertPath);
  console.warn('💡 Download it from Aiven Console and save as ca.pem in backend folder');
  console.warn('⚠️ Using SSL without verification (less secure)');
  sslConfig = {
    ssl: {
      rejectUnauthorized: false
    }
  };
}

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ...sslConfig
});

// Test database connection function
const testConnection = async () => {
  let connection;
  try {
    console.log('🔄 Attempting to connect to Aiven MySQL...');
    
    connection = await pool.getConnection();
    console.log('✅✅✅ Database connected successfully to Aiven MySQL! ✅✅✅');
    
    // Test a simple query
    const [result] = await connection.query('SELECT 1 + 1 AS solution');
    console.log('📊 Test query result:', result[0].solution === 2 ? '✅ Working' : '❌ Failed');
    
    // Check tables
    const [tables] = await connection.query('SHOW TABLES');
    if (tables.length > 0) {
      console.log('📊 Tables in database:', tables.map(t => Object.values(t)[0]).join(', '));
    } else {
      console.log('📊 No tables found in database yet');
    }
    
    return true;
  } catch (error) {
    console.error('❌❌❌ Database connection failed! ❌❌❌');
    console.error('🔴 Error code:', error.code);
    console.error('🔴 Error message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Tip: Check if your Aiven service is running and host/port are correct');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Tip: Check your username and password in .env file');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 Tip: Check your hostname - it might be incorrect');
    } else if (error.message.includes('SSL') || error.code === 'HANDSHAKE_SSL_ERROR') {
      console.error('💡 Tip: SSL connection issue - make sure ca.pem file is in backend folder');
    }
    
    return false;
  } finally {
    if (connection) connection.release();
  }
};

// Run the test but don't block module export
testConnection().then(success => {
  if (success) {
    console.log('🚀 Database is ready for queries');
  } else {
    console.error('⚠️ Database connection failed - queries may not work');
  }
});

// Export the pool immediately (don't wait for test)
module.exports = pool;