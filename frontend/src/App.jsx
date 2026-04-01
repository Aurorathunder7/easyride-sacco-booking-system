import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Header from './components/Header'
import Footer from './components/Footer'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import BookingPage from './pages/BookingPage'
import MyBookingsPage from './pages/MyBookingsPage'
import OperatorDashboard from './pages/OperatorDashboard'
import OperatorBookingPage from './pages/OperatorBookingPage'
import OperatorBookingsPage from './pages/OperatorBookingsPage'

// NEW PAGES
import RegisterPage from './pages/RegisterPage'
import AdminPage from './pages/AdminPage'
import CustomerDashboard from './pages/CustomerDashboard'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Landing/Introduction Page (No Header/Footer) */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Login/Register Pages (No Header/Footer) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Customer Pages (After Login) */}
          <Route path="/home" element={
            <>
              <Header />
              <HomePage />
              <Footer />
            </>
          } />
          <Route path="/book" element={
            <>
              <Header />
              <BookingPage />
              <Footer />
            </>
          } />
          <Route path="/my-bookings" element={
            <>
              <Header />
              <MyBookingsPage />
              <Footer />
            </>
          } />
          <Route path="/customer/dashboard" element={
            <>
              <Header />
              <CustomerDashboard />
              <Footer />
            </>
          } />
          
          {/* Operator Pages (After Login) */}
          <Route path="/operator/dashboard" element={
            <>
              <Header />
              <OperatorDashboard />
              <Footer />
            </>
          } />
          <Route path="/operator/book" element={
            <>
              <Header />
              <OperatorBookingPage />
              <Footer />
            </>
          } />
          <Route path="/operator/bookings" element={
            <>
              <Header />
              <OperatorBookingsPage />
              <Footer />
            </>
          } />
          
          {/* Admin Page (Protected) */}
          <Route path="/admin" element={
            <>
              <Header />
              <AdminPage />
              <Footer />
            </>
          } />
          
          {/* 404 Page - Updated to match theme */}
          <Route path="*" element={
            <div style={styles.notFoundContainer}>
              <div style={styles.notFoundCard}>
                <div style={styles.notFoundIcon}>🚌</div>
                <h1 style={styles.notFoundTitle}>404</h1>
                <p style={styles.notFoundMessage}>Oops! Page not found</p>
                <p style={styles.notFoundSubMessage}>The page you're looking for doesn't exist or has been moved.</p>
                <a href="/" style={styles.notFoundButton}>
                  ← Return to Home
                </a>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  )
}

// ============================
// STYLES - Warm Cream/Amber Theme
// ============================
const styles = {
  notFoundContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #fef9e8, #fff5e6, #fef3e2)',
    padding: '20px',
  },
  notFoundCard: {
    backgroundColor: 'white',
    borderRadius: '1rem',
    padding: '2.5rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.02)',
    width: '100%',
    maxWidth: '450px',
    textAlign: 'center',
    border: '1px solid #fed7aa',
    animation: 'slideIn 0.5s ease-out',
  },
  notFoundIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
    animation: 'bounce 1s ease infinite',
  },
  notFoundTitle: {
    fontSize: '4rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.5rem',
  },
  notFoundMessage: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#78350f',
    marginBottom: '0.5rem',
  },
  notFoundSubMessage: {
    fontSize: '0.875rem',
    color: '#92400e',
    marginBottom: '1.5rem',
  },
  notFoundButton: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #059669, #10b981)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.75rem',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
}

// Add keyframes for animations
const style = document.createElement('style')
style.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`
document.head.appendChild(style)

export default App