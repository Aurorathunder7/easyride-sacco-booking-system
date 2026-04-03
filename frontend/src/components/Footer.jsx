import React from 'react'
import { Link } from 'react-router-dom'

// Footer
function Footer() {
  return (
    <footer style={styles.footer}>
      <div className="container" style={styles.container}>
        <div style={styles.content}>
          <div style={styles.logoSection}>
            {/* Bus logo */}
            <span style={styles.logo}>🚌</span>
            {/* Company name */}
            <span style={styles.logoText}>EasyRide SACCO</span>
            {/* company description */}
            <p style={styles.tagline}>
              Making travel easy, safe, and affordable for everyone. Book your ride with us today and experience the difference!
            </p>
          </div>
          
          {/* Links section */}
          <div style={styles.linksSection}>
            {/* Quick Links column */}
            <div style={styles.linksColumn}>
              <h4 style={styles.linksTitle}>Quick Links</h4>
              {/* Navigation links - using React Router Link for SPA navigation */}
              <Link to="/" style={styles.link}>Home</Link>
              <Link to="/book" style={styles.link}>Book Now</Link>
              <Link to="/my-bookings" style={styles.link}>My Bookings</Link>
              <Link to="/login" style={styles.link}>Login</Link>
              <Link to="/register" style={styles.link}>Register</Link>
            </div>
            
            {/* Contact Information */}
            <div style={styles.linksColumn}>
              <h4 style={styles.linksTitle}>Contact Us</h4>
              {/* Phone number */}
              <p style={styles.contactInfo}>📞 0797338021</p>
              {/* Email address */}
              <p style={styles.contactInfo}>📧 antomure122@gmail.com</p>
              {/* Location */}
              <p style={styles.contactInfo}>📍 Nairobi, Kenya</p>
              {/* Working Hours */}
              <p style={styles.contactInfo}>🕒 Mon-Sun: 6:00 AM - 10:00 PM</p>
            </div>

            {/* Social Media Links */}
            <div style={styles.linksColumn}>
              <h4 style={styles.linksTitle}>Follow Us</h4>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={styles.socialLink}
              >
                📘 Facebook
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={styles.socialLink}
              >
                🐦 Twitter
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={styles.socialLink}
              >
                📷 Instagram
              </a>
              <a 
                href="https://whatsapp.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={styles.socialLink}
              >
                💬 WhatsApp
              </a>
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div style={styles.copyright}>
          <p>© 2025 EasyRide SACCO. All rights reserved.</p>
          <p style={styles.version}>Version 2.0.0</p>
        </div>
      </div>
    </footer>
  )
}

// STYLES
const styles = {
  // Main footer container
  footer: {
    backgroundColor: '#1e293b',
    color: 'white',
    padding: '40px 0 20px',
    marginTop: '50px',
  },
  // Container for content
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  // Main content
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '40px',
    marginBottom: '20px',
  },
  // Logo and tagline container
  logoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  // Bus logo style
  logo: {
    fontSize: '32px',
    marginBottom: '10px',
  },
  // Company name text
  logoText: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '15px',
    background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  // Tagline/description text
  tagline: {
    fontSize: '14px',
    opacity: 0.8,
    lineHeight: 1.6,
    maxWidth: '400px',
  },
  // Links section container
  linksSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '30px',
    alignItems: 'start',
    justifyContent: 'center',
  },
  // Individual link column
  linksColumn: {
    display: 'flex',
    flexDirection: 'column', // Stack links vertically
    alignItems: 'flex-start',
  },
  // Column title (Quick Links, Contact Us)
  linksTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '20px',
    color: '#fbbf24',
  },
  // Navigation link style
  link: {
    color: 'white',
    textDecoration: 'none',
    marginBottom: '12px',
    opacity: 0.8,
    fontSize: '14px',
    transition: 'all 0.3s',
    ':hover': {
      opacity: 1,
      transform: 'translateX(5px)',
      color: '#fbbf24',
    },
  },
  // Social media link style
  socialLink: {
    color: 'white',
    textDecoration: 'none',
    marginBottom: '12px',
    opacity: 0.8,
    fontSize: '14px',
    transition: 'all 0.3s',
    display: 'inline-block',
  },
  // Contact information text
  contactInfo: {
    fontSize: '14px',
    marginBottom: '10px',
    opacity: 0.8,
    lineHeight: 1.6,
  },
  // Copyright section
  copyright: {
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: '20px',
    textAlign: 'center',
    fontSize: '12px',
    opacity: 0.7,
  },
  version: {
    fontSize: '10px',
    marginTop: '5px',
    opacity: 0.5,
  },
}

// Add hover styles
const styleSheet = document.createElement('style')
styleSheet.textContent = `
  a:hover {
    opacity: 1 !important;
    transform: translateX(5px);
    color: #fbbf24 !important;
  }
  @media (max-width: 768px) {
    footer .links-section {
      grid-template-columns: 1fr;
      text-align: center;
    }
    footer .links-column {
      align-items: center;
    }
    footer .links-column a {
      text-align: center;
    }
  }
`
document.head.appendChild(styleSheet)

export default Footer