import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import SeatMap from '../components/SeatMap'
import apiFetch from '../utils/api'

function OperatorBookingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // ============================
  // STATE MANAGEMENT
  // ============================
  
  const [operator, setOperator] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(false)
  
  // Data from database
  const [routes, setRoutes] = useState([])
  const [schedules, setSchedules] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  
  // Customer details
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    email: '',
    idNumber: ''
  })
  
  // Selected booking options
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [selectedSeats, setSelectedSeats] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('mpesa')
  const [bookingNotes, setBookingNotes] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => {
    // Allow today as default
    return new Date().toISOString().split('T')[0]
  })
  
  // ============================
  // HELPER FUNCTIONS FOR SCHEDULE AVAILABILITY
  // ============================
  
  const isScheduleAvailable = (schedule) => {
    if (!schedule) return false
    
    const now = new Date()
    const departureTime = new Date(schedule.departureTime)
    
    // If the date is today, check if departure time has passed
    const isToday = departureTime.toDateString() === now.toDateString()
    if (isToday && departureTime < now) {
      return false
    }
    return true
  }
  
  const getScheduleStatus = (schedule) => {
    const now = new Date()
    const departureTime = new Date(schedule.departureTime)
    const isToday = departureTime.toDateString() === now.toDateString()
    
    if (isToday && departureTime > now) {
      const minutesUntil = Math.floor((departureTime - now) / (1000 * 60))
      if (minutesUntil < 30) {
        return { text: `⏰ Departs in ${minutesUntil} mins`, color: '#f59e0b' }
      }
      return { text: '🟢 Available today', color: '#10b981' }
    } else if (isToday && departureTime < now) {
      return { text: '⏰ Departed', color: '#ef4444' }
    }
    return { text: '📅 Future booking', color: '#3b82f6' }
  }
  
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
    fetchInitialData()
    
    if (location.state?.customer) {
      setCustomerDetails({
        name: location.state.customer.customerName,
        phone: location.state.customer.phoneNumber,
        email: location.state.customer.email || '',
        idNumber: location.state.customer.idNumber || ''
      })
    }
  }, [navigate, location])

  useEffect(() => {
    if (selectedRoute) {
      fetchSchedulesForRoute(selectedRoute.routeID, selectedDate)
    }
  }, [selectedRoute, selectedDate])

  // ============================
  // API FUNCTIONS
  // ============================
  
  const fetchInitialData = async () => {
    try {
      // Using apiFetch to get routes
      const data = await apiFetch('/bookings/routes')
      setRoutes(data.routes || [])
      
    } catch (error) {
      console.error('❌ Error fetching routes:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchSchedulesForRoute = async (routeId, date, retryDate = null) => {
    setLoading(true)
    try {
      let dateToUse = date || selectedDate
      
      console.log(`🔍 Fetching schedules for route: ${routeId}, date: ${dateToUse}`)
      
      // Using apiFetch to get schedules
      const data = await apiFetch(`/bookings/schedules?routeId=${routeId}&date=${dateToUse}`)
      
      console.log('📅 Schedules response:', data)
      
      // Filter out schedules that have already passed for today
      let availableSchedules = data.schedules || []
      if (dateToUse === new Date().toISOString().split('T')[0]) {
        const now = new Date()
        availableSchedules = availableSchedules.filter(schedule => {
          const departureTime = new Date(schedule.departureTime)
          return departureTime > now
        })
        console.log(`⏰ Filtered out past schedules for today. ${availableSchedules.length} remaining`)
      }
      
      // If no schedules and not already retried, try tomorrow
      if (availableSchedules.length === 0 && !retryDate) {
        const tomorrow = new Date(dateToUse)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]
        console.log(`⚠️ No available schedules for ${dateToUse}, trying tomorrow: ${tomorrowStr}`)
        setSelectedDate(tomorrowStr)
        fetchSchedulesForRoute(routeId, tomorrowStr, true)
        return
      }
      
      setSchedules(availableSchedules)
      
      if (availableSchedules.length === 0) {
        console.log('⚠️ No schedules available for selected date')
      } else {
        console.log(`✅ Found ${availableSchedules.length} available schedules`)
      }
      
    } catch (error) {
      console.error('❌ Error fetching schedules:', error)
      setError(error.message)
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }

  const searchCustomer = async () => {
    if (!customerDetails.phone || customerDetails.phone.length < 10) {
      return
    }
    
    try {
      // Using apiFetch to search customer
      const data = await apiFetch(`/operators/customers/search?q=${encodeURIComponent(customerDetails.phone)}`)
      
      if (data.customers && data.customers.length > 0) {
        setSearchResults(data.customers)
        setShowSearchResults(true)
      }
    } catch (error) {
      console.error('Search error:', error)
      // Silently fail - customer not found is fine
    }
  }

  const selectCustomer = (customer) => {
    setCustomerDetails({
      name: customer.customerName,
      phone: customer.phoneNumber,
      email: customer.email || '',
      idNumber: customer.idNumber || ''
    })
    setShowSearchResults(false)
    setSearchResults([])
  }

  const handleBookForCustomer = async () => {
    if (!customerDetails.name || !customerDetails.phone) {
      alert('Please enter customer name and phone number')
      return
    }
    
    if (!selectedSchedule) {
      alert('Please select a schedule')
      return
    }
    
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat')
      return
    }

    setProcessing(true)

    try {
      // First, check if customer already exists by phone number
      let existingCustomerId = null
      try {
        const searchData = await apiFetch(`/operators/customers/phone/${encodeURIComponent(customerDetails.phone)}`)
        
        if (searchData.customer) {
          existingCustomerId = searchData.customer.custID
          console.log('✅ Existing customer found:', existingCustomerId)
        }
      } catch (searchError) {
        console.log('⚠️ Customer search error:', searchError)
      }
      
      // Build booking data for operator endpoint
      const bookingData = {
        routeId: selectedRoute.routeID,
        vehicleId: selectedSchedule.vehicleID,
        seatNumbers: selectedSeats,
        travelDate: selectedSchedule.departureTime.split('T')[0],
        customerDetails: {
          name: customerDetails.name,
          phone: customerDetails.phone,
          email: customerDetails.email,
          idNumber: customerDetails.idNumber
        },
        paymentMethod: paymentMethod,
        notes: bookingNotes
      }
      
      // If customer exists, add customerId
      if (existingCustomerId) {
        bookingData.customerId = existingCustomerId
      }
      
      console.log('📝 Creating operator booking:', bookingData)

      // Using apiFetch to create booking
      const result = await apiFetch('/operators/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData)
      })
      
      console.log('✅ Booking created:', result)
      
      let successMessage = `✅ Booking successful!\n\nBooking ID: ${result.booking?.reference || 'ER' + result.booking?.id}\nCustomer: ${customerDetails.name}\nPhone: ${customerDetails.phone}\nSeats: ${selectedSeats.join(', ')}\nTotal: KSh ${calculateTotal()}\n\n`
      
      if (result.payment?.initiated) {
        successMessage += `📱 M-Pesa payment prompt sent to ${customerDetails.phone}\n`
      } else if (result.payment?.error) {
        successMessage += `⚠️ M-Pesa prompt failed: ${result.payment.error}\n`
      }
      
      if (result.email?.sent) {
        successMessage += `📧 Ticket email sent to ${result.email.customerEmail || customerDetails.email || 'customer'}`
      } else if (customerDetails.email) {
        successMessage += `⚠️ Email failed to send`
      }
      
      alert(successMessage)

      navigate('/operator/bookings')

    } catch (error) {
      console.error('❌ Booking error:', error)
      alert(`Failed to create booking: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleSendSMS = async () => {
    if (!customerDetails.phone) {
      alert('Customer phone number required')
      return
    }
    
    if (!selectedSchedule || !selectedSeats.length) {
      alert('Please complete booking first')
      return
    }
    
    try {
      const smsData = {
        phone: customerDetails.phone,
        message: `EasyRide: Your booking from ${selectedRoute?.origin} to ${selectedRoute?.destination} on ${new Date(selectedSchedule.departureTime).toLocaleString()} (Seat${selectedSeats.length > 1 ? 's' : ''} ${selectedSeats.join(', ')}) is confirmed. Total: KSh ${calculateTotal()}. Thank you!`
      }
      
      // Using apiFetch to send SMS
      await apiFetch('/notifications/sms', {
        method: 'POST',
        body: JSON.stringify(smsData)
      })
      
      alert(`SMS sent to ${customerDetails.phone}`)
      
    } catch (error) {
      console.error('SMS error:', error)
      alert('Failed to send SMS: ' + error.message)
    }
  }

  const handlePrintTicket = () => {
    if (!customerDetails.name || !selectedSchedule || !selectedSeats.length) {
      alert('Please complete booking details first')
      return
    }
    
    try {
      const now = new Date()
      const bookingId = `ER${now.getTime().toString().slice(-8)}`
      const totalAmount = calculateTotal()
      
      const origin = selectedRoute?.origin || 'N/A'
      const destination = selectedRoute?.destination || 'N/A'
      const departureTime = selectedSchedule?.departureTime ? new Date(selectedSchedule.departureTime).toLocaleString() : 'N/A'
      const travelDate = selectedSchedule?.departureTime ? new Date(selectedSchedule.departureTime).toLocaleDateString() : 'N/A'
      const vehicleInfo = selectedSchedule?.vehicleNumber || selectedSchedule?.vehicleType || 'Vehicle'
      const price = selectedSchedule?.price || 0
      
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
                @media print {
                    body {
                        background: white;
                        padding: 0;
                    }
                    .no-print {
                        display: none;
                    }
                    .ticket {
                        box-shadow: none;
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
                            <span class="info-value">${bookingId}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Date & Time</span>
                            <span class="info-value">${new Date().toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <div class="info-row">
                            <span class="info-label">Passenger Name</span>
                            <span class="info-value">${(customerDetails.name || '').toUpperCase()}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Phone Number</span>
                            <span class="info-value">${customerDetails.phone || 'N/A'}</span>
                        </div>
                        ${customerDetails.email ? `
                        <div class="info-row">
                            <span class="info-label">Email</span>
                            <span class="info-value">${customerDetails.email}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="seats-section">
                        <div class="seats-number">${selectedSeats.join(', ')}</div>
                        <div class="seats-label">Seat${selectedSeats.length > 1 ? 's' : ''}</div>
                    </div>
                    
                    <div class="info-section">
                        <div class="info-row">
                            <span class="info-label">Route</span>
                            <span class="info-value">${origin} → ${destination}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Departure</span>
                            <span class="info-value">${departureTime}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Vehicle</span>
                            <span class="info-value">${vehicleInfo}</span>
                        </div>
                    </div>
                    
                    <div class="price-section">
                        <div class="price-row">
                            <span>Price per seat</span>
                            <span>KSh ${price}</span>
                        </div>
                        <div class="price-row">
                            <span>Number of seats</span>
                            <span>${selectedSeats.length}</span>
                        </div>
                        <div class="price-row total-price">
                            <span>Total Amount</span>
                            <span style="color: #f59e0b; font-size: 20px;">KSh ${totalAmount}</span>
                        </div>
                    </div>
                    
                    <div class="info-row">
                        <span class="info-label">Payment Method</span>
                        <span class="info-value">${paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod === 'cash' ? 'Cash' : 'Card'}</span>
                    </div>
                    
                    <div class="barcode">
                        ${bookingId}
                    </div>
                </div>
                <div class="footer">
                    <p>Please present this ticket at boarding</p>
                    <p>For inquiries: 0797338021 | info@easyride.co.ke</p>
                    <p style="margin-top: 8px;">Valid for travel on: ${travelDate}</p>
                </div>
            </div>
            <div class="no-print" style="position: fixed; bottom: 20px; right: 20px; display: flex; gap: 10px;">
                <button onclick="window.print()" style="background: #f59e0b; color: white; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer;">
                    🖨️ Print Ticket
                </button>
                <button onclick="window.close()" style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer;">
                    ✕ Close
                </button>
            </div>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank')
      
      if (!printWindow) {
        alert('Please allow popups for this site to print tickets.')
        return
      }
      
      printWindow.document.write(ticketHTML)
      printWindow.document.close()
      
    } catch (error) {
      console.error('❌ Print ticket error:', error)
      alert('Failed to generate ticket: ' + error.message)
    }
  }

  // ============================
  // HELPER FUNCTIONS
  // ============================
  
  const calculateTotal = () => {
    if (!selectedSchedule) return 0
    return selectedSchedule.price * selectedSeats.length
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-KE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // ============================
  // RENDER
  // ============================
  
  if (loading && routes.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading booking system...</p>
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
          <button onClick={() => window.location.reload()} style={styles.retryButton}>
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
          <div style={styles.headerIcon}>🏢</div>
          <h1 style={styles.title}>Book for Customer</h1>
          <p style={styles.subtitle}>Enter customer details and book seats on their behalf</p>
          {operator && (
            <div style={styles.operatorBadge}>
              👤 {operator.name || operator.operatorName} | {operator.officeLocation || 'Main Office'}
            </div>
          )}
        </div>
        
        <div style={styles.twoColumnGrid}>
          {/* Left Column: Customer Details */}
          <div style={styles.leftColumn}>
            <div style={styles.card}>
              <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #f59e0b, #fbbf24)'}}>
                <h2 style={styles.cardTitle}>
                  <span style={styles.cardIcon}>👤</span>
                  Customer Information
                </h2>
              </div>
              <div style={styles.cardBody}>
                {showSearchResults && searchResults.length > 0 && (
                  <div style={styles.searchResultBox}>
                    <p style={styles.searchResultTitle}>Existing customer found:</p>
                    {searchResults.map(customer => (
                      <div key={customer.custID} style={styles.searchResultItem} onClick={() => selectCustomer(customer)}>
                        <div style={styles.customerNameText}>{customer.customerName}</div>
                        <div style={styles.customerPhoneText}>{customer.phoneNumber}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={styles.formGroup}>
                  <label style={styles.label}><span style={styles.required}>*</span> Full Name</label>
                  <input
                    type="text"
                    value={customerDetails.name}
                    onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                    placeholder="Enter customer full name"
                    style={styles.input}
                    disabled={processing}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}><span style={styles.required}>*</span> Phone Number</label>
                  <input
                    type="tel"
                    value={customerDetails.phone}
                    onChange={(e) => {
                      setCustomerDetails({...customerDetails, phone: e.target.value})
                      if (e.target.value.length >= 10) searchCustomer()
                    }}
                    placeholder="0712345678"
                    style={styles.input}
                    disabled={processing}
                  />
                  <p style={styles.helperText}>Ticket will be sent via SMS</p>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    value={customerDetails.email}
                    onChange={(e) => setCustomerDetails({...customerDetails, email: e.target.value})}
                    placeholder="customer@email.com"
                    style={styles.input}
                    disabled={processing}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>ID/Passport Number</label>
                  <input
                    type="text"
                    value={customerDetails.idNumber}
                    onChange={(e) => setCustomerDetails({...customerDetails, idNumber: e.target.value})}
                    placeholder="National ID or Passport"
                    style={styles.input}
                    disabled={processing}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Booking Notes (Optional)</label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Any special instructions or notes..."
                    style={styles.textarea}
                    rows="3"
                    disabled={processing}
                  />
                </div>
              </div>
            </div>
            
            {/* Payment Method - Removed Card Option */}
            <div style={styles.card}>
              <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #10b981, #34d399)'}}>
                <h2 style={styles.cardTitle}>
                  <span style={styles.cardIcon}>💰</span>
                  Payment Method
                </h2>
              </div>
              <div style={styles.cardBody}>
                <div style={styles.paymentOptions}>
                  <label style={styles.paymentOption}>
                    <input
                      type="radio"
                      name="payment"
                      value="mpesa"
                      checked={paymentMethod === 'mpesa'}
                      onChange={() => setPaymentMethod('mpesa')}
                      disabled={processing}
                    />
                    <span style={styles.paymentIcon}>📱</span>
                    <div>
                      <div style={styles.paymentTitle}>M-Pesa</div>
                      <div style={styles.paymentDesc}>Customer pays via M-Pesa</div>
                    </div>
                  </label>
                  
                  <label style={styles.paymentOption}>
                    <input
                      type="radio"
                      name="payment"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                      disabled={processing}
                    />
                    <span style={styles.paymentIcon}>💵</span>
                    <div>
                      <div style={styles.paymentTitle}>Cash Payment</div>
                      <div style={styles.paymentDesc}>Customer pays cash at counter</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column: Booking Details */}
          <div style={styles.rightColumn}>
            {/* Route Selection */}
            <div style={styles.card}>
              <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #3b82f6, #60a5fa)'}}>
                <h2 style={styles.cardTitle}>
                  <span style={styles.cardIcon}>🛣️</span>
                  Select Route
                </h2>
              </div>
              <div style={styles.cardBody}>
                {routes.length === 0 ? (
                  <p style={styles.emptyText}>No routes available. Please add routes to the system.</p>
                ) : (
                  <div style={styles.routesGrid}>
                    {routes.map(route => (
                      <button
                        key={route.routeID}
                        onClick={() => {
                          setSelectedRoute(route)
                          setSelectedSchedule(null)
                          setSelectedSeats([])
                        }}
                        style={{
                          ...styles.routeButton,
                          background: selectedRoute?.routeID === route.routeID ? '#eff6ff' : 'white',
                          borderColor: selectedRoute?.routeID === route.routeID ? '#3b82f6' : '#fed7aa'
                        }}
                      >
                        <div style={styles.routeHeader}>
                          <h3 style={styles.routeTitle}>
                            {route.origin} → {route.destination}
                          </h3>
                          {selectedRoute?.routeID === route.routeID && (
                            <div style={styles.selectedBadge}>✓</div>
                          )}
                        </div>
                        <div style={styles.routeDetails}>
                          <span>⏱️ {route.estimatedTime || 'N/A'}</span>
                          <span>📏 {route.distance || 'N/A'} km</span>
                        </div>
                        <div style={styles.routeFooter}>
                          <span style={styles.routePrice}>KSh {route.baseFare}</span>
                          <span style={selectedRoute?.routeID === route.routeID ? styles.selectedText : styles.selectText}>
                            {selectedRoute?.routeID === route.routeID ? 'Selected' : 'Select'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Date Selector */}
            {selectedRoute && (
              <div style={styles.card}>
                <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #3b82f6, #60a5fa)'}}>
                  <h2 style={styles.cardTitle}>
                    <span style={styles.cardIcon}>📅</span>
                    Select Travel Date
                  </h2>
                </div>
                <div style={styles.cardBody}>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setSelectedDate(e.target.value)
                      setSelectedSchedule(null)
                      setSelectedSeats([])
                      if (selectedRoute) {
                        fetchSchedulesForRoute(selectedRoute.routeID, e.target.value)
                      }
                    }}
                    style={styles.dateInput}
                  />
                  <p style={styles.helperText}>
                    {selectedDate === new Date().toISOString().split('T')[0] 
                      ? "⚠️ Today's bookings: Only available for future departure times" 
                      : "Choose your travel date. Schedules shown for selected date"}
                  </p>
                </div>
              </div>
            )}
            
            {/* Schedule Selection */}
            {selectedRoute && (
              <div style={styles.card}>
                <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)'}}>
                  <h2 style={styles.cardTitle}>
                    <span style={styles.cardIcon}>⏰</span>
                    Select Schedule
                  </h2>
                </div>
                <div style={styles.cardBody}>
                  {loading ? (
                    <p style={styles.loadingTextSmall}>Loading schedules...</p>
                  ) : schedules.length === 0 ? (
                    <div style={styles.emptySchedule}>
                      <div style={styles.emptyIcon}>🚌</div>
                      <p style={styles.emptyText}>No available schedules for this date</p>
                      <p style={styles.emptySubtext}>Try selecting a different date or route</p>
                    </div>
                  ) : (
                    <div style={styles.schedulesList}>
                      {schedules.map(schedule => {
                        const isAvailable = isScheduleAvailable(schedule)
                        const status = getScheduleStatus(schedule)
                        
                        return (
                          <button
                            key={schedule.scheduleID}
                            onClick={() => {
                              if (isAvailable) {
                                setSelectedSchedule(schedule)
                                setSelectedSeats([])
                              }
                            }}
                            disabled={!isAvailable}
                            style={{
                              ...styles.scheduleButton,
                              background: selectedSchedule?.scheduleID === schedule.scheduleID ? '#faf5ff' : 'white',
                              borderColor: selectedSchedule?.scheduleID === schedule.scheduleID ? '#8b5cf6' : '#fed7aa',
                              opacity: !isAvailable ? 0.6 : 1,
                              cursor: !isAvailable ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <div style={styles.scheduleHeader}>
                              <div>
                                <div style={styles.scheduleTime}>
                                  <span style={styles.timeLarge}>
                                    {new Date(schedule.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span style={styles.timeArrow}>→</span>
                                  <span style={styles.timeSmall}>
                                    {new Date(schedule.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p style={styles.scheduleDate}>{new Date(schedule.departureTime).toLocaleDateString()}</p>
                              </div>
                              <div style={styles.schedulePriceRight}>
                                <span style={styles.priceAmount}>KSh {schedule.price}</span>
                                <span style={{...styles.availableBadge, color: status.color}}>{status.text}</span>
                                <span style={styles.availableBadge}>{schedule.availableSeats} seats available</span>
                              </div>
                            </div>
                            <div style={styles.scheduleFooter}>
                              <span>{schedule.vehicleType} {schedule.vehicleNumber ? `(${schedule.vehicleNumber})` : ''}</span>
                              {!isAvailable && <span style={{color: '#ef4444'}}>❌ Not available</span>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Seat Selection */}
            {selectedSchedule && (
              <div style={styles.card}>
                <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #10b981, #34d399)'}}>
                  <h2 style={styles.cardTitle}>
                    <span style={styles.cardIcon}>💺</span>
                    Select Seats
                  </h2>
                </div>
                <div style={styles.cardBody}>
                  <SeatMap
                    capacity={selectedSchedule.capacity || 14}
                    bookedSeats={selectedSchedule.bookedSeats || []}
                    selectedSeats={selectedSeats}
                    onSeatSelect={setSelectedSeats}
                    maxSelectable={10}
                  />
                  <div style={styles.seatLegend}>
                    <span><span style={{...styles.legendColor, background: '#e5e7eb'}}></span> Available</span>
                    <span><span style={{...styles.legendColor, background: '#10b981'}}></span> Selected</span>
                    <span><span style={{...styles.legendColor, background: '#ef4444'}}></span> Booked</span>
                    <span>Click on available seats to select</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Booking Summary */}
            {(selectedSchedule || selectedSeats.length > 0) && (
              <div style={styles.summaryCard}>
                <div style={{...styles.summaryHeader, background: 'linear-gradient(135deg, #4f46e5, #818cf8)'}}>
                  <h2 style={styles.summaryTitle}>
                    <span style={styles.summaryIcon}>📋</span>
                    Booking Summary
                  </h2>
                </div>
                <div style={styles.summaryBody}>
                  {customerDetails.name && (
                    <div style={styles.summaryRow}>
                      <span style={styles.summaryLabel}>Customer:</span>
                      <span style={styles.summaryValue}>{customerDetails.name}</span>
                    </div>
                  )}
                  {customerDetails.phone && (
                    <div style={styles.summaryRow}>
                      <span style={styles.summaryLabel}>Contact:</span>
                      <span style={styles.summaryValue}>{customerDetails.phone}</span>
                    </div>
                  )}
                  {selectedSchedule && selectedRoute && (
                    <>
                      <div style={styles.summaryRow}>
                        <span style={styles.summaryLabel}>Route:</span>
                        <span style={styles.summaryValue}>{selectedRoute.origin} → {selectedRoute.destination}</span>
                      </div>
                      <div style={styles.summaryRow}>
                        <span style={styles.summaryLabel}>Departure:</span>
                        <span style={styles.summaryValue}>{formatDateTime(selectedSchedule.departureTime)}</span>
                      </div>
                      <div style={styles.summaryRow}>
                        <span style={styles.summaryLabel}>Vehicle:</span>
                        <span style={styles.summaryValue}>{selectedSchedule.vehicleType || 'Vehicle'}</span>
                      </div>
                    </>
                  )}
                  {selectedSeats.length > 0 && (
                    <div style={styles.summaryRow}>
                      <span style={styles.summaryLabel}>Selected Seats:</span>
                      <span style={{...styles.summaryValue, color: '#10b981', fontWeight: 'bold'}}>{selectedSeats.join(', ')}</span>
                    </div>
                  )}
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Price per seat:</span>
                    <span style={styles.summaryValue}>KSh {selectedSchedule?.price || 0}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Number of seats:</span>
                    <span style={styles.summaryValue}>{selectedSeats.length}</span>
                  </div>
                  <div style={styles.totalRow}>
                    <span style={styles.totalLabel}>Total Amount:</span>
                    <span style={styles.totalAmount}>KSh {calculateTotal()}</span>
                  </div>
                  
                  <button
                    onClick={handleBookForCustomer}
                    disabled={processing || !customerDetails.name || !customerDetails.phone || selectedSeats.length === 0}
                    style={{
                      ...styles.confirmButton,
                      background: (processing || !customerDetails.name || !customerDetails.phone || selectedSeats.length === 0)
                        ? '#d1d5db'
                        : 'linear-gradient(135deg, #10b981, #059669)',
                      cursor: (processing || !customerDetails.name || !customerDetails.phone || selectedSeats.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {processing ? (
                      <span>⏳ Processing...</span>
                    ) : (
                      '📱 Confirm Booking & Send SMS'
                    )}
                  </button>
                  
                  <div style={styles.actionButtonsRow}>
                    <button
                      onClick={handlePrintTicket}
                      disabled={!customerDetails.name || !selectedSchedule || selectedSeats.length === 0 || processing}
                      style={{
                        ...styles.actionButton,
                        ...styles.printButton,
                        opacity: (!customerDetails.name || !selectedSchedule || selectedSeats.length === 0 || processing) ? 0.5 : 1
                      }}
                    >
                      🖨️ Print Ticket
                    </button>
                    <button
                      onClick={handleSendSMS}
                      disabled={!customerDetails.phone || processing}
                      style={{
                        ...styles.actionButton,
                        ...styles.smsButton,
                        opacity: (!customerDetails.phone || processing) ? 0.5 : 1
                      }}
                    >
                      📲 Send SMS
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
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
  loadingTextSmall: {
    color: '#b45309',
    textAlign: 'center',
    padding: '2rem',
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
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '2rem',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  card: {
    background: 'white',
    borderRadius: '1rem',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    padding: '1rem 1.5rem',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  cardIcon: {
    fontSize: '1.25rem',
  },
  cardBody: {
    padding: '1.5rem',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#78350f',
    marginBottom: '0.5rem',
  },
  required: {
    color: '#ef4444',
    marginRight: '0.25rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #fed7aa',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'all 0.3s',
    background: '#fffbef',
    color: '#78350f',
  },
  dateInput: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #fed7aa',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'all 0.3s',
    background: '#fffbef',
    color: '#78350f',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #fed7aa',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'all 0.3s',
    background: '#fffbef',
    color: '#78350f',
    fontFamily: 'inherit',
  },
  helperText: {
    fontSize: '0.75rem',
    color: '#b45309',
    marginTop: '0.25rem',
  },
  searchResultBox: {
    marginBottom: '1rem',
    padding: '0.75rem',
    background: '#fffbeb',
    borderRadius: '0.75rem',
    border: '1px solid #fed7aa',
  },
  searchResultTitle: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#b45309',
    marginBottom: '0.5rem',
  },
  searchResultItem: {
    padding: '0.5rem',
    background: 'white',
    borderRadius: '0.5rem',
    marginBottom: '0.5rem',
    cursor: 'pointer',
  },
  customerNameText: {
    fontWeight: '500',
    color: '#78350f',
  },
  customerPhoneText: {
    fontSize: '0.75rem',
    color: '#b45309',
  },
  paymentOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  paymentOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    border: '2px solid #fed7aa',
    borderRadius: '0.75rem',
    cursor: 'pointer',
  },
  paymentIcon: {
    fontSize: '1.5rem',
  },
  paymentTitle: {
    fontWeight: '600',
    color: '#78350f',
  },
  paymentDesc: {
    fontSize: '0.75rem',
    color: '#b45309',
  },
  routesGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '0.75rem',
  },
  routeButton: {
    padding: '1rem',
    borderRadius: '0.75rem',
    border: '2px solid',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.3s',
    width: '100%',
  },
  routeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '0.5rem',
  },
  routeTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#78350f',
  },
  selectedBadge: {
    width: '1.5rem',
    height: '1.5rem',
    background: '#10b981',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 'bold',
  },
  routeDetails: {
    display: 'flex',
    gap: '0.75rem',
    fontSize: '0.75rem',
    color: '#92400e',
    marginBottom: '0.75rem',
  },
  routeFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '0.75rem',
    borderTop: '1px solid #fed7aa',
  },
  routePrice: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#d97706',
  },
  selectText: {
    fontSize: '0.75rem',
    color: '#f59e0b',
  },
  selectedText: {
    fontSize: '0.75rem',
    color: '#10b981',
  },
  schedulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  scheduleButton: {
    padding: '1rem',
    borderRadius: '0.75rem',
    border: '2px solid',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.3s',
    width: '100%',
  },
  scheduleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '0.75rem',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  scheduleTime: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
    flexWrap: 'wrap',
  },
  timeLarge: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#78350f',
  },
  timeArrow: {
    color: '#d97706',
  },
  timeSmall: {
    fontSize: '0.875rem',
    color: '#92400e',
  },
  scheduleDate: {
    fontSize: '0.75rem',
    color: '#b45309',
  },
  schedulePriceRight: {
    textAlign: 'right',
  },
  priceAmount: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#d97706',
    display: 'block',
  },
  availableBadge: {
    fontSize: '0.75rem',
    display: 'block',
    marginTop: '0.25rem',
  },
  scheduleFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.75rem',
    color: '#92400e',
    paddingTop: '0.75rem',
    borderTop: '1px solid #fed7aa',
  },
  emptySchedule: {
    textAlign: 'center',
    padding: '2rem',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
  },
  emptyText: {
    color: '#b45309',
  },
  emptySubtext: {
    fontSize: '0.75rem',
    color: '#b45309',
    marginTop: '0.25rem',
  },
  seatLegend: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1rem',
    fontSize: '0.75rem',
    color: '#b45309',
    flexWrap: 'wrap',
  },
  legendColor: {
    width: '1rem',
    height: '1rem',
    borderRadius: '0.25rem',
    display: 'inline-block',
    marginRight: '0.25rem',
  },
  summaryCard: {
    background: 'white',
    borderRadius: '1rem',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: '1rem',
  },
  summaryHeader: {
    padding: '1rem 1.5rem',
  },
  summaryTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  summaryIcon: {
    fontSize: '1.25rem',
  },
  summaryBody: {
    padding: '1.5rem',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #fed7aa',
  },
  summaryLabel: {
    color: '#b45309',
    fontSize: '0.875rem',
  },
  summaryValue: {
    color: '#78350f',
    fontSize: '0.875rem',
    textAlign: 'right',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '1rem 0',
    marginTop: '0.5rem',
    borderTop: '2px solid #fed7aa',
  },
  totalLabel: {
    fontWeight: '600',
    color: '#78350f',
    fontSize: '1rem',
  },
  totalAmount: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#d97706',
  },
  confirmButton: {
    width: '100%',
    padding: '1rem',
    borderRadius: '0.75rem',
    border: 'none',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1rem',
    marginTop: '1rem',
    transition: 'all 0.3s',
  },
  actionButtonsRow: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1rem',
  },
  actionButton: {
    flex: 1,
    padding: '0.75rem',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: 'none',
  },
  printButton: {
    background: 'white',
    color: '#f59e0b',
    border: '1px solid #f59e0b',
  },
  smsButton: {
    background: '#8b5cf6',
    color: 'white',
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
`
document.head.appendChild(styleSheet)

export default OperatorBookingPage