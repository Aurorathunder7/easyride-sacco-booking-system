
import React from 'react'

// Import a hook from React Router that lets us navigate between pages programmatically
import { useNavigate } from 'react-router-dom'

// LandingPage - this is the homepage of our app
function LandingPage() {
  const navigate = useNavigate()
  return (
    <div style={styles.container}>
      {}
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          {/* Logo section with bus emoji and company name */}
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🚌</span>
            <h1 style={styles.logoText}>EasyRide SACCO</h1>
          </div>

          <h2 style={styles.heroTitle}>
            Welcome to EasyRide SACCO Booking App
          </h2>

          <p style={styles.heroSubtitle}>
            Book your matatu journeys online with ease, safety, and convenience.
            Say goodbye to long queues and hello to hassle-free travel planning!
          </p>
          
          {/* System Overview - explains different user roles */}
          <div style={styles.overview}>
            <h3 style={styles.overviewTitle}>App Overview</h3>
            
            {/* Container that holds all feature cards in a grid layout */}
            <div style={styles.features}>

              {/* PASSENGER CARD - first column */}
              <div style={styles.featureCard}>
                <div style={styles.featureIcon}>👤</div>
                <h4 style={styles.featureTitle}>For Passengers</h4>

                {/* List of passenger features */}
                <div style={styles.featureList}>
                  <div style={styles.featureListItem}>✓ Search and book available routes</div>
                  <div style={styles.featureListItem}>✓ Select seats with visual seat map</div>
                  <div style={styles.featureListItem}>✓ Secure M-Pesa payments</div>
                  <div style={styles.featureListItem}>✓ Receive digital tickets via SMS/Email</div>
                  <div style={styles.featureListItem}>✓ View booking history</div>
                </div>
              </div>
              
              {/* OPERATOR CARD - second column */}
              <div style={styles.featureCard}>
                <div style={styles.featureIcon}>🏢</div>
                <h4 style={styles.featureTitle}>For Operators</h4>

                {/* List of operator features */}
                <div style={styles.featureList}>
                  <div style={styles.featureListItem}>✓ Book tickets on behalf of customers</div>
                  <div style={styles.featureListItem}>✓ Manage customer bookings</div>
                  <div style={styles.featureListItem}>✓ Send SMS notifications</div>
                  <div style={styles.featureListItem}>✓ Print physical tickets</div>
                </div>
              </div>
              
              {/* SECURITY & RELIABILITY CARD - third column */}
              <div style={styles.featureCard}>
                <div style={styles.featureIcon}>🛡️</div>
                <h4 style={styles.featureTitle}>Secure & Reliable</h4>
                
                {/* List of system features/benefits */}
                <div style={styles.featureList}>
                  <div style={styles.featureListItem}>✓ Secure user authentication</div>
                  <div style={styles.featureListItem}>✓ Real-time seat availability</div>
                  <div style={styles.featureListItem}>✓ Automatic backups</div>
                  <div style={styles.featureListItem}>✓ 24/7 system availability</div>
                  <div style={styles.featureListItem}>✓ Multi-user support</div>
                </div>
              </div>
            </div>
          </div>
          
          
          {/* Action Buttons - main call-to-action section */}
          <div style={styles.actions}>
            {/* Primary login/register buttons - large and prominent */}
            <div style={styles.primaryActions}>
              <button 
                style={styles.loginButton}
                onClick={() => navigate('/login')}
              >
                🔐 Login to System
              </button>
              <button 
                style={styles.registerButton}
                onClick={() => navigate('/register')}
              >
                👤 Register as Passenger
              </button>
            </div>
            
            {/* Secondary options for operators and admins */}
            <div style={styles.registerOptions}>
              <p style={styles.registerPrompt}>Need operator access?</p>
              <div style={styles.registerButtons}>
                {/* Operator button shows alert then redirects to login */}
                <button 
                  style={styles.registerOperatorButton}
                  onClick={() => {
                    alert('Operators are added by administrators. Please login as admin or contact SACCO management.');
                    navigate('/login');
                  }}
                >
                  🏢 Operator Login
                </button>
                {/* Admin button shows alert then redirects to login */}
                <button 
                  style={styles.registerAdminButton}
                  onClick={() => {
                    alert('Admin access is restricted. Please use existing admin credentials.');
                    navigate('/login');
                  }}
                >
                  ⚙️ Admin Login
                </button>
              </div>
            </div>
          </div>
          
          {/* Quick Footer Stats - displays impressive numbers to build trust */}
          <div style={styles.stats}>
            <div style={styles.statItem}>
              <div style={styles.statNumber}>500+</div>
              <div style={styles.statLabel}>Daily Bookings</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statNumber}>10+</div>
              <div style={styles.statLabel}>Routes</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statNumber}>24/7</div>
              <div style={styles.statLabel}>Support</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer - appears at the bottom of the page */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          {/* Copyright notice */}
          <p style={styles.footerText}>
            © 2025 EasyRide SACCO. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

// STYLES OBJECT - Contains all CSS styles for the component
// Each property defines how different elements should look
const styles = {
  
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
  },

  hero: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },

  heroContent: {
    maxWidth: '1200px',
    width: '100%',
    textAlign: 'center',
    color: 'white',
  },

  logo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '40px',
  },

  logoIcon: {
    fontSize: '60px',
    marginBottom: '15px',
  },

  logoText: {
    fontSize: '36px',
    fontWeight: 'bold',
    margin: 0,
  },

  heroTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '20px',
    lineHeight: 1.3,
  },

  heroSubtitle: {
    fontSize: '18px',
    opacity: 0.9,
    maxWidth: '800px',
    margin: '0 auto 40px',
    lineHeight: 1.6,
  },

  overview: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)', // Creates frosted glass effect
    borderRadius: '20px',
    padding: '40px',
    marginBottom: '40px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },

  overviewTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '30px',
    color: 'white',
  },

  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
    marginBottom: '30px',
  },

  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '15px',
    padding: '25px',
    textAlign: 'left',
    backdropFilter: 'blur(5px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },

  featureIcon: {
    fontSize: '40px',
    marginBottom: '15px',
    textAlign: 'center',
  },

  featureTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '15px',
    color: 'white',
    textAlign: 'center',
  },

  featureList: {
    margin: 0,
    padding: 0,
    flex: 1,
  },

  featureListItem: {
    fontSize: '14px',
    marginBottom: '8px',
    paddingLeft: '20px',
    position: 'relative',
    opacity: 0.9,
    lineHeight: 1.5,
  },

  featureAction: {
    marginTop: '20px',
    textAlign: 'center',
  },
  // Green button for passenger registration
  featureButton: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.3s',
  },
  // Purple button for operator contact
  featureButtonSecondary: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.3s',
  },
  // Blue button for login
  featureButtonTertiary: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.3s',
  },
  // Actions container
  actions: {
    marginBottom: '40px',
  },

  primaryActions: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
  },
  // Large blue login button
  loginButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '18px 40px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'transform 0.3s, box-shadow 0.3s',
    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
    minWidth: '250px',
  },
  // Large green register button
  registerButton: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '18px 40px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'transform 0.3s, box-shadow 0.3s',
    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
    minWidth: '250px',
  },
  // Secondary options container - semi-transparent background
  registerOptions: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '15px',
    padding: '25px',
    maxWidth: '500px',
    margin: '0 auto',
  },
  // Prompt text
  registerPrompt: {
    fontSize: '16px',
    marginBottom: '15px',
    opacity: 0.9,
  },
  // Secondary buttons container
  registerButtons: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  // Purple operator button
  registerOperatorButton: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    padding: '12px 25px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'transform 0.2s',
  },
  // Indigo admin button
  registerAdminButton: {
    backgroundColor: '#6366f1',
    color: 'white',
    padding: '12px 25px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'transform 0.2s',
  },
  // Stats grid
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
    marginTop: '40px',
  },
  // Individual stats card(column) - frosted glass
  statItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '20px',
    backdropFilter: 'blur(5px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  // Stat number
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  // Stat label
  statLabel: {
    fontSize: '14px',
    opacity: 0.9,
  },
  // Footer
  footer: {
    backgroundColor: '#1e293b',
    color: 'white',
    padding: '30px 20px',
  },
  // Footer content container
  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    textAlign: 'center',
  },
  // Footer text
  footerText: {
    fontSize: '16px',
    marginBottom: '10px',
    opacity: 0.8,
  },
}

// Function to add hover effects via CSS
const addHoverEffects = () => {
  const style = document.createElement('style')
  style.textContent = `
    button:hover {
      opacity: 0.9;
      transform: translateY(-2px);
    }
    .login-button:hover {
      background-color: #2563eb;
    }
    .register-button:hover {
      background-color: #059669;
    }
    .register-operator-button:hover {
      background-color: #7c3aed;
    }
    .register-admin-button:hover {
      background-color: #4f46e5;
    }
    .feature-button:hover {
      opacity: 0.9;
    }
  `
  document.head.appendChild(style)
}
// Initialize hover effects
if (typeof window !== 'undefined') {
  addHoverEffects()
}

export default LandingPage