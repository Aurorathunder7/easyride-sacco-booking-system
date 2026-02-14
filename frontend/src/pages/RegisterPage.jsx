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

      // 🔴 BACKEND API CALL - Connects to your Node.js server which then saves to Aiven MySQL
      const response = await fetch(`${API_BASE_URL}/register`,  {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden transform transition-all hover:scale-[1.01] duration-300">
        <div className="md:flex">
          
          {/* ============================ */}
          {/* LEFT SIDE - BRANDING SECTION */}
          {/* ============================ */}
          <div className="md:w-1/2 bg-gradient-to-br from-blue-600 to-blue-700 text-white p-8 md:p-12 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500 opacity-20 rounded-full -ml-10 -mb-10"></div>
            
            {/* Company branding */}
            <div className="relative z-10 mb-8">
              <h1 className="text-4xl font-bold mb-2 tracking-tight">EasyRide SACCO</h1>
              <p className="text-blue-100 text-lg">✨ Matatu Booking System</p>
            </div>
            
            {/* Benefits section */}
            <div className="relative z-10 mt-12">
              <h2 className="text-2xl font-semibold mb-6">🌟 Why Join Us?</h2>
              <ul className="space-y-4">
                <li className="flex items-center transform transition-all hover:translate-x-2 duration-200">
                  <span className="mr-3 bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-sm">✓</span>
                  <span>Book seats from anywhere, anytime</span>
                </li>
                <li className="flex items-center transform transition-all hover:translate-x-2 duration-200">
                  <span className="mr-3 bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-sm">✓</span>
                  <span>Secure M-Pesa payments & digital receipts</span>
                </li>
                <li className="flex items-center transform transition-all hover:translate-x-2 duration-200">
                  <span className="mr-3 bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-sm">✓</span>
                  <span>Digital tickets with QR codes</span>
                </li>
                <li className="flex items-center transform transition-all hover:translate-x-2 duration-200">
                  <span className="mr-3 bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-sm">✓</span>
                  <span>Track booking history & favorite routes</span>
                </li>
              </ul>
            </div>
            
            {/* Call to action for existing users */}
            <div className="relative z-10 mt-12 bg-blue-500 bg-opacity-30 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-blue-100">Already have an account?</p>
              <Link 
                to="/login" 
                className="text-white font-semibold underline hover:text-blue-200 transition-colors duration-200 inline-block mt-1"
              >
                🔑 Login to your account →
              </Link>
            </div>
          </div>
          
          {/* ============================ */}
          {/* RIGHT SIDE - REGISTRATION FORM */}
          {/* ============================ */}
          <div className="md:w-1/2 p-8 md:p-12 bg-white">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
            <p className="text-gray-500 mb-6">Join our community of satisfied travelers</p>
            
            {/* Server Error Display */}
            {serverError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-pulse">
                <p className="text-red-600 flex items-start">
                  <span className="mr-2 text-lg">⚠️</span>
                  <span className="font-medium">{serverError}</span>
                </p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Full Name & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors">
                    👤 Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={customer.customerName}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                      errors.customerName ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-blue-400'
                    } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="John Doe"
                  />
                  {errors.customerName && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <span className="mr-1">⚠️</span> {errors.customerName}
                    </p>
                  )}
                </div>
                
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors">
                    📧 Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={customer.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                      errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-blue-400'
                    } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="john@example.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <span className="mr-1">⚠️</span> {errors.email}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Row 2: Date of Birth & Gender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors">
                    📅 Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={customer.dob}
                    onChange={handleChange}
                    disabled={isLoading}
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                      errors.dob ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-blue-400'
                    } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {errors.dob && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <span className="mr-1">⚠️</span> {errors.dob}
                    </p>
                  )}
                </div>
                
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors">
                    ⚥ Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={customer.gender}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                      errors.gender ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-blue-400'
                    } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">👨 Male</option>
                    <option value="Female">👩 Female</option>
                    <option value="Other">🧑 Other</option>
                  </select>
                  {errors.gender && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <span className="mr-1">⚠️</span> {errors.gender}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Row 3: Phone Number & Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors">
                    📱 Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={customer.phoneNumber}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                      errors.phoneNumber ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-blue-400'
                    } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="0712345678"
                  />
                  {errors.phoneNumber && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <span className="mr-1">⚠️</span> {errors.phoneNumber}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Format: 0712345678 or 254712345678</p>
                </div>
                
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors">
                    🏠 Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={customer.address}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                      errors.address ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-blue-400'
                    } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="Nairobi, Kenya"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <span className="mr-1">⚠️</span> {errors.address}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Row 4: Password & Confirm Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors">
                    🔒 Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={customer.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                      errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-blue-400'
                    } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="Min. 6 characters with letters and numbers"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <span className="mr-1">⚠️</span> {errors.password}
                    </p>
                  )}
                </div>
                
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors">
                    ✓ Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={customer.confirmPassword}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                      errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-blue-400'
                    } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="Re-enter password"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <span className="mr-1">⚠️</span> {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-semibold 
                    transform transition-all duration-300 hover:shadow-xl focus:ring-4 focus:ring-blue-300
                    ${isLoading 
                      ? 'opacity-75 cursor-not-allowed from-blue-400 to-blue-500' 
                      : 'hover:from-blue-700 hover:to-blue-800 hover:scale-[1.02]'
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
                    '🚀 Create Account'
                  )}
                </button>
              </div>
            </form>
            
            {/* Important Note */}
            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
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
    </div>
  )
}

export default RegisterPage