import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import SeatMap from '../components/SeatMap'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function BookingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // ============================
  // STATE MANAGEMENT
  // ============================
  
  // Data from database
  const [routes, setRoutes] = useState([])
  const [schedules, setSchedules] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [seats, setSeats] = useState([])
  
  // UI State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [selectedSeats, setSelectedSeats] = useState([])
  const [availableSeats, setAvailableSeats] = useState([])
  
  // Passenger details
  const [passengerDetails, setPassengerDetails] = useState({
    name: '',
    phone: '',
    email: '',
    idNumber: ''
  })
  
  // M-Pesa payment state
  const [processingPayment, setProcessingPayment] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState(null)

  // ============================
  // EFFECTS
  // ============================
  
  // Load initial data on mount
  useEffect(() => {
    fetchInitialData()
    
    // Get user from localStorage for pre-filling
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setPassengerDetails({
          name: user.name || user.customerName || '',
          phone: user.phoneNumber || user.phone || '',
          email: user.email || '',
          idNumber: user.idNumber || ''
        })
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
  }, [])

  // Fetch schedules when route is selected
  useEffect(() => {
    if (selectedRoute) {
      fetchSchedulesForRoute(selectedRoute.routeID)
    }
  }, [selectedRoute])

  // Fetch seat availability when schedule is selected
  useEffect(() => {
    if (selectedSchedule) {
      fetchSeatAvailability(selectedSchedule.scheduleID)
    }
  }, [selectedSchedule])

  // ============================
  // API FUNCTIONS
  // ============================
  
  /**
   * Fetch initial data (routes and vehicles)
   */
  const fetchInitialData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        navigate('/login')
        return
      }
      
      console.log('📡 Fetching routes and vehicles...')
      
      // Fetch routes
      const routesResponse = await fetch(`${API_BASE_URL}/routes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!routesResponse.ok) throw new Error('Failed to fetch routes')
      const routesData = await routesResponse.json()
      setRoutes(routesData.routes || [])
      
      // Fetch vehicles
      const vehiclesResponse = await fetch(`${API_BASE_URL}/vehicles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!vehiclesResponse.ok) throw new Error('Failed to fetch vehicles')
      const vehiclesData = await vehiclesResponse.json()
      setVehicles(vehiclesData.vehicles || [])
      
    } catch (error) {
      console.error('❌ Error fetching data:', error)
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
      
      console.log(`📡 Fetching schedules for route ${routeId}...`)
      
      const response = await fetch(`${API_BASE_URL}/schedules?routeId=${routeId}`, {
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
   * Fetch seat availability for selected schedule
   */
  const fetchSeatAvailability = async (scheduleId) => {
    try {
      const token = localStorage.getItem('token')
      
      console.log(`📡 Fetching seat availability for schedule ${scheduleId}...`)
      
      const response = await fetch(`${API_BASE_URL}/schedules/${scheduleId}/seats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Failed to fetch seat availability')
      const data = await response.json()
      
      setAvailableSeats(data.availableSeats || [])
      setSeats(data.allSeats || [])
      
    } catch (error) {
      console.error('❌ Error fetching seats:', error)
      setError(error.message)
    }
  }

  /**
   * Create booking and initiate M-Pesa payment
   */
  const handleBook = async () => {
    // Validation
    if (!selectedSchedule) {
      alert('Please select a schedule')
      return
    }
    
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat')
      return
    }
    
    if (!passengerDetails.name || !passengerDetails.phone) {
      alert('Please fill in passenger details')
      return
    }

    setProcessingPayment(true)
    setPaymentStatus(null)

    try {
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      const user = JSON.parse(userStr)
      
      // Prepare booking data
      const bookingData = {
        scheduleId: selectedSchedule.scheduleID,
        routeId: selectedSchedule.routeID,
        vehicleId: selectedSchedule.vehicleID,
        seatNumbers: selectedSeats,
        travelDate: selectedSchedule.departureTime,
        passengers: selectedSeats.length,
        amount: selectedSchedule.price * selectedSeats.length,
        passengerDetails: {
          name: passengerDetails.name,
          phone: passengerDetails.phone,
          email: passengerDetails.email,
          idNumber: passengerDetails.idNumber
        }
      }

      console.log('📝 Creating booking:', bookingData)

      // Create booking and initiate payment
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create booking')
      }

      console.log('✅ Booking created:', data)

      setPaymentStatus({
        type: 'success',
        message: 'M-Pesa prompt sent to your phone. Please check and enter PIN.'
      })

      // Show M-Pesa instructions
      alert(`📱 M-Pesa prompt sent to ${passengerDetails.phone}\n\nPlease check your phone and enter your PIN to complete payment.\n\nBooking Reference: ${data.booking.bookingReference}`)

      // Navigate to my-bookings after short delay
      setTimeout(() => {
        navigate('/my-bookings')
      }, 3000)

    } catch (error) {
      console.error('❌ Booking error:', error)
      
      setPaymentStatus({
        type: 'error',
        message: error.message || 'Failed to complete booking'
      })
      
      alert(`❌ Booking failed: ${error.message}`)
    } finally {
      setProcessingPayment(false)
    }
  }

  // ============================
  // HELPER FUNCTIONS
  // ============================
  
  const handlePassengerChange = (e) => {
    setPassengerDetails({
      ...passengerDetails,
      [e.target.name]: e.target.value
    })
  }

  const calculateTotal = () => {
    if (!selectedSchedule) return 0
    return selectedSchedule.price * selectedSeats.length
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-KE', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // ============================
  // RENDER FUNCTIONS
  // ============================
  
  if (loading && routes.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading available routes...</p>
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
          onClick={() => fetchInitialData()}
          style={styles.retryButton}
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Book Your Journey</h1>
      <p style={styles.subtitle}>Select route, schedule, and seats</p>
      
      {/* Payment Status Message */}
      {paymentStatus && (
        <div style={{
          ...styles.paymentStatus,
          ...(paymentStatus.type === 'success' ? styles.paymentSuccess : styles.paymentError)
        }}>
          <span style={styles.paymentIcon}>
            {paymentStatus.type === 'success' ? '✅' : '❌'}
          </span>
          <p style={styles.paymentMessage}>{paymentStatus.message}</p>
        </div>
      )}
      
      {/* Route Selection */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>1. Select Route</h2>
        <div style={styles.routesGrid}>
          {routes.map(route => (
            <div 
              key={route.routeID}
              style={{
                ...styles.routeCard,
                ...(selectedRoute?.routeID === route.routeID ? styles.selectedRoute : {})
              }}
              onClick={() => setSelectedRoute(route)}
            >
              <div style={styles.routeHeader}>
                <h3 style={styles.routeName}>
                  {route.origin} → {route.destination}
                </h3>
                <div style={styles.routeDetails}>
                  <span style={styles.duration}>⏱️ {route.estimatedTime}</span>
                  <span style={styles.distance}>📏 {route.distance} km</span>
                </div>
              </div>
              <div style={styles.routePrice}>
                <div style={styles.price}>KSh {route.basePrice}</div>
                <div style={styles.selectBadge}>
                  {selectedRoute?.routeID === route.routeID ? '✓ Selected' : 'Select Route'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Selection */}
      {selectedRoute && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Select Schedule</h2>
          {loading ? (
            <div style={styles.smallLoader}>Loading schedules...</div>
          ) : schedules.length === 0 ? (
            <div style={styles.noDataMessage}>
              No available schedules for this route. Please try another route.
            </div>
          ) : (
            <div style={styles.schedulesList}>
              {schedules.map(schedule => (
                <div
                  key={schedule.scheduleID}
                  style={{
                    ...styles.scheduleCard,
                    ...(selectedSchedule?.scheduleID === schedule.scheduleID ? styles.selectedSchedule : {})
                  }}
                  onClick={() => setSelectedSchedule(schedule)}
                >
                  <div style={styles.scheduleInfo}>
                    <div>
                      <h3 style={styles.scheduleTime}>
                        {formatTime(schedule.departureTime)} → {formatTime(schedule.arrivalTime)}
                      </h3>
                      <p style={styles.scheduleDate}>
                        {formatDateTime(schedule.departureTime)}
                      </p>
                    </div>
                    <div style={styles.vehicleInfo}>
                      <p style={styles.vehicle}>
                        {schedule.vehicleType || 'Vehicle'} {schedule.vehicleNumber ? `(${schedule.vehicleNumber})` : ''}
                      </p>
                      <p style={styles.driver}>Driver: {schedule.driverName || 'To be assigned'}</p>
                    </div>
                  </div>
                  <div style={styles.scheduleDetails}>
                    <div style={styles.seatAvailability}>
                      <span style={styles.availableSeats}>
                        {schedule.availableSeats || 0} seats available
                      </span>
                      <span style={styles.capacity}>
                        (Capacity: {schedule.capacity || 0})
                      </span>
                    </div>
                    <div style={styles.schedulePrice}>
                      <div style={styles.price}>KSh {schedule.price}</div>
                      <button
                        style={styles.selectButton}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedSchedule(schedule)
                        }}
                      >
                        {selectedSchedule?.scheduleID === schedule.scheduleID ? 'Selected' : 'Select'}
                      </button>
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
          <h2 style={styles.sectionTitle}>3. Select Seats</h2>
          {loading ? (
            <div style={styles.smallLoader}>Loading seat map...</div>
          ) : (
            <SeatMap
              capacity={selectedSchedule.capacity || 14}
              bookedSeats={availableSeats.filter(s => !s.available).map(s => s.seatNumber)}
              selectedSeats={selectedSeats}
              onSeatSelect={setSelectedSeats}
              maxSelectable={5}
              seatLayout={seats}
            />
          )}
        </div>
      )}

      {/* Passenger Details */}
      {selectedSchedule && selectedSeats.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>4. Passenger Details</h2>
          <div style={styles.passengerForm}>
            <div style={styles.formGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={passengerDetails.name}
                  onChange={handlePassengerChange}
                  placeholder="John Doe"
                  style={styles.input}
                  required
                  disabled={processingPayment}
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={passengerDetails.phone}
                  onChange={handlePassengerChange}
                  placeholder="0712345678"
                  style={styles.input}
                  required
                  disabled={processingPayment}
                />
                <small style={styles.inputHint}>For M-Pesa payment and ticket</small>
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={passengerDetails.email}
                  onChange={handlePassengerChange}
                  placeholder="john@example.com"
                  style={styles.input}
                  disabled={processingPayment}
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>ID/Passport Number</label>
                <input
                  type="text"
                  name="idNumber"
                  value={passengerDetails.idNumber}
                  onChange={handlePassengerChange}
                  placeholder="National ID or Passport"
                  style={styles.input}
                  disabled={processingPayment}
                />
              </div>
            </div>
            
            <p style={styles.formNote}>
              * Required fields. M-Pesa payment will be sent to provided phone number.
            </p>
          </div>
        </div>
      )}

      {/* Booking Summary & Action */}
      {(selectedSchedule || selectedSeats.length > 0) && (
        <div style={styles.summarySection}>
          <div style={styles.summaryCard}>
            <h2 style={styles.summaryTitle}>Booking Summary</h2>
            
            {selectedSchedule && (
              <div style={styles.summaryDetails}>
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Route:</span>
                  <span style={styles.summaryValue}>
                    {selectedRoute?.origin} → {selectedRoute?.destination}
                  </span>
                </div>
                
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Departure:</span>
                  <span style={styles.summaryValue}>
                    {formatDateTime(selectedSchedule.departureTime)}
                  </span>
                </div>
                
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Vehicle:</span>
                  <span style={styles.summaryValue}>
                    {selectedSchedule.vehicleType || 'Vehicle'} {selectedSchedule.vehicleNumber || ''}
                  </span>
                </div>
                
                {selectedSeats.length > 0 && (
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Selected Seats:</span>
                    <span style={styles.summaryValue}>
                      {selectedSeats.join(', ')}
                    </span>
                  </div>
                )}
                
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Price per seat:</span>
                  <span style={styles.summaryValue}>KSh {selectedSchedule.price}</span>
                </div>
                
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Number of seats:</span>
                  <span style={styles.summaryValue}>{selectedSeats.length}</span>
                </div>
                
                <div style={styles.summaryDivider}></div>
                
                <div style={styles.summaryRow}>
                  <span style={styles.totalLabel}>Total Amount:</span>
                  <span style={styles.totalValue}>KSh {calculateTotal()}</span>
                </div>
              </div>
            )}
            
            <button
              onClick={handleBook}
              disabled={
                processingPayment ||
                selectedSeats.length === 0 || 
                !passengerDetails.name || 
                !passengerDetails.phone
              }
              style={{
                ...styles.bookButton,
                ...((selectedSeats.length === 0 || !passengerDetails.name || !passengerDetails.phone || processingPayment) ? styles.disabledButton : {})
              }}
            >
              {processingPayment ? (
                <span style={styles.buttonSpinner}>
                  <span style={styles.smallSpinner}></span>
                  Processing Payment...
                </span>
              ) : selectedSeats.length === 0 ? (
                'Select Seats First'
              ) : !passengerDetails.name || !passengerDetails.phone ? (
                'Complete Passenger Details'
              ) : (
                `💳 Pay KSh ${calculateTotal()} via M-Pesa`
              )}
            </button>
            
            <p style={styles.bookingNote}>
              After confirmation, you'll receive an M-Pesa prompt on {passengerDetails.phone || 'your phone'}.
              Your ticket will be sent via SMS.
            </p>
          </div>
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
    padding: '30px 20px',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '10px',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: '40px',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#334155',
    paddingBottom: '15px',
    borderBottom: '2px solid #e2e8f0',
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
  smallLoader: {
    textAlign: 'center',
    padding: '20px',
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
  noDataMessage: {
    textAlign: 'center',
    padding: '30px',
    backgroundColor: 'white',
    borderRadius: '8px',
    color: '#666',
  },
  paymentStatus: {
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  paymentSuccess: {
    backgroundColor: '#d1fae5',
    border: '1px solid #10b981',
  },
  paymentError: {
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
  },
  paymentIcon: {
    fontSize: '20px',
  },
  paymentMessage: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '500',
  },
  routesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  routeCard: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '2px solid transparent',
  },
  selectedRoute: {
    borderColor: '#3b82f6',
    transform: 'scale(1.02)',
    boxShadow: '0 5px 20px rgba(59,130,246,0.2)',
  },
  routeHeader: {
    marginBottom: '15px',
  },
  routeName: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '5px',
    color: '#1e293b',
  },
  routeDetails: {
    display: 'flex',
    gap: '10px',
    fontSize: '13px',
    color: '#64748b',
  },
  routePrice: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #e2e8f0',
  },
  price: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  selectBadge: {
    color: '#3b82f6',
    fontSize: '14px',
    fontWeight: '500',
  },
  schedulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  scheduleCard: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '2px solid transparent',
  },
  selectedSchedule: {
    borderColor: '#3b82f6',
    backgroundColor: '#f0f9ff',
  },
  scheduleInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '15px',
  },
  scheduleTime: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '5px',
  },
  scheduleDate: {
    fontSize: '14px',
    color: '#64748b',
  },
  vehicleInfo: {
    textAlign: 'right',
  },
  vehicle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#334155',
    marginBottom: '3px',
  },
  driver: {
    fontSize: '13px',
    color: '#64748b',
  },
  scheduleDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '15px',
    borderTop: '1px solid #e2e8f0',
  },
  seatAvailability: {
    fontSize: '14px',
  },
  availableSeats: {
    color: '#10b981',
    fontWeight: '600',
    marginRight: '5px',
  },
  capacity: {
    color: '#64748b',
    fontSize: '12px',
  },
  schedulePrice: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  selectButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  passengerForm: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '15px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '5px',
    color: '#475569',
  },
  input: {
    padding: '10px',
    border: '1px solid #e2e8f0',
    borderRadius: '5px',
    fontSize: '14px',
  },
  inputHint: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '3px',
  },
  formNote: {
    fontSize: '13px',
    color: '#64748b',
    fontStyle: 'italic',
  },
  summarySection: {
    marginTop: '40px',
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 5px 20px rgba(0,0,0,0.1)',
  },
  summaryTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#1e293b',
  },
  summaryDetails: {
    marginBottom: '25px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '15px',
  },
  summaryLabel: {
    color: '#64748b',
  },
  summaryValue: {
    fontWeight: '500',
    color: '#1e293b',
  },
  summaryDivider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '15px 0',
  },
  totalLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
  },
  totalValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  bookButton: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '15px',
    transition: 'all 0.3s',
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
  },
  bookingNote: {
    fontSize: '13px',
    color: '#64748b',
    textAlign: 'center',
  },
  buttonSpinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  smallSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
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

export default BookingPage