import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function OperatorBookingsPage() {
  const navigate = useNavigate()
  
  // ============================
  // STATE MANAGEMENT
  // ============================
  
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [operator, setOperator] = useState(null)
  
  // Filters
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBookings, setTotalBookings] = useState(0)
  const itemsPerPage = 10

  // ============================
  // EFFECTS
  // ============================
  
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    
    if (!token || !userStr) {
      navigate('/login')
      return
    }
    
    const user = JSON.parse(userStr)
    if (user.role !== 'operator') {
      navigate('/')
      return
    }
    
    setOperator(user)
    fetchBookings()
  }, [navigate, currentPage, filter, dateRange])

  // ============================
  // API FUNCTIONS
  // ============================
  
  /**
   * Fetch all bookings with filters
   */
  const fetchBookings = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('token')
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        status: filter !== 'all' ? filter : '',
        startDate: dateRange.start || '',
        endDate: dateRange.end || '',
        search: searchTerm || ''
      })
      
      console.log('📋 Fetching operator bookings...')
      
      const response = await fetch(`${API_BASE_URL}/operators/bookings?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('user')
          localStorage.removeItem('token')
          navigate('/login')
          throw new Error('Session expired')
        }
        throw new Error('Failed to fetch bookings')
      }
      
      const data = await response.json()
      console.log('✅ Bookings received:', data)
      
      setBookings(data.bookings || [])
      setTotalPages(data.totalPages || 1)
      setTotalBookings(data.total || 0)
      
    } catch (error) {
      console.error('❌ Error fetching bookings:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Update booking status
   */
  const handleUpdateStatus = async (bookingId, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this booking as ${newStatus}?`)) {
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update status')
      }
      
      // Refresh bookings
      await fetchBookings()
      
      alert(`✅ Booking marked as ${newStatus}`)
      
    } catch (error) {
      console.error('❌ Status update error:', error)
      alert(`Failed to update status: ${error.message}`)
    }
  }

  /**
   * Cancel booking
   */
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return
    }
    
    const reason = prompt('Please enter cancellation reason (optional):')
    
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to cancel booking')
      }
      
      // Refresh bookings
      await fetchBookings()
      
      alert('✅ Booking cancelled successfully')
      
    } catch (error) {
      console.error('❌ Cancel error:', error)
      alert(`Failed to cancel booking: ${error.message}`)
    }
  }

  /**
   * Print ticket
   */
  const handlePrintTicket = async (bookingId) => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/ticket`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Failed to generate ticket')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      
    } catch (error) {
      console.error('❌ Ticket error:', error)
      alert('Failed to generate ticket')
    }
  }

  /**
   * Send SMS reminder
   */
  const handleSendReminder = async (booking) => {
    if (!booking.customerPhone) {
      alert('Customer phone number not available')
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/bookings/${booking.bookingID}/reminder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) throw new Error('Failed to send reminder')
      
      alert(`✅ Reminder sent to ${booking.customerPhone}`)
      
    } catch (error) {
      console.error('❌ SMS error:', error)
      alert('Failed to send reminder')
    }
  }

  /**
   * Export bookings to Excel
   */
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/operators/bookings/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Failed to export bookings')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bookings-export-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      
    } catch (error) {
      console.error('❌ Export error:', error)
      alert('Failed to export bookings')
    }
  }

  /**
   * Print daily report
   */
  const handlePrintReport = async () => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/operators/reports/daily`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Failed to generate report')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      
    } catch (error) {
      console.error('❌ Report error:', error)
      alert('Failed to generate report')
    }
  }

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    setSearchTerm('')
    setFilter('all')
    setDateRange({ start: '', end: '' })
    setCurrentPage(1)
  }

  // ============================
  // HELPER FUNCTIONS
  // ============================
  
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusStyle = (status) => {
    const styles = {
      confirmed: { bg: '#d1fae5', color: '#065f46' },
      pending: { bg: '#fef3c7', color: '#92400e' },
      cancelled: { bg: '#fee2e2', color: '#991b1b' },
      completed: { bg: '#dbeafe', color: '#1e40af' },
      refunded: { bg: '#f3e8ff', color: '#6b21a8' }
    }
    return styles[status?.toLowerCase()] || { bg: '#f3f4f6', color: '#4b5563' }
  }

  const getPaymentStatusStyle = (status) => {
    const styles = {
      paid: { bg: '#d1fae5', color: '#065f46' },
      pending: { bg: '#fef3c7', color: '#92400e' },
      failed: { bg: '#fee2e2', color: '#991b1b' },
      refunded: { bg: '#f3e8ff', color: '#6b21a8' }
    }
    return styles[status?.toLowerCase()] || { bg: '#f3f4f6', color: '#4b5563' }
  }

  const calculateStats = () => {
    return {
      total: totalBookings,
      revenue: bookings
        .filter(b => b.paymentStatus === 'paid')
        .reduce((sum, b) => sum + (b.totalAmount || b.amount || 0), 0),
      pendingPayments: bookings.filter(b => b.paymentStatus === 'pending').length,
      cancelled: bookings.filter(b => b.bookingStatus === 'cancelled').length
    }
  }

  // ============================
  // RENDER
  // ============================
  
  const stats = calculateStats()

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📋 All Bookings</h1>
          <p style={styles.subtitle}>
            {operator ? `Operator: ${operator.name || operator.operatorName}` : 'View and manage all customer bookings'}
          </p>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.exportButton} onClick={handleExport}>
            📥 Export Excel
          </button>
          <button style={styles.printButton} onClick={handlePrintReport}>
            🖨️ Print Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search by name, phone, or booking ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchBookings()}
            style={styles.searchInput}
          />
          <span style={styles.searchIcon}>🔍</span>
        </div>
        
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Status:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Bookings</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>From:</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            style={styles.dateInput}
          />
        </div>
        
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>To:</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            style={styles.dateInput}
          />
        </div>
        
        <button onClick={handleClearFilters} style={styles.clearButton}>
          Clear Filters
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsBar}>
        <div style={styles.statItem}>
          <div style={styles.statNumber}>{stats.total}</div>
          <div style={styles.statLabel}>Total Bookings</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statNumber}>KSh {stats.revenue.toLocaleString()}</div>
          <div style={styles.statLabel}>Total Revenue</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statNumber}>{stats.pendingPayments}</div>
          <div style={styles.statLabel}>Pending Payments</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statNumber}>{stats.cancelled}</div>
          <div style={styles.statLabel}>Cancelled</div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading bookings...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>❌</div>
          <h3 style={styles.errorTitle}>Error loading bookings</h3>
          <p style={styles.errorText}>{error}</p>
          <button onClick={fetchBookings} style={styles.retryButton}>
            Try Again
          </button>
        </div>
      )}

      {/* Bookings Table */}
      {!loading && !error && (
        <>
          <div style={styles.bookingsTable}>
            <div style={styles.tableHeader}>
              <div style={styles.tableCell}>Booking ID</div>
              <div style={styles.tableCell}>Customer</div>
              <div style={styles.tableCell}>Route</div>
              <div style={styles.tableCell}>Departure</div>
              <div style={styles.tableCell}>Seats</div>
              <div style={styles.tableCell}>Amount</div>
              <div style={styles.tableCell}>Payment</div>
              <div style={styles.tableCell}>Status</div>
              <div style={styles.tableCell}>Operator</div>
              <div style={styles.tableCell}>Actions</div>
            </div>
            
            {bookings.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📭</div>
                <h3 style={styles.emptyTitle}>No bookings found</h3>
                <p style={styles.emptyText}>Try adjusting your filters</p>
              </div>
            ) : (
              bookings.map(booking => {
                const statusStyle = getStatusStyle(booking.bookingStatus)
                const paymentStyle = getPaymentStatusStyle(booking.paymentStatus)
                
                return (
                  <div key={booking.bookingID} style={styles.tableRow}>
                    <div style={styles.tableCell}>
                      <span style={styles.bookingIdText}>
                        {booking.bookingReference}
                      </span>
                      <div style={styles.bookingDate}>
                        {formatDate(booking.createdAt)}
                      </div>
                    </div>
                    
                    <div style={styles.tableCell}>
                      <div style={styles.customerInfo}>
                        <div style={styles.customerName}>
                          {booking.customerName}
                        </div>
                        <div style={styles.customerContact}>
                          <span style={styles.customerPhone}>
                            {booking.customerPhone}
                          </span>
                          {booking.customerEmail && (
                            <span style={styles.customerEmail}>
                              {booking.customerEmail}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div style={styles.tableCell}>
                      {booking.route || `${booking.origin} → ${booking.destination}`}
                    </div>
                    
                    <div style={styles.tableCell}>
                      <div style={styles.departureTime}>
                        {formatDateTime(booking.travelDate)}
                      </div>
                    </div>
                    
                    <div style={styles.tableCell}>
                      <div style={styles.seatsBadge}>
                        {booking.seatNumbers?.join(', ') || booking.seats}
                      </div>
                    </div>
                    
                    <div style={styles.tableCell}>
                      <div style={styles.amountText}>
                        KSh {(booking.totalAmount || booking.amount || 0).toLocaleString()}
                      </div>
                      <div style={styles.paymentMethod}>
                        {booking.paymentMethod === 'mpesa' ? '📱 M-Pesa' : 
                         booking.paymentMethod === 'cash' ? '💵 Cash' : '💳 Card'}
                      </div>
                    </div>
                    
                    <div style={styles.tableCell}>
                      <span style={{
                        ...styles.paymentBadge,
                        backgroundColor: paymentStyle.bg,
                        color: paymentStyle.color
                      }}>
                        {booking.paymentStatus}
                      </span>
                    </div>
                    
                    <div style={styles.tableCell}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.color
                      }}>
                        {booking.bookingStatus}
                      </span>
                    </div>
                    
                    <div style={styles.tableCell}>
                      <div style={styles.operatorBadge}>
                        {booking.operatorName || 'System'}
                      </div>
                    </div>
                    
                    <div style={styles.tableCell}>
                      <div style={styles.actionButtons}>
                        <button 
                          style={styles.viewButton}
                          onClick={() => navigate(`/operator/bookings/${booking.bookingID}`)}
                          title="View Details"
                        >
                          👁️
                        </button>
                        
                        <button 
                          style={styles.smsButton}
                          onClick={() => handleSendReminder(booking)}
                          title="Send SMS Reminder"
                        >
                          📲
                        </button>
                        
                        <button 
                          style={styles.printButtonSmall}
                          onClick={() => handlePrintTicket(booking.bookingID)}
                          title="Print Ticket"
                        >
                          🖨️
                        </button>
                        
                        {booking.bookingStatus === 'pending' && (
                          <button 
                            style={styles.confirmButton}
                            onClick={() => handleUpdateStatus(booking.bookingID, 'confirmed')}
                            title="Confirm Booking"
                          >
                            ✓
                          </button>
                        )}
                        
                        {booking.bookingStatus === 'confirmed' && (
                          <button 
                            style={styles.completeButton}
                            onClick={() => handleUpdateStatus(booking.bookingID, 'completed')}
                            title="Mark Completed"
                          >
                            ✅
                          </button>
                        )}
                        
                        {booking.bookingStatus !== 'cancelled' && booking.bookingStatus !== 'completed' && (
                          <button 
                            style={styles.cancelButton}
                            onClick={() => handleCancelBooking(booking.bookingID)}
                            title="Cancel Booking"
                          >
                            ❌
                          </button>
                        )}
                      </div>
                      
                      {booking.notes && (
                        <div style={styles.notes} title={booking.notes}>
                          📝
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={styles.pageButton}
              >
                ← Previous
              </button>
              
              <span style={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={styles.pageButton}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================
// STYLES
// ============================

const styles = {
  container: {
    padding: '30px',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '5px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
  },
  headerActions: {
    display: 'flex',
    gap: '15px',
  },
  exportButton: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  printButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filters: {
    display: 'flex',
    gap: '15px',
    marginBottom: '30px',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  searchBox: {
    flex: 1,
    minWidth: '250px',
    position: 'relative',
  },
  searchInput: {
    width: '100%',
    padding: '12px 40px 12px 15px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: '#f8fafc',
  },
  searchIcon: {
    position: 'absolute',
    right: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569',
    whiteSpace: 'nowrap',
  },
  filterSelect: {
    padding: '10px 15px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
    minWidth: '120px',
  },
  dateInput: {
    padding: '10px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
    minWidth: '120px',
  },
  clearButton: {
    backgroundColor: 'transparent',
    color: '#ef4444',
    padding: '10px 15px',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statItem: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '5px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '60px',
    backgroundColor: 'white',
    borderRadius: '12px',
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '12px',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '15px',
  },
  errorTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: '10px',
  },
  errorText: {
    color: '#6b7280',
    marginBottom: '20px',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  bookingsTable: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1.5fr 1.5fr 1.2fr 1fr 1fr 1fr 1fr 1fr 1.5fr',
    backgroundColor: '#f8fafc',
    padding: '15px 20px',
    borderBottom: '1px solid #e5e7eb',
    fontWeight: '600',
    color: '#374151',
    fontSize: '14px',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1.5fr 1.5fr 1.2fr 1fr 1fr 1fr 1fr 1fr 1.5fr',
    padding: '15px 20px',
    borderBottom: '1px solid #f3f4f6',
    alignItems: 'center',
    ':hover': {
      backgroundColor: '#f8fafc',
    },
  },
  tableCell: {
    padding: '0 8px',
  },
  bookingIdText: {
    fontWeight: '600',
    color: '#3b82f6',
    fontSize: '13px',
    display: 'block',
  },
  bookingDate: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '2px',
  },
  customerInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  customerName: {
    fontWeight: '500',
    color: '#1f2937',
    fontSize: '14px',
    marginBottom: '2px',
  },
  customerContact: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  customerPhone: {
    fontSize: '11px',
    color: '#6b7280',
  },
  customerEmail: {
    fontSize: '11px',
    color: '#6b7280',
  },
  departureTime: {
    fontSize: '13px',
    color: '#1f2937',
  },
  seatsBadge: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
    display: 'inline-block',
  },
  amountText: {
    fontWeight: '600',
    color: '#1f2937',
    fontSize: '13px',
  },
  paymentMethod: {
    fontSize: '10px',
    color: '#6b7280',
    marginTop: '2px',
  },
  paymentBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
  },
  operatorBadge: {
    backgroundColor: '#f0f9ff',
    color: '#0369a1',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
    display: 'inline-block',
  },
  actionButtons: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  },
  viewButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smsButton: {
    backgroundColor: '#10b981',
    color: 'white',
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  printButtonSmall: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    backgroundColor: '#059669',
    color: 'white',
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButton: {
    backgroundColor: '#7c3aed',
    color: 'white',
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notes: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '5px',
    cursor: 'help',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '60px',
    color: '#d1d5db',
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '10px',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: '14px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    marginTop: '30px',
  },
  pageButton: {
    padding: '8px 16px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
  pageInfo: {
    fontSize: '14px',
    color: '#475569',
  },
}

// Add keyframes
const style = document.createElement('style')
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`
document.head.appendChild(style)

export default OperatorBookingsPage