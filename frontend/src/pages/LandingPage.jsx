import React from 'react'
import { useNavigate } from 'react-router-dom'

// Matatu stage image URL (Pexels - reliable free stock photos)
const MATATU_STAGE_IMAGE = 'https://landtransportguru.net/web/wp-content/uploads/2024/03/JB-Sentral-Ter-Mar24-1.jpg'

function LandingPage() {
  const navigate = useNavigate()
  
  return (
    <div style={styles.container}>
      {/* Hero Section with Background Image */}
      <div style={styles.hero}>
        <div style={styles.overlay}></div>
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
          </div>
          
          {/* Quick Stats */}
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

// STYLES OBJECT
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },

  hero: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    backgroundImage: `url('${MATATU_STAGE_IMAGE}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(0,0,0,0.75), rgba(0,0,0,0.6), rgba(245, 158, 11, 0.3))',
  },

  heroContent: {
    position: 'relative',
    zIndex: 2,
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
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
  },

  logoText: {
    fontSize: '48px',
    fontWeight: 'bold',
    margin: 0,
    background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },

  heroTitle: {
    fontSize: '42px',
    fontWeight: 'bold',
    marginBottom: '20px',
    lineHeight: 1.3,
    color: 'white',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },

  heroSubtitle: {
    fontSize: '20px',
    maxWidth: '800px',
    margin: '0 auto 40px',
    lineHeight: 1.6,
    color: 'rgba(255,255,255,0.95)',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
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
    padding: '16px 40px',
    border: 'none',
    borderRadius: '50px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.4)',
    minWidth: '220px',
  },

  registerButton: {
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: 'white',
    padding: '16px 40px',
    border: 'none',
    borderRadius: '50px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)',
    minWidth: '220px',
  },

  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '30px',
    marginTop: '60px',
  },

  statItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '25px 20px',
    textAlign: 'center',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  },

  statNumber: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#d97706',
  },

  statLabel: {
    fontSize: '14px',
    color: '#78350f',
    fontWeight: '500',
  },

  footer: {
    backgroundColor: '#1e293b',
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
      transform: translateY(-3px) !important;
      box-shadow: 0 15px 30px -8px rgba(0,0,0,0.3) !important;
    }
    .stat-item:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 35px -10px rgba(0,0,0,0.2);
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .stat-item {
      animation: fadeInUp 0.6s ease-out forwards;
    }
    .stat-item:nth-child(1) { animation-delay: 0.1s; }
    .stat-item:nth-child(2) { animation-delay: 0.2s; }
    .stat-item:nth-child(3) { animation-delay: 0.3s; }
    
    /* Responsive styles */
    @media (max-width: 768px) {
      .hero-title {
        font-size: 28px;
      }
      .hero-subtitle {
        font-size: 16px;
      }
      .login-button, .register-button {
        font-size: 14px;
        padding: 12px 24px;
        min-width: 180px;
      }
      .logo-text {
        font-size: 32px;
      }
      .stat-number {
        font-size: 28px;
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