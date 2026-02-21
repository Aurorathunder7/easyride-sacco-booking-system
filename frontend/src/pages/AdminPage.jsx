// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Helper function for API calls with ngrok header
const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token')
  
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  if (!response.ok) {
    const text = await response.text()
    try {
      // Try to parse as JSON
      const data = JSON.parse(text)
      throw new Error(data.message || 'Request failed')
    } catch {
      // If not JSON, it's probably HTML error
      console.error('Received HTML instead of JSON:', text.substring(0, 200))
      throw new Error('Server returned HTML instead of JSON. Please check your connection.')
    }
  }

  return response.json()
}

const AdminPage = () => {
  const navigate = useNavigate()
  
  // ============================
  // STATE MANAGEMENT
  // ============================
  
  // Authentication & User
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Tab Management
  const [activeTab, setActiveTab] = useState('operators')
  
  // Data Tables
  const [operators, setOperators] = useState([])
  const [routes, setRoutes] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [reports, setReports] = useState({
    daily: null,
    weekly: null,
    monthly: null
  })
  
  // Form States
  const [showOperatorForm, setShowOperatorForm] = useState(false)
  const [showRouteForm, setShowRouteForm] = useState(false)
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  
  // New Operator Form
  const [newOperator, setNewOperator] = useState({
    operatorName: '',
    opEmail: '',
    dob: '',
    gender: '',
    phoneNum: '',
    address: '',
    employeeID: '',
    officeLocation: '',
    shift: 'Morning',
    employmentDate: '',
    emergencyContact: '',
    emergencyName: '',
    canBookTickets: true,
    canIssueRefunds: false,
    canOverridePricing: false,
    canViewReports: false
  })
  
  // New Route Form
  const [newRoute, setNewRoute] = useState({
    routeCode: '',
    origin: '',
    destination: '',
    distance: '',
    basePrice: '',
    estimatedTime: '',
    isActive: true
  })
  
  // New Vehicle Form
  const [newVehicle, setNewVehicle] = useState({
    vehicleNumber: '',
    registrationNumber: '',
    vehicleType: 'Shuttle',
    capacity: 14,
    operatorID: '',
    routeID: '',
    make: '',
    model: '',
    year: '',
    ownerName: '',
    driverName: '',
    driverContact: '',
    driverLicense: '',
    insuranceExpiry: '',
    inspectionExpiry: '',
    features: {
      ac: false,
      wifi: false,
      usb: false
    },
    isActive: true
  })
  
  // Form Submission States
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // ============================
  // EFFECTS
  // ============================
  
  useEffect(() => {
    // Check authentication
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
    
    // 🔍 DEBUG CODE - Check connection
    const debugConnection = async () => {
      console.log('🔍 DEBUG: AdminPage mounted')
      console.log('🔍 API_BASE_URL:', API_BASE_URL)
      console.log('🔍 Token exists:', !!token)
      console.log('🔍 User:', user)
      
      try {
        const testUrl = `${API_BASE_URL}/admin/operators`
        console.log('🔍 Testing URL:', testUrl)
        
        const response = await fetch(testUrl, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}`
          }
        })
        
        console.log('🔍 Response status:', response.status)
        console.log('🔍 Response headers:', response.headers.get('content-type'))
        
        const text = await response.text()
        console.log('🔍 Raw response (first 300 chars):', text.substring(0, 300))
        
        if (text.trim().startsWith('<!DOCTYPE')) {
          console.error('🔍❌ Received HTML instead of JSON!')
        } else {
          try {
            const json = JSON.parse(text)
            console.log('🔍✅ Successfully parsed JSON:', json)
          } catch (e) {
            console.error('🔍❌ Failed to parse JSON:', e.message)
          }
        }
      } catch (error) {
        console.error('🔍❌ Debug fetch error:', error)
      }
    }
    
    debugConnection()
    fetchAllData()
  }, [navigate])

  // ============================
  // API FUNCTIONS
  // ============================
  
  /**
   * Fetch all admin data
   */
  const fetchAllData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch operators
      const operatorsData = await apiFetch(`${API_BASE_URL}/admin/operators`)
      setOperators(operatorsData.operators || [])
      
      // Fetch routes
      const routesData = await apiFetch(`${API_BASE_URL}/admin/routes`)
      setRoutes(routesData.routes || [])
      
      // Fetch vehicles
      const vehiclesData = await apiFetch(`${API_BASE_URL}/admin/vehicles`)
      setVehicles(vehiclesData.vehicles || [])
      
    } catch (error) {
      console.error('❌ Error fetching admin data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Add new operator
   */
  const handleAddOperator = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    setFormSuccess('')
    
    try {
      const data = await apiFetch(`${API_BASE_URL}/admin/operators`, {
        method: 'POST',
        body: JSON.stringify(newOperator)
      })
      
      // Refresh operators list
      await fetchAllData()
      
      // Reset form
      setNewOperator({
        operatorName: '',
        opEmail: '',
        dob: '',
        gender: '',
        phoneNum: '',
        address: '',
        employeeID: '',
        officeLocation: '',
        shift: 'Morning',
        employmentDate: '',
        emergencyContact: '',
        emergencyName: '',
        canBookTickets: true,
        canIssueRefunds: false,
        canOverridePricing: false,
        canViewReports: false
      })
      setShowOperatorForm(false)
      
      setFormSuccess(`Operator added successfully! Default password: default123`)
      
    } catch (error) {
      console.error('❌ Error adding operator:', error)
      setFormError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Update operator
   */
  const handleUpdateOperator = async (operatorId, updates) => {
    try {
      await apiFetch(`${API_BASE_URL}/admin/operators/${operatorId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })
      
      await fetchAllData()
      setFormSuccess('✅ Operator updated successfully')
      setTimeout(() => setFormSuccess(''), 3000)
      
    } catch (error) {
      console.error('❌ Error updating operator:', error)
      setFormError(error.message)
      setTimeout(() => setFormError(''), 3000)
    }
  }

  /**
   * Delete operator
   */
  const handleDeleteOperator = async (operatorId) => {
    if (!window.confirm('Are you sure you want to delete this operator? This action cannot be undone.')) {
      return
    }
    
    try {
      await apiFetch(`${API_BASE_URL}/admin/operators/${operatorId}`, {
        method: 'DELETE'
      })
      
      await fetchAllData()
      setFormSuccess('✅ Operator deleted successfully')
      setTimeout(() => setFormSuccess(''), 3000)
      
    } catch (error) {
      console.error('❌ Error deleting operator:', error)
      setFormError(error.message)
      setTimeout(() => setFormError(''), 3000)
    }
  }

  /**
   * Add new route
   */
  const handleAddRoute = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    setFormSuccess('')
    
    try {
      await apiFetch(`${API_BASE_URL}/admin/routes`, {
        method: 'POST',
        body: JSON.stringify(newRoute)
      })
      
      await fetchAllData()
      
      setNewRoute({
        routeCode: '',
        origin: '',
        destination: '',
        distance: '',
        basePrice: '',
        estimatedTime: '',
        isActive: true
      })
      setShowRouteForm(false)
      
      setFormSuccess('Route added successfully!')
      
    } catch (error) {
      console.error('❌ Error adding route:', error)
      setFormError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Delete route
   */
  const handleDeleteRoute = async (routeId) => {
    if (!window.confirm('Are you sure you want to delete this route? This will affect all associated vehicles and bookings.')) {
      return
    }
    
    try {
      await apiFetch(`${API_BASE_URL}/admin/routes/${routeId}`, {
        method: 'DELETE'
      })
      
      await fetchAllData()
      setFormSuccess('✅ Route deleted successfully')
      setTimeout(() => setFormSuccess(''), 3000)
      
    } catch (error) {
      console.error('❌ Error deleting route:', error)
      setFormError(error.message)
      setTimeout(() => setFormError(''), 3000)
    }
  }

  /**
   * Add new vehicle
   */
  const handleAddVehicle = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    setFormSuccess('')
    
    try {
      await apiFetch(`${API_BASE_URL}/admin/vehicles`, {
        method: 'POST',
        body: JSON.stringify(newVehicle)
      })
      
      await fetchAllData()
      
      setNewVehicle({
        vehicleNumber: '',
        registrationNumber: '',
        vehicleType: 'Shuttle',
        capacity: 14,
        operatorID: '',
        routeID: '',
        make: '',
        model: '',
        year: '',
        ownerName: '',
        driverName: '',
        driverContact: '',
        driverLicense: '',
        insuranceExpiry: '',
        inspectionExpiry: '',
        features: { ac: false, wifi: false, usb: false },
        isActive: true
      })
      setShowVehicleForm(false)
      
      setFormSuccess('Vehicle added successfully!')
      
    } catch (error) {
      console.error('❌ Error adding vehicle:', error)
      setFormError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Generate reports
   */
  const fetchReports = async (period = 'daily') => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/admin/reports/${period}`)
      setReports(prev => ({ ...prev, [period]: data }))
      
    } catch (error) {
      console.error('❌ Error fetching reports:', error)
      setFormError('Failed to load reports')
      setTimeout(() => setFormError(''), 3000)
    }
  }

  /**
   * Export report as PDF
   */
  const handleExportReport = async (period) => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}/admin/reports/${period}/export`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      })
      
      if (!response.ok) throw new Error('Failed to export report')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${period}-report-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      
    } catch (error) {
      console.error('❌ Export error:', error)
      setFormError('Failed to export report')
      setTimeout(() => setFormError(''), 3000)
    }
  }

  // ============================
  // RENDER FUNCTIONS
  // ============================
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-md text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchAllData}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {admin?.adminName || admin?.name || 'Admin'}
          </p>
        </div>
        
        {/* Success/Error Messages */}
        {formSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600">{formSuccess}</p>
          </div>
        )}
        
        {formError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{formError}</p>
          </div>
        )}
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
          <button
            className={`px-6 py-3 font-medium whitespace-nowrap ${
              activeTab === 'operators' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('operators')}
          >
            👥 Operators
          </button>
          <button
            className={`px-6 py-3 font-medium whitespace-nowrap ${
              activeTab === 'routes' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('routes')}
          >
            🗺️ Routes
          </button>
          <button
            className={`px-6 py-3 font-medium whitespace-nowrap ${
              activeTab === 'vehicles' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('vehicles')}
          >
            🚌 Vehicles
          </button>
          <button
            className={`px-6 py-3 font-medium whitespace-nowrap ${
              activeTab === 'reports' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => {
              setActiveTab('reports')
              fetchReports('daily')
            }}
          >
            📊 Reports
          </button>
        </div>
        
        {/* ============================
             OPERATORS TAB
        ============================ */}
        {activeTab === 'operators' && (
          <div className="space-y-8">
            {/* Add Operator Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowOperatorForm(!showOperatorForm)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 flex items-center gap-2"
              >
                <span>{showOperatorForm ? '−' : '+'}</span>
                {showOperatorForm ? 'Cancel' : 'Add New Operator'}
              </button>
            </div>
            
            {/* Add Operator Form */}
            {showOperatorForm && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Add New Operator</h2>
                <form onSubmit={handleAddOperator}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employee ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="employeeID"
                        value={newOperator.employeeID}
                        onChange={(e) => setNewOperator({...newOperator, employeeID: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="EMP001"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="operatorName"
                        value={newOperator.operatorName}
                        onChange={(e) => setNewOperator({...newOperator, operatorName: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Operator's full name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="opEmail"
                        value={newOperator.opEmail}
                        onChange={(e) => setNewOperator({...newOperator, opEmail: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="operator@easyride.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phoneNum"
                        value={newOperator.phoneNum}
                        onChange={(e) => setNewOperator({...newOperator, phoneNum: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0712345678"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="dob"
                        value={newOperator.dob}
                        onChange={(e) => setNewOperator({...newOperator, dob: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="gender"
                        value={newOperator.gender}
                        onChange={(e) => setNewOperator({...newOperator, gender: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Office Location <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="officeLocation"
                        value={newOperator.officeLocation}
                        onChange={(e) => setNewOperator({...newOperator, officeLocation: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nairobi Terminal"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shift <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="shift"
                        value={newOperator.shift}
                        onChange={(e) => setNewOperator({...newOperator, shift: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Morning">Morning (6AM - 2PM)</option>
                        <option value="Afternoon">Afternoon (2PM - 10PM)</option>
                        <option value="Night">Night (10PM - 6AM)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employment Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="employmentDate"
                        value={newOperator.employmentDate}
                        onChange={(e) => setNewOperator({...newOperator, employmentDate: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={newOperator.address}
                        onChange={(e) => setNewOperator({...newOperator, address: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Operator's address"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emergency Contact
                      </label>
                      <input
                        type="tel"
                        name="emergencyContact"
                        value={newOperator.emergencyContact}
                        onChange={(e) => setNewOperator({...newOperator, emergencyContact: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0712345678"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emergency Name
                      </label>
                      <input
                        type="text"
                        name="emergencyName"
                        value={newOperator.emergencyName}
                        onChange={(e) => setNewOperator({...newOperator, emergencyName: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Contact person name"
                      />
                    </div>
                  </div>
                  
                  {/* Permissions */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Permissions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={newOperator.canBookTickets}
                          onChange={(e) => setNewOperator({...newOperator, canBookTickets: e.target.checked})}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Can Book Tickets</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={newOperator.canIssueRefunds}
                          onChange={(e) => setNewOperator({...newOperator, canIssueRefunds: e.target.checked})}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Can Issue Refunds</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={newOperator.canOverridePricing}
                          onChange={(e) => setNewOperator({...newOperator, canOverridePricing: e.target.checked})}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Can Override Pricing</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={newOperator.canViewReports}
                          onChange={(e) => setNewOperator({...newOperator, canViewReports: e.target.checked})}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Can View Reports</span>
                      </label>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 disabled:opacity-50"
                  >
                    {submitting ? 'Adding Operator...' : 'Add Operator'}
                  </button>
                </form>
              </div>
            )}
            
            {/* Operators Table */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  Existing Operators ({operators.length})
                </h2>
              </div>
              
              {operators.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No operators added yet. Add your first operator above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Office</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {operators.map((operator) => (
                        <tr key={operator.opID} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{operator.opID}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{operator.employeeID}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{operator.operatorName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{operator.opEmail}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{operator.phoneNum}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{operator.officeLocation}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{operator.shift}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              operator.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {operator.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleUpdateOperator(operator.opID, { isActive: !operator.isActive })}
                                className={`px-3 py-1 rounded-md text-sm font-medium ${
                                  operator.isActive 
                                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {operator.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDeleteOperator(operator.opID)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* ============================
             ROUTES TAB
        ============================ */}
        {activeTab === 'routes' && (
          <div className="space-y-8">
            {/* Add Route Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowRouteForm(!showRouteForm)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 flex items-center gap-2"
              >
                <span>{showRouteForm ? '−' : '+'}</span>
                {showRouteForm ? 'Cancel' : 'Add New Route'}
              </button>
            </div>
            
            {/* Add Route Form */}
            {showRouteForm && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Add New Route</h2>
                <form onSubmit={handleAddRoute}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Route Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="routeCode"
                        value={newRoute.routeCode}
                        onChange={(e) => setNewRoute({...newRoute, routeCode: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="NBO-MSA-01"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Origin <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="origin"
                        value={newRoute.origin}
                        onChange={(e) => setNewRoute({...newRoute, origin: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nairobi"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Destination <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="destination"
                        value={newRoute.destination}
                        onChange={(e) => setNewRoute({...newRoute, destination: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Mombasa"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Distance (km)
                      </label>
                      <input
                        type="number"
                        name="distance"
                        value={newRoute.distance}
                        onChange={(e) => setNewRoute({...newRoute, distance: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="480"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Base Price (KSh) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="basePrice"
                        value={newRoute.basePrice}
                        onChange={(e) => setNewRoute({...newRoute, basePrice: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="1500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estimated Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        name="estimatedTime"
                        value={newRoute.estimatedTime}
                        onChange={(e) => setNewRoute({...newRoute, estimatedTime: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <label className="flex items-center space-x-3 mt-2">
                        <input
                          type="checkbox"
                          checked={newRoute.isActive}
                          onChange={(e) => setNewRoute({...newRoute, isActive: e.target.checked})}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Active</span>
                      </label>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 disabled:opacity-50"
                  >
                    {submitting ? 'Adding Route...' : 'Add Route'}
                  </button>
                </form>
              </div>
            )}
            
            {/* Routes Table */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  Existing Routes ({routes.length})
                </h2>
              </div>
              
              {routes.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No routes added yet. Add your first route above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origin</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {routes.map((route) => (
                        <tr key={route.routeID} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.routeID}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.routeCode}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.origin}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.destination}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.distance} km</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">KSh {route.basePrice}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.estimatedTime}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              route.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {route.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleDeleteRoute(route.routeID)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* ============================
             VEHICLES TAB
        ============================ */}
        {activeTab === 'vehicles' && (
          <div className="space-y-8">
            {/* Add Vehicle Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowVehicleForm(!showVehicleForm)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 flex items-center gap-2"
              >
                <span>{showVehicleForm ? '−' : '+'}</span>
                {showVehicleForm ? 'Cancel' : 'Add New Vehicle'}
              </button>
            </div>
            
            {/* Add Vehicle Form */}
            {showVehicleForm && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Add New Vehicle</h2>
                <form onSubmit={handleAddVehicle}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vehicle Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="vehicleNumber"
                        value={newVehicle.vehicleNumber}
                        onChange={(e) => setNewVehicle({...newVehicle, vehicleNumber: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="KAA 123A"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Registration Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="registrationNumber"
                        value={newVehicle.registrationNumber}
                        onChange={(e) => setNewVehicle({...newVehicle, registrationNumber: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="KAA 123A"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vehicle Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="vehicleType"
                        value={newVehicle.vehicleType}
                        onChange={(e) => setNewVehicle({...newVehicle, vehicleType: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Shuttle">Shuttle (14 seater)</option>
                        <option value="Minibus">Minibus (25 seater)</option>
                        <option value="Bus">Bus (50+ seater)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Capacity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="capacity"
                        value={newVehicle.capacity}
                        onChange={(e) => setNewVehicle({...newVehicle, capacity: parseInt(e.target.value)})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="14"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Operator
                      </label>
                      <select
                        name="operatorID"
                        value={newVehicle.operatorID}
                        onChange={(e) => setNewVehicle({...newVehicle, operatorID: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Operator</option>
                        {operators.map(op => (
                          <option key={op.opID} value={op.opID}>{op.operatorName}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Route
                      </label>
                      <select
                        name="routeID"
                        value={newVehicle.routeID}
                        onChange={(e) => setNewVehicle({...newVehicle, routeID: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Route</option>
                        {routes.map(route => (
                          <option key={route.routeID} value={route.routeID}>
                            {route.origin} → {route.destination}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Make
                      </label>
                      <input
                        type="text"
                        name="make"
                        value={newVehicle.make}
                        onChange={(e) => setNewVehicle({...newVehicle, make: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Toyota"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Model
                      </label>
                      <input
                        type="text"
                        name="model"
                        value={newVehicle.model}
                        onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Hiace"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year
                      </label>
                      <input
                        type="number"
                        name="year"
                        value={newVehicle.year}
                        onChange={(e) => setNewVehicle({...newVehicle, year: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="2022"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Owner Name
                      </label>
                      <input
                        type="text"
                        name="ownerName"
                        value={newVehicle.ownerName}
                        onChange={(e) => setNewVehicle({...newVehicle, ownerName: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="James Kamau"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Driver Name
                      </label>
                      <input
                        type="text"
                        name="driverName"
                        value={newVehicle.driverName}
                        onChange={(e) => setNewVehicle({...newVehicle, driverName: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Peter Mwangi"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Driver Contact
                      </label>
                      <input
                        type="tel"
                        name="driverContact"
                        value={newVehicle.driverContact}
                        onChange={(e) => setNewVehicle({...newVehicle, driverContact: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0712345678"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Driver License
                      </label>
                      <input
                        type="text"
                        name="driverLicense"
                        value={newVehicle.driverLicense}
                        onChange={(e) => setNewVehicle({...newVehicle, driverLicense: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="DL123456"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Insurance Expiry
                      </label>
                      <input
                        type="date"
                        name="insuranceExpiry"
                        value={newVehicle.insuranceExpiry}
                        onChange={(e) => setNewVehicle({...newVehicle, insuranceExpiry: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Inspection Expiry
                      </label>
                      <input
                        type="date"
                        name="inspectionExpiry"
                        value={newVehicle.inspectionExpiry}
                        onChange={(e) => setNewVehicle({...newVehicle, inspectionExpiry: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Features</h3>
                    <div className="flex space-x-6">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={newVehicle.features.ac}
                          onChange={(e) => setNewVehicle({
                            ...newVehicle, 
                            features: {...newVehicle.features, ac: e.target.checked}
                          })}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Air Conditioning</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={newVehicle.features.wifi}
                          onChange={(e) => setNewVehicle({
                            ...newVehicle, 
                            features: {...newVehicle.features, wifi: e.target.checked}
                          })}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">WiFi</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={newVehicle.features.usb}
                          onChange={(e) => setNewVehicle({
                            ...newVehicle, 
                            features: {...newVehicle.features, usb: e.target.checked}
                          })}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">USB Charging</span>
                      </label>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 disabled:opacity-50"
                  >
                    {submitting ? 'Adding Vehicle...' : 'Add Vehicle'}
                  </button>
                </form>
              </div>
            )}
            
            {/* Vehicles Table */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  Existing Vehicles ({vehicles.length})
                </h2>
              </div>
              
              {vehicles.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No vehicles added yet. Add your first vehicle above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {vehicles.map((vehicle) => (
                        <tr key={vehicle.vehicleID} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vehicle.vehicleID}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vehicle.vehicleNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vehicle.vehicleType}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vehicle.capacity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vehicle.operatorName || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {vehicle.origin ? `${vehicle.origin} → ${vehicle.destination}` : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vehicle.driverName || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              vehicle.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {vehicle.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* ============================
             REPORTS TAB
        ============================ */}
        {activeTab === 'reports' && (
          <div className="space-y-8">
            {/* Report Period Selector */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Generate Reports</h2>
              <div className="flex space-x-4">
                <button
                  onClick={() => fetchReports('daily')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Daily Report
                </button>
                <button
                  onClick={() => fetchReports('weekly')}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                >
                  Weekly Report
                </button>
                <button
                  onClick={() => fetchReports('monthly')}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
                >
                  Monthly Report
                </button>
              </div>
            </div>
            
            {/* Daily Report Display */}
            {reports.daily && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800">Daily Report</h2>
                  <button
                    onClick={() => handleExportReport('daily')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Export PDF
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600 mb-1">Total Bookings</p>
                    <p className="text-2xl font-bold text-blue-800">{reports.daily.totalBookings}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600 mb-1">Revenue</p>
                    <p className="text-2xl font-bold text-green-800">KSh {reports.daily.revenue.toLocaleString()}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-600 mb-1">Passengers</p>
                    <p className="text-2xl font-bold text-purple-800">{reports.daily.passengers}</p>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left">Route</th>
                        <th className="px-4 py-2 text-left">Bookings</th>
                        <th className="px-4 py-2 text-left">Revenue</th>
                        <th className="px-4 py-2 text-left">Passengers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.daily.breakdown?.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-4 py-2">{item.route}</td>
                          <td className="px-4 py-2">{item.bookings}</td>
                          <td className="px-4 py-2">KSh {item.revenue}</td>
                          <td className="px-4 py-2">{item.passengers}</td>
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

export default AdminPage