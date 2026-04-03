import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiFetch from '../utils/api'  // Import the apiFetch helper

// API Configuration (keep for fallback but will use apiFetch)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function MyBookingsPage() {
  // ============================
  // STATE MANAGEMENT
  // ============================
  
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [cancellingBooking, setCancellingBooking] = useState(null)
  
  const navigate = useNavigate()

  // ============================
  // EFFECTS
  // ============================
  
  useEffect(() => {
    fetchBookings()
  }, [])

  // ============================
  // API FUNCTIONS
  // ============================
  
  const fetchBookings = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      
      if (!token || !userStr) {
        navigate('/login')
        return
      }
      
      console.log('📋 Fetching customer bookings from /bookings/customer...')
      
      // Use apiFetch instead of direct fetch
      const data = await apiFetch('/bookings/customer')
      
      console.log('✅ Bookings received:', data)
      
      const bookingsData = data.bookings || data.data || []
      setBookings(bookingsData)
      
    } catch (error) {
      console.error('❌ Error fetching bookings:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async (bookingId) => {
    // Check if booking is within 30 minutes of departure
    const booking = bookings.find(b => (b.bookingID || b.id) === bookingId)
    if (booking && booking.travelDate) {
      const travelTime = new Date(booking.travelDate).getTime()
      const currentTime = new Date().getTime()
      const minutesUntilTravel = (travelTime - currentTime) / (1000 * 60)
      
      if (minutesUntilTravel < 30) {
        alert(`❌ Cannot cancel booking\n\nBookings can only be cancelled at least 30 minutes before departure.\nYou have ${Math.max(0, Math.floor(minutesUntilTravel))} minutes remaining.`)
        return
      }
    }
    
    if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return
    }
    
    setCancellingBooking(bookingId)
    
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/login')
        return
      }
      
      // Use apiFetch instead of direct fetch
      const result = await apiFetch(`/bookings/${bookingId}/cancel`, {
        method: 'PUT'
      })
      
      console.log('✅ Booking cancelled:', result)
      
      // Refresh bookings list
      await fetchBookings()
      alert('✅ Booking cancelled successfully')
      
    } catch (error) {
      console.error('❌ Error cancelling booking:', error)
      alert(`Failed to cancel booking: ${error.message}`)
    } finally {
      setCancellingBooking(null)
    }
  }

  // Updated handleViewTicket function
  const handleViewTicket = (bookingId) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Please login again')
        return
      }
      
      // Use correct endpoint with token in URL for new window
      const ticketUrl = `${API_BASE_URL}/bookings/${bookingId}/ticket?token=${token}`
      window.open(ticketUrl, '_blank')
    } catch (error) {
      console.error('❌ Error viewing ticket:', error)
      alert('Failed to load ticket')
    }
  }

  // Updated handleReprintTicket function
  const handleReprintTicket = async (bookingId) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Please login again')
        return
      }
      
      // Use fetch for HTML response (apiFetch expects JSON)
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/ticket?token=${token}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch ticket')
      }
      
      const ticketHTML = await response.text()
      
      // Open in new window
      const printWindow = window.open('', '_blank')
      printWindow.document.write(ticketHTML)
      printWindow.document.close()
      
    } catch (error) {
      console.error('❌ Error reprinting ticket:', error)
      alert('Failed to reprint ticket')
    }
  }

  // ============================
  // HELPER FUNCTIONS
  // ============================
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
    return new Date(dateString).toLocaleDateString('en-KE', options)
  }

  const getStatusStyle = (status) => {
    const statusLower = status?.toLowerCase() || ''
    
    const styles = {
      confirmed: { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #10b981' },
      pending: { backgroundColor: '#fed7aa', color: '#92400e', border: '1px solid #f59e0b' },
      cancelled: { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #ef4444' },
      completed: { backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #6366f1' },
      refunded: { backgroundColor: '#f3e8ff', color: '#6b21a5', border: '1px solid #8b5cf6' }
    }
    
    return styles[statusLower] || { backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #9ca3af' }
  }

  const getPaymentStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid': return '#059669'
      case 'completed': return '#059669'
      case 'pending': return '#d97706'
      case 'failed': return '#dc2626'
      case 'refunded': return '#7c3aed'
      default: return '#6b7280'
    }
  }

  const canCancelBooking = (booking) => {
    const status = booking.status?.toLowerCase()
    if (status !== 'confirmed' && status !== 'pending') return false
    
    const travelDate = new Date(booking.travelDate)
    const currentTime = new Date()
    const minutesUntilTravel = (travelDate - currentTime) / (1000 * 60)
    
    return minutesUntilTravel >= 30
  }

  const getMinutesUntilTravel = (booking) => {
    if (!booking.travelDate) return null
    const travelDate = new Date(booking.travelDate)
    const currentTime = new Date()
    const minutesUntilTravel = Math.floor((travelDate - currentTime) / (1000 * 60))
    return minutesUntilTravel
  }

  const getFilteredBookings = () => {
    let filtered = [...bookings]
    
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
            return travelDate < today || booking.status === 'completed' || booking.status === 'cancelled'
          case 'cancelled':
            return booking.status === 'cancelled'
          default:
            return true
        }
      })
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(booking => 
        (booking.bookingReference || booking.id)?.toString().toLowerCase().includes(term) ||
        booking.route?.toLowerCase().includes(term) ||
        booking.seatNumber?.toString().includes(term) ||
        (booking.origin && booking.destination && `${booking.origin} → ${booking.destination}`.toLowerCase().includes(term))
      )
    }
    
    return filtered
  }

  // ============================
  // RENDER
  // ============================
  
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading your bookings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>❌</div>
          <h2 style={styles.errorTitle}>Something went wrong</h2>
          <p style={styles.errorMessage}>{error}</p>
          <button onClick={() => fetchBookings()} style={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const filteredBookings = getFilteredBookings()

  return (
    <div style={styles.container}>
      <div style={styles.contentWrapper}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>📋</div>
          <h1 style={styles.title}>My Bookings</h1>
          <p style={styles.subtitle}>View and manage all your journeys</p>
        </div>

        {/* Search and Filter Bar */}
        <div style={styles.searchFilterBar}>
          <div style={styles.searchWrapper}>
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
                style={styles.clearSearchButton}
              >
                ✕
              </button>
            )}
          </div>
          
          <div style={styles.filterButtons}>
            {['all', 'upcoming', 'past', 'cancelled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  ...styles.filterButton,
                  background: filter === f ? '#f59e0b' : 'white',
                  color: filter === f ? 'white' : '#78350f',
                  borderColor: filter === f ? '#f59e0b' : '#fed7aa'
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings Count */}
        <p style={styles.bookingsCount}>
          Showing {filteredBookings.length} of {bookings.length} bookings
        </p>

        {filteredBookings.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <h2 style={styles.emptyTitle}>
              {bookings.length === 0 ? 'No Bookings Yet' : 'No Matching Bookings'}
            </h2>
            <p style={styles.emptyMessage}>
              {bookings.length === 0 
                ? "You haven't made any bookings yet. Start your journey today!"
                : "Try adjusting your filters or search term to see more results."}
            </p>
            <Link to="/book" style={styles.bookNowButton}>
              {bookings.length === 0 ? 'Book Now' : 'Clear Filters'}
            </Link>
          </div>
        ) : (
          <div style={styles.bookingsList}>
            {filteredBookings.map((booking) => {
              const bookingId = booking.bookingID || booking.id
              const canCancel = canCancelBooking(booking)
              const minutesUntilTravel = getMinutesUntilTravel(booking)
              const isCancelling = cancellingBooking === bookingId
              
              return (
                <div key={bookingId} style={styles.bookingCard}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.routeTitle}>
                        {booking.route || `${booking.origin || 'Nairobi'} → ${booking.destination || 'Mombasa'}`}
                      </h3>
                      <p style={styles.bookingId}>
                        Booking ID: {booking.bookingReference || `ER${bookingId}`}
                      </p>
                    </div>
                    <span style={getStatusStyle(booking.status)} className="status-badge">
                      {booking.status || 'Pending'}
                    </span>
                  </div>

                  <div style={styles.detailsGrid}>
                    <div>
                      <p style={styles.detailLabel}>📅 Travel Date</p>
                      <p style={styles.detailValue}>{formatDate(booking.travelDate)}</p>
                    </div>
                    <div>
                      <p style={styles.detailLabel}>💺 Seat</p>
                      <p style={styles.detailValue}>{booking.seatNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p style={styles.detailLabel}>🚌 Vehicle</p>
                      <p style={styles.detailValue}>{booking.vehicleNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p style={styles.detailLabel}>⏰ Booked On</p>
                      <p style={styles.detailValue}>{formatDate(booking.bookingDate)}</p>
                    </div>
                  </div>

                  <div style={styles.cardFooter}>
                    <div style={styles.priceSection}>
                      <span style={styles.totalLabel}>Total:</span>
                      <span style={styles.totalAmount}>
                        KSh {booking.amount || booking.total_fare || booking.totalAmount || 0}
                      </span>
                      {booking.paymentStatus && (
                        <span style={{...styles.paymentStatus, color: getPaymentStatusColor(booking.paymentStatus) }}>
                          ({booking.paymentStatus})
                        </span>
                      )}
                    </div>
                    
                    <div style={styles.actionButtons}>
                      <button
                        onClick={() => handleViewTicket(bookingId)}
                        style={styles.viewTicketButton}
                      >
                        🎫 View Ticket
                      </button>
                      
                      <button
                        onClick={() => handleReprintTicket(bookingId)}
                        style={styles.reprintButton}
                      >
                        🖨️ Reprint Ticket
                      </button>
                      
                      {(booking.status?.toLowerCase() === 'confirmed' || booking.status?.toLowerCase() === 'pending') && (
                        <button
                          onClick={() => handleCancelBooking(bookingId)}
                          disabled={!canCancel || isCancelling}
                          style={{
                            ...styles.cancelButton,
                            opacity: (!canCancel || isCancelling) ? 0.6 : 1,
                            cursor: (!canCancel || isCancelling) ? 'not-allowed' : 'pointer'
                          }}
                          title={!canCancel && minutesUntilTravel !== null && minutesUntilTravel > 0 
                            ? `Cannot cancel - only ${minutesUntilTravel} minutes until departure (need at least 30 minutes)`
                            : !canCancel && minutesUntilTravel !== null && minutesUntilTravel <= 0
                            ? 'Cannot cancel - departure time has passed'
                            : 'Cancel this booking'}
                        >
                          {isCancelling ? (
                            <span>⏳ Cancelling...</span>
                          ) : (
                            '✕ Cancel Booking'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {booking.mpesaCode && (
                    <div style={styles.mpesaInfo}>
                      <span>📱</span>
                      <span>M-Pesa Receipt: {booking.mpesaCode}</span>
                    </div>
                  )}
                  
                  {!canCancel && (booking.status?.toLowerCase() === 'confirmed' || booking.status?.toLowerCase() === 'pending') && minutesUntilTravel !== null && minutesUntilTravel > 0 && (
                    <div style={styles.warningInfo}>
                      <span>⚠️</span>
                      <span>Cancellation unavailable: Only {minutesUntilTravel} minutes until departure (minimum 30 minutes required)</span>
                    </div>
                  )}
                  
                  {!canCancel && (booking.status?.toLowerCase() === 'confirmed' || booking.status?.toLowerCase() === 'pending') && minutesUntilTravel !== null && minutesUntilTravel <= 0 && (
                    <div style={styles.warningInfo}>
                      <span>⚠️</span>
                      <span>Cancellation unavailable: Departure time has passed</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fef9e8, #fff5e6, #fef3e2)',
    padding: '2rem 1rem',
  },
  contentWrapper: {
    maxWidth: '1280px',
    margin: '0 auto',
  },
  loadingContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fef9e8, #fff5e6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContent: {
    textAlign: 'center',
  },
  spinner: {
    width: '4rem',
    height: '4rem',
    border: '4px solid #fbbf24',
    borderTopColor: '#f59e0b',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem',
  },
  loadingText: {
    color: '#78350f',
    fontSize: '1.125rem',
    fontWeight: '500',
  },
  errorContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fef9e8, #fff5e6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  errorCard: {
    background: 'white',
    borderRadius: '1rem',
    padding: '2rem',
    maxWidth: '28rem',
    textAlign: 'center',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },
  errorIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  errorTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#78350f',
    marginBottom: '0.5rem',
  },
  errorMessage: {
    color: '#92400e',
    marginBottom: '1.5rem',
  },
  retryButton: {
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: 'white',
    padding: '0.5rem 1.5rem',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  headerIcon: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
    animation: 'bounce 1s ease infinite',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: '#92400e',
    fontSize: '1.125rem',
  },
  searchFilterBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  searchWrapper: {
    position: 'relative',
    flex: 1,
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 2.5rem 0.75rem 1rem',
    border: '1px solid #fed7aa',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'all 0.3s',
    background: '#fffbef',
    color: '#78350f',
  },
  clearSearchButton: {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#b45309',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  filterButtons: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '0.5rem 1rem',
    borderRadius: '2rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '1px solid',
  },
  bookingsCount: {
    fontSize: '0.875rem',
    color: '#b45309',
    marginBottom: '1rem',
  },
  emptyState: {
    background: 'white',
    borderRadius: '1rem',
    padding: '3rem',
    textAlign: 'center',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#78350f',
    marginBottom: '0.5rem',
  },
  emptyMessage: {
    color: '#92400e',
    marginBottom: '1.5rem',
  },
  bookNowButton: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.75rem',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'all 0.3s',
  },
  bookingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  bookingCard: {
    background: 'white',
    borderRadius: '1rem',
    padding: '1.5rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
    transition: 'all 0.3s',
  },
  cardHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #fed7aa',
  },
  routeTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#78350f',
  },
  bookingId: {
    fontSize: '0.75rem',
    color: '#b45309',
    marginTop: '0.25rem',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
    marginBottom: '1rem',
  },
  detailLabel: {
    fontSize: '0.75rem',
    color: '#b45309',
  },
  detailValue: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#78350f',
  },
  cardFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #fed7aa',
  },
  priceSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  totalLabel: {
    fontSize: '0.875rem',
    color: '#92400e',
  },
  totalAmount: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#d97706',
  },
  paymentStatus: {
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  actionButtons: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  viewTicketButton: {
    padding: '0.5rem 1rem',
    background: 'white',
    border: '1px solid #f59e0b',
    color: '#f59e0b',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  reprintButton: {
    padding: '0.5rem 1rem',
    background: 'white',
    border: '1px solid #8b5cf6',
    color: '#8b5cf6',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    background: '#ef4444',
    border: 'none',
    color: 'white',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  mpesaInfo: {
    marginTop: '0.75rem',
    padding: '0.5rem',
    background: '#d1fae5',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#065f46',
  },
  warningInfo: {
    marginTop: '0.75rem',
    padding: '0.5rem',
    background: '#fed7aa',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#92400e',
  },
}

// Add animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`;
document.head.appendChild(styleSheet);

export default MyBookingsPage