import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function OperatorDashboard() {
  const navigate = useNavigate()
  
  // ============================
  // STATE MANAGEMENT
  // ============================
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [operatorInfo, setOperatorInfo] = useState(null)
  
  // Statistics from database
  const [stats, setStats] = useState({
    todayBookings: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    availableSeats: 0,
    totalCustomers: 0,
    completedTrips: 0
  })
  
  // Recent bookings from database
  const [recentBookings, setRecentBookings] = useState([])
  
  // Quick search for customer
  const [searchPhone, setSearchPhone] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searching, setSearching] = useState(false)

  // ============================
  // EFFECTS
  // ============================
  
  useEffect(() => {
    fetchDashboardData()
  }, [])

  // ============================
  // API FUNCTIONS
  // ============================
  
  /**
   * Fetch operator dashboard data
   * Endpoint: GET /api/operators/dashboard
   */
  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      
      if (!token || !userStr) {
        navigate('/login')
        return
      }
      
      const user = JSON.parse(userStr)
      setOperatorInfo(user)
      
      console.log('📊 Fetching operator dashboard...')
      
      const response = await fetch(`${API_BASE_URL}/operators/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('user')
          localStorage.removeItem('token')
          navigate('/login')
          throw new Error('Session expired')
        }
        if (response.status === 403) {
          navigate('/')
          throw new Error('Unauthorized access')
        }
        throw new Error('Failed to fetch dashboard data')
      }
      
      const data = await response.json()
      console.log('✅ Dashboard data received:', data)
      
      setStats(data.stats || {})
      setRecentBookings(data.recentBookings || [])
      
    } catch (error) {
      console.error('❌ Error fetching dashboard:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Search customer by phone number
   * Endpoint: GET /api/customers/search?phone=...
   */
  const handleSearchCustomer = async () => {
    if (!searchPhone.trim()) {
      alert('Please enter a phone number')
      return
    }
    
    setSearching(true)
    setSearchResult(null)
    
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/customers/search?phone=${searchPhone}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          setSearchResult({ notFound: true })
          return
        }
        throw new Error('Search failed')
      }
      
      const data = await response.json()
      setSearchResult(data.customer)
      
    } catch (error) {
      console.error('❌ Search error:', error)
      alert('Failed to search customer')
    } finally {
      setSearching(false)
    }
  }

  /**
   * Generate daily report
   * Endpoint: GET /api/operators/reports/daily
   */
  const handleGenerateReport = async () => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/operators/reports/daily`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Failed to generate report')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `daily-report-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      
    } catch (error) {
      console.error('❌ Report error:', error)
      alert('Failed to generate report')
    }
  }

  /**
   * Update booking status
   * Endpoint: PUT /api/bookings/:id/status
   */
  const handleUpdateStatus = async (bookingId, newStatus) => {
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
      
      if (!response.ok) throw new Error('Failed to update status')
      
      // Refresh dashboard
      fetchDashboardData()
      
    } catch (error) {
      console.error('❌ Status update error:', error)
      alert('Failed to update booking status')
    }
  }

  /**
   * Print ticket
   * Endpoint: GET /api/bookings/:id/ticket
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

  const getStatusStyle = (status) => {
    const styles = {
      confirmed: { bg: '#d1fae5', color: '#065f46' },
      pending: { bg: '#fef3c7', color: '#92400e' },
      cancelled: { bg: '#fee2e2', color: '#991b1b' },
      completed: { bg: '#dbeafe', color: '#1e40af' }
    }
    return styles[status?.toLowerCase()] || { bg: '#f3f4f6', color: '#4b5563' }
  }

  // ============================
  // RENDER FUNCTIONS
  // ============================
  
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading operator dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>❌</div>
        <h2 style={styles.errorTitle}>Something went wrong</h2>
        <p style={styles.errorText}>{error}</p>
        <button onClick={fetchDashboardData} style={styles.retryButton}>
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Dashboard Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            🏢 Welcome, {operatorInfo?.name || operatorInfo?.operatorName || 'Operator'}!
          </h1>
          <p style={styles.subtitle}>
            {operatorInfo?.officeLocation || 'Manage bookings and customer reservations'}
          </p>
          {operatorInfo?.shift && (
            <p style={styles.shiftInfo}>Shift: {operatorInfo.shift}</p>
          )}
        </div>
        
        <div style={styles.headerActions}>
          {/* Quick Customer Search */}
          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="Search customer by phone..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              style={styles.searchInput}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchCustomer()}
            />
            <button
              onClick={handleSearchCustomer}
              disabled={searching}
              style={styles.searchButton}
            >
              {searching ? '🔍...' : '🔍 Search'}
            </button>
          </div>
          
          {/* Search Result Popup */}
          {searchResult && (
            <div style={styles.searchResult}>
              {searchResult.notFound ? (
                <p style={styles.notFound}>❌ Customer not found</p>
              ) : (
                <div>
                  <p style={styles.resultName}>✓ {searchResult.customerName}</p>
                  <p style={styles.resultPhone}>{searchResult.phoneNumber}</p>
                  <button
                    onClick={() => {
                      navigate('/operator/book', { state: { customer: searchResult } })
                      setSearchResult(null)
                      setSearchPhone('')
                    }}
                    style={styles.resultAction}
                  >
                    Book for this customer →
                  </button>
                </div>
              )}
              <button
                onClick={() => setSearchResult(null)}
                style={styles.closeResult}
              >
                ✕
              </button>
            </div>
          )}
          
          <button style={styles.quickBookButton} onClick={() => navigate('/operator/book')}>
            📱 Quick Book
          </button>
          <button style={styles.viewAllButton} onClick={() => navigate('/operator/bookings')}>
            📋 All Bookings
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, backgroundColor: '#dbeafe', color: '#1d4ed8'}}>📅</div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>{stats.todayBookings || 0}</h3>
            <p style={styles.statLabel}>Today's Bookings</p>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, backgroundColor: '#dcfce7', color: '#15803d'}}>💰</div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>
              KSh {(stats.totalRevenue || 0).toLocaleString()}
            </h3>
            <p style={styles.statLabel}>Total Revenue</p>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, backgroundColor: '#fef3c7', color: '#92400e'}}>⏳</div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>
              KSh {(stats.pendingPayments || 0).toLocaleString()}
            </h3>
            <p style={styles.statLabel}>Pending Payments</p>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, backgroundColor: '#f3e8ff', color: '#7c3aed'}}>🪑</div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>{stats.availableSeats || 0}</h3>
            <p style={styles.statLabel}>Available Seats</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        <div style={styles.actionsGrid}>
          <button style={styles.actionCard} onClick={() => navigate('/operator/book')}>
            <div style={styles.actionIcon}>➕</div>
            <h3 style={styles.actionTitle}>New Booking</h3>
            <p style={styles.actionDesc}>Book for a customer</p>
          </button>
          
          <button style={styles.actionCard} onClick={handleGenerateReport}>
            <div style={styles.actionIcon}>📊</div>
            <h3 style={styles.actionTitle}>Daily Report</h3>
            <p style={styles.actionDesc}>Generate sales report</p>
          </button>
          
          <button style={styles.actionCard} onClick={() => navigate('/operator/schedules')}>
            <div style={styles.actionIcon}>🚌</div>
            <h3 style={styles.actionTitle}>View Schedules</h3>
            <p style={styles.actionDesc}>Check bus schedules</p>
          </button>
          
          <button style={styles.actionCard} onClick={() => navigate('/operator/customers')}>
            <div style={styles.actionIcon}>👥</div>
            <h3 style={styles.actionTitle}>Customers</h3>
            <p style={styles.actionDesc}>View all customers</p>
          </button>
        </div>
      </div>

      {/* Recent Bookings */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Recent Bookings</h2>
          <button style={styles.seeAllButton} onClick={() => navigate('/operator/bookings')}>
            See All →
          </button>
        </div>
        
        {recentBookings.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No recent bookings</p>
          </div>
        ) : (
          <div style={styles.bookingsTable}>
            <div style={styles.tableHeader}>
              <div style={styles.tableCell}>Booking ID</div>
              <div style={styles.tableCell}>Customer</div>
              <div style={styles.tableCell}>Route</div>
              <div style={styles.tableCell}>Seats</div>
              <div style={styles.tableCell}>Amount</div>
              <div style={styles.tableCell}>Time</div>
              <div style={styles.tableCell}>Status</div>
              <div style={styles.tableCell}>Actions</div>
            </div>
            
            {recentBookings.map(booking => {
              const statusStyle = getStatusStyle(booking.status)
              return (
                <div key={booking.bookingID || booking.id} style={styles.tableRow}>
                  <div style={styles.tableCell}>
                    <span style={styles.bookingId}>
                      {booking.bookingReference || booking.bookingId}
                    </span>
                  </div>
                  
                  <div style={styles.tableCell}>
                    <div style={styles.customerInfo}>
                      <div style={styles.customerName}>
                        {booking.customerName || booking.customer}
                      </div>
                      <div style={styles.customerPhone}>
                        {booking.customerPhone || booking.phone}
                      </div>
                    </div>
                  </div>
                  
                  <div style={styles.tableCell}>
                    {booking.route || `${booking.origin || ''} → ${booking.destination || ''}`}
                  </div>
                  
                  <div style={styles.tableCell}>
                    {booking.seatNumbers?.join(', ') || booking.seats}
                  </div>
                  
                  <div style={styles.tableCell}>
                    KSh {(booking.totalAmount || booking.amount || 0).toLocaleString()}
                  </div>
                  
                  <div style={styles.tableCell}>
                    {formatDateTime(booking.createdAt || booking.bookingDate)}
                  </div>
                  
                  <div style={styles.tableCell}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.color
                    }}>
                      {booking.status || 'pending'}
                    </span>
                  </div>
                  
                  <div style={styles.tableCell}>
                    <div style={styles.actionButtons}>
                      <button
                        style={styles.viewButton}
                        onClick={() => navigate(`/operator/bookings/${booking.bookingID || booking.id}`)}
                        title="View Details"
                      >
                        👁️
                      </button>
                      
                      <button
                        style={styles.printButton}
                        onClick={() => handlePrintTicket(booking.bookingID || booking.id)}
                        title="Print Ticket"
                      >
                        🖨️
                      </button>
                      
                      {booking.status?.toLowerCase() === 'pending' && (
                        <button
                          style={styles.confirmButton}
                          onClick={() => handleUpdateStatus(booking.bookingID || booking.id, 'confirmed')}
                          title="Confirm Booking"
                        >
                          ✓
                        </button>
                      )}
                      
                      {booking.status?.toLowerCase() === 'confirmed' && (
                        <button
                          style={styles.completeButton}
                          onClick={() => handleUpdateStatus(booking.bookingID || booking.id, 'completed')}
                          title="Mark Completed"
                        >
                          ✅
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
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
    maxWidth: '1400px',
    margin: '0 auto',
  },
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '12px 30px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
  },
  header: {
    marginBottom: '40px',
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
    marginBottom: '5px',
  },
  shiftInfo: {
    fontSize: '14px',
    color: '#3b82f6',
    fontWeight: '500',
  },
  headerActions: {
    marginTop: '20px',
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
    alignItems: 'center',
    position: 'relative',
  },
  searchBox: {
    display: 'flex',
    gap: '10px',
    flex: 1,
    minWidth: '300px',
  },
  searchInput: {
    flex: 1,
    padding: '12px 15px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
  },
  searchButton: {
    padding: '12px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  searchResult: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '15px',
    marginTop: '5px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notFound: {
    color: '#ef4444',
    margin: 0,
  },
  resultName: {
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '3px',
  },
  resultPhone: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '8px',
  },
  resultAction: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#3b82f6',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
  },
  closeResult: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#64748b',
  },
  quickBookButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  viewAllButton: {
    backgroundColor: 'white',
    color: '#3b82f6',
    padding: '12px 24px',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  statIcon: {
    fontSize: '40px',
    width: '70px',
    height: '70px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    color: '#1f2937',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  section: {
    marginBottom: '40px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937',
  },
  seeAllButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#3b82f6',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'transform 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
    },
  },
  actionIcon: {
    fontSize: '40px',
    marginBottom: '15px',
  },
  actionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#1f2937',
  },
  actionDesc: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: '16px',
  },
  bookingsTable: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1.5fr 1.5fr 1fr 1fr 1.2fr 1fr 1fr',
    backgroundColor: '#f8fafc',
    padding: '15px 20px',
    borderBottom: '1px solid #e5e7eb',
    fontWeight: '600',
    color: '#374151',
    fontSize: '14px',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1.5fr 1.5fr 1fr 1fr 1.2fr 1fr 1fr',
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
  bookingId: {
    fontWeight: '600',
    color: '#3b82f6',
    fontSize: '13px',
  },
  customerInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  customerName: {
    fontWeight: '500',
    color: '#1f2937',
    fontSize: '14px',
  },
  customerPhone: {
    fontSize: '12px',
    color: '#6b7280',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actionButtons: {
    display: 'flex',
    gap: '5px',
  },
  viewButton: {
    padding: '6px 8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  printButton: {
    padding: '6px 8px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '6px 8px',
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  completeButton: {
    padding: '6px 8px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
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

export default OperatorDashboard