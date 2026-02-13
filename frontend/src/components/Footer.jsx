import React from 'react'

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
              {/* Navigation links */}
              <a href="/" style={styles.link}>Home</a>
              <a href="/book" style={styles.link}>Book Now</a>
              <a href="/my-bookings" style={styles.link}>My Bookings</a>
              <a href="/login" style={styles.link}>Login</a>
            </div>
            
            {/* Contact Information */}
            <div style={styles.linksColumn}>
              <h4 style={styles.linksTitle}>Contact Us</h4>
              {/* Phone number */}
              <p style={styles.contactInfo}>📞 0797338021</p>
              {/* Email address */}
              <p style={styles.contactInfo}>📧 antomure122@gmail.com</p>
              {/* Location with */}
              <p style={styles.contactInfo}>📍 Nairobi, Kenya</p>
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div style={styles.copyright}>
          <p>© 2024 EasyRide SACCO. All rights reserved.</p>
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
  },
  // Tagline/description text
  tagline: {
    fontSize: '14px',
    opacity: 0.8,
    lineHeight: 1.6,
  },
  // Links section container
  linksSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '30px',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Individual link column
  linksColumn: {
    display: 'flex',
    flexDirection: 'column', // Stack links vertically
  },
  // Column title (Quick Links, Contact Us)
  linksTitle: {
    fontSize: '20px',
    fontWeight: '800',
    marginBottom: '20px',
  },
  // Navigation link style
  link: {
    color: 'white',
    textDecoration: 'underline',
    marginBottom: '14px',
    opacity: 0.8,
    fontSize: '14px',
  },
  // Contact information text
  contactInfo: {
    fontSize: '14px',
    marginBottom: '10px',
    opacity: 0.8,
  },
  // Copyright section
  copyright: {
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: '20px',
    textAlign: 'center',
    fontSize: '14px',
    opacity: 0.7,
  },
}
export default Footer