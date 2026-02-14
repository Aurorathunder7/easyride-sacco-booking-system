// ============================================
// EasyRide SACCO - Customer Registration Page
// ============================================
// This component handles new customer registration with form validation,
// API integration with Aiven MySQL database, and enhanced user experience
// ============================================

// src/pages/RegisterPage.jsx
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

// API configuration - change this to your deployed backend URL when ready
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * RegisterPage Component
 * Provides a comprehensive registration form for new customers
 * Features: Real-time validation, error handling, responsive design,
 * loading states, and Aiven MySQL database integration
 */
const RegisterPage = () => {
  // ============================
  // STATE MANAGEMENT
  // ============================
  
  /**
   * Customer Form State - Tracks all input fields
   */
  const [customer, setCustomer] = useState({
    customerName: '',
    email: '',
    dob: '',
    gender: '',
    phoneNumber: '',
    address: '',
    password: '',
    confirmPassword: '',
  })

  /**
   * Errors State - Tracks validation errors for each field
   */
  const [errors, setErrors] = useState({})
  
  /**
   * Loading State - Disables button during API call
   */
  const [isLoading, setIsLoading] = useState(false)
  
  /**
   * Server Error State - Shows backend error messages
   */
  const [serverError, setServerError] = useState('')
  
  /**
   * Navigation hook for programmatic routing after successful registration
   */
  const navigate = useNavigate()

  // ============================
  // EVENT HANDLERS
  // ============================

  /**
   * Handles input changes and updates form state
   * Clears specific field error when user starts typing
   */
  const handleChange = (e) => {
    setCustomer({
      ...customer,
      [e.target.name]: e.target.value,
    })
    
    // Clear error for this field if it exists
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' })
    }
    
    // Clear server error when user makes changes
    if (serverError) setServerError('')
  }

  /**
   * Validates all form fields before submission
   * @returns {Object} Validation errors object (empty if valid)
   */
  const validateForm = () => {
    const newErrors = {}
    
    // Personal Info Validation
    if (!customer.customerName.trim()) {
      newErrors.customerName = '👤 Full name is required'
    } else if (customer.customerName.length < 3) {
      newErrors.customerName = '👤 Name must be at least 3 characters'
    }
    
    // Email Validation - Required + Format check
    if (!customer.email.trim()) {
      newErrors.email = '📧 Email is required'
    } else if (!/^\S+@\S+\.\S+$/.test(customer.email)) {
      newErrors.email = '❌ Please enter a valid email address (e.g., name@example.com)'
    }
    
    // Date of Birth Validation
    if (!customer.dob) {
      newErrors.dob = '📅 Date of birth is required'
    } else {
      // Check if customer is at least 18 years old
      const today = new Date()
      const birthDate = new Date(customer.dob)
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      if (age < 18) {
        newErrors.dob = '📅 You must be at least 18 years old to register'
      }
    }
    
    // Gender Selection Validation
    if (!customer.gender) {
      newErrors.gender = '⚥ Please select your gender'
    }
    
    // Phone Number Validation - Kenyan format
    if (!customer.phoneNumber.trim()) {
      newErrors.phoneNumber = '📱 Phone number is required'
    } else {
      // Remove any non-digit characters
      const phoneDigits = customer.phoneNumber.replace(/\D/g, '')
      if (!/^[0-9]{10}$/.test(phoneDigits) && !/^254[0-9]{9}$/.test(phoneDigits)) {
        newErrors.phoneNumber = '🔢 Phone number must be 10 digits (e.g., 0712345678) or start with 254'
      }
    }
    
    // Address Validation
    if (!customer.address.trim()) {
      newErrors.address = '🏠 Address is required'
    }
    
    // Password Validation
    if (!customer.password) {
      newErrors.password = '🔒 Password is required'
    } else if (customer.password.length < 6) {
      newErrors.password = '🔐 Password must be at least 6 characters long'
    } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(customer.password)) {
      newErrors.password = '🔐 Password must contain at least one letter and one number'
    }
    
    // Password Confirmation Validation
    if (customer.password !== customer.confirmPassword) {
      newErrors.confirmPassword = '❌ Passwords do not match'
    }
    
    return newErrors
  }

  /**
   * Formats phone number to international format for backend
   * Converts 0712345678 → 254712345678
   */
  const formatPhoneNumber = (phone) => {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('0')) {
      return '254' + digits.slice(1)
    } else if (digits.startsWith('254')) {
      return digits
    }
    return '254' + digits // Assume Kenyan number
  }

  /**
   * Handles form submission
   * Validates input, attempts registration, and handles response
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate all fields before proceeding
    const formErrors = validateForm()
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors)
      // Scroll to first error
      const firstErrorField = document.querySelector('[class*="border-red-500"]')
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    // Start loading
    setIsLoading(true)
    setServerError('')

    try {
      // Format data for backend
      const registrationData = {
        customerName: customer.customerName.trim(),
        email: customer.email.trim().toLowerCase(),
        dob: customer.dob,
        gender: customer.gender,
        phoneNumber: formatPhoneNumber(customer.phoneNumber),
        address: customer.address.trim(),
        password: customer.password
      }

      console.log('📝 Sending registration data to Aiven MySQL:', { 
        ...registrationData, 
        password: '[HIDDEN]' 
      })

      // 🔴 BACKEND API CALL - UPDATED: changed from '/register' to '/auth/register'
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true' // Added to bypass ngrok warning
        },
        body: JSON.stringify(registrationData),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error messages from backend
        if (response.status === 400) {
          if (data.message?.includes('email already exists')) {
            throw new Error('📧 This email is already registered. Please use a different email or login.')
          } else if (data.message?.includes('phone number already exists')) {
            throw new Error('📱 This phone number is already registered. Please use a different number or login.')
          } else {
            throw new Error(data.message || 'Registration failed. Please check your information.')
          }
        } else {
          throw new Error(data.message || 'Server error. Please try again later.')
        }
      }

      // Registration successful!
      console.log('✅ Registration successful! Customer saved to Aiven MySQL:', data)
      
      // Store registration email for login page pre-fill (optional)
      localStorage.setItem('registeredEmail', registrationData.email)
      
      // Show success message
      alert('✅ Registration successful! Please login with your credentials.')
      
      // Redirect to login page
      navigate('/login')
      
    } catch (error) {
      console.error('❌ Registration error:', error)
      setServerError(error.message || 'Registration failed. Please try again.')
      
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsLoading(false)
    }
  }

  // ============================
  // RENDER COMPONENT
  // ============================

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-5 rounded-full animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white opacity-5 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-500 to-purple-500 opacity-10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`
            }}
          ></div>
        ))}
      </div>

      {/* Main Card Container */}
      <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-white/20 transform transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl">
        <div className="md:flex">
          
          {/* ============================ */}
          {/* LEFT SIDE - BRANDING SECTION */}
          {/* ============================ */}
          <div className="md:w-1/2 bg-gradient-to-br from-blue-600/90 to-purple-600/90 text-white p-8 md:p-12 relative overflow-hidden backdrop-blur-sm">
            {/* Animated gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
            
            {/* Decorative circles */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full animate-blob"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/20 rounded-full animate-blob animation-delay-2000"></div>
            
            {/* Company branding */}
            <div className="relative z-10 mb-8 transform transition-all duration-700 hover:scale-105">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm animate-bounce-slow">
                  <span className="text-4xl">🚌</span>
                </div>
              </div>
              <h1 className="text-4xl font-bold mb-2 tracking-tight text-center bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                EasyRide SACCO
              </h1>
              <p className="text-blue-100 text-lg text-center animate-pulse">✨ Matatu Booking System</p>
            </div>
            
            {/* Welcome message */}
            <div className="relative z-10 mb-8 text-center">
              <p className="text-white/90 text-lg font-light">
                Join thousands of happy travelers
              </p>
            </div>
            
            {/* Benefits section with animated cards */}
            <div className="relative z-10 mt-8">
              <h2 className="text-2xl font-semibold mb-6 text-center">🌟 Why Join Us?</h2>
              <div className="space-y-4">
                <div className="group bg-white/5 rounded-xl p-4 backdrop-blur-sm transform transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:shadow-xl">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-400/20 rounded-full flex items-center justify-center mr-4 group-hover:rotate-12 transition-transform">
                      <span className="text-green-400 text-xl">✓</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Book Anywhere</h3>
                      <p className="text-sm text-white/70">From your phone or computer</p>
                    </div>
                  </div>
                </div>
                
                <div className="group bg-white/5 rounded-xl p-4 backdrop-blur-sm transform transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:shadow-xl">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-400/20 rounded-full flex items-center justify-center mr-4 group-hover:rotate-12 transition-transform">
                      <span className="text-blue-400 text-xl">💰</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">M-Pesa Payments</h3>
                      <p className="text-sm text-white/70">Secure & instant transactions</p>
                    </div>
                  </div>
                </div>
                
                <div className="group bg-white/5 rounded-xl p-4 backdrop-blur-sm transform transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:shadow-xl">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-400/20 rounded-full flex items-center justify-center mr-4 group-hover:rotate-12 transition-transform">
                      <span className="text-purple-400 text-xl">🎫</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Digital Tickets</h3>
                      <p className="text-sm text-white/70">QR codes for easy boarding</p>
                    </div>
                  </div>
                </div>
                
                <div className="group bg-white/5 rounded-xl p-4 backdrop-blur-sm transform transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:shadow-xl">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-pink-400/20 rounded-full flex items-center justify-center mr-4 group-hover:rotate-12 transition-transform">
                      <span className="text-pink-400 text-xl">📊</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Track History</h3>
                      <p className="text-sm text-white/70">View all your past trips</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Call to action for existing users */}
            <div className="relative z-10 mt-8 bg-gradient-to-r from-white/20 to-purple-500/20 rounded-xl p-6 backdrop-blur-sm border border-white/20 transform transition-all duration-300 hover:scale-105">
              <p className="text-white/90 text-center mb-2">Already have an account?</p>
              <Link 
                to="/login" 
                className="block text-center bg-white text-purple-600 font-semibold py-3 px-6 rounded-lg hover:bg-purple-50 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
              >
                🔑 Login to your account →
              </Link>
            </div>
          </div>
          
          {/* ============================ */}
          {/* RIGHT SIDE - REGISTRATION FORM */}
          {/* ============================ */}
          <div className="md:w-1/2 p-8 md:p-12 bg-white/95 backdrop-blur-xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                Create Account
              </h2>
              <p className="text-gray-600">Join our community of satisfied travelers</p>
            </div>
            
            {/* Server Error Display */}
            {serverError && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-shake">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">⚠️</span>
                  <p className="text-red-700 font-medium">{serverError}</p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Row 1: Full Name & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-purple-600 transition-colors">
                    👤 Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="customerName"
                      value={customer.customerName}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-300 pl-10 ${
                        errors.customerName ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-purple-300'
                      } ${isLoading ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                      placeholder="John Doe"
                    />
                    <span className="absolute left-3 top-3 text-gray-400 group-hover:text-purple-500 transition-colors">👤</span>
                  </div>
                  {errors.customerName && (
                    <p className="text-red-500 text-sm mt-1 flex items-center animate-slideIn">
                      <span className="mr-1">⚠️</span> {errors.customerName}
                    </p>
                  )}
                </div>
                
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-purple-600 transition-colors">
                    📧 Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={customer.email}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-300 pl-10 ${
                        errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-purple-300'
                      } ${isLoading ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                      placeholder="john@example.com"
                    />
                    <span className="absolute left-3 top-3 text-gray-400 group-hover:text-purple-500 transition-colors">📧</span>
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1 flex items-center animate-slideIn">
                      <span className="mr-1">⚠️</span> {errors.email}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Row 2: Date of Birth & Gender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-purple-600 transition-colors">
                    📅 Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="dob"
                      value={customer.dob}
                      onChange={handleChange}
                      disabled={isLoading}
                      max={new Date().toISOString().split('T')[0]}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-300 pl-10 ${
                        errors.dob ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-purple-300'
                      } ${isLoading ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                    />
                    <span className="absolute left-3 top-3 text-gray-400 group-hover:text-purple-500 transition-colors">📅</span>
                  </div>
                  {errors.dob && (
                    <p className="text-red-500 text-sm mt-1 flex items-center animate-slideIn">
                      <span className="mr-1">⚠️</span> {errors.dob}
                    </p>
                  )}
                </div>
                
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-purple-600 transition-colors">
                    ⚥ Gender <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="gender"
                      value={customer.gender}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-300 pl-10 appearance-none ${
                        errors.gender ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-purple-300'
                      } ${isLoading ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">👨 Male</option>
                      <option value="Female">👩 Female</option>
                      <option value="Other">🧑 Other</option>
                    </select>
                    <span className="absolute left-3 top-3 text-gray-400 group-hover:text-purple-500 transition-colors">⚥</span>
                    <span className="absolute right-3 top-3 text-gray-400">▼</span>
                  </div>
                  {errors.gender && (
                    <p className="text-red-500 text-sm mt-1 flex items-center animate-slideIn">
                      <span className="mr-1">⚠️</span> {errors.gender}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Row 3: Phone Number & Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-purple-600 transition-colors">
                    📱 Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={customer.phoneNumber}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-300 pl-10 ${
                        errors.phoneNumber ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-purple-300'
                      } ${isLoading ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                      placeholder="0712345678"
                    />
                    <span className="absolute left-3 top-3 text-gray-400 group-hover:text-purple-500 transition-colors">📱</span>
                  </div>
                  {errors.phoneNumber && (
                    <p className="text-red-500 text-sm mt-1 flex items-center animate-slideIn">
                      <span className="mr-1">⚠️</span> {errors.phoneNumber}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Format: 0712345678 or 254712345678</p>
                </div>
                
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-purple-600 transition-colors">
                    🏠 Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="address"
                      value={customer.address}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-300 pl-10 ${
                        errors.address ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-purple-300'
                      } ${isLoading ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                      placeholder="Nairobi, Kenya"
                    />
                    <span className="absolute left-3 top-3 text-gray-400 group-hover:text-purple-500 transition-colors">🏠</span>
                  </div>
                  {errors.address && (
                    <p className="text-red-500 text-sm mt-1 flex items-center animate-slideIn">
                      <span className="mr-1">⚠️</span> {errors.address}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Row 4: Password & Confirm Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-purple-600 transition-colors">
                    🔒 Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      name="password"
                      value={customer.password}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-300 pl-10 ${
                        errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-purple-300'
                      } ${isLoading ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                      placeholder="Min. 6 characters with letters and numbers"
                    />
                    <span className="absolute left-3 top-3 text-gray-400 group-hover:text-purple-500 transition-colors">🔒</span>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1 flex items-center animate-slideIn">
                      <span className="mr-1">⚠️</span> {errors.password}
                    </p>
                  )}
                </div>
                
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-purple-600 transition-colors">
                    ✓ Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      name="confirmPassword"
                      value={customer.confirmPassword}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-300 pl-10 ${
                        errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-purple-300'
                      } ${isLoading ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                      placeholder="Re-enter password"
                    />
                    <span className="absolute left-3 top-3 text-gray-400 group-hover:text-purple-500 transition-colors">✓</span>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1 flex items-center animate-slideIn">
                      <span className="mr-1">⚠️</span> {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Terms and Conditions */}
              <div className="flex items-center mt-4">
                <input type="checkbox" className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" />
                <label className="ml-2 text-sm text-gray-600">
                  I agree to the <a href="#" className="text-purple-600 hover:underline">Terms of Service</a> and <a href="#" className="text-purple-600 hover:underline">Privacy Policy</a>
                </label>
              </div>
              
              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 rounded-xl font-bold text-lg
                    transform transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/30 hover:scale-[1.02] focus:ring-4 focus:ring-purple-300
                    ${isLoading 
                      ? 'opacity-75 cursor-not-allowed from-purple-400 to-blue-400' 
                      : 'hover:from-purple-700 hover:to-blue-700 active:scale-95'
                    }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      🚀 Create Account
                    </span>
                  )}
                </button>
              </div>
            </form>
            
            {/* Important Note */}
            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-800 flex items-start">
                <span className="mr-2 text-lg">📌</span>
                <span>
                  <strong className="block mb-1">Important Note:</strong>
                  This registration is for customers only. SACCO operators and staff are onboarded by system administrators.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .hover\:shadow-3xl:hover {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  )
}

export default RegisterPage