import React from 'react'
import { useNavigate } from 'react-router-dom'

function LandingPage() {
  const navigate = useNavigate()
  
  return (
    <div style={styles.container}>
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
            <div style={styles.primaryActions}>
              <button 
                style={styles.loginButton}
                onClick={() => navigate('/login')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                🔐 Login to System
              </button>
              <button 
                style={styles.registerButton}
                onClick={() => navigate('/register')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                👤 Register as Passenger
              </button>
            </div>
            
            <div style={styles.registerOptions}>
              <p style={styles.registerPrompt}>Need operator access?</p>
              <div style={styles.registerButtons}>
                <button 
                  style={styles.registerOperatorButton}
                  onClick={() => {
                    alert('Operators are added by administrators. Please login as admin or contact SACCO management.')
                    navigate('/login')
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  🏢 Operator Login
                </button>
                <button 
                  style={styles.registerAdminButton}
                  onClick={() => {
                    alert('Admin access is restricted. Please use existing admin credentials.')
                    navigate('/login')
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  ⚙️ Admin Login
                </button>
              </div>
            </div>
          </div>
          
          {/* Quick Footer Stats */}
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
      
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <p style={styles.footerText}>
            © 2025 EasyRide SACCO. All rights reserved.
          </p>
          <p style={styles.footerVersion}>
            Version 2.0.0
          </p>
        </div>
      </footer>
    </div>
  )
}

// STYLES OBJECT - Warm Cream/Amber Theme
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fef9e8, #fff5e6, #fef3e2)',
    display: 'flex',
    flexDirection: 'column',
  },

  hero: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    background: 'linear-gradient(135deg, #fef9e8, #fff5e6, #fef3e2)',
  },

  heroContent: {
    maxWidth: '1200px',
    width: '100%',
    textAlign: 'center',
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
    animation: 'bounce 1s ease infinite',
  },

  logoText: {
    fontSize: '36px',
    fontWeight: 'bold',
    margin: 0,
    background: 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },

  heroTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '20px',
    lineHeight: 1.3,
    color: '#78350f',
  },

  heroSubtitle: {
    fontSize: '18px',
    maxWidth: '800px',
    margin: '0 auto 40px',
    lineHeight: 1.6,
    color: '#92400e',
  },

  overview: {
    backgroundColor: '#fffbef',
    borderRadius: '20px',
    padding: '40px',
    marginBottom: '40px',
    border: '1px solid #fed7aa',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
  },

  overviewTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '30px',
    color: '#78350f',
  },

  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
    marginBottom: '30px',
  },

  featureCard: {
    backgroundColor: 'white',
    borderRadius: '15px',
    padding: '25px',
    textAlign: 'left',
    border: '1px solid #fed7aa',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    transition: 'transform 0.3s, box-shadow 0.3s',
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
    color: '#78350f',
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
    lineHeight: 1.5,
    color: '#92400e',
  },

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

  loginButton: {
    background: 'linear-gradient(135deg, #059669, #10b981)',
    color: 'white',
    padding: '18px 40px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'transform 0.3s, box-shadow 0.3s',
    boxShadow: '0 10px 20px rgba(5, 150, 105, 0.2)',
    minWidth: '250px',
  },

  registerButton: {
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: 'white',
    padding: '18px 40px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'transform 0.3s, box-shadow 0.3s',
    boxShadow: '0 10px 20px rgba(245, 158, 11, 0.2)',
    minWidth: '250px',
  },

  registerOptions: {
    backgroundColor: '#fffbef',
    borderRadius: '15px',
    padding: '25px',
    maxWidth: '500px',
    margin: '0 auto',
    border: '1px solid #fed7aa',
  },

  registerPrompt: {
    fontSize: '16px',
    marginBottom: '15px',
    color: '#92400e',
  },

  registerButtons: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  registerOperatorButton: {
    background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    color: 'white',
    padding: '12px 25px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'transform 0.2s',
  },

  registerAdminButton: {
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    color: 'white',
    padding: '12px 25px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'transform 0.2s',
  },

  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
    marginTop: '40px',
  },

  statItem: {
    backgroundColor: '#fffbef',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #fed7aa',
    transition: 'transform 0.3s',
  },

  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '5px',
    color: '#d97706',
  },

  statLabel: {
    fontSize: '14px',
    color: '#92400e',
  },

  footer: {
    backgroundColor: '#78350f',
    color: 'white',
    padding: '30px 20px',
  },

  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    textAlign: 'center',
  },

  footerText: {
    fontSize: '14px',
    marginBottom: '5px',
    opacity: 0.8,
  },

  footerVersion: {
    fontSize: '10px',
    opacity: 0.5,
    marginTop: '5px',
  },
}

// Add hover effects and animations
const addStyles = () => {
  const style = document.createElement('style')
  style.textContent = `
    button:hover {
      opacity: 0.9;
    }
    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
    }
    .stat-item:hover {
      transform: translateY(-2px);
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
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
    .feature-card, .stat-item {
      animation: slideIn 0.5s ease-out;
    }
    
    /* Responsive styles */
    @media (max-width: 768px) {
      .hero-title {
        font-size: 24px;
      }
      .hero-subtitle {
        font-size: 16px;
      }
      .login-button, .register-button {
        font-size: 16px;
        padding: 14px 30px;
      }
      .logo-text {
        font-size: 28px;
      }
      .overview {
        padding: 20px;
      }
      .feature-card {
        padding: 15px;
      }
    }
  `
  document.head.appendChild(style)
}

// Initialize styles
if (typeof window !== 'undefined') {
  addStyles()
}

export default LandingPage