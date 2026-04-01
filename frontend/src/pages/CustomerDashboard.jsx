// src/pages/CustomerDashboard.jsx
import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const CustomerDashboard = () => {
  // ============================
  // STATE MANAGEMENT
  // ============================
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // User data from localStorage
  const [user, setUser] = useState(null)
  
  // Dashboard data from API
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalSpent: 0,
    upcomingTrips: 0,
    completedTrips: 0,
    pendingBookings: 0,
    cancelledBookings: 0
  })
  
  const navigate = useNavigate()

  // ============================
  // EFFECTS
  // ============================
  
  // Check authentication and fetch data on component mount
  useEffect(() => {
    // Get user from localStorage
    const userStr = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    
    if (!userStr || !token) {
      // Not logged in, redirect to login
      navigate('/login')
      return
    }
    
    try {
      const userData = JSON.parse(userStr)
      setUser(userData)
      
      // Fetch dashboard data
      fetchDashboardData(token)
    } catch (error) {
      console.error('Error parsing user data:', error)
      navigate('/login')
    }
  }, [navigate])

  // ============================
  // API FUNCTIONS
  // ============================
  
  /**
   * Fetch customer's bookings from backend
   * Endpoint: GET /api/customers/bookings
   */
  const fetchDashboardData = async (token) => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('📊 Fetching customer dashboard data...')
      
      const response = await fetch(`${API_BASE_URL}/customers/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('user')
          localStorage.removeItem('token')
          navigate('/login')
          throw new Error('Session expired. Please login again.')
        }
        throw new Error('Failed to fetch dashboard data')
      }
      
      const data = await response.json()
      console.log('✅ Dashboard data received:', data)
      
      // Update state with real data
      setBookings(data.recentBookings || [])
      setStats({
        totalBookings: data.stats?.totalBookings || 0,
        totalSpent: formatCurrency(data.stats?.totalSpent || 0),
        upcomingTrips: data.stats?.upcomingTrips || 0,
        completedTrips: data.stats?.completedTrips || 0,
        pendingBookings: data.stats?.pendingBookings || 0,
        cancelledBookings: data.stats?.cancelledBookings || 0
      })
      
    } catch (error) {
      console.error('❌ Error fetching dashboard:', error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Format currency to Ksh
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('KES', 'Ksh')
  }

  /**
   * Format date to readable format
   */
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' }
    return new Date(dateString).toLocaleDateString('en-KE', options)
  }

  /**
   * Get status badge style
   */
  const getStatusBadge = (status) => {
    const statusStyles = {
      'confirmed': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'cancelled': 'bg-red-100 text-red-800',
      'completed': 'bg-blue-100 text-blue-800',
      'refunded': 'bg-purple-100 text-purple-800'
    }
    
    return statusStyles[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  // ============================
  // LOADING STATE
  // ============================
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // ============================
  // ERROR STATE
  // ============================
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-md text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // ============================
  // RENDER COMPONENT
  // ============================
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with user name */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome back, {user?.name || user?.customerName || 'Customer'}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Here's what's happening with your bookings
          </p>
        </div>
        
        {/* Stats Cards - Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {/* Total Bookings */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🚌</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalBookings}</p>
              </div>
            </div>
          </div>
          
          {/* Total Spent */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalSpent}</p>
              </div>
            </div>
          </div>
          
          {/* Upcoming Trips */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Upcoming Trips</p>
                <p className="text-2xl font-bold text-gray-800">{stats.upcomingTrips}</p>
              </div>
            </div>
          </div>
          
          {/* Completed Trips */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Completed Trips</p>
                <p className="text-2xl font-bold text-gray-800">{stats.completedTrips}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Additional Stats Row - Pending and Cancelled */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {/* Pending Bookings */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500 mb-1">Pending Bookings</p>
                <p className="text-3xl font-bold text-gray-800">{stats.pendingBookings}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
            </div>
          </div>
          
          {/* Cancelled Bookings */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500 mb-1">Cancelled Bookings</p>
                <p className="text-3xl font-bold text-gray-800">{stats.cancelledBookings}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">❌</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <Link
            to="/book"
            className="bg-white rounded-xl shadow-sm p-5 text-center hover:shadow-md transition-all border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-4xl mb-3">🚌</div>
            <h3 className="font-semibold text-gray-800 mb-1">Book a Trip</h3>
            <p className="text-sm text-gray-500">Find and book matatu seats</p>
          </Link>
          
          <Link
            to="/my-bookings"
            className="bg-white rounded-xl shadow-sm p-5 text-center hover:shadow-md transition-all border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-4xl mb-3">📋</div>
            <h3 className="font-semibold text-gray-800 mb-1">My Bookings</h3>
            <p className="text-sm text-gray-500">View and manage bookings</p>
          </Link>
          
          <Link
            to="/payments"
            className="bg-white rounded-xl shadow-sm p-5 text-center hover:shadow-md transition-all border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-4xl mb-3">💰</div>
            <h3 className="font-semibold text-gray-800 mb-1">Payment History</h3>
            <p className="text-sm text-gray-500">View payment records</p>
          </Link>
          
          <Link
            to="/profile"
            className="bg-white rounded-xl shadow-sm p-5 text-center hover:shadow-md transition-all border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-4xl mb-3">👤</div>
            <h3 className="font-semibold text-gray-800 mb-1">Profile</h3>
            <p className="text-sm text-gray-500">Update your information</p>
          </Link>
        </div>
        
        {/* Recent Bookings Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Recent Bookings</h2>
            <Link
              to="/my-bookings"
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              View All
              <span className="text-lg">→</span>
            </Link>
          </div>
          
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎫</div>
              <p className="text-gray-500 mb-2 text-lg">No bookings yet.</p>
              <p className="text-gray-400 mb-6">Start your journey with EasyRide SACCO</p>
              <Link
                to="/book"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Book Your First Trip
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.bookingID || booking.id}
                  className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 mb-2">
                        {booking.route || `${booking.origin} to ${booking.destination}`}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <span>📅</span> {formatDate(booking.travelDate || booking.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>💺</span> Seat {booking.seatNumber || booking.seat}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>💰</span> {formatCurrency(booking.amount || booking.price)}
                        </span>
                        {booking.bookingReference && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <span>🔖</span> Ref: {booking.bookingReference}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(booking.status)}`}>
                        {booking.status}
                      </span>
                      {booking.status === 'pending' && (
                        <Link
                          to={`/payment/${booking.bookingID || booking.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Pay Now →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomerDashboard