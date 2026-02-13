import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function MyBookingsPage() {
  // ============================
  // STATE MANAGEMENT
  // ============================
  
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all, upcoming, past, cancelled
  const [searchTerm, setSearchTerm] = useState('')
  
  const navigate = useNavigate()

  // ============================
  // EFFECTS
  // ============================
  
  useEffect(() => {
    fetchBookings()
  }, []) // Run once on mount

  // ============================
  // API FUNCTIONS
  // ============================
  
  /**
   * Fetch customer's bookings from backend
   * Endpoint: GET /api/customers/bookings
   */
  const fetchBookings = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      
      // Check if user is logged in
      if (!token || !userStr) {
        navigate('/login')
        return
      }
      
      console.log('📋 Fetching customer bookings...')
      
      const response = await fetch(`${API_BASE_URL}/customers/bookings`, {
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
        throw new Error('Failed to fetch bookings')
      }
      
      const data = await response.json()
      console.log('✅ Bookings received:', data)
      
      setBookings(data.bookings || [])
      
    } catch (error) {
      console.error('❌ Error fetching bookings:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Cancel a booking
   * Endpoint: PUT /api/bookings/:id/cancel
   */
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to cancel booking')
      }
      
      // Refresh bookings list
      await fetchBookings()
      
      alert('✅ Booking cancelled successfully')
      
    } catch (error) {
      console.error('❌ Error cancelling booking:', error)
      alert(`Failed to cancel booking: ${error.message}`)
    }
  }

  /**
   * Download ticket/receipt
   * Endpoint: GET /api/bookings/:id/ticket
   */
  const handleViewTicket = async (bookingId) => {
    try {
      const token = localStorage.getItem('token')
      
      // Open ticket in new tab
      window.open(`${API_BASE_URL}/bookings/${bookingId}/ticket`, '_blank')
      
    } catch (error) {
      console.error('❌ Error viewing ticket:', error)
      alert('Failed to load ticket')
    }
  }

  // ============================
  // HELPER FUNCTIONS
  // ============================
  
  /**
   * Format date to readable format
   */
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
    return new Date(dateString).toLocaleDateString('en-KE', options)
  }

  /**
   * Get status color and background
   */
  const getStatusStyle = (status) => {
    const statusLower = status?.toLowerCase() || ''
    
    const styles = {
      confirmed: {
        backgroundColor: '#10b98120',
        color: '#10b981',
        border: '1px solid #10b981'
      },
      pending: {
        backgroundColor: '#f59e0b20',
        color: '#f59e0b',
        border: '1px solid #f59e0b'
      },
      cancelled: {
        backgroundColor: '#ef444420',
        color: '#ef4444',
        border: '1px solid #ef4444'
      },
      completed: {
        backgroundColor: '#6366f120',
        color: '#6366f1',
        border: '1px solid #6366f1'
      },
      refunded: {
        backgroundColor: '#8b5cf620',
        color: '#8b5cf6',
        border: '1px solid #8b5cf6'
      }
    }
    
    return styles[statusLower] || {
      backgroundColor: '#6b728020',
      color: '#6b7280',
      border: '1px solid #6b7280'
    }
  }

  /**
   * Get payment status color
   */
  const getPaymentStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid': return '#10b981'
      case 'pending': return '#f59e0b'
      case 'failed': return '#ef4444'
      case 'refunded': return '#8b5cf6'
      default: return '#6b7280'
    }
  }

  /**
   * Filter bookings based on filter type and search term
   */
  const getFilteredBookings = () => {
    let filtered = [...bookings]
    
    // Apply status filter
    if (filter !== 'all') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      filtered = filtered.filter(booking => {
        const travelDate = new Date(booking.travelDate)
        travelDate.setHours(0, 0, 0, 0)
        
        switch(filter) {
          case 'upcoming':
            return travelDate >= today && booking.status !== 'cancelled' && booking.status !== 'completed'
          case 'past':
            return travelDate < today || booking.status === 'completed'
          case 'cancelled':
            return booking.status === 'cancelled'
          default:
            return true
        }
      })
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(booking => 
        booking.bookingReference?.toLowerCase().includes(term) ||
        booking.origin?.toLowerCase().includes(term) ||
        booking.destination?.toLowerCase().includes(term) ||
        booking.seatNumber?.toLowerCase().includes(term)
      )
    }
    
    return filtered
  }

  // ============================
  // RENDER FUNCTIONS
  // ============================
  
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading your bookings...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>❌</div>
        <h2 style={styles.errorTitle}>Something went wrong</h2>
        <p style={styles.errorText}>{error}</p>
        <button 
          onClick={() => fetchBookings()}
          style={styles.retryButton}
        >
          Try Again
        </button>
      </div>
    )
  }

  const filteredBookings = getFilteredBookings()

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My Bookings</h1>
        <p style={styles.subtitle}>View and manage all your journeys</p>
      </div>

      {/* Search and Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by booking ID, route, or seat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={styles.clearSearch}
            >
              ✕
            </button>
          )}
        </div>
        
        <div style={styles.filterButtons}>
          <button
            onClick={() => setFilter('all')}
            style={{
              ...styles.filterButton,
              ...(filter === 'all' ? styles.activeFilter : {})
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            style={{
              ...styles.filterButton,
              ...(filter === 'upcoming' ? styles.activeFilter : {})
            }}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            style={{
              ...styles.filterButton,
              ...(filter === 'past' ? styles.activeFilter : {})
            }}
          >
            Past
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            style={{
              ...styles.filterButton,
              ...(filter === 'cancelled' ? styles.activeFilter : {})
            }}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Bookings Count */}
      <div style={styles.countContainer}>
        <p style={styles.countText}>
          Showing {filteredBookings.length} of {bookings.length} bookings
        </p>
      </div>

      {filteredBookings.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📋</div>
          <h2 style={styles.emptyTitle}>
            {bookings.length === 0 ? 'No Bookings Yet' : 'No Matching Bookings'}
          </h2>
          <p style={styles.emptyText}>
            {bookings.length === 0 
              ? "You haven't made any bookings yet. Start your journey today!"
              : "Try adjusting your filters or search term to see more results."}
          </p>
          <Link to="/book" style={styles.bookButton}>
            {bookings.length === 0 ? 'Book Now' : 'Clear Filters'}
          </Link>
        </div>
      ) : (
        <div style={styles.bookingsList}>
          {filteredBookings.map((booking) => (
            <div key={booking.bookingID || booking.id} style={styles.bookingCard}>
              <div style={styles.bookingHeader}>
                <div>
                  <h3 style={styles.route}>
                    {booking.origin || booking.from} → {booking.destination || booking.to}
                  </h3>
                  <p style={styles.bookingId}>
                    Booking ID: {booking.bookingReference || booking.bookingId}
                  </p>
                </div>
                <span style={{
                  ...styles.statusBadge,
                  ...getStatusStyle(booking.status)
                }}>
                  {booking.status || 'Unknown'}
                </span>
              </div>

              <div style={styles.bookingDetails}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>📅 Travel Date:</span>
                  <span style={styles.detailValue}>
                    {formatDate(booking.travelDate || booking.date)}
                  </span>
                </div>
                
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>💺 Seat:</span>
                  <span style={styles.detailValue}>{booking.seatNumber || booking.seat}</span>
                </div>
                
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>🚌 Vehicle:</span>
                  <span style={styles.detailValue}>{booking.vehicle || 'Not assigned'}</span>
                </div>
                
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>⏰ Booked On:</span>
                  <span style={styles.detailValue}>
                    {formatDate(booking.createdAt || booking.bookingDate)}
                  </span>
                </div>
              </div>

              <div style={styles.bookingFooter}>
                <div style={styles.priceSection}>
                  <span style={styles.priceLabel}>Total Fare:</span>
                  <span style={styles.price}>
                    KSh {booking.totalAmount || booking.amount || booking.price}
                  </span>
                  {booking.paymentStatus && (
                    <span style={{
                      ...styles.paymentStatus,
                      color: getPaymentStatusColor(booking.paymentStatus)
                    }}>
                      ({booking.paymentStatus})
                    </span>
                  )}
                </div>
                
                <div style={styles.actions}>
                  <button 
                    onClick={() => handleViewTicket(booking.bookingID || booking.id)}
                    style={styles.actionButton}
                  >
                    🎫 View Ticket
                  </button>
                  
                  {booking.status?.toLowerCase() === 'pending' && (
                    <button 
                      onClick={() => handleCancelBooking(booking.bookingID || booking.id)}
                      style={styles.cancelButton}
                    >
                      ✕ Cancel Booking
                    </button>
                  )}
                  
                  {booking.status?.toLowerCase() === 'confirmed' && (
                    <Link 
                      to={`/booking/${booking.bookingID || booking.id}/modify`}
                      style={styles.modifyButton}
                    >
                      ✎ Modify
                    </Link>
                  )}
                </div>
              </div>
              
              {/* M-Pesa Receipt if available */}
              {booking.mpesaReceipt && (
                <div style={styles.receiptInfo}>
                  <span style={styles.receiptIcon}>📱</span>
                  <span style={styles.receiptText}>
                    M-Pesa Receipt: {booking.mpesaReceipt}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================
// STYLES
// ============================

const styles = {
  container: {
    padding: '40px 20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  },
  header: {
    maxWidth: '1200px',
    margin: '0 auto 20px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#333',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
  },
  filterBar: {
    maxWidth: '1200px',
    margin: '20px auto',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchContainer: {
    position: 'relative',
    flex: 1,
    minWidth: '250px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 40px 12px 15px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  clearSearch: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#666',
  },
  filterButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: '20px',
    backgroundColor: 'white',
    color: '#666',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  activeFilter: {
    backgroundColor: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6',
  },
  countContainer: {
    maxWidth: '1200px',
    margin: '10px auto',
  },
  countText: {
    fontSize: '14px',
    color: '#666',
  },
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  loadingText: {
    color: '#666',
  },
  errorContainer: {
    maxWidth: '400px',
    margin: '100px auto',
    textAlign: 'center',
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '15px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
  },
  errorIcon: {
    fontSize: '60px',
    marginBottom: '20px',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#333',
  },
  errorText: {
    color: '#666',
    marginBottom: '30px',
    lineHeight: 1.6,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '12px 30px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '16px',
  },
  emptyState: {
    maxWidth: '400px',
    margin: '100px auto',
    textAlign: 'center',
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '15px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
  },
  emptyIcon: {
    fontSize: '60px',
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#333',
  },
  emptyText: {
    color: '#666',
    marginBottom: '30px',
    lineHeight: 1.6,
  },
  bookButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '12px 30px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    display: 'inline-block',
  },
  bookingsList: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s, boxShadow 0.3s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 5px 20px rgba(0,0,0,0.15)',
    },
  },
  bookingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid #eee',
  },
  route: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '5px',
    color: '#333',
  },
  bookingId: {
    fontSize: '14px',
    color: '#666',
  },
  statusBadge: {
    padding: '5px 15px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
  },
  bookingDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '25px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  detailLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '5px',
  },
  detailValue: {
    fontSize: '16px',
    fontWeight: '500',
  },
  bookingFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid #eee',
    flexWrap: 'wrap',
    gap: '15px',
  },
  priceSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  priceLabel: {
    fontSize: '14px',
    color: '#666',
  },
  price: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  paymentStatus: {
    fontSize: '14px',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  actionButton: {
    padding: '10px 20px',
    border: '1px solid #3b82f6',
    backgroundColor: 'transparent',
    color: '#3b82f6',
    borderRadius: '5px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    ':hover': {
      backgroundColor: '#3b82f6',
      color: 'white',
    },
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    ':hover': {
      backgroundColor: '#dc2626',
    },
  },
  modifyButton: {
    padding: '10px 20px',
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'all 0.3s',
    ':hover': {
      backgroundColor: '#7c3aed',
    },
  },
  receiptInfo: {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#f0fdf4',
    borderRadius: '5px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  receiptIcon: {
    fontSize: '20px',
  },
  receiptText: {
    fontSize: '14px',
    color: '#166534',
  },
}

// Add keyframes for spinner animation
const style = document.createElement('style')
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`
document.head.appendChild(style)

export default MyBookingsPage