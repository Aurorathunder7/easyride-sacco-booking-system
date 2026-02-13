import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import SeatMap from '../components/SeatMap'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function OperatorBookingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // ============================
  // STATE MANAGEMENT
  // ============================
  
  // Operator info
  const [operator, setOperator] = useState(null)
  
  // Loading states
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
  
  // ============================
  // EFFECTS
  // ============================
  
  // Check authentication and load data
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
    
    // Check if customer was passed from dashboard search
    if (location.state?.customer) {
      setCustomerDetails({
        name: location.state.customer.customerName,
        phone: location.state.customer.phoneNumber,
        email: location.state.customer.email || '',
        idNumber: location.state.customer.idNumber || ''
      })
    }
  }, [navigate, location])

  // Fetch schedules when route is selected
  useEffect(() => {
    if (selectedRoute) {
      fetchSchedulesForRoute(selectedRoute.routeID)
    }
  }, [selectedRoute])

  // ============================
  // API FUNCTIONS
  // ============================
  
  /**
   * Fetch initial data (routes)
   */
  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/routes?active=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Failed to fetch routes')
      
      const data = await response.json()
      setRoutes(data.routes || [])
      
    } catch (error) {
      console.error('❌ Error fetching routes:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Fetch schedules for selected route
   */
  const fetchSchedulesForRoute = async (routeId) => {
    setLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/schedules?routeId=${routeId}&active=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Failed to fetch schedules')
      
      const data = await response.json()
      setSchedules(data.schedules || [])
      
    } catch (error) {
      console.error('❌ Error fetching schedules:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Search for existing customer by phone
   */
  const searchCustomer = async () => {
    if (!customerDetails.phone || customerDetails.phone.length < 10) {
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/customers/search?phone=${customerDetails.phone}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.customer) {
          setSearchResults([data.customer])
          setShowSearchResults(true)
        }
      }
    } catch (error) {
      console.error('Search error:', error)
    }
  }

  /**
   * Select existing customer from search results
   */
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

  /**
   * Create booking for customer
   */
  const handleBookForCustomer = async () => {
    // Validation
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
      const token = localStorage.getItem('token')
      
      // First, find or create customer
      let customerId = null
      
      // Try to find existing customer
      const searchResponse = await fetch(`${API_BASE_URL}/customers/search?phone=${customerDetails.phone}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        if (searchData.customer) {
          customerId = searchData.customer.custID
        }
      }
      
      // If customer doesn't exist, create new one
      if (!customerId) {
        const createResponse = await fetch(`${API_BASE_URL}/customers/quick-create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            customerName: customerDetails.name,
            phoneNumber: customerDetails.phone,
            email: customerDetails.email || null,
            idNumber: customerDetails.idNumber || null
          })
        })
        
        if (!createResponse.ok) {
          const error = await createResponse.json()
          throw new Error(error.message || 'Failed to create customer')
        }
        
        const createData = await createResponse.json()
        customerId = createData.customer.custID
      }
      
      // Create booking
      const bookingData = {
        customerId,
        scheduleId: selectedSchedule.scheduleID,
        routeId: selectedSchedule.routeID,
        vehicleId: selectedSchedule.vehicleID,
        seatNumbers: selectedSeats,
        travelDate: selectedSchedule.departureTime,
        passengers: selectedSeats.length,
        amount: selectedSchedule.price * selectedSeats.length,
        paymentMethod,
        notes: bookingNotes,
        bookedBy: operator?.id // Operator ID
      }

      console.log('📝 Creating operator booking:', bookingData)

      const bookingResponse = await fetch(`${API_BASE_URL}/operators/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      })

      if (!bookingResponse.ok) {
        const error = await bookingResponse.json()
        throw new Error(error.message || 'Failed to create booking')
      }

      const result = await bookingResponse.json()
      
      console.log('✅ Booking created:', result)

      // Show success message
      alert(`✅ Booking successful!\n\nBooking ID: ${result.booking.bookingReference}\nCustomer: ${customerDetails.name}\nPhone: ${customerDetails.phone}\nSeats: ${selectedSeats.join(', ')}\nTotal: KSh ${result.booking.totalAmount}\n\nTicket sent to customer's phone.`)

      // Navigate to operator bookings
      navigate('/operator/bookings')

    } catch (error) {
      console.error('❌ Booking error:', error)
      alert(`Failed to create booking: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  /**
   * Send SMS receipt manually
   */
  const handleSendSMS = async () => {
    if (!customerDetails.phone) {
      alert('Customer phone number required')
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      
      // This would be implemented with your SMS service
      alert(`SMS functionality will send to ${customerDetails.phone}`)
      
    } catch (error) {
      console.error('SMS error:', error)
      alert('Failed to send SMS')
    }
  }

  /**
   * Print ticket
   */
  const handlePrintTicket = () => {
    if (!customerDetails.name) {
      alert('Please enter customer details first')
      return
    }
    
    // In real app, generate PDF
    alert('Printing ticket... (PDF generation would happen here)')
  }

  // ============================
  // HELPER FUNCTIONS
  // ============================
  
  const calculateTotal = () => {
    if (!selectedSchedule) return 0
    return selectedSchedule.price * selectedSeats.length
  }

  const formatDateTime = (dateString) => {
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
        <div style={styles.loadingSpinner}></div>
        <p>Loading booking system...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🏢 Book for Customer</h1>
        <p style={styles.subtitle}>Enter customer details and book seats on their behalf</p>
        {operator && (
          <p style={styles.operatorInfo}>
            Operator: {operator.name || operator.operatorName} | {operator.officeLocation || 'Main Office'}
          </p>
        )}
      </div>
      
      <div style={styles.grid}>
        {/* Left Column: Customer Details */}
        <div style={styles.leftColumn}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Customer Information</h2>
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div style={styles.searchResults}>
                <p style={styles.searchResultsTitle}>Existing customer found:</p>
                {searchResults.map(customer => (
                  <div
                    key={customer.custID}
                    style={styles.searchResultItem}
                    onClick={() => selectCustomer(customer)}
                  >
                    <div style={styles.resultName}>{customer.customerName}</div>
                    <div style={styles.resultPhone}>{customer.phoneNumber}</div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <span style={styles.required}>*</span> Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={customerDetails.name}
                  onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                  placeholder="Enter customer full name"
                  style={styles.input}
                  disabled={processing}
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <span style={styles.required}>*</span> Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={customerDetails.phone}
                  onChange={(e) => {
                    setCustomerDetails({...customerDetails, phone: e.target.value})
                    if (e.target.value.length >= 10) {
                      searchCustomer()
                    }
                  }}
                  placeholder="0712345678"
                  style={styles.input}
                  disabled={processing}
                />
                <p style={styles.helperText}>Ticket will be sent via SMS</p>
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={customerDetails.email}
                  onChange={(e) => setCustomerDetails({...customerDetails, email: e.target.value})}
                  placeholder="customer@email.com"
                  style={styles.input}
                  disabled={processing}
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>ID/Passport Number</label>
                <input
                  type="text"
                  name="idNumber"
                  value={customerDetails.idNumber}
                  onChange={(e) => setCustomerDetails({...customerDetails, idNumber: e.target.value})}
                  placeholder="National ID or Passport"
                  style={styles.input}
                  disabled={processing}
                />
              </div>
              
              <div style={styles.inputGroup}>
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
          
          {/* Payment Method */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Payment Method</h2>
            <div style={styles.paymentMethods}>
              <label style={styles.paymentOption}>
                <input
                  type="radio"
                  name="payment"
                  value="mpesa"
                  checked={paymentMethod === 'mpesa'}
                  onChange={() => setPaymentMethod('mpesa')}
                  style={styles.radio}
                  disabled={processing}
                />
                <div style={styles.paymentIcon}>📱</div>
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
                  style={styles.radio}
                  disabled={processing}
                />
                <div style={styles.paymentIcon}>💵</div>
                <div>
                  <div style={styles.paymentTitle}>Cash Payment</div>
                  <div style={styles.paymentDesc}>Customer pays cash at counter</div>
                </div>
              </label>
              
              <label style={styles.paymentOption}>
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  style={styles.radio}
                  disabled={processing}
                />
                <div style={styles.paymentIcon}>💳</div>
                <div>
                  <div style={styles.paymentTitle}>Card Payment</div>
                  <div style={styles.paymentDesc}>Pay with card at counter</div>
                </div>
              </label>
            </div>
          </div>
        </div>
        
        {/* Right Column: Booking Details */}
        <div style={styles.rightColumn}>
          {/* Route Selection */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Select Route</h2>
            {loading ? (
              <p>Loading routes...</p>
            ) : (
              <div style={styles.routesGrid}>
                {routes.map(route => (
                  <div
                    key={route.routeID}
                    style={{
                      ...styles.routeCard,
                      ...(selectedRoute?.routeID === route.routeID ? styles.selectedRoute : {})
                    }}
                    onClick={() => {
                      setSelectedRoute(route)
                      setSelectedSchedule(null)
                      setSelectedSeats([])
                    }}
                  >
                    <div style={styles.routeInfo}>
                      <h3 style={styles.routeName}>
                        {route.origin} → {route.destination}
                      </h3>
                      <div style={styles.routeDetails}>
                        <span style={styles.duration}>⏱️ {route.estimatedTime}</span>
                        <span style={styles.price}>KSh {route.basePrice}/seat</span>
                      </div>
                    </div>
                    <div style={styles.selectIndicator}>
                      {selectedRoute?.routeID === route.routeID ? '✓ Selected' : 'Select'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Schedule Selection */}
          {selectedRoute && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Select Schedule</h2>
              {loading ? (
                <p>Loading schedules...</p>
              ) : schedules.length === 0 ? (
                <p style={styles.noData}>No available schedules for this route</p>
              ) : (
                <div style={styles.schedulesList}>
                  {schedules.map(schedule => (
                    <div
                      key={schedule.scheduleID}
                      style={{
                        ...styles.scheduleCard,
                        ...(selectedSchedule?.scheduleID === schedule.scheduleID ? styles.selectedSchedule : {})
                      }}
                      onClick={() => {
                        setSelectedSchedule(schedule)
                        setSelectedSeats([])
                      }}
                    >
                      <div style={styles.scheduleTime}>
                        <div style={styles.time}>
                          {new Date(schedule.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={styles.timeLabel}>Departure</div>
                      </div>
                      <div style={styles.scheduleInfo}>
                        <div style={styles.vehicleInfo}>
                          {schedule.vehicleType} {schedule.vehicleNumber ? `(${schedule.vehicleNumber})` : ''}
                        </div>
                        <div style={styles.seatInfo}>
                          {schedule.availableSeats || 0} seats available
                        </div>
                      </div>
                      <div style={styles.schedulePrice}>
                        <div style={styles.price}>KSh {schedule.price}</div>
                        <div style={styles.selectText}>
                          {selectedSchedule?.scheduleID === schedule.scheduleID ? '✓ Selected' : 'Select'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Seat Selection */}
          {selectedSchedule && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Select Seats</h2>
              <SeatMap
                capacity={selectedSchedule.capacity || 14}
                bookedSeats={selectedSchedule.bookedSeats || []}
                selectedSeats={selectedSeats}
                onSeatSelect={setSelectedSeats}
                maxSelectable={10}
                disabled={processing}
              />
            </div>
          )}
          
          {/* Booking Summary */}
          {(selectedSchedule || selectedSeats.length > 0) && (
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Booking Summary</h3>
              
              {customerDetails.name && (
                <div style={styles.summaryRow}>
                  <span>Customer:</span>
                  <span style={styles.customerHighlight}>{customerDetails.name}</span>
                </div>
              )}
              
              {customerDetails.phone && (
                <div style={styles.summaryRow}>
                  <span>Contact:</span>
                  <span>{customerDetails.phone}</span>
                </div>
              )}
              
              {selectedSchedule && selectedRoute && (
                <>
                  <div style={styles.summaryRow}>
                    <span>Route:</span>
                    <span>{selectedRoute.origin} → {selectedRoute.destination}</span>
                  </div>
                  
                  <div style={styles.summaryRow}>
                    <span>Departure:</span>
                    <span>{formatDateTime(selectedSchedule.departureTime)}</span>
                  </div>
                  
                  <div style={styles.summaryRow}>
                    <span>Vehicle:</span>
                    <span>{selectedSchedule.vehicleType || 'Vehicle'}</span>
                  </div>
                </>
              )}
              
              {selectedSeats.length > 0 && (
                <div style={styles.summaryRow}>
                  <span>Selected Seats:</span>
                  <span style={styles.seatsHighlight}>{selectedSeats.join(', ')}</span>
                </div>
              )}
              
              <div style={styles.summaryRow}>
                <span>Price per seat:</span>
                <span>KSh {selectedSchedule?.price || 0}</span>
              </div>
              
              <div style={styles.summaryRow}>
                <span>Number of seats:</span>
                <span>{selectedSeats.length}</span>
              </div>
              
              <div style={styles.summaryDivider}></div>
              
              <div style={styles.summaryRow}>
                <span style={styles.totalLabel}>Total Amount:</span>
                <span style={styles.totalValue}>KSh {calculateTotal()}</span>
              </div>
              
              <div style={styles.bookingActions}>
                <button
                  onClick={handleBookForCustomer}
                  disabled={
                    processing ||
                    !customerDetails.name ||
                    !customerDetails.phone ||
                    selectedSeats.length === 0
                  }
                  style={{
                    ...styles.bookButton,
                    ...((processing || !customerDetails.name || !customerDetails.phone || selectedSeats.length === 0) ? styles.disabledButton : {})
                  }}
                >
                  {processing ? (
                    <span>
                      <span style={styles.spinner}></span>
                      Processing...
                    </span>
                  ) : (
                    '📱 Confirm Booking & Send SMS'
                  )}
                </button>
                
                <div style={styles.secondaryActions}>
                  <button 
                    onClick={handlePrintTicket}
                    disabled={!customerDetails.name || processing}
                    style={styles.secondaryButton}
                  >
                    🖨️ Print Ticket
                  </button>
                  <button 
                    onClick={handleSendSMS}
                    disabled={!customerDetails.phone || processing}
                    style={styles.secondaryButton}
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
  errorContainer: {
    maxWidth: '400px',
    margin: '100px auto',
    textAlign: 'center',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '12px',
  },
  header: {
    marginBottom: '30px',
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
  operatorInfo: {
    fontSize: '14px',
    color: '#3b82f6',
    fontWeight: '500',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: '30px',
  },
  leftColumn: {},
  rightColumn: {},
  section: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '25px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e2e8f0',
  },
  searchResults: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    border: '1px solid #bae6fd',
  },
  searchResultsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: '10px',
  },
  searchResultItem: {
    padding: '10px',
    backgroundColor: 'white',
    borderRadius: '6px',
    marginBottom: '5px',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#f1f5f9',
    },
  },
  resultName: {
    fontWeight: '500',
    color: '#1e293b',
  },
  resultPhone: {
    fontSize: '12px',
    color: '#64748b',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '8px',
    fontWeight: '500',
    color: '#475569',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    padding: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: '#f8fafc',
  },
  textarea: {
    padding: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: '#f8fafc',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  helperText: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '5px',
  },
  paymentMethods: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  paymentOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  radio: {
    width: '20px',
    height: '20px',
  },
  paymentIcon: {
    fontSize: '24px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
  },
  paymentTitle: {
    fontWeight: '600',
    color: '#1e293b',
  },
  paymentDesc: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
  },
  routesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  routeCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    ':hover': {
      borderColor: '#3b82f6',
    },
  },
  selectedRoute: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '5px',
  },
  routeDetails: {
    display: 'flex',
    gap: '15px',
    fontSize: '14px',
    color: '#64748b',
  },
  duration: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  price: {
    fontWeight: '600',
    color: '#3b82f6',
  },
  selectIndicator: {
    fontSize: '14px',
    color: '#3b82f6',
    fontWeight: '500',
  },
  schedulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  scheduleCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  selectedSchedule: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  scheduleTime: {
    textAlign: 'center',
    paddingRight: '20px',
    borderRight: '1px solid #e2e8f0',
    minWidth: '80px',
  },
  time: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
  },
  timeLabel: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
  },
  scheduleInfo: {
    flex: 1,
    paddingLeft: '20px',
  },
  vehicleInfo: {
    fontWeight: '500',
    color: '#475569',
    marginBottom: '5px',
  },
  seatInfo: {
    fontSize: '14px',
    color: '#64748b',
  },
  schedulePrice: {
    textAlign: 'right',
  },
  selectText: {
    fontSize: '14px',
    color: '#10b981',
    fontWeight: '500',
    marginTop: '5px',
  },
  noData: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '20px',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  summaryTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '20px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: '15px',
    color: '#475569',
  },
  customerHighlight: {
    fontWeight: '600',
    color: '#1e293b',
  },
  seatsHighlight: {
    fontWeight: '600',
    color: '#10b981',
  },
  summaryDivider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '20px 0',
  },
  totalLabel: {
    fontWeight: '600',
    color: '#1e293b',
    fontSize: '16px',
  },
  totalValue: {
    fontWeight: 'bold',
    color: '#3b82f6',
    fontSize: '24px',
  },
  bookingActions: {
    marginTop: '25px',
  },
  bookButton: {
    width: '100%',
    backgroundColor: '#10b981',
    color: 'white',
    padding: '16px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
  },
  secondaryActions: {
    display: 'flex',
    gap: '10px',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px',
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

export default OperatorBookingPage