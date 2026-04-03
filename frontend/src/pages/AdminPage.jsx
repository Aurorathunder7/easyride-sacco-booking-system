// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiFetch from '../utils/api'

const AdminPage = () => {
  const navigate = useNavigate()
  
  // State Management
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({
    totalOperators: 0,
    totalCustomers: 0,
    totalRoutes: 0,
    totalVehicles: 0,
    todayBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    todayRevenue: 0
  })
  
  // Data Tables
  const [operators, setOperators] = useState([])
  const [routes, setRoutes] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])
  
  // Form States
  const [showOperatorForm, setShowOperatorForm] = useState(false)
  const [showRouteForm, setShowRouteForm] = useState(false)
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formSuccess, setFormSuccess] = useState('')
  const [formError, setFormError] = useState('')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - daysToMonday)
    return monday.toISOString().split('T')[0]
  })
  const [weekEndDate, setWeekEndDate] = useState(() => {
    const monday = new Date(weekStartDate)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return sunday.toISOString().split('T')[0]
  })
  
  // New Operator Form
  const [newOperator, setNewOperator] = useState({
    operatorName: '',
    opEmail: '',
    dob: '',
    gender: '',
    phoneNum: '',
    address: '',
    password: 'default123'
  })
  
  // New Route Form
  const [newRoute, setNewRoute] = useState({
    routeName: '',
    origin: '',
    destination: '',
    distance: '',
    baseFare: '',
    estimatedTime: ''
  })
  
  // New Vehicle Form
  const [newVehicle, setNewVehicle] = useState({
    vehicleNumber: '',
    vehicleType: 'Shuttle',
    capacity: 14,
    operatorID: '',
    routeID: '',
    status: 'active'
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    
    if (!token || !userStr) {
      navigate('/login')
      return
    }
    
    const user = JSON.parse(userStr)
    if (user.role !== 'admin') {
      navigate('/')
      return
    }
    
    setAdmin(user)
    fetchAllData()
  }, [navigate])

  const fetchAllData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Using apiFetch for all admin endpoints
      const [operatorsData, routesData, vehiclesData, bookingsData, paymentsData, statsData] = await Promise.all([
        apiFetch('/admin/operators').catch(() => ({ operators: [] })),
        apiFetch('/admin/routes').catch(() => ({ routes: [] })),
        apiFetch('/admin/vehicles').catch(() => ({ vehicles: [] })),
        apiFetch('/admin/bookings').catch(() => ({ bookings: [] })),
        apiFetch('/admin/payments').catch(() => ({ payments: [] })),
        apiFetch('/admin/stats').catch(() => ({ stats: {} }))
      ])
      
      setOperators(operatorsData.operators || [])
      setRoutes(routesData.routes || [])
      setVehicles(vehiclesData.vehicles || [])
      setBookings(bookingsData.bookings || [])
      setPayments(paymentsData.payments || [])
      setStats(statsData.stats || {})
      
    } catch (error) {
      console.error('Error fetching admin data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message, type = 'success') => {
    setFormSuccess(type === 'success' ? message : '')
    setFormError(type === 'error' ? message : '')
    setTimeout(() => {
      setFormSuccess('')
      setFormError('')
    }, 3000)
  }

  // Report Generation Functions (using direct fetch for HTML responses)
  const handleDailyReport = async () => {
    try {
      const token = localStorage.getItem('token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
      // Keep direct fetch for HTML report endpoints
      const response = await fetch(`${API_BASE_URL}/admin/reports/daily?date=${reportDate}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate report')
      }
      
      const reportHTML = await response.text()
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

  const handleWeeklyReport = async () => {
    try {
      const token = localStorage.getItem('token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${API_BASE_URL}/admin/reports/weekly?startDate=${weekStartDate}&endDate=${weekEndDate}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate weekly report')
      }
      
      const reportHTML = await response.text()
      const reportWindow = window.open('', '_blank')
      if (!reportWindow) {
        alert('Please allow popups to view the report')
        return
      }
      reportWindow.document.write(reportHTML)
      reportWindow.document.close()
      
    } catch (error) {
      console.error('❌ Weekly report error:', error)
      alert(`Failed to generate weekly report: ${error.message}`)
    }
  }

  const handleMonthlyReport = async () => {
    try {
      const token = localStorage.getItem('token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
      const currentDate = new Date()
      const month = currentDate.getMonth() + 1
      const year = currentDate.getFullYear()
      const response = await fetch(`${API_BASE_URL}/admin/reports/monthly?month=${month}&year=${year}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate monthly report')
      }
      
      const reportHTML = await response.text()
      const reportWindow = window.open('', '_blank')
      if (!reportWindow) {
        alert('Please allow popups to view the report')
        return
      }
      reportWindow.document.write(reportHTML)
      reportWindow.document.close()
      
    } catch (error) {
      console.error('❌ Monthly report error:', error)
      alert(`Failed to generate monthly report: ${error.message}`)
    }
  }

  const handleAddOperator = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      await apiFetch('/admin/operators', {
        method: 'POST',
        body: JSON.stringify(newOperator)
      })
      await fetchAllData()
      setNewOperator({
        operatorName: '',
        opEmail: '',
        dob: '',
        gender: '',
        phoneNum: '',
        address: '',
        password: 'default123'
      })
      setShowOperatorForm(false)
      showToast('Operator added successfully! Default password: default123', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddRoute = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      await apiFetch('/admin/routes', {
        method: 'POST',
        body: JSON.stringify(newRoute)
      })
      await fetchAllData()
      setNewRoute({
        routeName: '',
        origin: '',
        destination: '',
        distance: '',
        baseFare: '',
        estimatedTime: ''
      })
      setShowRouteForm(false)
      showToast('Route added successfully!', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddVehicle = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      await apiFetch('/admin/vehicles', {
        method: 'POST',
        body: JSON.stringify(newVehicle)
      })
      await fetchAllData()
      setNewVehicle({
        vehicleNumber: '',
        vehicleType: 'Shuttle',
        capacity: 14,
        operatorID: '',
        routeID: '',
        status: 'active'
      })
      setShowVehicleForm(false)
      showToast('Vehicle added successfully!', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteOperator = async (id) => {
    if (!window.confirm('Are you sure you want to delete this operator?')) return
    
    try {
      await apiFetch(`/admin/operators/${id}`, { method: 'DELETE' })
      await fetchAllData()
      showToast('Operator deleted successfully', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  const handleDeleteRoute = async (id) => {
    if (!window.confirm('Are you sure you want to delete this route?')) return
    
    try {
      await apiFetch(`/admin/routes/${id}`, { method: 'DELETE' })
      await fetchAllData()
      showToast('Route deleted successfully', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return
    
    try {
      await apiFetch(`/admin/vehicles/${id}`, { method: 'DELETE' })
      await fetchAllData()
      showToast('Vehicle deleted successfully', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  const handleToggleVehicleStatus = async (id, currentStatus) => {
    try {
      await apiFetch(`/admin/vehicles/${id}/toggle-status`, { method: 'PATCH' })
      await fetchAllData()
      const newStatus = currentStatus === 'active' ? 'deactivated' : 'activated'
      showToast(`Vehicle ${newStatus} successfully`, 'success')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount || 0)
  }

  // Stats Cards
  const statsCards = [
    { icon: '👥', label: 'Total Operators', value: stats.totalOperators || operators.length || 0, color: '#f59e0b', bg: '#fed7aa' },
    { icon: '👤', label: 'Total Customers', value: stats.totalCustomers || 0, color: '#10b981', bg: '#d1fae5' },
    { icon: '🚌', label: 'Active Vehicles', value: stats.activeVehicles || stats.totalVehicles || vehicles.length || 0, color: '#8b5cf6', bg: '#f3e8ff' },
    { icon: '🛣️', label: 'Total Routes', value: stats.totalRoutes || routes.length || 0, color: '#f59e0b', bg: '#fed7aa' },
    { icon: '📅', label: "Today's Bookings", value: stats.todayBookings || 0, color: '#ec489a', bg: '#fce7f3' },
    { icon: '⏳', label: 'Pending Bookings', value: stats.pendingBookings || 0, color: '#f97316', bg: '#ffedd5' },
    { icon: '💰', label: 'Total Revenue', value: formatCurrency(stats.totalRevenue || 0), color: '#10b981', bg: '#d1fae5' },
    { icon: '💵', label: "Today's Revenue", value: formatCurrency(stats.todayRevenue || 0), color: '#3b82f6', bg: '#dbeafe' },
  ]

  // Tabs
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'operators', label: 'Operators', icon: '👥' },
    { id: 'routes', label: 'Routes', icon: '🛣️' },
    { id: 'vehicles', label: 'Vehicles', icon: '🚌' },
    { id: 'bookings', label: 'Bookings', icon: '📋' },
    { id: 'payments', label: 'Payments', icon: '💰' },
  ]

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>❌</div>
          <h2 style={styles.errorTitle}>Error Loading Dashboard</h2>
          <p style={styles.errorMessage}>{error}</p>
          <button onClick={fetchAllData} style={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Toast Notifications */}
      {formSuccess && (
        <div style={styles.toastSuccess}>
          {formSuccess}
        </div>
      )}
      {formError && (
        <div style={styles.toastError}>
          {formError}
        </div>
      )}

      <div style={styles.contentWrapper}>
        {/* Header */}
        <div style={styles.headerCard}>
          <div>
            <div style={styles.headerIcon}>🏢</div>
            <h1 style={styles.title}>EasyRide SACCO</h1>
            <p style={styles.subtitle}>Admin Control Panel</p>
            <p style={styles.welcomeText}>
              Welcome back, <span style={styles.adminName}>{admin?.adminName || admin?.name || 'Administrator'}</span>
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              navigate('/login')
            }}
            style={styles.logoutButton}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          {statsCards.map((stat, idx) => (
            <div key={idx} style={styles.statCard}>
              <div style={{...styles.statIcon, backgroundColor: stat.bg}}>
                <span style={styles.statIconText}>{stat.icon}</span>
              </div>
              <div>
                <p style={styles.statLabel}>{stat.label}</p>
                <p style={{...styles.statValue, color: stat.color}}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setActiveTab(tab.id)
              }}
              style={{
                ...styles.tabButton,
                background: activeTab === tab.id ? '#f59e0b' : 'white',
                color: activeTab === tab.id ? 'white' : '#78350f',
                borderColor: activeTab === tab.id ? '#f59e0b' : '#fed7aa'
              }}
              type="button"
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div style={styles.dashboardContent}>
            <div style={styles.welcomeBanner}>
              <h2 style={styles.bannerTitle}>📊 Dashboard Overview</h2>
              <p style={styles.bannerText}>Monitor and manage all system activities from one central location.</p>
            </div>
            
            <div style={styles.quickActionsGrid}>
              <button 
                style={styles.quickActionCard} 
                onClick={(e) => {
                  e.preventDefault()
                  setActiveTab('operators')
                }}
              >
                <div style={styles.quickActionIcon}>👥</div>
                <h3 style={styles.quickActionTitle}>Manage Operators</h3>
                <p style={styles.quickActionDesc}>Add, edit, or remove staff</p>
              </button>
              
              <button 
                style={styles.quickActionCard} 
                onClick={(e) => {
                  e.preventDefault()
                  setActiveTab('routes')
                }}
              >
                <div style={styles.quickActionIcon}>🛣️</div>
                <h3 style={styles.quickActionTitle}>Manage Routes</h3>
                <p style={styles.quickActionDesc}>Add or update travel routes</p>
              </button>
              
              <button 
                style={styles.quickActionCard} 
                onClick={(e) => {
                  e.preventDefault()
                  setActiveTab('vehicles')
                }}
              >
                <div style={styles.quickActionIcon}>🚌</div>
                <h3 style={styles.quickActionTitle}>Manage Vehicles</h3>
                <p style={styles.quickActionDesc}>Add or update fleet vehicles</p>
              </button>
              
              <button 
                style={styles.quickActionCard} 
                onClick={(e) => {
                  e.preventDefault()
                  setActiveTab('reports')
                }}
              >
                <div style={styles.quickActionIcon}>📈</div>
                <h3 style={styles.quickActionTitle}>Generate Reports</h3>
                <p style={styles.quickActionDesc}>View daily/weekly reports</p>
              </button>
            </div>

            <div style={styles.recentGrid}>
              <div style={styles.recentCard}>
                <h3 style={styles.recentTitle}>📋 Recent Bookings</h3>
                {bookings.slice(0, 5).length === 0 ? (
                  <div style={styles.recentEmpty}>No recent bookings</div>
                ) : (
                  bookings.slice(0, 5).map(booking => (
                    <div key={booking.bookingID} style={styles.recentItem}>
                      <span>ER{booking.bookingID} - {booking.customerName}</span>
                      <span style={{...styles.statusBadge, ...getStatusStyle(booking.status)}}>
                        {booking.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
              
              <div style={styles.recentCard}>
                <h3 style={styles.recentTitle}>💰 Recent Payments</h3>
                {payments.slice(0, 5).length === 0 ? (
                  <div style={styles.recentEmpty}>No recent payments</div>
                ) : (
                  payments.slice(0, 5).map(payment => (
                    <div key={payment.paymentID} style={styles.recentItem}>
                      <span>{payment.customerName}</span>
                      <span style={styles.recentAmount}>{formatCurrency(payment.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div style={styles.tabContent}>
            <div style={styles.tabHeader}>
              <h2 style={styles.tabTitle}>📈 Report Generation</h2>
              <p style={styles.tabSubtitle}>Generate and download system reports</p>
            </div>

            {/* Daily Report Card */}
            <div style={styles.reportCard}>
              <div style={styles.reportHeader}>
                <div style={styles.reportIcon}>📅</div>
                <div>
                  <h3 style={styles.reportTitle}>Daily Report</h3>
                  <p style={styles.reportDesc}>Generate a detailed report for a specific date</p>
                </div>
              </div>
              <div style={styles.reportForm}>
                <div style={styles.reportInputGroup}>
                  <label style={styles.reportLabel}>Select Date</label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    style={styles.reportInput}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <button onClick={handleDailyReport} style={styles.reportButton}>
                  <span>📊</span>
                  Generate Daily Report
                </button>
              </div>
            </div>

            {/* Weekly Report Card */}
            <div style={styles.reportCard}>
              <div style={styles.reportHeader}>
                <div style={styles.reportIcon}>📆</div>
                <div>
                  <h3 style={styles.reportTitle}>Weekly Report</h3>
                  <p style={styles.reportDesc}>Generate a detailed report for a week period</p>
                </div>
              </div>
              <div style={styles.reportForm}>
                <div style={styles.reportDateRange}>
                  <div style={styles.reportInputGroup}>
                    <label style={styles.reportLabel}>Start Date</label>
                    <input
                      type="date"
                      value={weekStartDate}
                      onChange={(e) => {
                        setWeekStartDate(e.target.value)
                        const start = new Date(e.target.value)
                        const end = new Date(start)
                        end.setDate(start.getDate() + 6)
                        setWeekEndDate(end.toISOString().split('T')[0])
                      }}
                      style={styles.reportInput}
                    />
                  </div>
                  <span style={styles.dateSeparator}>to</span>
                  <div style={styles.reportInputGroup}>
                    <label style={styles.reportLabel}>End Date</label>
                    <input
                      type="date"
                      value={weekEndDate}
                      onChange={(e) => setWeekEndDate(e.target.value)}
                      style={styles.reportInput}
                    />
                  </div>
                </div>
                <button onClick={handleWeeklyReport} style={styles.reportButton}>
                  <span>📊</span>
                  Generate Weekly Report
                </button>
              </div>
            </div>

            {/* Monthly Report Card */}
            <div style={styles.reportCard}>
              <div style={styles.reportHeader}>
                <div style={styles.reportIcon}>📅</div>
                <div>
                  <h3 style={styles.reportTitle}>Monthly Report</h3>
                  <p style={styles.reportDesc}>Generate a detailed report for the current month</p>
                </div>
              </div>
              <div style={styles.reportForm}>
                <button onClick={handleMonthlyReport} style={styles.reportButton}>
                  <span>📊</span>
                  Generate Monthly Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Operators Tab */}
        {activeTab === 'operators' && (
          <div style={styles.tabContent}>
            <div style={styles.tabHeader}>
              <h2 style={styles.tabTitle}>👥 Operator Management</h2>
              <button
                onClick={() => setShowOperatorForm(!showOperatorForm)}
                style={styles.addButton}
              >
                <span>{showOperatorForm ? '✕' : '+'}</span>
                {showOperatorForm ? 'Cancel' : 'Add Operator'}
              </button>
            </div>

            {showOperatorForm && (
              <div style={styles.formCard}>
                <h3 style={styles.formTitle}>Add New Operator</h3>
                <form onSubmit={handleAddOperator}>
                  <div style={styles.formGrid}>
                    <div>
                      <label style={styles.label}>Full Name *</label>
                      <input
                        type="text"
                        value={newOperator.operatorName}
                        onChange={(e) => setNewOperator({...newOperator, operatorName: e.target.value})}
                        required
                        style={styles.input}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Email *</label>
                      <input
                        type="email"
                        value={newOperator.opEmail}
                        onChange={(e) => setNewOperator({...newOperator, opEmail: e.target.value})}
                        required
                        style={styles.input}
                        placeholder="operator@easyride.com"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Phone *</label>
                      <input
                        type="tel"
                        value={newOperator.phoneNum}
                        onChange={(e) => setNewOperator({...newOperator, phoneNum: e.target.value})}
                        required
                        style={styles.input}
                        placeholder="0712345678"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Date of Birth *</label>
                      <input
                        type="date"
                        value={newOperator.dob}
                        onChange={(e) => setNewOperator({...newOperator, dob: e.target.value})}
                        required
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Gender *</label>
                      <select
                        value={newOperator.gender}
                        onChange={(e) => setNewOperator({...newOperator, gender: e.target.value})}
                        required
                        style={styles.select}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Address *</label>
                      <input
                        type="text"
                        value={newOperator.address}
                        onChange={(e) => setNewOperator({...newOperator, address: e.target.value})}
                        required
                        style={styles.input}
                        placeholder="Nairobi, Kenya"
                      />
                    </div>
                  </div>
                  <div style={styles.formActions}>
                    <button type="submit" disabled={submitting} style={styles.submitButton}>
                      {submitting ? 'Adding...' : 'Add Operator'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div style={styles.tableCard}>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Phone</th>
                      <th style={styles.th}>Gender</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operators.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={styles.tableEmpty}>No operators found. Click "Add Operator" to get started.</td>
                      </tr>
                    ) : (
                      operators.map((op) => (
                        <tr key={op.opID} style={styles.tableRow}>
                          <td style={styles.td}>{op.opID}</td>
                          <td style={styles.tdName}>{op.operatorName}</td>
                          <td style={styles.td}>{op.opEmail}</td>
                          <td style={styles.td}>{op.phoneNum}</td>
                          <td style={styles.td}>{op.gender}</td>
                          <td style={styles.td}>
                            <button
                              onClick={() => handleDeleteOperator(op.opID)}
                              style={styles.deleteButton}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Routes Tab */}
        {activeTab === 'routes' && (
          <div style={styles.tabContent}>
            <div style={styles.tabHeader}>
              <h2 style={styles.tabTitle}>🛣️ Route Management</h2>
              <button
                onClick={() => setShowRouteForm(!showRouteForm)}
                style={styles.addButton}
              >
                <span>{showRouteForm ? '✕' : '+'}</span>
                {showRouteForm ? 'Cancel' : 'Add Route'}
              </button>
            </div>

            {showRouteForm && (
              <div style={styles.formCard}>
                <h3 style={styles.formTitle}>Add New Route</h3>
                <form onSubmit={handleAddRoute}>
                  <div style={styles.formGrid}>
                    <div>
                      <label style={styles.label}>Route Name *</label>
                      <input
                        type="text"
                        value={newRoute.routeName}
                        onChange={(e) => setNewRoute({...newRoute, routeName: e.target.value})}
                        required
                        style={styles.input}
                        placeholder="Nairobi-Mombasa Express"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Origin *</label>
                      <input
                        type="text"
                        value={newRoute.origin}
                        onChange={(e) => setNewRoute({...newRoute, origin: e.target.value})}
                        required
                        style={styles.input}
                        placeholder="Nairobi"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Destination *</label>
                      <input
                        type="text"
                        value={newRoute.destination}
                        onChange={(e) => setNewRoute({...newRoute, destination: e.target.value})}
                        required
                        style={styles.input}
                        placeholder="Mombasa"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Distance (km)</label>
                      <input
                        type="number"
                        value={newRoute.distance}
                        onChange={(e) => setNewRoute({...newRoute, distance: e.target.value})}
                        style={styles.input}
                        placeholder="480"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Base Fare (KSh) *</label>
                      <input
                        type="number"
                        value={newRoute.baseFare}
                        onChange={(e) => setNewRoute({...newRoute, baseFare: e.target.value})}
                        required
                        style={styles.input}
                        placeholder="1500"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Estimated Time</label>
                      <input
                        type="text"
                        value={newRoute.estimatedTime}
                        onChange={(e) => setNewRoute({...newRoute, estimatedTime: e.target.value})}
                        style={styles.input}
                        placeholder="8 hours"
                      />
                    </div>
                  </div>
                  <div style={styles.formActions}>
                    <button type="submit" disabled={submitting} style={styles.submitButton}>
                      {submitting ? 'Adding...' : 'Add Route'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div style={styles.tableCard}>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>Route Name</th>
                      <th style={styles.th}>Origin</th>
                      <th style={styles.th}>Destination</th>
                      <th style={styles.th}>Distance</th>
                      <th style={styles.th}>Fare</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={styles.tableEmpty}>No routes found. Click "Add Route" to get started.</td>
                      </tr>
                    ) : (
                      routes.map((route) => (
                        <tr key={route.routeID} style={styles.tableRow}>
                          <td style={styles.td}>{route.routeID}</td>
                          <td style={styles.tdName}>{route.routeName}</td>
                          <td style={styles.td}>{route.origin}</td>
                          <td style={styles.td}>{route.destination}</td>
                          <td style={styles.td}>{route.distance ? `${route.distance} km` : 'N/A'}</td>
                          <td style={styles.tdAmount}>{formatCurrency(route.baseFare)}</td>
                          <td style={styles.td}>
                            <button
                              onClick={() => handleDeleteRoute(route.routeID)}
                              style={styles.deleteButton}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div style={styles.tabContent}>
            <div style={styles.tabHeader}>
              <h2 style={styles.tabTitle}>🚌 Vehicle Management</h2>
              <button
                onClick={() => setShowVehicleForm(!showVehicleForm)}
                style={styles.addButton}
              >
                <span>{showVehicleForm ? '✕' : '+'}</span>
                {showVehicleForm ? 'Cancel' : 'Add Vehicle'}
              </button>
            </div>

            {showVehicleForm && (
              <div style={styles.formCard}>
                <h3 style={styles.formTitle}>Add New Vehicle</h3>
                <form onSubmit={handleAddVehicle}>
                  <div style={styles.formGrid}>
                    <div>
                      <label style={styles.label}>Vehicle Number *</label>
                      <input
                        type="text"
                        value={newVehicle.vehicleNumber}
                        onChange={(e) => setNewVehicle({...newVehicle, vehicleNumber: e.target.value})}
                        required
                        style={styles.input}
                        placeholder="KCA 123A"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Vehicle Type *</label>
                      <select
                        value={newVehicle.vehicleType}
                        onChange={(e) => setNewVehicle({...newVehicle, vehicleType: e.target.value})}
                        required
                        style={styles.select}
                      >
                        <option value="Shuttle">Shuttle (14 seater)</option>
                        <option value="Minibus">Minibus (25 seater)</option>
                        <option value="Bus">Bus (50+ seater)</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Capacity *</label>
                      <input
                        type="number"
                        value={newVehicle.capacity}
                        onChange={(e) => setNewVehicle({...newVehicle, capacity: parseInt(e.target.value)})}
                        required
                        style={styles.input}
                        placeholder="14"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Assign Operator</label>
                      <select
                        value={newVehicle.operatorID}
                        onChange={(e) => setNewVehicle({...newVehicle, operatorID: e.target.value})}
                        style={styles.select}
                      >
                        <option value="">Select Operator</option>
                        {operators.map(op => (
                          <option key={op.opID} value={op.opID}>{op.operatorName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Assign Route</label>
                      <select
                        value={newVehicle.routeID}
                        onChange={(e) => setNewVehicle({...newVehicle, routeID: e.target.value})}
                        style={styles.select}
                      >
                        <option value="">Select Route</option>
                        {routes.map(route => (
                          <option key={route.routeID} value={route.routeID}>
                            {route.origin} → {route.destination}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={styles.formActions}>
                    <button type="submit" disabled={submitting} style={styles.submitButton}>
                      {submitting ? 'Adding...' : 'Add Vehicle'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div style={styles.tableCard}>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>Vehicle #</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Capacity</th>
                      <th style={styles.th}>Operator</th>
                      <th style={styles.th}>Route</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={styles.tableEmpty}>No vehicles found. Click "Add Vehicle" to get started.</td>
                      </tr>
                    ) : (
                      vehicles.map((vehicle) => (
                        <tr key={vehicle.vehicleID} style={styles.tableRow}>
                          <td style={styles.td}>{vehicle.vehicleID}</td>
                          <td style={styles.tdName}>{vehicle.vehicleNumber}</td>
                          <td style={styles.td}>{vehicle.vehicleType}</td>
                          <td style={styles.td}>{vehicle.capacity}</td>
                          <td style={styles.td}>{vehicle.operatorName || 'Unassigned'}</td>
                          <td style={styles.td}>{vehicle.routeName || 'Unassigned'}</td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.statusBadge,
                              background: vehicle.status === 'active' ? '#d1fae5' : '#f3f4f6',
                              color: vehicle.status === 'active' ? '#065f46' : '#4b5563'
                            }}>
                              {vehicle.status || 'active'}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.actionButtons}>
                              <button
                                onClick={() => handleToggleVehicleStatus(vehicle.vehicleID, vehicle.status)}
                                style={{
                                  ...styles.toggleButton,
                                  background: vehicle.status === 'active' ? '#fed7aa' : '#d1fae5',
                                  color: vehicle.status === 'active' ? '#92400e' : '#065f46'
                                }}
                              >
                                {vehicle.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDeleteVehicle(vehicle.vehicleID)}
                                style={styles.deleteButtonSmall}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div style={styles.tabContent}>
            <div style={styles.tabHeader}>
              <h2 style={styles.tabTitle}>📋 Booking Management</h2>
              <p style={styles.tabSubtitle}>View and manage all customer bookings</p>
            </div>

            {bookings.length === 0 ? (
              <div style={styles.emptyState}>
                No bookings found
              </div>
            ) : (
              <div style={styles.tableCard}>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Booking ID</th>
                        <th style={styles.th}>Customer Name</th>
                        <th style={styles.th}>Phone Number</th>
                        <th style={styles.th}>Route</th>
                        <th style={styles.th}>Seat</th>
                        <th style={styles.th}>Vehicle</th>
                        <th style={styles.th}>Travel Date</th>
                        <th style={styles.th}>Booking Date</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <tr key={booking.bookingID} style={styles.tableRow}>
                          <td style={styles.td}>ER{booking.bookingID}</td>
                          <td style={styles.tdName}>{booking.customerName}</td>
                          <td style={styles.td}>{booking.phoneNumber}</td>
                          <td style={styles.td}>{booking.route}</td>
                          <td style={styles.td}>{booking.seatNumber}</td>
                          <td style={styles.td}>{booking.vehicleNumber}</td>
                          <td style={styles.td}>{booking.travelDate ? new Date(booking.travelDate).toLocaleString() : 'N/A'}</td>
                          <td style={styles.td}>{booking.bookingDate ? new Date(booking.bookingDate).toLocaleString() : 'N/A'}</td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.statusBadge,
                              background: booking.status === 'confirmed' ? '#d1fae5' : 
                                          booking.status === 'pending' ? '#fed7aa' : 
                                          booking.status === 'cancelled' ? '#fee2e2' : '#f3f4f6',
                              color: booking.status === 'confirmed' ? '#065f46' : 
                                     booking.status === 'pending' ? '#92400e' : 
                                     booking.status === 'cancelled' ? '#991b1b' : '#4b5563'
                            }}>
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div style={styles.tabContent}>
            <div style={styles.tabHeader}>
              <h2 style={styles.tabTitle}>💰 Payment Management</h2>
              <p style={styles.tabSubtitle}>Track and manage all payments</p>
            </div>

            {payments.length === 0 ? (
              <div style={styles.emptyState}>
                No payments found
              </div>
            ) : (
              <div style={styles.tableCard}>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Payment ID</th>
                        <th style={styles.th}>Customer Name</th>
                        <th style={styles.th}>Amount</th>
                        <th style={styles.th}>Payment Method</th>
                        <th style={styles.th}>M-Pesa Code</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Payment Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.paymentID} style={styles.tableRow}>
                          <td style={styles.td}>{payment.paymentID}</td>
                          <td style={styles.tdName}>{payment.customerName}</td>
                          <td style={styles.tdAmount}>{formatCurrency(payment.amount)}</td>
                          <td style={styles.td}>{payment.paymentMethod}</td>
                          <td style={styles.td}>{payment.mpesaCode || 'N/A'}</td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.statusBadge,
                              background: payment.status === 'completed' ? '#d1fae5' : 
                                          payment.status === 'pending' ? '#fed7aa' : '#fee2e2',
                              color: payment.status === 'completed' ? '#065f46' : 
                                     payment.status === 'pending' ? '#92400e' : '#991b1b'
                            }}>
                              {payment.status}
                            </span>
                          </td>
                          <td style={styles.td}>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleString() : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function for status styles
const getStatusStyle = (status) => {
  const statusLower = status?.toLowerCase() || ''
  const styles = {
    confirmed: { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #10b981' },
    pending: { backgroundColor: '#fed7aa', color: '#92400e', border: '1px solid #f59e0b' },
    cancelled: { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #ef4444' },
    completed: { backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #6366f1' }
  }
  return styles[statusLower] || { backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #9ca3af' }
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
  toastSuccess: {
    position: 'fixed',
    top: '1rem',
    right: '1rem',
    zIndex: 50,
    background: '#10b981',
    color: 'white',
    padding: '0.75rem 1rem',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },
  toastError: {
    position: 'fixed',
    top: '1rem',
    right: '1rem',
    zIndex: 50,
    background: '#ef4444',
    color: 'white',
    padding: '0.75rem 1rem',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },
  headerCard: {
    background: 'white',
    borderRadius: '1rem',
    padding: '1.5rem',
    marginBottom: '2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },
  headerIcon: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.25rem',
  },
  subtitle: {
    color: '#b45309',
    fontSize: '0.875rem',
  },
  welcomeText: {
    color: '#92400e',
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  },
  adminName: {
    fontWeight: '600',
    color: '#f59e0b',
  },
  logoutButton: {
    background: '#f3f4f6',
    color: '#78350f',
    padding: '0.5rem 1rem',
    borderRadius: '0.75rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
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
  },
  tabsContainer: {
    background: 'white',
    borderRadius: '1rem',
    padding: '0.5rem',
    marginBottom: '2rem',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },
  tabButton: {
    padding: '0.5rem 1rem',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  dashboardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  welcomeBanner: {
    background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
    borderRadius: '1rem',
    padding: '1.5rem',
    border: '1px solid #fed7aa',
  },
  bannerTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#78350f',
    marginBottom: '0.5rem',
  },
  bannerText: {
    color: '#92400e',
  },
  quickActionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  quickActionCard: {
    background: 'white',
    borderRadius: '1rem',
    padding: '1.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '2px solid transparent',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },
  quickActionIcon: {
    fontSize: '2rem',
    marginBottom: '0.75rem',
  },
  quickActionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#78350f',
    marginBottom: '0.25rem',
  },
  quickActionDesc: {
    fontSize: '0.75rem',
    color: '#b45309',
  },
  recentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem',
  },
  recentCard: {
    background: 'white',
    borderRadius: '1rem',
    padding: '1.5rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },
  recentTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#78350f',
    marginBottom: '1rem',
  },
  recentEmpty: {
    textAlign: 'center',
    padding: '2rem',
    color: '#b45309',
  },
  recentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid #fed7aa',
  },
  recentAmount: {
    fontWeight: '600',
    color: '#d97706',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  tabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  tabTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#78350f',
  },
  tabSubtitle: {
    color: '#b45309',
    fontSize: '0.875rem',
  },
  addButton: {
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '0.75rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  formCard: {
    background: 'white',
    borderRadius: '1rem',
    padding: '1.5rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },
  formTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#78350f',
    marginBottom: '1rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#b45309',
    marginBottom: '0.25rem',
  },
  input: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #fed7aa',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    background: '#fffbef',
    color: '#78350f',
  },
  select: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #fed7aa',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    background: '#fffbef',
    color: '#78350f',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    padding: '0.5rem 1.5rem',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  tableCard: {
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
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#b45309',
    textTransform: 'uppercase',
    borderBottom: '1px solid #fed7aa',
  },
  td: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: '#78350f',
    borderBottom: '1px solid #fed7aa',
  },
  tdName: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#78350f',
    borderBottom: '1px solid #fed7aa',
  },
  tdAmount: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#d97706',
    borderBottom: '1px solid #fed7aa',
  },
  tableRow: {
    transition: 'background 0.3s',
  },
  tableEmpty: {
    padding: '2rem',
    textAlign: 'center',
    color: '#b45309',
  },
  deleteButton: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '0.25rem 0.75rem',
    borderRadius: '0.5rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
  },
  deleteButtonSmall: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.5rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
  },
  toggleButton: {
    padding: '0.25rem 0.5rem',
    borderRadius: '0.5rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
  },
  actionButtons: {
    display: 'flex',
    gap: '0.5rem',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '2rem',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  emptyState: {
    background: 'white',
    borderRadius: '1rem',
    padding: '3rem',
    textAlign: 'center',
    color: '#b45309',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },
  // Report Styles
  reportCard: {
    background: 'white',
    borderRadius: '1rem',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
    border: '1px solid #fed7aa',
  },
  reportHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #fed7aa',
  },
  reportIcon: {
    fontSize: '2rem',
  },
  reportTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#78350f',
    marginBottom: '0.25rem',
  },
  reportDesc: {
    fontSize: '0.75rem',
    color: '#b45309',
  },
  reportForm: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  reportInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  reportLabel: {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#b45309',
  },
  reportInput: {
    padding: '0.5rem 0.75rem',
    border: '1px solid #fed7aa',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    background: '#fffbef',
    color: '#78350f',
  },
  reportDateRange: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '0.5rem',
  },
  dateSeparator: {
    color: '#b45309',
    fontSize: '0.875rem',
    marginBottom: '0.5rem',
  },
  reportButton: {
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
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

export default AdminPage