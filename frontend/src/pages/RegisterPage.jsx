// src/pages/RegisterPage.jsx
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import apiFetch from '../utils/api'  // Import the apiFetch helper

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * RegisterPage Component
 * Provides a comprehensive registration form for new customers
 */
const RegisterPage = () => {
  // ============================
  // STATE MANAGEMENT
  // ============================
  
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

  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const navigate = useNavigate()

  // ============================
  // EVENT HANDLERS
  // ============================

  const handleChange = (e) => {
    setCustomer({
      ...customer,
      [e.target.name]: e.target.value,
    })
    
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' })
    }
    if (serverError) setServerError('')
  }

  const validateForm = () => {
    const newErrors = {}
    
    // Full Name Validation
    if (!customer.customerName.trim()) {
      newErrors.customerName = 'Full name is required'
    } else if (customer.customerName.length < 3) {
      newErrors.customerName = 'Name must be at least 3 characters'
    }
    
    // Email Validation
    if (!customer.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^\S+@\S+\.\S+$/.test(customer.email)) {
      newErrors.email = 'Please enter a valid email address (e.g., name@example.com)'
    }
    
    // Date of Birth Validation
    if (!customer.dob) {
      newErrors.dob = 'Date of birth is required'
    } else {
      const today = new Date()
      const birthDate = new Date(customer.dob)
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      if (age < 18) {
        newErrors.dob = 'You must be at least 18 years old to register'
      }
    }
    
    // Gender Validation
    if (!customer.gender) {
      newErrors.gender = 'Please select your gender'
    }
    
    // Phone Validation
    if (!customer.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required'
    } else {
      const phoneDigits = customer.phoneNumber.replace(/\D/g, '')
      if (!/^[0-9]{10}$/.test(phoneDigits) && !/^254[0-9]{9}$/.test(phoneDigits)) {
        newErrors.phoneNumber = 'Phone number must be 10 digits (e.g., 0712345678) or start with 254'
      }
    }
    
    // Address Validation
    if (!customer.address.trim()) {
      newErrors.address = 'Address is required'
    }
    
    // Password Validation
    if (!customer.password) {
      newErrors.password = 'Password is required'
    } else if (customer.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long'
    } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(customer.password)) {
      newErrors.password = 'Password must contain at least one letter and one number'
    }
    
    // Confirm Password
    if (customer.password !== customer.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    return newErrors
  }

  const formatPhoneNumber = (phone) => {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('0')) {
      return '254' + digits.slice(1)
    } else if (digits.startsWith('254')) {
      return digits
    }
    return '254' + digits
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const formErrors = validateForm()
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors)
      const firstErrorField = document.querySelector('[class*="border-red-500"]')
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    setIsLoading(true)
    setServerError('')

    try {
      const registrationData = {
        customerName: customer.customerName.trim(),
        email: customer.email.trim().toLowerCase(),
        dob: customer.dob,
        gender: customer.gender,
        phoneNumber: formatPhoneNumber(customer.phoneNumber),
        address: customer.address.trim(),
        password: customer.password
      }

      // Use apiFetch instead of direct fetch
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registrationData)
      })

      localStorage.setItem('registeredEmail', registrationData.email)
      alert('✅ Registration successful! Please login with your credentials.')
      navigate('/login')
      
    } catch (error) {
      console.error('❌ Registration error:', error)
      
      // Handle specific error messages
      if (error.message?.includes('email already exists')) {
        setServerError('This email is already registered. Please use a different email or login.')
      } else if (error.message?.includes('phone number already exists')) {
        setServerError('This phone number is already registered. Please use a different number or login.')
      } else {
        setServerError(error.message || 'Registration failed. Please try again.')
      }
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
      <div style={styles.formContainer}>
        {/* Logo Section */}
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>🚌</div>
          <h1 style={styles.logoTitle}>EasyRide SACCO</h1>
          <p style={styles.logoSubtitle}>Matatu Booking System</p>
        </div>

        <h2 style={styles.title}>Create Account</h2>
        <p style={styles.subtitle}>Join our community of satisfied travelers</p>

        {/* Server Error Display */}
        {serverError && (
          <div style={styles.errorAlert}>
            <span style={styles.errorIcon}>⚠️</span>
            <p style={styles.errorMessage}>{serverError}</p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Full Name */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>👤</span>
              Full Name *
            </label>
            <input
              type="text"
              name="customerName"
              value={customer.customerName}
              onChange={handleChange}
              disabled={isLoading}
              style={{
                ...styles.input,
                borderColor: errors.customerName ? '#ef4444' : '#fed7aa',
                background: errors.customerName ? '#fef2f2' : '#fffbef',
                opacity: isLoading ? 0.6 : 1,
              }}
              placeholder="John Doe"
            />
            {errors.customerName && (
              <p style={styles.errorText}>{errors.customerName}</p>
            )}
          </div>

          {/* Email */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>📧</span>
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={customer.email}
              onChange={handleChange}
              disabled={isLoading}
              style={{
                ...styles.input,
                borderColor: errors.email ? '#ef4444' : '#fed7aa',
                background: errors.email ? '#fef2f2' : '#fffbef',
                opacity: isLoading ? 0.6 : 1,
              }}
              placeholder="john@example.com"
            />
            {errors.email && (
              <p style={styles.errorText}>{errors.email}</p>
            )}
          </div>

          {/* Date of Birth & Gender Row */}
          <div style={styles.rowGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <span style={styles.labelIcon}>📅</span>
                Date of Birth *
              </label>
              <input
                type="date"
                name="dob"
                value={customer.dob}
                onChange={handleChange}
                disabled={isLoading}
                max={new Date().toISOString().split('T')[0]}
                style={{
                  ...styles.input,
                  borderColor: errors.dob ? '#ef4444' : '#fed7aa',
                  background: errors.dob ? '#fef2f2' : '#fffbef',
                  opacity: isLoading ? 0.6 : 1,
                }}
              />
              {errors.dob && (
                <p style={styles.errorText}>{errors.dob}</p>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <span style={styles.labelIcon}>⚥</span>
                Gender *
              </label>
              <select
                name="gender"
                value={customer.gender}
                onChange={handleChange}
                disabled={isLoading}
                style={{
                  ...styles.select,
                  borderColor: errors.gender ? '#ef4444' : '#fed7aa',
                  background: errors.gender ? '#fef2f2' : '#fffbef',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                <option value="">Select Gender</option>
                <option value="Male">👨 Male</option>
                <option value="Female">👩 Female</option>
                <option value="Other">🧑 Other</option>
              </select>
              {errors.gender && (
                <p style={styles.errorText}>{errors.gender}</p>
              )}
            </div>
          </div>

          {/* Phone Number */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>📱</span>
              Phone Number *
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={customer.phoneNumber}
              onChange={handleChange}
              disabled={isLoading}
              style={{
                ...styles.input,
                borderColor: errors.phoneNumber ? '#ef4444' : '#fed7aa',
                background: errors.phoneNumber ? '#fef2f2' : '#fffbef',
                opacity: isLoading ? 0.6 : 1,
              }}
              placeholder="0712345678"
            />
            {errors.phoneNumber && (
              <p style={styles.errorText}>{errors.phoneNumber}</p>
            )}
            <p style={styles.helperText}>Format: 0712345678 or 254712345678</p>
          </div>

          {/* Address */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>🏠</span>
              Address *
            </label>
            <input
              type="text"
              name="address"
              value={customer.address}
              onChange={handleChange}
              disabled={isLoading}
              style={{
                ...styles.input,
                borderColor: errors.address ? '#ef4444' : '#fed7aa',
                background: errors.address ? '#fef2f2' : '#fffbef',
                opacity: isLoading ? 0.6 : 1,
              }}
              placeholder="Nairobi, Kenya"
            />
            {errors.address && (
              <p style={styles.errorText}>{errors.address}</p>
            )}
          </div>

          {/* Password & Confirm Password Row */}
          <div style={styles.rowGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <span style={styles.labelIcon}>🔒</span>
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={customer.password}
                onChange={handleChange}
                disabled={isLoading}
                style={{
                  ...styles.input,
                  borderColor: errors.password ? '#ef4444' : '#fed7aa',
                  background: errors.password ? '#fef2f2' : '#fffbef',
                  opacity: isLoading ? 0.6 : 1,
                }}
                placeholder="Min. 6 characters"
              />
              {errors.password && (
                <p style={styles.errorText}>{errors.password}</p>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <span style={styles.labelIcon}>✓</span>
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={customer.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
                style={{
                  ...styles.input,
                  borderColor: errors.confirmPassword ? '#ef4444' : '#fed7aa',
                  background: errors.confirmPassword ? '#fef2f2' : '#fffbef',
                  opacity: isLoading ? 0.6 : 1,
                }}
                placeholder="Re-enter password"
              />
              {errors.confirmPassword && (
                <p style={styles.errorText}>{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...styles.submitButton,
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <span style={styles.loadingSpinner}>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
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
        <div style={styles.noteBox}>
          <p style={styles.noteText}>
            <span style={styles.noteIcon}>📌</span>
            <span>
              <strong>Important Note:</strong> This registration is for customers only. SACCO operators and staff are onboarded by system administrators.
            </span>
          </p>
        </div>

        {/* Back to home link */}
        <Link to="/" style={styles.backLink}>
          ← Back to Home
        </Link>
      </div>

      {/* Add animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
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
      ` }} />
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fef9e8, #fff5e6, #fef3e2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
  },
  formContainer: {
    maxWidth: '32rem',
    width: '100%',
    background: 'white',
    borderRadius: '1.5rem',
    padding: '2rem 1.5rem',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    animation: 'slideIn 0.5s ease-out',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  logoIcon: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
    animation: 'bounce 1s ease infinite',
  },
  logoTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.25rem',
  },
  logoSubtitle: {
    color: '#b45309',
    fontSize: '0.75rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#78350f',
    textAlign: 'center',
    marginBottom: '0.25rem',
  },
  subtitle: {
    color: '#b45309',
    fontSize: '0.875rem',
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  errorAlert: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '0.75rem',
    padding: '0.75rem',
    marginBottom: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  errorIcon: {
    fontSize: '1.25rem',
  },
  errorMessage: {
    color: '#991b1b',
    fontSize: '0.875rem',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  rowGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '1rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#78350f',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  labelIcon: {
    fontSize: '1rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'all 0.3s',
    backgroundColor: '#fffbef',
    color: '#78350f',
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'all 0.3s',
    backgroundColor: '#fffbef',
    color: '#78350f',
    cursor: 'pointer',
  },
  errorText: {
    color: '#ef4444',
    fontSize: '0.75rem',
    marginTop: '0.25rem',
  },
  helperText: {
    color: '#b45309',
    fontSize: '0.7rem',
    marginTop: '0.25rem',
  },
  submitButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    fontWeight: '600',
    padding: '0.75rem 1rem',
    borderRadius: '0.75rem',
    border: 'none',
    fontSize: '0.875rem',
    marginTop: '0.5rem',
    transition: 'all 0.3s',
  },
  loadingSpinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  loginLink: {
    textAlign: 'center',
    marginTop: '1.25rem',
  },
  loginText: {
    color: '#92400e',
    fontSize: '0.875rem',
  },
  loginLinkText: {
    color: '#f59e0b',
    fontWeight: '600',
    textDecoration: 'none',
  },
  noteBox: {
    marginTop: '1.25rem',
    padding: '0.75rem',
    backgroundColor: '#fffbeb',
    border: '1px solid #fed7aa',
    borderRadius: '0.75rem',
  },
  noteText: {
    color: '#b45309',
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
  },
  noteIcon: {
    fontSize: '0.875rem',
  },
  backLink: {
    display: 'block',
    textAlign: 'center',
    color: '#b45309',
    fontSize: '0.75rem',
    marginTop: '1rem',
    textDecoration: 'none',
  },
}

// Add media query styles
const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @media (min-width: 768px) {
    .row-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
  }
  
  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  .animate-bounce {
    animation: bounce 1s ease infinite;
  }
  
  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
  
  input:focus, select:focus {
    border-color: #f59e0b !important;
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
  }
`
document.head.appendChild(styleSheet)

export default RegisterPage