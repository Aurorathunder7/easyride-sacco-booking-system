import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function OperatorBookingsPage() {
  const navigate = useNavigate()
  
  // ============================
  // STATE MANAGEMENT
  // ============================
  
  const [operator, setOperator] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bookings, setBookings] = useState([])
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  
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
    fetchAllBookings()
  }, [navigate])

  // ============================
  // API FUNCTIONS
  // ============================
  
  const fetchAllBookings = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/operators/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch bookings')
      }
      
      const data = await response.json()
      setBookings(data.bookings || [])
      
    } catch (error) {
      console.error('❌ Error fetching bookings:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateBookingStatus = async (bookingId, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this booking as ${newStatus}?`)) {
      return
    }
    
    setActionLoading(`${bookingId}_status`)
    
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/operators/bookings/${bookingId}/status`, {
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
      
      await fetchAllBookings()
      alert(`✅ Booking status updated to ${newStatus}`)
      
    } catch (error) {
      console.error('❌ Status update error:', error)
      alert('Failed to update booking status: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelBooking = async (bookingId, travelDate) => {
    if (travelDate) {
      const travelTime = new Date(travelDate).getTime()
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
    
    setActionLoading(`${bookingId}_cancel`)
    
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/operators/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to cancel booking')
      }
      
      await fetchAllBookings()
      alert('✅ Booking cancelled successfully')
      
    } catch (error) {
      console.error('❌ Cancel booking error:', error)
      alert(`Failed to cancel booking: ${error.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const viewBookingDetails = (booking) => {
    setActionLoading(`view_${booking.id || booking.bookingID}`)
    
    try {
      setSelectedBooking(booking)
      setShowDetailsModal(true)
    } catch (error) {
      console.error('❌ Error showing booking details:', error)
      alert('Failed to load booking details')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePrintTicket = (booking) => {
    setActionLoading(`print_${booking.id || booking.bookingID}`)
    
    try {
      const bookingRef = booking.bookingReference || `ER${booking.id || booking.bookingID}`
      const travelDate = booking.travelDate ? new Date(booking.travelDate).toLocaleString() : 'N/A'
      const bookingDate = booking.bookingDate ? new Date(booking.bookingDate).toLocaleString() : 'N/A'
      
      let seats = booking.seatNumber || booking.seats || 'N/A'
      if (typeof seats === 'number') {
        seats = seats.toString()
      }
      const hasMultipleSeats = typeof seats === 'string' && seats.includes(',')
      
      const amount = booking.amount || 0
      const route = booking.route || 'N/A'
      const vehicleNumber = booking.vehicleNumber || 'N/A'
      const customerName = booking.customerName || 'Guest'
      const customerPhone = booking.customerPhone || booking.phoneNumber || 'N/A'
      const paymentMethod = booking.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Cash'
      
      const ticketHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>EasyRide SACCO - Ticket</title>
            <meta charset="UTF-8">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    background: linear-gradient(135deg, #fef9e8 0%, #fff5e6 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .ticket {
                    max-width: 450px;
                    width: 100%;
                    background: white;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                    animation: slideIn 0.5s ease-out;
                }
                .ticket-header {
                    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
                    color: white;
                    padding: 30px 25px;
                    text-align: center;
                }
                .ticket-header h1 {
                    font-size: 28px;
                    margin-bottom: 5px;
                    letter-spacing: 1px;
                }
                .ticket-header .bus-icon {
                    font-size: 48px;
                    margin-bottom: 10px;
                }
                .ticket-body {
                    padding: 25px;
                }
                .info-section {
                    margin-bottom: 20px;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 12px 0;
                    border-bottom: 1px dashed #fed7aa;
                }
                .info-label {
                    font-weight: 600;
                    color: #b45309;
                    font-size: 14px;
                }
                .info-value {
                    font-weight: 600;
                    color: #78350f;
                    font-size: 14px;
                    text-align: right;
                }
                .seats-section {
                    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
                    border-radius: 16px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                    border: 1px solid #fed7aa;
                }
                .seats-section .seats-number {
                    font-size: 36px;
                    font-weight: bold;
                    color: #f59e0b;
                    letter-spacing: 2px;
                }
                .seats-section .seats-label {
                    font-size: 12px;
                    color: #b45309;
                    margin-top: 5px;
                }
                .price-section {
                    background: #fffbeb;
                    border-radius: 16px;
                    padding: 15px 20px;
                    margin: 20px 0;
                }
                .price-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }
                .total-price {
                    border-top: 2px solid #fed7aa;
                    margin-top: 10px;
                    padding-top: 10px;
                    font-weight: bold;
                    font-size: 18px;
                }
                .barcode {
                    text-align: center;
                    margin: 20px 0;
                    font-family: monospace;
                    font-size: 18px;
                    letter-spacing: 3px;
                    background: #fffbeb;
                    padding: 12px;
                    border-radius: 8px;
                }
                .footer {
                    background: #fffbeb;
                    padding: 20px;
                    text-align: center;
                    font-size: 11px;
                    color: #b45309;
                    border-top: 1px solid #fed7aa;
                }
                .qr-code {
                    text-align: center;
                    margin: 15px 0;
                    font-size: 48px;
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
                @media print {
                    body {
                        background: white;
                        padding: 0;
                        margin: 0;
                    }
                    .no-print {
                        display: none;
                    }
                    .ticket {
                        box-shadow: none;
                        margin: 0;
                        max-width: 100%;
                    }
                }
            </style>
        </head>
        <body>
            <div class="ticket">
                <div class="ticket-header">
                    <div class="bus-icon">🚌</div>
                    <h1>EasyRide SACCO</h1>
                    <p>Matatu Booking Ticket</p>
                </div>
                <div class="ticket-body">
                    <div class="info-section">
                        <div class="info-row">
                            <span class="info-label">Booking ID</span>
                            <span class="info-value">${bookingRef}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Date & Time</span>
                            <span class="info-value">${bookingDate}</span>
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <div class="info-row">
                            <span class="info-label">Passenger Name</span>
                            <span class="info-value">${customerName}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Phone Number</span>
                            <span class="info-value">${customerPhone}</span>
                        </div>
                    </div>
                    
                    <div class="seats-section">
                        <div class="seats-number">${seats}</div>
                        <div class="seats-label">Seat${hasMultipleSeats ? 's' : ''}</div>
                    </div>
                    
                    <div class="info-section">
                        <div class="info-row">
                            <span class="info-label">Route</span>
                            <span class="info-value">${route}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Departure</span>
                            <span class="info-value">${travelDate}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Vehicle</span>
                            <span class="info-value">${vehicleNumber}</span>
                        </div>
                    </div>
                    
                    <div class="price-section">
                        <div class="price-row total-price">
                            <span>Total Amount</span>
                            <span style="color: #f59e0b;">KSh ${amount.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="info-row">
                        <span class="info-label">Payment Method</span>
                        <span class="info-value">${paymentMethod}</span>
                    </div>
                    
                    <div class="qr-code">
                        🎫
                    </div>
                    <div class="barcode">
                        ${bookingRef}
                    </div>
                </div>
                <div class="footer">
                    <p>Please present this ticket at boarding</p>
                    <p>For inquiries: 0797338021 | info@easyride.co.ke</p>
                    <p style="margin-top: 8px;">Valid for travel on: ${booking.travelDate ? new Date(booking.travelDate).toLocaleDateString() : 'N/A'}</p>
                </div>
            </div>
            <div class="no-print" style="position: fixed; bottom: 20px; right: 20px; display: flex; gap: 10px; z-index: 1000;">
                <button onclick="window.print()" style="background: #f59e0b; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(245,158,11,0.3);">
                    🖨️ Print Ticket
                </button>
                <button onclick="window.close()" style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer;">
                    ✕ Close
                </button>
            </div>
            <script>
                setTimeout(function() {
                    window.print();
                }, 500);
            </script>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank')
      
      if (!printWindow) {
        alert('Please allow popups for this site to print tickets.')
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = ticketHTML
        document.body.appendChild(tempDiv)
        setTimeout(() => {
          document.body.removeChild(tempDiv)
        }, 5000)
        return
      }
      
      printWindow.document.write(ticketHTML)
      printWindow.document.close()
      
    } catch (error) {
      console.error('❌ Print ticket error:', error)
      alert('Failed to generate ticket: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  // ============================
  // HELPER FUNCTIONS
  // ============================
  
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFilteredBookings = () => {
    let filtered = [...bookings]
    
    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(b => b.status?.toLowerCase() === filter)
    }
    
    // Apply search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(b => 
        b.customerName?.toLowerCase().includes(term) ||
        b.customerPhone?.toLowerCase().includes(term) ||
        b.bookingReference?.toLowerCase().includes(term) ||
        b.route?.toLowerCase().includes(term) ||
        (b.id || b.bookingID)?.toString().includes(term)
      )
    }
    
    return filtered
  }

  const filteredBookings = getFilteredBookings()
  const totalBookings = bookings.length
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length
  const pendingCount = bookings.filter(b => b.status === 'pending').length
  const completedCount = bookings.filter(b => b.status === 'completed').length

  // ============================
  // RENDER
  // ============================
  
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading bookings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>❌</div>
          <h2 style={styles.errorTitle}>Error</h2>
          <p style={styles.errorMessage}>{error}</p>
          <button onClick={fetchAllBookings} style={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.contentWrapper}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>📋</div>
          <h1 style={styles.title}>All Bookings</h1>
          <p style={styles.subtitle}>View and manage all customer bookings</p>
          {operator && (
            <div style={styles.operatorBadge}>
              👤 {operator.name || operator.operatorName}
            </div>
          )}
        </div>
        
        {/* Search and Filter */}
        <div style={styles.filterCard}>
          <div style={styles.filterRow}>
            <div style={styles.searchWrapper}>
              <input
                type="text"
                placeholder="Search by customer name, phone, or booking ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && setFilter('all')}
                style={styles.searchInput}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={styles.clearSearch}>
                  ✕
                </button>
              )}
              <button 
                onClick={() => {
                  setFilter('all')
                }}
                style={styles.searchButton}
              >
                🔍 Search
              </button>
            </div>
            <div style={styles.filterButtons}>
              <button
                onClick={() => {
                  setFilter('all')
                  setSearchTerm('')
                }}
                style={{
                  ...styles.filterButton,
                  background: filter === 'all' ? '#f59e0b' : 'white',
                  color: filter === 'all' ? 'white' : '#78350f',
                  borderColor: filter === 'all' ? '#f59e0b' : '#fed7aa'
                }}
              >
                All
              </button>
              <button
                onClick={() => {
                  setFilter('confirmed')
                  setSearchTerm('')
                }}
                style={{
                  ...styles.filterButton,
                  background: filter === 'confirmed' ? '#10b981' : 'white',
                  color: filter === 'confirmed' ? 'white' : '#78350f',
                  borderColor: filter === 'confirmed' ? '#10b981' : '#fed7aa'
                }}
              >
                Confirmed
              </button>
              <button
                onClick={() => {
                  setFilter('pending')
                  setSearchTerm('')
                }}
                style={{
                  ...styles.filterButton,
                  background: filter === 'pending' ? '#f59e0b' : 'white',
                  color: filter === 'pending' ? 'white' : '#78350f',
                  borderColor: filter === 'pending' ? '#f59e0b' : '#fed7aa'
                }}
              >
                Pending
              </button>
              <button
                onClick={() => {
                  setFilter('cancelled')
                  setSearchTerm('')
                }}
                style={{
                  ...styles.filterButton,
                  background: filter === 'cancelled' ? '#ef4444' : 'white',
                  color: filter === 'cancelled' ? 'white' : '#78350f',
                  borderColor: filter === 'cancelled' ? '#ef4444' : '#fed7aa'
                }}
              >
                Cancelled
              </button>
              <button
                onClick={() => {
                  setFilter('completed')
                  setSearchTerm('')
                }}
                style={{
                  ...styles.filterButton,
                  background: filter === 'completed' ? '#8b5cf6' : 'white',
                  color: filter === 'completed' ? 'white' : '#78350f',
                  borderColor: filter === 'completed' ? '#8b5cf6' : '#fed7aa'
                }}
              >
                Completed
              </button>
            </div>
          </div>
          
          {/* Show search results info */}
          {searchTerm && (
            <div style={styles.searchInfo}>
              <span>🔍 Searching for: <strong>"{searchTerm}"</strong></span>
              <span style={styles.searchResultCount}>
                Found {filteredBookings.length} result{filteredBookings.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        
        {/* Stats Summary */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#fee2e2'}}>
              <span style={styles.statIconText}>📋</span>
            </div>
            <div>
              <p style={styles.statLabel}>Total Bookings</p>
              <p style={styles.statValue}>{totalBookings}</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#d1fae5'}}>
              <span style={styles.statIconText}>✓</span>
            </div>
            <div>
              <p style={styles.statLabel}>Confirmed</p>
              <p style={styles.statValue}>{confirmedCount}</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#fed7aa'}}>
              <span style={styles.statIconText}>⏳</span>
            </div>
            <div>
              <p style={styles.statLabel}>Pending</p>
              <p style={styles.statValue}>{pendingCount}</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#e0e7ff'}}>
              <span style={styles.statIconText}>✅</span>
            </div>
            <div>
              <p style={styles.statLabel}>Completed</p>
              <p style={styles.statValue}>{completedCount}</p>
            </div>
          </div>
        </div>
        
        {/* Bookings Table */}
        {filteredBookings.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <h2 style={styles.emptyTitle}>No Bookings Found</h2>
            <p style={styles.emptyMessage}>
              {searchTerm ? `No results found for "${searchTerm}"` : 'No bookings have been made yet'}
            </p>
            <button onClick={() => navigate('/operator/book')} style={styles.createButton}>
              + Create New Booking
            </button>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Booking ID</th>
                    <th style={styles.th}>Customer</th>
                    <th style={styles.th}>Phone</th>
                    <th style={styles.th}>Route</th>
                    <th style={styles.th}>Seat</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Travel Date</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => {
                    const bookingId = booking.id || booking.bookingID
                    const statusStyle = getStatusStyle(booking.status)
                    const isLoading = actionLoading === `${bookingId}_status` || 
                                     actionLoading === `${bookingId}_cancel` ||
                                     actionLoading === `view_${bookingId}` ||
                                     actionLoading === `print_${bookingId}`
                    
                    return (
                      <tr key={bookingId} style={styles.tableRow}>
                        <td style={styles.td}>
                          <span style={styles.bookingId}>
                            {booking.bookingReference || `ER${bookingId}`}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.customerName}>{booking.customerName || 'Guest'}</span>
                        </td>
                        <td style={styles.td}>
                          {booking.customerPhone || booking.phoneNumber || 'N/A'}
                        </td>
                        <td style={styles.td}>
                          {booking.route || 'N/A'}
                        </td>
                        <td style={styles.td}>
                          {booking.seatNumber || booking.seats || 'N/A'}
                        </td>
                        <td style={styles.td}>
                          <span style={styles.amountText}>KSh {(booking.amount || 0).toLocaleString()}</span>
                        </td>
                        <td style={styles.td}>
                          {formatDate(booking.travelDate)}
                        </td>
                        <td style={styles.td}>
                          <span style={{...styles.statusBadge, ...statusStyle}}>
                            {booking.status || 'Pending'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionIcons}>
                            <button
                              onClick={() => viewBookingDetails(booking)}
                              style={styles.iconButton}
                              title="View Details"
                              disabled={isLoading}
                            >
                              {actionLoading === `view_${bookingId}` ? '⏳' : '👁️'}
                            </button>
                            <button
                              onClick={() => handlePrintTicket(booking)}
                              style={styles.iconButton}
                              title="Print Ticket"
                              disabled={isLoading}
                            >
                              {actionLoading === `print_${bookingId}` ? '⏳' : '🖨️'}
                            </button>
                            {booking.status?.toLowerCase() === 'pending' && (
                              <button
                                onClick={() => updateBookingStatus(bookingId, 'confirmed')}
                                style={styles.confirmButton}
                                title="Confirm Booking"
                                disabled={isLoading}
                              >
                                {actionLoading === `${bookingId}_status` ? '⏳' : '✓'}
                              </button>
                            )}
                            {booking.status?.toLowerCase() === 'confirmed' && (
                              <button
                                onClick={() => updateBookingStatus(bookingId, 'completed')}
                                style={styles.completeButton}
                                title="Mark Completed"
                                disabled={isLoading}
                              >
                                {actionLoading === `${bookingId}_status` ? '⏳' : '✅'}
                              </button>
                            )}
                            {(booking.status?.toLowerCase() === 'pending' || booking.status?.toLowerCase() === 'confirmed') && (
                              <button
                                onClick={() => handleCancelBooking(bookingId, booking.travelDate)}
                                style={styles.cancelButton}
                                title="Cancel Booking"
                                disabled={isLoading}
                              >
                                {actionLoading === `${bookingId}_cancel` ? '⏳' : '✕'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Booking Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div style={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{...styles.modalHeader, background: 'linear-gradient(135deg, #f59e0b, #fbbf24)'}}>
              <h2 style={styles.modalTitle}>Booking Details</h2>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.modalGrid}>
                <div>
                  <p style={styles.modalLabel}>Booking ID</p>
                  <p style={styles.modalValue}>{selectedBooking.bookingReference || `ER${selectedBooking.bookingID || selectedBooking.id}`}</p>
                </div>
                <div>
                  <p style={styles.modalLabel}>Status</p>
                  <span style={{...styles.statusBadge, ...getStatusStyle(selectedBooking.status)}}>
                    {selectedBooking.status || 'Pending'}
                  </span>
                </div>
                <div>
                  <p style={styles.modalLabel}>Customer Name</p>
                  <p style={styles.modalValue}>{selectedBooking.customerName || 'Guest'}</p>
                </div>
                <div>
                  <p style={styles.modalLabel}>Phone Number</p>
                  <p style={styles.modalValue}>{selectedBooking.customerPhone || selectedBooking.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <p style={styles.modalLabel}>Route</p>
                  <p style={styles.modalValue}>{selectedBooking.route || 'N/A'}</p>
                </div>
                <div>
                  <p style={styles.modalLabel}>Seat Number</p>
                  <p style={styles.modalValue}>{selectedBooking.seatNumber || selectedBooking.seats || 'N/A'}</p>
                </div>
                <div>
                  <p style={styles.modalLabel}>Travel Date</p>
                  <p style={styles.modalValue}>{formatDate(selectedBooking.travelDate)}</p>
                </div>
                <div>
                  <p style={styles.modalLabel}>Booking Date</p>
                  <p style={styles.modalValue}>{formatDate(selectedBooking.bookingDate)}</p>
                </div>
                <div>
                  <p style={styles.modalLabel}>Amount</p>
                  <p style={{...styles.modalValue, color: '#d97706', fontWeight: 'bold'}}>
                    KSh {(selectedBooking.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p style={styles.modalLabel}>Payment Status</p>
                  <p style={styles.modalValue}>{selectedBooking.paymentStatus || 'Pending'}</p>
                </div>
              </div>
              {selectedBooking.mpesaCode && (
                <div style={styles.mpesaInfo}>
                  <span>📱</span>
                  <span>M-Pesa Receipt: {selectedBooking.mpesaCode}</span>
                </div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button
                onClick={() => handlePrintTicket(selectedBooking)}
                style={styles.printModalButton}
              >
                🖨️ Print Ticket
              </button>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={styles.closeModalButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
    fontSize: '2rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: '#92400e',
    fontSize: '1rem',
  },
  operatorBadge: {
    display: 'inline-block',
    marginTop: '0.5rem',
    padding: '0.25rem 0.75rem',
    background: '#fed7aa',
    color: '#92400e',
    borderRadius: '2rem',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  filterCard: {
    background: 'white',
    borderRadius: '1rem',
    padding: '1rem',
    marginBottom: '1.5rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },
  filterRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  searchWrapper: {
    position: 'relative',
    flex: 1,
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 2rem 0.75rem 1rem',
    border: '1px solid #fed7aa',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    background: '#fffbef',
    color: '#78350f',
  },
  clearSearch: {
    position: 'absolute',
    right: '6rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#b45309',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0.25rem',
  },
  searchButton: {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '500',
    transition: 'all 0.3s',
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
  searchInfo: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    background: '#fffbeb',
    borderRadius: '0.75rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.875rem',
    color: '#b45309',
    border: '1px solid #fed7aa',
  },
  searchResultCount: {
    fontWeight: '600',
    color: '#f59e0b',
    background: '#fff5e6',
    padding: '0.25rem 0.75rem',
    borderRadius: '2rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  statCard: {
    background: 'white',
    borderRadius: '1rem',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },
  statIcon: {
    width: '3rem',
    height: '3rem',
    borderRadius: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconText: {
    fontSize: '1.5rem',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#b45309',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#78350f',
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
  createButton: {
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.75rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  tableContainer: {
    background: 'white',
    borderRadius: '1rem',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#b45309',
    textTransform: 'uppercase',
    borderBottom: '1px solid #fed7aa',
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#78350f',
    borderBottom: '1px solid #fed7aa',
  },
  tableRow: {
    transition: 'background 0.3s',
  },
  bookingId: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  customerName: {
    fontWeight: '500',
  },
  amountText: {
    fontWeight: '600',
    color: '#d97706',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '2rem',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  actionIcons: {
    display: 'flex',
    gap: '0.5rem',
  },
  iconButton: {
    width: '2rem',
    height: '2rem',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.3s',
  },
  confirmButton: {
    width: '2rem',
    height: '2rem',
    background: '#d1fae5',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#065f46',
  },
  completeButton: {
    width: '2rem',
    height: '2rem',
    background: '#e0e7ff',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#3730a3',
  },
  cancelButton: {
    width: '2rem',
    height: '2rem',
    background: '#fee2e2',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#991b1b',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '1rem',
  },
  modal: {
    background: 'white',
    borderRadius: '1rem',
    maxWidth: '32rem',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    padding: '1rem 1.5rem',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'white',
  },
  modalBody: {
    padding: '1.5rem',
    overflowY: 'auto',
    maxHeight: 'calc(90vh - 8rem)',
  },
  modalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  modalLabel: {
    fontSize: '0.75rem',
    color: '#b45309',
    marginBottom: '0.25rem',
  },
  modalValue: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#78350f',
  },
  mpesaInfo: {
    marginTop: '1rem',
    padding: '0.75rem',
    background: '#d1fae5',
    borderRadius: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#065f46',
  },
  modalFooter: {
    display: 'flex',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    borderTop: '1px solid #fed7aa',
  },
  printModalButton: {
    flex: 1,
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  closeModalButton: {
    flex: 1,
    padding: '0.75rem',
    background: '#f3f4f6',
    color: '#78350f',
    border: 'none',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
}

// Add animations
const styleSheet = document.createElement("style")
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`
document.head.appendChild(styleSheet)

export default OperatorBookingsPage