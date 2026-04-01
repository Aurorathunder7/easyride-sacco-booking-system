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
// STYLES - Warm Cream/Amber Color Scheme
// ============================
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #fef9e8, #fff5e6, #fef3e2)',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '1rem',
    padding: '2rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.02)',
    width: '100%',
    maxWidth: '450px',
    animation: 'slideIn 0.5s ease-out',
    border: '1px solid #fed7aa',
  },
  logoContainer: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  logo: {
    fontSize: '4rem',
    marginBottom: '0.5rem',
    animation: 'bounce 1s ease infinite',
  },
  logoText: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.25rem',
  },
  tagline: {
    fontSize: '0.875rem',
    color: '#92400e',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#78350f',
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '0.75rem',
    padding: '0.75rem',
    marginBottom: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  errorIcon: {
    fontSize: '1.125rem',
  },
  errorText: {
    color: '#991b1b',
    fontSize: '0.875rem',
    margin: 0,
    flex: 1,
  },
  userTypeContainer: {
    marginBottom: '1.5rem',
    padding: '1.25rem',
    backgroundColor: '#fffbef',
    borderRadius: '0.75rem',
    border: '1px solid #fed7aa',
  },
  userTypeTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    marginBottom: '0.75rem',
    color: '#b45309',
    textAlign: 'center',
  },
  userTypeButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  userTypeButton: {
    padding: '0.625rem',
    border: '2px solid #fed7aa',
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#92400e',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
  },
  activeUserType: {
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: 'white',
    borderColor: '#f59e0b',
  },
  userTypeNote: {
    fontSize: '0.75rem',
    color: '#b45309',
    textAlign: 'center',
    marginTop: '0.5rem',
    fontStyle: 'italic',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '0.5rem',
    fontWeight: '500',
    color: '#78350f',
    fontSize: '0.875rem',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #fed7aa',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    backgroundColor: '#fffbef',
    transition: 'all 0.3s',
    outline: 'none',
    color: '#78350f',
  },
  passwordOptions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.5rem',
  },
  rememberLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#92400e',
    cursor: 'pointer',
  },
  checkbox: {
    width: '1rem',
    height: '1rem',
    cursor: 'pointer',
    accentColor: '#f59e0b',
  },
  forgotLink: {
    fontSize: '0.875rem',
    color: '#f59e0b',
    textDecoration: 'none',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #059669, #10b981)',
    color: 'white',
    padding: '0.75rem',
    border: 'none',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
    transition: 'all 0.3s',
  },
  registrationInfo: {
    marginTop: '1.5rem',
  },
  registerText: {
    textAlign: 'center',
    color: '#92400e',
    fontSize: '0.875rem',
  },
  registerLink: {
    color: '#f59e0b',
    textDecoration: 'none',
    fontWeight: '600',
  },
  adminNote: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fed7aa',
    borderRadius: '0.75rem',
    padding: '1rem',
    marginTop: '1rem',
  },
  noteTitle: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#b45309',
    marginBottom: '0.5rem',
  },
  noteText: {
    fontSize: '0.7rem',
    color: '#92400e',
    marginBottom: '0.25rem',
  },
  switchLink: {
    color: '#f59e0b',
    textDecoration: 'none',
    fontSize: '0.7rem',
    fontWeight: '500',
  },
  backLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: '1.25rem',
    color: '#92400e',
    textDecoration: 'none',
    fontSize: '0.875rem',
    transition: 'color 0.3s',
  },
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  disabledInput: {
    backgroundColor: '#fef3e2',
    cursor: 'not-allowed',
  },
  loadingSpinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  spinner: {
    display: 'inline-block',
    width: '1.125rem',
    height: '1.125rem',
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
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`
document.head.appendChild(style)

export default LoginPage