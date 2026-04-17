import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiFetch from '../utils/api'

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
  
  // Loading states for actions
  const [actionLoading, setActionLoading] = useState(null)
  
  // Modal state for booking details
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)

  // ============================
  // EFFECTS
  // ============================
  
  useEffect(() => {
    fetchDashboardData()
  }, [])

  // ============================
  // API FUNCTIONS
  // ============================
  
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
      
      const data = await apiFetch('/operators/dashboard')
      
      console.log('✅ Dashboard data received:', data)
      
      setStats(data.stats || {})
      setRecentBookings(data.recentBookings || [])
      
    } catch (error) {
      console.error('❌ Error fetching dashboard:', error)
      setError(error.message)
      
      if (error.message.includes('Session expired') || error.message.includes('Unauthorized')) {
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        navigate('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearchCustomer = async () => {
    if (!searchPhone.trim()) {
      alert('Please enter a phone number')
      return
    }
    
    setSearching(true)
    setSearchResult(null)
    
    try {
      const data = await apiFetch(`/customers/search?phone=${encodeURIComponent(searchPhone)}`)
      
      if (data.customer) {
        setSearchResult(data.customer)
      } else if (data.notFound) {
        setSearchResult({ notFound: true })
      }
      
    } catch (error) {
      console.error('❌ Search error:', error)
      if (error.message.includes('404')) {
        setSearchResult({ notFound: true })
      } else {
        alert('Failed to search customer: ' + error.message)
      }
    } finally {
      setSearching(false)
    }
  }

  const generateReportHTML = (reportData) => {
    const reportDate = new Date().toLocaleDateString('en-KE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    const reportTime = new Date().toLocaleTimeString('en-KE')
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EasyRide Daily Report - ${reportDate}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #fef9e8 0%, #fff5e6 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        .report-container { max-width: 1200px; margin: 0 auto; }
        .report-header {
            background: linear-gradient(135deg, #d97706, #f59e0b);
            color: white;
            padding: 30px;
            border-radius: 16px 16px 0 0;
            text-align: center;
        }
        .report-header h1 { font-size: 32px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .report-header .date { font-size: 16px; opacity: 0.9; }
        .report-header .generated { font-size: 12px; opacity: 0.7; margin-top: 10px; }
        .stats-grid {
            display: grid;
            gridTemplateColumns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
            background: white;
            border-bottom: 1px solid #fed7aa;
        }
        .stat-card {
            background: #fffbef;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid #fed7aa;
        }
        .stat-card .stat-icon { font-size: 40px; margin-bottom: 10px; }
        .stat-card .stat-label { font-size: 14px; color: #b45309; margin-bottom: 8px; }
        .stat-card .stat-value { font-size: 28px; font-weight: bold; color: #d97706; }
        .bookings-section {
            background: white;
            padding: 30px;
            border-radius: 0 0 16px 16px;
        }
        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #78350f;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f59e0b;
        }
        .bookings-table { width: 100%; border-collapse: collapse; }
        .bookings-table th {
            background: #fffbef;
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #b45309;
            text-transform: uppercase;
            border-bottom: 1px solid #fed7aa;
        }
        .bookings-table td {
            padding: 12px;
            font-size: 14px;
            color: #78350f;
            border-bottom: 1px solid #fed7aa;
        }
        .bookings-table tr:hover { background: #fffbef; }
        .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
        }
        .status-confirmed { background: #d1fae5; color: #065f46; }
        .status-pending { background: #fed7aa; color: #92400e; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        .status-completed { background: #e0e7ff; color: #3730a3; }
        .footer { margin-top: 20px; text-align: center; padding: 20px; color: #b45309; font-size: 12px; }
        .print-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #f59e0b;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(245,158,11,0.3);
            transition: all 0.3s;
        }
        .print-btn:hover { background: #d97706; transform: translateY(-2px); }
        @media print {
            body { background: white; padding: 0; }
            .print-btn { display: none; }
            .stats-grid { break-inside: avoid; }
            .bookings-table tr { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <h1><span>🚌</span> EasyRide SACCO <span>📊</span></h1>
            <p class="date">Daily Sales Report</p>
            <p class="date">${reportDate}</p>
            <p class="generated">Generated on: ${reportDate} at ${reportTime}</p>
            <p class="generated">Generated by: ${operatorInfo?.name || operatorInfo?.operatorName || 'Operator'}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon">📅</div><div class="stat-label">Today's Bookings</div><div class="stat-value">${reportData.summary?.totalBookings || 0}</div></div>
            <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-label">Total Revenue</div><div class="stat-value">KES ${(reportData.summary?.totalRevenue || 0).toLocaleString()}</div></div>
            <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-label">Confirmed Bookings</div><div class="stat-value">${reportData.summary?.confirmedBookings || 0}</div></div>
            <div class="stat-card"><div class="stat-icon">❌</div><div class="stat-label">Cancelled Bookings</div><div class="stat-value">${reportData.summary?.cancelledBookings || 0}</div></div>
            <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-label">Pending Bookings</div><div class="stat-value">${reportData.summary?.pendingBookings || 0}</div></div>
            <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-label">Total Customers</div><div class="stat-value">${reportData.summary?.totalCustomers || recentBookings.length}</div></div>
        </div>
        
        <div class="bookings-section">
            <h2 class="section-title">📋 Recent Bookings</h2>
            ${recentBookings.length === 0 ? '<p style="text-align: center; color: #b45309;">No bookings found for today.</p>' : `
                <table class="bookings-table">
                    <thead><tr><th>Booking ID</th><th>Customer</th><th>Route</th><th>Seats</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                        ${recentBookings.map(booking => {
                            const bookingId = booking.bookingReference || `ER${booking.bookingID || booking.id}`
                            const statusClass = booking.status === 'confirmed' ? 'status-confirmed' : 
                                              booking.status === 'cancelled' ? 'status-cancelled' :
                                              booking.status === 'completed' ? 'status-completed' : 'status-pending'
                            return `<tr><td>${bookingId}</td><td>${booking.customerName || booking.customer || 'N/A'}</td><td>${booking.route || 'N/A'}</td><td>${booking.seats || booking.seatNumber || 'N/A'}</td><td><strong>KES ${(booking.amount || 0).toLocaleString()}</strong></td><td><span class="status-badge ${statusClass}">${booking.status || 'pending'}</span></td></tr>`
                        }).join('')}
                    </tbody>
                </table>
            `}
        </div>
        
        <div class="footer">
            <p>✨ Thank you for choosing EasyRide! ✨</p>
            <p>This report is system-generated and shows sales data for ${reportDate}</p>
            <p>For inquiries, contact: 0700 000 000 | info@easyride.co.ke</p>
        </div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ Print Report</button>
    <script>window.scrollTo(0, 0);</script>
</body>
</html>
    `
  }

  const handleGenerateReport = async () => {
    try {
      const data = await apiFetch('/operators/reports/daily')
      const reportHTML = generateReportHTML(data)
      const reportWindow = window.open('', '_blank')
      if (!reportWindow) {
        alert('Please allow popups to view the report')
        return
      }
      reportWindow.document.write(reportHTML)
      reportWindow.document.close()
    } catch (error) {
      console.error('❌ Report error:', error)
      alert(`Failed to generate report: ${error.message}`)
    }
  }

  const handleUpdateStatus = async (bookingId, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this booking as ${newStatus}?`)) {
      return
    }
    
    setActionLoading(`${bookingId}_status`)
    
    try {
      console.log(`📝 Updating booking ${bookingId} to status: ${newStatus}`)
      
      await apiFetch(`/operators/bookings/${bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      })
      
      await fetchDashboardData()
      
      // If modal is open, update selected booking
      if (selectedBooking && (selectedBooking.id === bookingId || selectedBooking.bookingID === bookingId)) {
        setSelectedBooking(prev => ({ ...prev, status: newStatus }))
      }
      
      alert(`✅ Booking marked as ${newStatus} successfully`)
      
    } catch (error) {
      console.error('❌ Status update error:', error)
      alert(`Failed to update booking status: ${error.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelBooking = async (bookingId) => {
    const booking = recentBookings.find(b => {
      const id = b.bookingID || b.id
      return id == bookingId
    })
    
    console.log('🔍 Cancel booking check:', { bookingId, booking })
    
    if (booking && booking.travelDate) {
      const travelTime = new Date(booking.travelDate).getTime()
      const currentTime = new Date().getTime()
      const minutesUntilTravel = (travelTime - currentTime) / (1000 * 60)
      
      console.log(`⏰ Minutes until travel: ${minutesUntilTravel}`)
      
      if (minutesUntilTravel < 30 && minutesUntilTravel > 0) {
        alert(`❌ Cannot cancel booking\n\nBookings can only be cancelled at least 30 minutes before departure.\nYou have ${Math.max(0, Math.floor(minutesUntilTravel))} minutes remaining.`)
        return
      }
    }
    
    if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return
    }
    
    setActionLoading(`${bookingId}_cancel`)
    
    try {
      console.log(`🗑️ Cancelling booking ${bookingId}`)
      
      await apiFetch(`/operators/bookings/${bookingId}/cancel`, {
        method: 'POST'
      })
      
      await fetchDashboardData()
      alert('✅ Booking cancelled successfully')
      
    } catch (error) {
      console.error('❌ Cancel booking error:', error)
      alert(`Failed to cancel booking: ${error.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // FIXED: View Details - opens modal instead of navigating
  const handleViewDetails = (booking) => {
    console.log(`👁️ View details for booking:`, booking)
    setSelectedBooking(booking)
    setShowDetailsModal(true)
  }

  const handlePrintTicket = async (bookingId) => {
    setActionLoading(`${bookingId}_print`)
    
    try {
      console.log(`🖨️ Printing ticket for booking: ${bookingId}`)
      
      const bookingData = await apiFetch(`/operators/bookings/${bookingId}`)
      const booking = bookingData.booking || bookingData
      
      const ticketHTML = generateTicketHTML(booking)
      
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(ticketHTML)
        printWindow.document.close()
      } else {
        alert('Please allow popups to print tickets')
      }
      
    } catch (error) {
      console.error('❌ Ticket error:', error)
      alert('Failed to generate ticket: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const generateTicketHTML = (booking) => {
    const bookingRef = booking.bookingReference || `ER${booking.bookingID || booking.id}`
    const travelDate = booking.travelDate ? new Date(booking.travelDate).toLocaleString() : 'N/A'
    const bookingDate = booking.bookingDate ? new Date(booking.bookingDate).toLocaleString() : 'N/A'
    
    // Handle seats safely
    let seats = 'N/A'
    if (booking.seatNumber) {
      seats = booking.seatNumber.toString()
    } else if (booking.seats) {
      if (Array.isArray(booking.seats)) {
        seats = booking.seats.join(', ')
      } else {
        seats = booking.seats.toString()
      }
    } else if (booking.seatNumbers) {
      if (Array.isArray(booking.seatNumbers)) {
        seats = booking.seatNumbers.join(', ')
      } else {
        seats = booking.seatNumbers.toString()
      }
    }
    
    const amount = booking.amount || booking.totalAmount || booking.total_fare || 0
    
    return `
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
          }
          .ticket-header {
            background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
            color: white;
            padding: 30px 25px;
            text-align: center;
          }
          .ticket-header h1 { font-size: 28px; margin-bottom: 5px; }
          .ticket-header .bus-icon { font-size: 48px; margin-bottom: 10px; }
          .ticket-body { padding: 25px; }
          .info-section { margin-bottom: 20px; }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px dashed #fed7aa;
          }
          .info-label { font-weight: 600; color: #b45309; font-size: 14px; }
          .info-value { font-weight: 600; color: #78350f; font-size: 14px; text-align: right; }
          .seats-section {
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
            border-radius: 16px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
            border: 1px solid #fed7aa;
          }
          .seats-section .seats-number { font-size: 36px; font-weight: bold; color: #f59e0b; }
          .price-section {
            background: #fffbeb;
            border-radius: 16px;
            padding: 15px 20px;
            margin: 20px 0;
          }
          .price-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
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
          @media print {
            body { background: white; padding: 0; }
            .no-print { display: none; }
            .ticket { box-shadow: none; }
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
              <div class="info-row"><span class="info-label">Booking ID</span><span class="info-value">${bookingRef}</span></div>
              <div class="info-row"><span class="info-label">Date & Time</span><span class="info-value">${bookingDate}</span></div>
            </div>
            
            <div class="info-section">
              <div class="info-row"><span class="info-label">Passenger Name</span><span class="info-value">${booking.customerName || booking.passengerName || 'N/A'}</span></div>
              <div class="info-row"><span class="info-label">Phone Number</span><span class="info-value">${booking.phoneNumber || booking.customerPhone || 'N/A'}</span></div>
            </div>
            
            <div class="seats-section">
              <div class="seats-number">${seats}</div>
              <div class="seats-label">Seat${seats.includes(',') ? 's' : ''}</div>
            </div>
            
            <div class="info-section">
              <div class="info-row"><span class="info-label">Route</span><span class="info-value">${booking.route || `${booking.origin} → ${booking.destination}`}</span></div>
              <div class="info-row"><span class="info-label">Departure</span><span class="info-value">${travelDate}</span></div>
              <div class="info-row"><span class="info-label">Vehicle</span><span class="info-value">${booking.vehicleNumber || 'N/A'}</span></div>
            </div>
            
            <div class="price-section">
              <div class="price-row total-price"><span>Total Amount</span><span style="color: #f59e0b;">KSh ${amount.toLocaleString()}</span></div>
            </div>
            
            <div class="barcode">${bookingRef}</div>
          </div>
          <div class="footer">
            <p>Please present this ticket at boarding</p>
            <p>For inquiries: 0797338021 | info@easyride.co.ke</p>
          </div>
        </div>
        <div class="no-print" style="position: fixed; bottom: 20px; right: 20px; display: flex; gap: 10px;">
          <button onclick="window.print()" style="background: #f59e0b; color: white; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer;">🖨️ Print Ticket</button>
          <button onclick="window.close()" style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer;">✕ Close</button>
        </div>
        <script>setTimeout(() => window.print(), 500);</script>
      </body>
      </html>
    `
  }

  // ============================
  // HELPER FUNCTIONS
  // ============================
  
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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

  const canCancelBooking = (booking) => {
    const status = booking.status?.toLowerCase()
    if (status !== 'confirmed' && status !== 'pending') return false
    
    if (!booking.travelDate) return true
    
    const travelDate = new Date(booking.travelDate)
    const currentTime = new Date()
    const minutesUntilTravel = (travelDate - currentTime) / (1000 * 60)
    
    return minutesUntilTravel > 30 || minutesUntilTravel < 0
  }

  // ============================
  // RENDER FUNCTIONS
  // ============================
  
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading operator dashboard...</p>
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
          <button onClick={fetchDashboardData} style={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.contentWrapper}>
        {/* Dashboard Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>🏢</div>
          <h1 style={styles.title}>
            Welcome, {operatorInfo?.name || operatorInfo?.operatorName || 'Operator'}!
          </h1>
          <p style={styles.subtitle}>
            {operatorInfo?.officeLocation || 'Manage bookings and customer reservations'}
          </p>
          {operatorInfo?.shift && (
            <div style={styles.shiftBadge}>
              ⏰ Shift: {operatorInfo.shift}
            </div>
          )}
        </div>
        
        {/* Header Actions with Search */}
        <div style={styles.searchContainer}>
          <div style={styles.searchWrapper}>
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
          
          <div style={styles.actionButtons}>
            <button onClick={() => navigate('/operator/book')} style={styles.quickBookButton}>📱 Quick Book</button>
            <button onClick={() => navigate('/operator/bookings')} style={styles.allBookingsButton}>📋 All Bookings</button>
          </div>
          
          {/* Search Result Popup */}
          {searchResult && (
            <div style={styles.searchResultPopup}>
              {searchResult.notFound ? (
                <p style={styles.notFoundText}>❌ Customer not found</p>
              ) : (
                <div>
                  <p style={styles.customerName}>✓ {searchResult.customerName}</p>
                  <p style={styles.customerPhone}>{searchResult.phoneNumber}</p>
                  <button
                    onClick={() => {
                      navigate('/operator/book', { state: { customer: searchResult } })
                      setSearchResult(null)
                      setSearchPhone('')
                    }}
                    style={styles.bookForCustomerButton}
                  >
                    Book for this customer →
                  </button>
                </div>
              )}
              <button onClick={() => setSearchResult(null)} style={styles.closeButton}>✕</button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#fee2e2'}}><span style={styles.statIconText}>📅</span></div>
            <div style={styles.statInfo}><p style={styles.statLabel}>Today's Bookings</p><p style={styles.statValue}>{stats.todayBookings || 0}</p></div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#d1fae5'}}><span style={styles.statIconText}>💰</span></div>
            <div style={styles.statInfo}><p style={styles.statLabel}>Total Revenue</p><p style={styles.statValue}>KSh {(stats.totalRevenue || 0).toLocaleString()}</p></div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#fed7aa'}}><span style={styles.statIconText}>⏳</span></div>
            <div style={styles.statInfo}><p style={styles.statLabel}>Pending Payments</p><p style={styles.statValue}>KSh {(stats.pendingPayments || 0).toLocaleString()}</p></div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#e0e7ff'}}><span style={styles.statIconText}>🪑</span></div>
            <div style={styles.statInfo}><p style={styles.statLabel}>Available Seats</p><p style={styles.statValue}>{stats.availableSeats || 0}</p></div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={styles.quickActionsSection}>
          <h2 style={styles.sectionTitle}>Quick Actions</h2>
          <div style={styles.actionsGrid}>
            <button onClick={() => navigate('/operator/book')} style={styles.actionCard}>
              <div style={styles.actionIcon}>➕</div>
              <h3 style={styles.actionTitle}>New Booking</h3>
              <p style={styles.actionDesc}>Book for a customer</p>
            </button>
            <button onClick={handleGenerateReport} style={styles.actionCard}>
              <div style={styles.actionIcon}>📊</div>
              <h3 style={styles.actionTitle}>Daily Report</h3>
              <p style={styles.actionDesc}>Generate sales report</p>
            </button>
            <button onClick={() => navigate('/operator/bookings')} style={styles.actionCard}>
              <div style={styles.actionIcon}>👥</div>
              <h3 style={styles.actionTitle}>All Bookings</h3>
              <p style={styles.actionDesc}>View all customer bookings</p>
            </button>
          </div>
        </div>

        {/* Recent Bookings */}
        <div>
          <div style={styles.recentHeader}>
            <h2 style={styles.sectionTitle}>Recent Bookings</h2>
            <button onClick={() => navigate('/operator/bookings')} style={styles.seeAllButton}>See All →</button>
          </div>
          
          {recentBookings.length === 0 ? (
            <div style={styles.emptyState}><p style={styles.emptyText}>No recent bookings</p></div>
          ) : (
            <div style={styles.tableContainer}>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Booking ID</th>
                      <th style={styles.th}>Customer</th>
                      <th style={styles.th}>Route</th>
                      <th style={styles.th}>Seats</th>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Time</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map(booking => {
                      const statusStyle = getStatusStyle(booking.status)
                      const bookingId = booking.bookingID || booking.id
                      const canCancel = canCancelBooking(booking)
                      const isLoading = actionLoading === `${bookingId}_status` || actionLoading === `${bookingId}_cancel` || actionLoading === `${bookingId}_print`
                      
                      return (
                        <tr key={bookingId} style={styles.tableRow}>
                          <td style={styles.td}><span style={styles.bookingId}>{booking.bookingReference || `ER${bookingId}`}</span></td>
                          <td style={styles.td}>
                            <div><div style={styles.customerNameText}>{booking.customerName || booking.customer}</div>
                            <div style={styles.customerPhoneText}>{booking.customerPhone || booking.phone}</div></div>
                          </td>
                          <td style={styles.td}>{booking.route || `${booking.origin || ''} → ${booking.destination || ''}`}</td>
                          <td style={styles.td}>{booking.seatNumbers?.join(', ') || booking.seats || booking.seatNumber || 'N/A'}</td>
                          <td style={styles.td}><span style={styles.amountText}>KSh {(booking.totalAmount || booking.amount || 0).toLocaleString()}</span></td>
                          <td style={styles.td}>{formatDateTime(booking.createdAt || booking.bookingDate || booking.travelDate)}</td>
                          <td style={styles.td}><span style={{...styles.statusBadge, ...statusStyle}}>{booking.status || 'pending'}</span></td>
                          <td style={styles.td}>
                            <div style={styles.actionIcons}>
                              <button 
                                onClick={() => handleViewDetails(booking)} 
                                style={styles.iconButton} 
                                title="View Details" 
                                disabled={isLoading}
                              >
                                👁️
                              </button>
                              <button 
                                onClick={() => handlePrintTicket(bookingId)} 
                                style={styles.iconButton} 
                                title="Print Ticket" 
                                disabled={isLoading}
                              >
                                {actionLoading === `${bookingId}_print` ? '⏳' : '🖨️'}
                              </button>
                              {(booking.status?.toLowerCase() === 'pending') && (
                                <button 
                                  onClick={() => handleUpdateStatus(bookingId, 'confirmed')} 
                                  style={styles.confirmButton} 
                                  title="Confirm Booking" 
                                  disabled={isLoading}
                                >
                                  {actionLoading === `${bookingId}_status` ? '⏳' : '✓'}
                                </button>
                              )}
                              {(booking.status?.toLowerCase() === 'confirmed') && (
                                <button 
                                  onClick={() => handleUpdateStatus(bookingId, 'completed')} 
                                  style={styles.completeButton} 
                                  title="Mark Completed" 
                                  disabled={isLoading}
                                >
                                  {actionLoading === `${bookingId}_status` ? '⏳' : '✅'}
                                </button>
                              )}
                              {(booking.status?.toLowerCase() === 'pending' || booking.status?.toLowerCase() === 'confirmed') && (
                                <button 
                                  onClick={() => handleCancelBooking(bookingId)} 
                                  style={{...styles.cancelButton, opacity: !canCancel ? 0.6 : 1, cursor: (!canCancel || isLoading) ? 'not-allowed' : 'pointer'}} 
                                  title={!canCancel ? 'Cannot cancel - less than 30 minutes to departure' : 'Cancel Booking'} 
                                  disabled={!canCancel || isLoading}
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
                onClick={() => handlePrintTicket(selectedBooking.id || selectedBooking.bookingID)}
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
  contentWrapper: { maxWidth: '1280px', margin: '0 auto' },
  loadingContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fef9e8, #fff5e6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContent: { textAlign: 'center' },
  spinner: {
    width: '4rem',
    height: '4rem',
    border: '4px solid #fbbf24',
    borderTopColor: '#f59e0b',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem',
  },
  loadingText: { color: '#78350f', fontSize: '1.125rem', fontWeight: '500' },
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
  errorIcon: { fontSize: '3rem', marginBottom: '1rem' },
  errorTitle: { fontSize: '1.25rem', fontWeight: 'bold', color: '#78350f', marginBottom: '0.5rem' },
  errorMessage: { color: '#92400e', marginBottom: '1.5rem' },
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
  header: { textAlign: 'center', marginBottom: '2rem' },
  headerIcon: { fontSize: '3rem', marginBottom: '0.5rem', animation: 'bounce 1s ease infinite' },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.5rem',
  },
  subtitle: { color: '#92400e', fontSize: '1rem' },
  shiftBadge: {
    display: 'inline-block',
    marginTop: '0.5rem',
    padding: '0.25rem 0.75rem',
    background: '#fed7aa',
    color: '#92400e',
    borderRadius: '2rem',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  searchContainer: { marginBottom: '2rem', position: 'relative' },
  searchWrapper: { display: 'flex', gap: '0.75rem', marginBottom: '1rem' },
  searchInput: {
    flex: 1,
    padding: '0.75rem 1rem',
    border: '1px solid #fed7aa',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'all 0.3s',
    background: '#fffbef',
    color: '#78350f',
  },
  searchButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  actionButtons: { display: 'flex', gap: '0.75rem' },
  quickBookButton: {
    flex: 1,
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  allBookingsButton: {
    flex: 1,
    padding: '0.75rem',
    background: 'white',
    color: '#f59e0b',
    border: '1px solid #f59e0b',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  searchResultPopup: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'white',
    border: '1px solid #fed7aa',
    borderRadius: '0.75rem',
    padding: '1rem',
    marginTop: '0.5rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  notFoundText: { color: '#dc2626' },
  customerName: { fontWeight: '600', color: '#78350f' },
  customerPhone: { fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem' },
  bookForCustomerButton: {
    marginTop: '0.5rem',
    color: '#f59e0b',
    fontSize: '0.75rem',
    fontWeight: '500',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  closeButton: { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard: {
    background: 'white',
    borderRadius: '1rem',
    padding: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
    transition: 'all 0.3s',
  },
  statIcon: { width: '3rem', height: '3rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statIconText: { fontSize: '1.5rem' },
  statInfo: { flex: 1 },
  statLabel: { fontSize: '0.75rem', color: '#b45309', marginBottom: '0.25rem' },
  statValue: { fontSize: '1.5rem', fontWeight: 'bold', color: '#78350f' },
  quickActionsSection: { marginBottom: '2rem' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#78350f', marginBottom: '1rem' },
  actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' },
  actionCard: {
    background: 'white',
    borderRadius: '1rem',
    padding: '1.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '2px solid transparent',
  },
  actionIcon: { fontSize: '2rem', marginBottom: '0.75rem' },
  actionTitle: { fontSize: '1rem', fontWeight: '600', color: '#78350f', marginBottom: '0.25rem' },
  actionDesc: { fontSize: '0.75rem', color: '#b45309' },
  recentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  seeAllButton: { color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' },
  emptyState: { background: 'white', borderRadius: '1rem', padding: '3rem', textAlign: 'center' },
  emptyText: { color: '#b45309' },
  tableContainer: { background: 'white', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#b45309', textTransform: 'uppercase', borderBottom: '1px solid #fed7aa' },
  td: { padding: '1rem', fontSize: '0.875rem', color: '#78350f', borderBottom: '1px solid #fed7aa' },
  tableRow: { transition: 'background 0.3s' },
  bookingId: { color: '#f59e0b', fontWeight: '600' },
  customerNameText: { fontWeight: '500', color: '#78350f' },
  customerPhoneText: { fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem' },
  amountText: { fontWeight: '600', color: '#d97706' },
  statusBadge: { display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: '500' },
  actionIcons: { display: 'flex', gap: '0.5rem' },
  iconButton: { width: '2rem', height: '2rem', background: '#f3f4f6', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.3s' },
  confirmButton: { width: '2rem', height: '2rem', background: '#d1fae5', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem', color: '#065f46', transition: 'all 0.3s' },
  completeButton: { width: '2rem', height: '2rem', background: '#e0e7ff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem', color: '#3730a3', transition: 'all 0.3s' },
  cancelButton: { width: '2rem', height: '2rem', background: '#fee2e2', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem', color: '#991b1b', transition: 'all 0.3s' },
  
  // Modal styles
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
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
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
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
`;
document.head.appendChild(styleSheet);

export default OperatorDashboard