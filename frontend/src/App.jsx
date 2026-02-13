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
          
          {/* 404 Page */}
          <Route path="*" element={
            <div style={{
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <h1 style={{ fontSize: '48px', color: '#3b82f6', marginBottom: '20px' }}>404</h1>
              <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>Page not found</p>
              <a href="/" style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: '600'
              }}>
                Return to Home
              </a>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App