import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

/**
 * Header Component
 * Displays navigation based on user authentication status and role
 * User data comes from localStorage after successful login (from LoginPage)
 */
function Header() {
  const navigate = useNavigate()
  
  // Get user data from localStorage (stored after login)
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const token = localStorage.getItem('token')
  
  // Determine if user is logged in (has both user data and token)
  const isLoggedIn = !!(user && token)
  
  // Determine user role from stored user object
  const userRole = user?.role || null
  const isCustomer = userRole === 'customer'
  const isOperator = userRole === 'operator'
  const isAdmin = userRole === 'admin'

  // Get display name from user object
  const getDisplayName = () => {
    if (!user) return ''
    
    // Handle different role's name fields
    if (isCustomer) return user.name || user.customerName || user.email
    if (isOperator) return user.name || user.operatorName || user.email
    if (isAdmin) return user.name || user.adminName || user.email
    
    return user.email || 'User'
  }

  /**
   * Handle logout - Clear all authentication data
   */
  const handleLogout = () => {
    // Clear all auth-related items from localStorage
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('loginTime')
    localStorage.removeItem('rememberedEmail')
    
    // Optional: Call logout API to invalidate token on server
    // fetch(`${API_BASE_URL}/auth/logout`, {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${token}` }
    // })
    
    // Redirect to login page
    navigate('/login')
  }

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <nav style={styles.nav}>
          {/* Logo - Always visible, links to appropriate home */}
          <div style={styles.logo}>
            <Link to={isLoggedIn ? (isCustomer ? '/home' : '/') : '/'} style={styles.logoLink}>
              <span style={styles.logoIcon}>🚌</span>
              <span style={styles.logoText}>EasyRide SACCO</span>
            </Link>
          </div>

          {/* Navigation Links - Based on user role */}
          <ul style={styles.navLinks}>
            {isLoggedIn ? (
              <>
                {/* Customer Navigation */}
                {isCustomer && (
                  <>
                    <li><Link to="/home" style={styles.link}>🏠 Home</Link></li>
                    <li><Link to="/book" style={styles.link}>🎫 Book Now</Link></li>
                    <li><Link to="/my-bookings" style={styles.link}>📋 My Bookings</Link></li>
                  </>
                )}
                
                {/* Operator Navigation */}
                {isOperator && (
                  <>
                    <li><Link to="/operator/dashboard" style={styles.link}>📊 Dashboard</Link></li>
                    <li><Link to="/operator/book" style={styles.link}>📝 Book for Customer</Link></li>
                    <li><Link to="/operator/bookings" style={styles.link}>📋 All Bookings</Link></li>
                  </>
                )}
                
                {/* Admin Navigation */}
                {isAdmin && (
                  <>
                    <li><Link to="/admin" style={styles.link}>⚙️ Admin Panel</Link></li>
                    <li><Link to="/admin/operators" style={styles.link}>👥 Operators</Link></li>
                    <li><Link to="/admin/vehicles" style={styles.link}>🚌 Vehicles</Link></li>
                    <li><Link to="/admin/routes" style={styles.link}>🗺️ Routes</Link></li>
                    <li><Link to="/admin/reports" style={styles.link}>📊 Reports</Link></li>
                  </>
                )}
              </>
            ) : (
              // Public Navigation (not logged in)
              <>
                <li><Link to="/" style={styles.link}>🏠 Home</Link></li>
                <li><Link to="/book" style={styles.link}>🎫 Book Now</Link></li>
                <li><Link to="/about" style={styles.link}>ℹ️ About</Link></li>
                <li><Link to="/contact" style={styles.link}>📞 Contact</Link></li>
              </>
            )}
          </ul>

          {/* User Section - Shows user info or login/register buttons */}
          <div style={styles.userSection}>
            {isLoggedIn ? (
              <div style={styles.userInfo}>
                {/* User avatar/icon based on role */}
                <span style={styles.userAvatar}>
                  {isAdmin ? '⚙️' : isOperator ? '🏢' : '👤'}
                </span>
                
                {/* User name and role badge */}
                <div style={styles.userDetails}>
                  <span style={styles.userName}>
                    {getDisplayName()}
                  </span>
                  <span style={styles.userRole}>
                    {isAdmin ? 'Admin' : isOperator ? 'Operator' : 'Customer'}
                  </span>
                </div>
                
                {/* Logout button */}
                <button onClick={handleLogout} style={styles.logoutBtn}>
                  <span style={styles.logoutIcon}>🚪</span>
                  Logout
                </button>
              </div>
            ) : (
              // Login/Register buttons for non-authenticated users
              <div style={styles.authButtons}>
                <Link to="/login" style={styles.loginBtn}>
                  🔐 Login
                </Link>
                <Link to="/register" style={styles.registerBtn}>
                  📝 Register
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

/**
 * Styles object
 */
const styles = {
  header: {
    backgroundColor: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    color: '#333',
    transition: 'opacity 0.3s',
    ':hover': {
      opacity: 0.8,
    },
  },
  logoIcon: {
    fontSize: '28px',
    marginRight: '10px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  navLinks: {
    display: 'flex',
    listStyle: 'none',
    gap: '15px',
    alignItems: 'center',
    margin: 0,
    padding: 0,
  },
  link: {
    textDecoration: 'none',
    color: '#4b5563',
    fontWeight: '500',
    fontSize: '14px',
    padding: '8px 12px',
    borderRadius: '6px',
    transition: 'all 0.3s',
    ':hover': {
      backgroundColor: '#f3f4f6',
      color: '#3b82f6',
    },
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    backgroundColor: '#f8fafc',
    padding: '6px 12px',
    borderRadius: '30px',
    border: '1px solid #e2e8f0',
  },
  userAvatar: {
    fontSize: '20px',
    backgroundColor: '#e2e8f0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e293b',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: '10px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  authButtons: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  loginBtn: {
    backgroundColor: 'transparent',
    color: '#3b82f6',
    padding: '8px 16px',
    borderRadius: '20px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '13px',
    border: '2px solid #3b82f6',
    transition: 'all 0.3s',
    ':hover': {
      backgroundColor: '#3b82f6',
      color: 'white',
    },
  },
  registerBtn: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '13px',
    border: '2px solid #3b82f6',
    transition: 'all 0.3s',
    ':hover': {
      backgroundColor: '#2563eb',
      borderColor: '#2563eb',
    },
  },
  logoutBtn: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '6px 12px',
    border: 'none',
    borderRadius: '20px',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    ':hover': {
      backgroundColor: '#dc2626',
      transform: 'scale(1.05)',
    },
  },
  logoutIcon: {
    fontSize: '14px',
  },
}

// Add global hover styles
const style = document.createElement('style')
style.textContent = `
  a:hover {
    opacity: 0.8;
  }
  button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  @media (max-width: 768px) {
    nav {
      flex-direction: column;
      gap: 10px;
    }
    ul {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
`
document.head.appendChild(style)

export default Header