import React from 'react'

function Hero() {
  return (
    <section style={styles.hero}>
      <div className="container" style={styles.container}>
        <div style={styles.content}>
          <h1 style={styles.title}>Book Your Matatu Journey with Ease</h1>
          <p style={styles.subtitle}>
            Safe, affordable, and convenient travel across Kenya with EasyRide SACCO
          </p>
          
          <div style={styles.features}>
            <div style={styles.feature}>
              <div style={styles.featureIcon}>🔍</div>
              <h3 style={styles.featureTitle}>Easy Search</h3>
              <p style={styles.featureText}>Find routes in seconds</p>
            </div>
            
            <div style={styles.feature}>
              <div style={styles.featureIcon}>🛡️</div>
              <h3 style={styles.featureTitle}>Secure Booking</h3>
              <p style={styles.featureText}>Guaranteed seat reservation</p>
            </div>
            
            <div style={styles.feature}>
              <div style={styles.featureIcon}>💳</div>
              <h3 style={styles.featureTitle}>M-Pesa Payments</h3>
              <p style={styles.featureText}>Pay with trusted M-Pesa</p>
            </div>
            
            <div style={styles.feature}>
              <div style={styles.featureIcon}>⏰</div>
              <h3 style={styles.featureTitle}>Real-time Updates</h3>
              <p style={styles.featureText}>Live schedule information</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const styles = {
  hero: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    color: 'white',
    padding: '60px 0',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  content: {
    textAlign: 'center',
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  subtitle: {
    fontSize: '20px',
    opacity: 0.9,
    marginBottom: '40px',
    maxWidth: '600px',
    margin: '0 auto 40px',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '30px',
    marginTop: '40px',
  },
  feature: {
    padding: '20px',
  },
  featureIcon: {
    fontSize: '40px',
    marginBottom: '15px',
  },
  featureTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '10px',
  },
  featureText: {
    opacity: 0.9,
    fontSize: '14px',
  },
}

export default Hero