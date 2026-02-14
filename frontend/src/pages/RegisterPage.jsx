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

      // 🔴 BACKEND API CALL
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
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
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoContainer}>
          <div style={styles.logo}>🚌</div>
          <h1 style={styles.logoText}>EasyRide SACCO</h1>
          <p style={styles.tagline}>Matatu Booking System</p>
        </div>

        <h2 style={styles.title}>Create Account</h2>
        <p style={styles.subtitle}>Join our community of satisfied travelers</p>

        {/* Server Error Display */}
        {serverError && (
          <div style={styles.errorContainer}>
            <span style={styles.errorIcon}>⚠️</span>
            <p style={styles.errorText}>{serverError}</p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Full Name */}
          <div style={styles.inputContainer}>
            <label style={styles.label}>👤 Full Name *</label>
            <input
              type="text"
              name="customerName"
              value={customer.customerName}
              onChange={handleChange}
              disabled={isLoading}
              style={{
                ...styles.input,
                ...(errors.customerName ? styles.inputError : {}),
                ...(isLoading ? styles.disabledInput : {})
              }}
              placeholder="John Doe"
            />
            {errors.customerName && (
              <p style={styles.errorMessage}>{errors.customerName}</p>
            )}
          </div>

          {/* Email */}
          <div style={styles.inputContainer}>
            <label style={styles.label}>📧 Email *</label>
            <input
              type="email"
              name="email"
              value={customer.email}
              onChange={handleChange}
              disabled={isLoading}
              style={{
                ...styles.input,
                ...(errors.email ? styles.inputError : {}),
                ...(isLoading ? styles.disabledInput : {})
              }}
              placeholder="john@example.com"
            />
            {errors.email && (
              <p style={styles.errorMessage}>{errors.email}</p>
            )}
          </div>

          {/* Date of Birth and Gender - Two columns */}
          <div style={styles.rowContainer}>
            <div style={styles.halfWidth}>
              <label style={styles.label}>📅 Date of Birth *</label>
              <input
                type="date"
                name="dob"
                value={customer.dob}
                onChange={handleChange}
                disabled={isLoading}
                max={new Date().toISOString().split('T')[0]}
                style={{
                  ...styles.input,
                  ...(errors.dob ? styles.inputError : {}),
                  ...(isLoading ? styles.disabledInput : {})
                }}
              />
              {errors.dob && (
                <p style={styles.errorMessage}>{errors.dob}</p>
              )}
            </div>

            <div style={styles.halfWidth}>
              <label style={styles.label}>⚥ Gender *</label>
              <select
                name="gender"
                value={customer.gender}
                onChange={handleChange}
                disabled={isLoading}
                style={{
                  ...styles.input,
                  ...(errors.gender ? styles.inputError : {}),
                  ...(isLoading ? styles.disabledInput : {})
                }}
              >
                <option value="">Select Gender</option>
                <option value="Male">👨 Male</option>
                <option value="Female">👩 Female</option>
                <option value="Other">🧑 Other</option>
              </select>
              {errors.gender && (
                <p style={styles.errorMessage}>{errors.gender}</p>
              )}
            </div>
          </div>

          {/* Phone Number */}
          <div style={styles.inputContainer}>
            <label style={styles.label}>📱 Phone Number *</label>
            <input
              type="tel"
              name="phoneNumber"
              value={customer.phoneNumber}
              onChange={handleChange}
              disabled={isLoading}
              style={{
                ...styles.input,
                ...(errors.phoneNumber ? styles.inputError : {}),
                ...(isLoading ? styles.disabledInput : {})
              }}
              placeholder="0712345678"
            />
            {errors.phoneNumber && (
              <p style={styles.errorMessage}>{errors.phoneNumber}</p>
            )}
            <p style={styles.helperText}>Format: 0712345678 or 254712345678</p>
          </div>

          {/* Address */}
          <div style={styles.inputContainer}>
            <label style={styles.label}>🏠 Address *</label>
            <input
              type="text"
              name="address"
              value={customer.address}
              onChange={handleChange}
              disabled={isLoading}
              style={{
                ...styles.input,
                ...(errors.address ? styles.inputError : {}),
                ...(isLoading ? styles.disabledInput : {})
              }}
              placeholder="Nairobi, Kenya"
            />
            {errors.address && (
              <p style={styles.errorMessage}>{errors.address}</p>
            )}
          </div>

          {/* Password and Confirm Password - Two columns */}
          <div style={styles.rowContainer}>
            <div style={styles.halfWidth}>
              <label style={styles.label}>🔒 Password *</label>
              <input
                type="password"
                name="password"
                value={customer.password}
                onChange={handleChange}
                disabled={isLoading}
                style={{
                  ...styles.input,
                  ...(errors.password ? styles.inputError : {}),
                  ...(isLoading ? styles.disabledInput : {})
                }}
                placeholder="Min. 6 characters"
              />
              {errors.password && (
                <p style={styles.errorMessage}>{errors.password}</p>
              )}
            </div>

            <div style={styles.halfWidth}>
              <label style={styles.label}>✓ Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={customer.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
                style={{
                  ...styles.input,
                  ...(errors.confirmPassword ? styles.inputError : {}),
                  ...(isLoading ? styles.disabledInput : {})
                }}
                placeholder="Re-enter password"
              />
              {errors.confirmPassword && (
                <p style={styles.errorMessage}>{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              ...styles.submitButton,
              ...(isLoading ? styles.disabledButton : {})
            }}
          >
            {isLoading ? (
              <span style={styles.loadingSpinner}>
                <span style={styles.spinner}></span>
                Creating Account...
              </span>
            ) : (
              '🚀 Create Account'
            )}
          </button>
        </form>

        {/* Login Link */}
        <div style={styles.loginLink}>
          <p style={styles.loginText}>
            Already have an account?{' '}
            <Link to="/login" style={styles.loginLinkText}>
              Login here
            </Link>
          </p>
        </div>

        {/* Important Note */}
        <div style={styles.noteContainer}>
          <p style={styles.noteText}>
            <span style={styles.noteIcon}>📌</span>
            <strong>Important Note:</strong> This registration is for customers only. SACCO operators and staff are onboarded by system administrators.
          </p>
        </div>

        {/* Back to home link */}
        <Link to="/" style={styles.backLink}>
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}

// ============================
// STYLES - Matching Login Page
// ============================
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '15px',
    padding: '40px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '600px',
    animation: 'slideIn 0.5s ease-out',
  },
  logoContainer: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  logo: {
    fontSize: '60px',
    marginBottom: '10px',
  },
  logoText: {
    fontSize: '28px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '5px',
  },
  tagline: {
    fontSize: '14px',
    color: '#666',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: '5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
    marginBottom: '20px',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  errorIcon: {
    fontSize: '20px',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '14px',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  rowContainer: {
    display: 'flex',
    gap: '15px',
  },
  halfWidth: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  inputContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '5px',
    fontWeight: '500',
    color: '#555',
    fontSize: '14px',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#f8fafc',
    transition: 'border 0.3s',
    outline: 'none',
  },
  inputError: {
    border: '1px solid #dc2626',
    backgroundColor: '#fef2f2',
  },
  errorMessage: {
    color: '#dc2626',
    fontSize: '12px',
    marginTop: '4px',
    marginBottom: 0,
  },
  helperText: {
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '4px',
    marginBottom: 0,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '14px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'background-color 0.3s',
  },
  loginLink: {
    textAlign: 'center',
    marginTop: '20px',
  },
  loginText: {
    fontSize: '14px',
    color: '#666',
  },
  loginLinkText: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: '600',
  },
  noteContainer: {
    marginTop: '20px',
    padding: '12px',
    backgroundColor: '#fff8e1',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
  },
  noteText: {
    fontSize: '12px',
    color: '#856404',
    margin: 0,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  noteIcon: {
    fontSize: '16px',
  },
  backLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: '15px',
    color: '#666',
    textDecoration: 'none',
    fontSize: '13px',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
    cursor: 'not-allowed',
  },
  loadingSpinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: '50%',
    borderTopColor: 'white',
    animation: 'spin 1s ease-in-out infinite',
  },
}

// Add keyframes for animations
const style = document.createElement('style')
style.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
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
document.head.appendChild(style)

export default RegisterPage