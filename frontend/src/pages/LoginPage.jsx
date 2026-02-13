import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

// API Configuration - Uses environment variable or falls back to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * LoginPage Component
 * Handles user authentication for customers, operators, and admins
 * Database Tables: customers, operators, admins
 * Backend Endpoint: POST /api/auth/login
 */
function LoginPage() {
  // ============================
  // STATE MANAGEMENT
  // ============================
  
  // Selected user type (customer, operator, admin)
  const [userType, setUserType] = useState('customer')
  
  // Form input values
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  
  // Loading state for API calls
  const [isLoading, setIsLoading] = useState(false)
  
  // Error state for displaying server errors
  const [error, setError] = useState('')
  
  // Remember me checkbox state
  const [rememberMe, setRememberMe] = useState(false)
  
  // Navigation hook for redirecting after login
  const navigate = useNavigate()

  // ============================
  // EFFECTS
  // ============================
  
  // Check if user was previously remembered
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }))
      setRememberMe(true)
    }
  }, [])

  // ============================
  // EVENT HANDLERS
  // ============================

  // Handle input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // Clear error when user starts typing
    if (error) setError('')
  }

  // Handle remember me checkbox
  const handleRememberMe = (e) => {
    setRememberMe(e.target.checked)
  }

  // Format phone number to match database format
  const formatPhoneNumber = (input) => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '')
    
    // If it's a Kenyan number starting with 0, convert to 254 format
    if (digits.startsWith('0') && digits.length === 10) {
      return '254' + digits.slice(1)
    }
    // If it already starts with 254, return as is
    if (digits.startsWith('254') && digits.length === 12) {
      return digits
    }
    // Otherwise, return original (might be email)
    return input
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Please enter both email/phone and password')
      return
    }

    // Start loading
    setIsLoading(true)
    setError('')

    try {
      // Prepare login data
      const loginData = {
        email: formData.email.trim(),
        password: formData.password,
        role: userType
      }

      console.log(`🔐 Attempting login as ${userType}:`, loginData.email)

      // 🔴 BACKEND API CALL
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error messages
        if (response.status === 401) {
          throw new Error('Invalid email/phone or password')
        } else if (response.status === 400) {
          throw new Error(data.message || 'Invalid request')
        } else {
          throw new Error(data.message || 'Login failed. Please try again.')
        }
      }

      // Login successful!
      console.log('✅ Login successful:', data)

      // Handle "Remember me" functionality
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      // Store user data and token in localStorage
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('token', data.token)
      
      // Store login timestamp for session management
      localStorage.setItem('loginTime', Date.now().toString())

      // Show success message
      alert(`✅ Welcome back, ${data.user.name || data.user.email}!`)

      // Redirect based on user role
      switch (data.user.role) {
        case 'admin':
          navigate('/admin')
          break
        case 'operator':
          navigate('/operator/dashboard')
          break
        case 'customer':
        default:
          navigate('/home')
          break
      }

    } catch (error) {
      console.error('❌ Login error:', error)
      setError(error.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to capitalize first letter
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoContainer}>
          <div style={styles.logo}>🚌</div>
          <h1 style={styles.logoText}>EasyRide SACCO</h1>
          <p style={styles.tagline}>Book your journey with confidence</p>
        </div>

        <h2 style={styles.title}>Login to Your Account</h2>

        {/* Error Display */}
        {error && (
          <div style={styles.errorContainer}>
            <span style={styles.errorIcon}>⚠️</span>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        {/* User Type Selection */}
        <div style={styles.userTypeContainer}>
          <h4 style={styles.userTypeTitle}>Log in as:</h4>
          <div style={styles.userTypeButtons}>
            <button
              type="button"
              onClick={() => setUserType('customer')}
              disabled={isLoading}
              style={{
                ...styles.userTypeButton,
                ...(userType === 'customer' ? styles.activeUserType : {}),
                ...(isLoading ? styles.disabledButton : {})
              }}
            >
              👤 Customer
            </button>

            <button
              type="button"
              onClick={() => setUserType('operator')}
              disabled={isLoading}
              style={{
                ...styles.userTypeButton,
                ...(userType === 'operator' ? styles.activeUserType : {}),
                ...(isLoading ? styles.disabledButton : {})
              }}
            >
              🏢 Operator
            </button>

            <button
              type="button"
              onClick={() => setUserType('admin')}
              disabled={isLoading}
              style={{
                ...styles.userTypeButton,
                ...(userType === 'admin' ? styles.activeUserType : {}),
                ...(isLoading ? styles.disabledButton : {})
              }}
            >
              ⚙️ Admin
            </button>
          </div>

          <p style={styles.userTypeNote}>
            {userType === 'customer' 
              ? 'Book and manage your travel' 
              : userType === 'operator'
              ? 'Manage bookings and customers' 
              : 'Manage operators and system settings'
            }
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputContainer}>
            <label style={styles.label}>
              {userType === 'customer' ? 'Email or Phone Number *' : 'Email *'}
            </label>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              style={{
                ...styles.input,
                ...(isLoading ? styles.disabledInput : {})
              }}
              placeholder={userType === 'customer' 
                ? "you@example.com or 0712345678" 
                : "you@example.com"
              }
              required
            />
          </div>

          <div style={styles.inputContainer}>
            <label style={styles.label}>Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              style={{
                ...styles.input,
                ...(isLoading ? styles.disabledInput : {})
              }}
              placeholder="••••••••"
              required
              minLength="6"
            />
            
            <div style={styles.passwordOptions}>
              <label style={styles.rememberLabel}>
                <input 
                  type="checkbox" 
                  style={styles.checkbox}
                  checked={rememberMe}
                  onChange={handleRememberMe}
                  disabled={isLoading}
                />
                Remember me
              </label>

              <a href="#" style={styles.forgotLink}>Forgot password?</a>
            </div>
          </div>

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
                Logging in...
              </span>
            ) : (
              `Login as ${capitalize(userType)}`
            )}
          </button>
        </form>

        {/* Registration Links */}
        <div style={styles.registrationInfo}>
          {userType === 'customer' && (
            <p style={styles.registerText}>
              Don't have an account?{' '}
              <Link to="/register" style={styles.registerLink}>
                Register as Customer
              </Link>
            </p>
          )}
          
          {(userType === 'operator' || userType === 'admin') && (
            <div style={styles.adminNote}>
              <p style={styles.noteTitle}>⚠️ Operator/Admin Registration</p>
              <p style={styles.noteText}>
                Operators and Admins cannot register here. 
                {userType === 'operator' 
                  ? ' Operators are added by administrators.' 
                  : ' Contact system administrator.'}
              </p>
              <p style={styles.noteText}>
                <Link 
                  to="/login" 
                  style={styles.switchLink} 
                  onClick={() => setUserType('customer')}
                >
                  Switch to Customer login
                </Link>
              </p>
            </div>
          )}
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
// STYLES
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
    maxWidth: '450px',
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
    marginBottom: '25px',
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
  userTypeContainer: {
    marginBottom: '25px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
  },
  userTypeTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '15px',
    color: '#475569',
    textAlign: 'center',
  },
  userTypeButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '10px',
  },
  userTypeButton: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    backgroundColor: 'white',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#64748b',
    transition: 'all 0.3s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
  },
  activeUserType: {
    backgroundColor: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6',
  },
  userTypeNote: {
    fontSize: '13px',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: '10px',
    fontStyle: 'italic',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '8px',
    fontWeight: '500',
    color: '#555',
    fontSize: '14px',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: '#f8fafc',
    transition: 'border 0.3s',
  },
  passwordOptions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
  },
  rememberLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#64748b',
  },
  checkbox: {
    width: '16px',
    height: '16px',
  },
  forgotLink: {
    fontSize: '14px',
    color: '#3b82f6',
    textDecoration: 'none',
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
  registrationInfo: {
    marginTop: '25px',
  },
  registerText: {
    textAlign: 'center',
    color: '#666',
    fontSize: '15px',
  },
  registerLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: '600',
  },
  adminNote: {
    backgroundColor: '#fff8e1',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    padding: '15px',
    marginTop: '15px',
  },
  noteTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#856404',
    marginBottom: '8px',
  },
  noteText: {
    fontSize: '13px',
    color: '#856404',
    marginBottom: '5px',
  },
  switchLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '500',
  },
  backLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: '20px',
    color: '#666',
    textDecoration: 'none',
    fontSize: '14px',
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
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,255,255,0.3)',
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

export default LoginPage