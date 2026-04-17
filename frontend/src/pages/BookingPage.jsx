import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import SeatMap from '../components/SeatMap'
import apiFetch from '../utils/api'  // Import the apiFetch helper

// API Configuration - Keep for fallback, but we'll use apiFetch
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function BookingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // State Management
  const [routes, setRoutes] = useState([])
  const [schedules, setSchedules] = useState([])
  const [seats, setSeats] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [selectedSeats, setSelectedSeats] = useState([])
  const [availableSeats, setAvailableSeats] = useState([])
  
  // Add date picker state - allow today
  const [selectedDate, setSelectedDate] = useState(() => {
    // Allow today as default
    return new Date().toISOString().split('T')[0]
  })
  
  const [passengerDetails, setPassengerDetails] = useState({
    name: '',
    phone: '',
    email: '',
    idNumber: ''
  })
  
  const [processingPayment, setProcessingPayment] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [activeStep, setActiveStep] = useState(1)
  const [bookingReference, setBookingReference] = useState(null)
  const [pollingInterval, setPollingInterval] = useState(null)

  const steps = [
    { number: 1, title: 'Route', icon: '🛣️', color: '#2563eb' },
    { number: 2, title: 'Date & Schedule', icon: '📅', color: '#7c3aed' },
    { number: 3, title: 'Seats', icon: '💺', color: '#059669' },
    { number: 4, title: 'Details', icon: '👤', color: '#ea580c' },
    { number: 5, title: 'Pay', icon: '💰', color: '#4f46e5' }
  ]

  // Helper functions for schedule availability
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

  // Get min date (today) and max date (30 days from now)
  const getMinDate = () => {
    // Allow today
    return new Date().toISOString().split('T')[0]
  }
  
  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)
    return maxDate.toISOString().split('T')[0]
  }

  useEffect(() => {
    fetchInitialData()
    
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

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [])

  useEffect(() => {
    if (selectedRoute && selectedDate) {
      fetchSchedulesForRoute(selectedRoute.routeID, selectedDate)
      setActiveStep(2)
    }
  }, [selectedRoute, selectedDate])

  useEffect(() => {
    if (selectedSchedule) {
      fetchSeatAvailability(selectedSchedule)
      setActiveStep(3)
    }
  }, [selectedSchedule])

  useEffect(() => {
    if (selectedSeats.length > 0) {
      setActiveStep(4)
    }
  }, [selectedSeats])

  useEffect(() => {
    if (passengerDetails.name && passengerDetails.phone && selectedSeats.length > 0) {
      setActiveStep(5)
    }
  }, [passengerDetails, selectedSeats])

  const fetchInitialData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/login')
        return
      }
      
      // Use apiFetch instead of direct fetch
      const data = await apiFetch('/bookings/routes')
      setRoutes(data.routes || [])
      
    } catch (error) {
      console.error('Fetch error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchSchedulesForRoute = async (routeId, date) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/login')
        return
      }
      
      // Use apiFetch instead of direct fetch
      const data = await apiFetch(`/bookings/schedules?routeId=${routeId}&date=${date}`)
      
      // Filter out schedules that have already passed for today
      let availableSchedules = data.schedules || []
      if (date === new Date().toISOString().split('T')[0]) {
        const now = new Date()
        availableSchedules = availableSchedules.filter(schedule => {
          const departureTime = new Date(schedule.departureTime)
          return departureTime > now
        })
        console.log(`⏰ Filtered out past schedules for today. ${availableSchedules.length} remaining`)
      }
      
      setSchedules(availableSchedules)
      
      // Reset selected schedule when new schedules load
      setSelectedSchedule(null)
      
    } catch (error) {
      console.error('Fetch schedules error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchSeatAvailability = async (schedule) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/login')
        return
      }
      
      const travelDate = schedule.departureTime.split('T')[0]
      const url = `/bookings/seats/availability?vehicleId=${schedule.vehicleID}&date=${travelDate}`
      
      // Use apiFetch instead of direct fetch
      const data = await apiFetch(url)
      setAvailableSeats(data.seats || [])
      setSeats(data.seats || [])
      
    } catch (error) {
      console.error('❌ Error fetching seats:', error)
      setError(error.message)
    }
  }

  const startPaymentPolling = (bookingId, bookingRef, totalAmount) => {
    let pollCount = 0
    const maxPolls = 60 // 60 seconds max wait (2 seconds per check = 2 minutes)
    
    console.log(`🔄 Starting payment polling for booking ${bookingId}`);
    
    const interval = setInterval(async () => {
      pollCount++
      console.log(`📊 Polling payment status (${pollCount}/${maxPolls}) for booking ${bookingId}`);
      
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          clearInterval(interval)
          navigate('/login')
          return
        }
        
        // Use apiFetch instead of direct fetch
        const data = await apiFetch(`/bookings/${bookingId}`)
        
        // Check different possible status locations
        const isPaid = data.booking?.paymentStatus === 'paid' || 
                       data.booking?.payment?.status === 'completed' ||
                       data.booking?.paymentStatus === 'completed' ||
                       data.paymentStatus === 'paid' ||
                       data.status === 'confirmed'
        
        console.log(`   Payment status check: isPaid = ${isPaid}`);
        console.log(`   Booking status: ${data.booking?.status || data.status}`);
        console.log(`   Payment status: ${data.booking?.paymentStatus || data.booking?.payment?.status}`);
        
        if (isPaid) {
          clearInterval(interval)
          setPollingInterval(null)
          setPaymentStatus({ 
            type: 'success', 
            message: `✅ Payment confirmed! Booking ${bookingRef} is confirmed.` 
          })
          alert(`✅ Payment Successful!\n\nBooking Reference: ${bookingRef}\nAmount: KSh ${totalAmount}\nSeats: ${selectedSeats.join(', ')}\n\nTicket has been sent to your email.`)
          console.log(`✅ Payment confirmed! Redirecting to My Bookings...`);
          setTimeout(() => {
            navigate('/my-bookings')
          }, 2000)
        } else if (data.booking?.paymentStatus === 'failed' || data.paymentStatus === 'failed') {
          clearInterval(interval)
          setPollingInterval(null)
          setPaymentStatus({ 
            type: 'error', 
            message: `❌ Payment failed. Please try again.` 
          })
        } else if (pollCount >= maxPolls) {
          clearInterval(interval)
          setPollingInterval(null)
          setPaymentStatus({ 
            type: 'info', 
            message: `Payment initiated. You'll receive confirmation via email shortly. Booking Reference: ${bookingRef}` 
          })
          console.log(`⏰ Polling timeout, redirecting anyway...`);
          setTimeout(() => {
            navigate('/my-bookings')
          }, 3000)
        }
      } catch (err) {
        console.error('Error checking payment status:', err)
        if (pollCount >= maxPolls) {
          clearInterval(interval)
          setPollingInterval(null)
          setTimeout(() => {
            navigate('/my-bookings')
          }, 3000)
        }
      }
    }, 2000) // Check every 2 seconds
    
    setPollingInterval(interval)
  }

  const handleBook = async () => {
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

    const phoneRegex = /^[0-9]{10,15}$/
    const cleanPhone = passengerDetails.phone.replace(/[+\s]/g, '')
    if (!phoneRegex.test(cleanPhone)) {
      alert('Please enter a valid phone number (10-15 digits)')
      return
    }

    setProcessingPayment(true)
    setPaymentStatus(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/login')
        return
      }
      
      // Step 1: Create the booking
      const bookingData = {
        routeId: selectedRoute.routeID,
        vehicleId: selectedSchedule.vehicleID,
        scheduleId: selectedSchedule.scheduleID,
        seatNumbers: selectedSeats,
        travelDate: selectedSchedule.departureTime.split('T')[0],
        passengers: selectedSeats.length,
        passengerDetails: {
          name: passengerDetails.name,
          phone: passengerDetails.phone,
          email: passengerDetails.email,
          idNumber: passengerDetails.idNumber
        },
        paymentMethod: 'mpesa'
      }

      // Use apiFetch instead of direct fetch
      const bookingResult = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData)
      })

      const bookingId = bookingResult.booking?.id
      const bookingRef = bookingResult.booking?.reference || `ER${bookingId}`
      const totalAmount = calculateTotal()
      
      setBookingReference(bookingRef)

      console.log(`💰 Booking created: ${bookingRef} (ID: ${bookingId}), Amount: KSh ${totalAmount}`);

      // Step 2: Initiate M-Pesa payment
      const paymentData = {
        phoneNumber: cleanPhone,
        amount: totalAmount,
        bookingId: bookingId,
        accountReference: bookingRef
      }

      // Use apiFetch instead of direct fetch
      const paymentResult = await apiFetch('/mpesa/stkpush', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      })

      // Payment initiated successfully
      console.log(`💰 Payment initiated, CheckoutRequestID: ${paymentResult.checkoutRequestID}`);
      setPaymentStatus({ 
        type: 'success', 
        message: `📱 M-Pesa prompt sent to ${passengerDetails.phone}! Please check your phone and enter your PIN to complete payment.` 
      })

      // Show M-Pesa prompt instructions
      const userConfirmed = window.confirm(
        `📱 M-Pesa Payment Initiated!\n\n` +
        `Please check your phone ending with ${passengerDetails.phone.slice(-4)} for the payment prompt.\n\n` +
        `1. Enter your M-Pesa PIN\n` +
        `2. Confirm the payment of KSh ${totalAmount}\n` +
        `3. You'll receive confirmation via email\n\n` +
        `Booking Reference: ${bookingRef}\n\n` +
        `Click OK to continue waiting for payment confirmation`
      )

      if (userConfirmed) {
        // Start polling for payment status
        startPaymentPolling(bookingId, bookingRef, totalAmount)
      } else {
        setPaymentStatus({ 
          type: 'info', 
          message: `Booking created! Booking Reference: ${bookingRef}. You'll receive payment confirmation via email.` 
        })
        setTimeout(() => {
          navigate('/my-bookings')
        }, 3000)
      }

    } catch (error) {
      console.error('❌ Booking/Payment error:', error)
      setPaymentStatus({ 
        type: 'error', 
        message: error.message || 'Booking failed. Please try again.' 
      })
      alert(`❌ Booking Failed\n\n${error.message}\n\nPlease try again or contact support.`)
    } finally {
      setProcessingPayment(false)
    }
  }

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
    if (!dateString) return ''
    return new Date(dateString).toLocaleString('en-KE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const resetBooking = () => {
    setSelectedRoute(null)
    setSelectedSchedule(null)
    setSelectedSeats([])
    setPassengerDetails({
      name: '',
      phone: '',
      email: '',
      idNumber: ''
    })
    setPaymentStatus(null)
    setBookingReference(null)
    setActiveStep(1)
    // Reset date to today
    setSelectedDate(new Date().toISOString().split('T')[0])
  }

  if (loading && routes.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading your journey options...</p>
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
          <button onClick={() => fetchInitialData()} style={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerIcon}>🚌</div>
        <h1 style={styles.title}>EasyRide Booking</h1>
        <p style={styles.subtitle}>Your journey begins here. Select your route, choose your seats, and travel in comfort</p>
      </div>

      {/* Real M-Pesa Mode Banner */}
      <div style={{
        ...styles.simulationBanner,
        background: '#fef3c7',
        borderColor: '#f59e0b'
      }}>
        <span style={{ fontSize: '1.25rem' }}>💰</span>
        <div>
          <strong style={{ color: '#92400e' }}>REAL M-PESA MODE</strong>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#78350f' }}>
            Real money will be deducted from your M-Pesa account
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <div key={step.number} style={styles.stepWrapper}>
            <div style={styles.stepItem}>
              <div style={{
                ...styles.stepCircle,
                background: activeStep >= step.number ? step.color : '#e2e8f0',
                color: activeStep >= step.number ? 'white' : '#64748b'
              }}>
                <span style={styles.stepIcon}>{step.icon}</span>
              </div>
              <p style={{
                ...styles.stepTitle,
                color: activeStep >= step.number ? '#1f2937' : '#94a3b8'
              }}>{step.title}</p>
            </div>
            {index < steps.length - 1 && (
              <div style={{
                ...styles.stepLine,
                background: activeStep > step.number ? step.color : '#e2e8f0'
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Payment Status */}
      {paymentStatus && (
        <div style={{
          ...styles.paymentStatus,
          background: paymentStatus.type === 'success' ? '#d1fae5' : paymentStatus.type === 'error' ? '#fee2e2' : '#fed7aa',
          color: paymentStatus.type === 'success' ? '#065f46' : paymentStatus.type === 'error' ? '#991b1b' : '#92400e',
          borderColor: paymentStatus.type === 'success' ? '#a7f3d0' : paymentStatus.type === 'error' ? '#fecaca' : '#fed7aa'
        }}>
          <span style={styles.paymentStatusIcon}>
            {paymentStatus.type === 'success' ? '✅' : paymentStatus.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <p style={styles.paymentStatusMessage}>{paymentStatus.message}</p>
          {bookingReference && (
            <span style={styles.bookingRef}>Ref: {bookingReference}</span>
          )}
        </div>
      )}
      
      {/* Reset Button */}
      {selectedRoute && (
        <div style={styles.resetContainer}>
          <button onClick={resetBooking} style={styles.resetButton}>
            🔄 Start New Booking
          </button>
        </div>
      )}
      
      {/* Main Content - Two Column Layout */}
      <div style={styles.mainGrid}>
        {/* Left Column */}
        <div style={styles.leftColumn}>
          {/* Route Selection */}
          <div style={styles.card}>
            <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #3b82f6, #60a5fa)'}}>
              <h2 style={styles.cardTitle}>
                <span style={styles.cardIcon}>🛣️</span>
                Select Your Route
              </h2>
              <p style={styles.cardSubtitle}>Choose from our available routes</p>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.routesGrid}>
                {routes.map(route => (
                  <button
                    key={route.routeID}
                    onClick={() => setSelectedRoute(route)}
                    style={{
                      ...styles.routeButton,
                      background: selectedRoute?.routeID === route.routeID 
                        ? '#eff6ff'
                        : 'white',
                      borderColor: selectedRoute?.routeID === route.routeID ? '#3b82f6' : '#e2e8f0'
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
                        {selectedRoute?.routeID === route.routeID ? 'Selected' : 'Select Route'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date Selection & Schedule */}
          {selectedRoute && (
            <div style={styles.card}>
              <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)'}}>
                <h2 style={styles.cardTitle}>
                  <span style={styles.cardIcon}>📅</span>
                  Select Travel Date & Schedule
                </h2>
                <p style={styles.cardSubtitle}>Choose your travel date and departure time</p>
              </div>
              <div style={styles.cardBody}>
                {/* Date Picker */}
                <div style={styles.datePickerContainer}>
                  <label style={styles.dateLabel}>Travel Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={getMinDate()}
                    max={getMaxDate()}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={styles.dateInput}
                  />
                  <p style={styles.dateHelper}>
                    {selectedDate === new Date().toISOString().split('T')[0] 
                      ? "⚠️ Today's bookings: Only available for future departure times" 
                      : "📅 Book up to 30 days in advance | 🚌 Schedules available from 6:00 AM to 8:00 PM"}
                  </p>
                </div>

                {/* Schedule List */}
                {loading ? (
                  <div style={styles.scheduleLoading}>
                    <div style={styles.spinnerSmall}></div>
                    <span>Loading schedules...</span>
                  </div>
                ) : schedules.length === 0 ? (
                  <div style={styles.noSchedules}>
                    <span>🚫</span>
                    <p>No schedules available for this date</p>
                    <p style={styles.noSchedulesHint}>Try selecting a different date</p>
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
                            }
                          }}
                          disabled={!isAvailable}
                          style={{
                            ...styles.scheduleButton,
                            background: selectedSchedule?.scheduleID === schedule.scheduleID 
                              ? '#faf5ff'
                              : 'white',
                            borderColor: selectedSchedule?.scheduleID === schedule.scheduleID ? '#8b5cf6' : '#e2e8f0',
                            opacity: !isAvailable ? 0.6 : 1,
                            cursor: !isAvailable ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <div style={styles.scheduleHeader}>
                            <div>
                              <div style={styles.scheduleTime}>
                                <span style={styles.timeLarge}>{formatTime(schedule.departureTime)}</span>
                                <span style={styles.timeArrow}>→</span>
                                <span style={styles.timeSmall}>{formatTime(schedule.arrivalTime)}</span>
                              </div>
                              <p style={styles.scheduleDate}>{formatDateTime(schedule.departureTime)}</p>
                            </div>
                            <div style={styles.schedulePrice}>
                              <span style={styles.priceAmount}>KSh {schedule.price}</span>
                              <span style={{...styles.availableSeats, color: status.color, display: 'block', fontSize: '0.7rem'}}>{status.text}</span>
                              {selectedSchedule?.scheduleID === schedule.scheduleID ? (
                                <span style={styles.selectedScheduleBadge}>Selected</span>
                              ) : (
                                <span style={styles.selectButton}>Select</span>
                              )}
                            </div>
                          </div>
                          <div style={styles.scheduleFooter}>
                            <span>🚌 {schedule.vehicleType || 'Vehicle'} {schedule.vehicleNumber || ''}</span>
                            <span style={styles.availableSeats}>✓ {schedule.availableSeats || 0} seats available</span>
                          </div>
                          {!isAvailable && (
                            <div style={{marginTop: '0.5rem', fontSize: '0.7rem', color: '#ef4444', textAlign: 'right'}}>
                              ⏰ Departure time has passed
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Seat Selection - FIXED: Using bookedSeatsList from schedule */}
          {selectedSchedule && (
            <div style={styles.card}>
              <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #10b981, #34d399)'}}>
                <h2 style={styles.cardTitle}>
                  <span style={styles.cardIcon}>💺</span>
                  Select Seats
                </h2>
                <p style={styles.cardSubtitle}>Choose your preferred seats</p>
              </div>
              <div style={styles.cardBody}>
                <SeatMap
                  capacity={selectedSchedule.capacity || 14}
                  // FIXED: Use bookedSeatsList from schedule instead of filtering availableSeats
                  bookedSeats={selectedSchedule.bookedSeatsList || selectedSchedule.bookedSeats || []}
                  selectedSeats={selectedSeats}
                  onSeatSelect={setSelectedSeats}
                  maxSelectable={5}
                  seatLayout={seats}
                />
                <div style={styles.seatLegend}>
                  <span style={styles.legendItem}><span style={{...styles.legendColor, background: '#e2e8f0'}}></span> Available</span>
                  <span style={styles.legendItem}><span style={{...styles.legendColor, background: '#10b981'}}></span> Selected</span>
                  <span style={styles.legendItem}><span style={{...styles.legendColor, background: '#ef4444'}}></span> Booked</span>
                  {selectedSeats.length > 0 && (
                    <button onClick={() => setSelectedSeats([])} style={styles.clearSeatsButton}>
                      Clear all ({selectedSeats.length})
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Passenger Details */}
          {selectedSchedule && selectedSeats.length > 0 && (
            <div style={styles.card}>
              <div style={{...styles.cardHeader, background: 'linear-gradient(135deg, #f97316, #fb923c)'}}>
                <h2 style={styles.cardTitle}>
                  <span style={styles.cardIcon}>👤</span>
                  Passenger Details
                </h2>
                <p style={styles.cardSubtitle}>Enter your information</p>
              </div>
              <div style={styles.cardBody}>
                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={passengerDetails.name}
                      onChange={handlePassengerChange}
                      placeholder="John Doe"
                      style={styles.input}
                      disabled={processingPayment}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={passengerDetails.phone}
                      onChange={handlePassengerChange}
                      placeholder="0712345678"
                      style={styles.input}
                      disabled={processingPayment}
                    />
                    <p style={styles.helperText}>For M-Pesa payment and ticket</p>
                  </div>
                  <div>
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
                  <div>
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
                <p style={styles.formNote}>* Required fields. M-Pesa payment will be sent to provided phone number.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Booking Summary */}
        {(selectedSchedule || selectedSeats.length > 0) && (
          <div style={styles.rightColumn}>
            <div style={styles.summaryCard}>
              <div style={{...styles.summaryHeader, background: 'linear-gradient(135deg, #4f46e5, #818cf8)'}}>
                <h2 style={styles.summaryTitle}>
                  <span style={styles.summaryIcon}>📋</span>
                  Booking Summary
                </h2>
              </div>
              <div style={styles.summaryBody}>
                {selectedSchedule && (
                  <>
                    <div style={styles.summaryRow}>
                      <span style={styles.summaryLabel}>Travel Date:</span>
                      <span style={styles.summaryValue}>
                        {new Date(selectedDate).toLocaleDateString('en-KE', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
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
                        <span style={{...styles.summaryValue, color: '#059669', fontWeight: 'bold'}}>
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
                    <div style={styles.totalRow}>
                      <span style={styles.totalLabel}>Total Amount:</span>
                      <span style={styles.totalAmount}>KSh {calculateTotal()}</span>
                    </div>
                  </>
                )}
                
                <button
                  onClick={handleBook}
                  disabled={processingPayment || selectedSeats.length === 0 || !passengerDetails.name || !passengerDetails.phone}
                  style={{
                    ...styles.payButton,
                    background: (selectedSeats.length === 0 || !passengerDetails.name || !passengerDetails.phone || processingPayment)
                      ? '#cbd5e1'
                      : 'linear-gradient(135deg, #059669, #10b981)',
                    cursor: (selectedSeats.length === 0 || !passengerDetails.name || !passengerDetails.phone || processingPayment)
                      ? 'not-allowed'
                      : 'pointer'
                  }}
                >
                  {processingPayment ? (
                    <span>
                      <span style={styles.spinnerSmall}></span>
                      Processing...
                    </span>
                  ) : selectedSeats.length === 0 ? (
                    'Select Seats First'
                  ) : !passengerDetails.name || !passengerDetails.phone ? (
                    'Complete Passenger Details'
                  ) : (
                    `💰 Pay KSh ${calculateTotal()} via M-Pesa`
                  )}
                </button>
                
                <p style={styles.paymentNote}>
                  Secure payment via M-Pesa. You'll receive a prompt on your phone to complete payment.
                </p>
                
                {bookingReference && (
                  <div style={styles.bookingInfo}>
                    <p style={styles.bookingRefText}>Booking Reference: <strong>{bookingReference}</strong></p>
                    <p style={styles.bookingNote}>Payment confirmation will be sent via email</p>
                  </div>
                )}
              </div>
            </div>
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
  simulationBanner: {
    maxWidth: '1280px',
    margin: '0 auto 1rem',
    padding: '1rem',
    borderRadius: '0.75rem',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  datePickerContainer: {
    marginBottom: '1.5rem',
    padding: '1rem',
    background: '#fffbef',
    borderRadius: '0.75rem',
    border: '1px solid #fed7aa',
  },
  dateLabel: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#78350f',
    marginBottom: '0.5rem',
  },
  dateInput: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #fed7aa',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s',
    background: 'white',
    color: '#78350f',
  },
  dateHelper: {
    fontSize: '0.7rem',
    color: '#b45309',
    marginTop: '0.5rem',
    textAlign: 'center',
  },
  scheduleLoading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '2rem',
    color: '#92400e',
  },
  noSchedules: {
    textAlign: 'center',
    padding: '2rem',
    color: '#92400e',
  },
  noSchedulesHint: {
    fontSize: '0.75rem',
    marginTop: '0.5rem',
    color: '#b45309',
  },
  schedulesList: {
    maxHeight: '400px',
    overflowY: 'auto',
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
  spinnerSmall: {
    display: 'inline-block',
    width: '1rem',
    height: '1rem',
    border: '2px solid #fbbf24',
    borderTopColor: '#f59e0b',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
    marginRight: '0.5rem',
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
    marginBottom: '3rem',
  },
  headerIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
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
    maxWidth: '42rem',
    margin: '0 auto',
  },
  stepsContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '3rem',
    maxWidth: '48rem',
    marginLeft: 'auto',
    marginRight: 'auto',
    flexWrap: 'wrap',
  },
  stepWrapper: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    minWidth: '80px',
  },
  stepItem: {
    textAlign: 'center',
    flex: 1,
  },
  stepCircle: {
    width: '3rem',
    height: '3rem',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    transition: 'all 0.3s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  stepIcon: {
    fontSize: '1.25rem',
  },
  stepTitle: {
    fontSize: '0.75rem',
    marginTop: '0.5rem',
    fontWeight: '600',
  },
  stepLine: {
    height: '2px',
    flex: 1,
    margin: '0 0.5rem',
    transition: 'all 0.3s',
  },
  resetContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '1rem',
    maxWidth: '1280px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  resetButton: {
    background: 'white',
    border: '1px solid #fed7aa',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    color: '#d97706',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.3s',
  },
  paymentStatus: {
    marginBottom: '1.5rem',
    padding: '1rem',
    borderRadius: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    border: '1px solid',
    maxWidth: '1280px',
    marginLeft: 'auto',
    marginRight: 'auto',
    flexWrap: 'wrap',
  },
  paymentStatusIcon: {
    fontSize: '1.25rem',
  },
  paymentStatusMessage: {
    fontSize: '0.875rem',
    margin: 0,
    flex: 1,
  },
  bookingRef: {
    fontSize: '0.75rem',
    fontWeight: 'bold',
    background: 'rgba(0,0,0,0.1)',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.375rem',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '2rem',
    maxWidth: '1280px',
    margin: '0 auto',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
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
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  },
  cardIcon: {
    fontSize: '1.5rem',
  },
  cardSubtitle: {
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.9)',
  },
  cardBody: {
    padding: '1.5rem',
  },
  routesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  },
  routeButton: {
    padding: '1rem',
    borderRadius: '0.75rem',
    border: '2px solid',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.3s',
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
    background: '#059669',
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
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#d97706',
  },
  selectText: {
    fontSize: '0.75rem',
    color: '#f59e0b',
    fontWeight: '500',
  },
  selectedText: {
    fontSize: '0.75rem',
    color: '#059669',
    fontWeight: '500',
  },
  scheduleButton: {
    padding: '1rem',
    borderRadius: '0.75rem',
    border: '2px solid',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.3s',
    marginBottom: '1rem',
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
  },
  timeLarge: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: '#78350f',
  },
  timeArrow: {
    color: '#d97706',
  },
  timeSmall: {
    fontSize: '1rem',
    color: '#92400e',
  },
  scheduleDate: {
    fontSize: '0.75rem',
    color: '#b45309',
  },
  schedulePrice: {
    textAlign: 'right',
  },
  priceAmount: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: '#d97706',
    display: 'block',
    marginBottom: '0.25rem',
  },
  selectedScheduleBadge: {
    fontSize: '0.75rem',
    background: '#059669',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.375rem',
  },
  selectButton: {
    fontSize: '0.75rem',
    background: '#f59e0b',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
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
  availableSeats: {
    color: '#059669',
    fontWeight: '500',
  },
  seatLegend: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1rem',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#92400e',
  },
  legendColor: {
    width: '1rem',
    height: '1rem',
    borderRadius: '0.25rem',
  },
  clearSeatsButton: {
    fontSize: '0.75rem',
    color: '#dc2626',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    marginLeft: 'auto',
    fontWeight: '500',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#78350f',
    marginBottom: '0.5rem',
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
  },
  helperText: {
    fontSize: '0.75rem',
    color: '#b45309',
    marginTop: '0.25rem',
  },
  formNote: {
    fontSize: '0.75rem',
    color: '#b45309',
    marginTop: '1rem',
    fontStyle: 'italic',
  },
  summaryCard: {
    background: 'white',
    borderRadius: '1rem',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: '2rem',
  },
  summaryHeader: {
    padding: '1rem 1.5rem',
  },
  summaryTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  summaryIcon: {
    fontSize: '1.5rem',
  },
  summaryBody: {
    padding: '1.5rem',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
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
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#d97706',
  },
  payButton: {
    width: '100%',
    padding: '1rem',
    borderRadius: '0.75rem',
    border: 'none',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1rem',
    marginTop: '1.5rem',
    transition: 'all 0.3s',
  },
  paymentNote: {
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#b45309',
    marginTop: '1rem',
  },
  bookingInfo: {
    marginTop: '1rem',
    padding: '0.75rem',
    background: '#fffbef',
    borderRadius: '0.5rem',
    textAlign: 'center',
  },
  bookingRefText: {
    fontSize: '0.875rem',
    color: '#78350f',
    marginBottom: '0.25rem',
  },
  bookingNote: {
    fontSize: '0.75rem',
    color: '#b45309',
    margin: 0,
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

export default BookingPage