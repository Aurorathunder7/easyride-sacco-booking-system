import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Hero from '../components/Hero'

// HomePage - main dashboard after login
function HomePage() {
  const navigate = useNavigate()
  
  // State to store search form data (from, to)
  const [searchData, setSearchData] = useState({
    from: '',
    to: ''
  })

  // Handle changes in search input fields
  const handleSearchChange = (e) => {
    setSearchData({
      ...searchData,
      [e.target.name]: e.target.value
    })
  }

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    navigate('/book', { state: searchData })
  }

  return (
    <div style={styles.container}>
      <Hero />
      
      {/* Enhanced Search Section */}
      <div style={styles.searchSection}>
        <div className="container">
          <div style={styles.searchWrapper}>
            <div style={styles.searchBadge}>
              <span>🚀</span>
              <span>Start Your Journey</span>
            </div>
            
            <h2 style={styles.searchHeading}>
              Where would you like to go?
            </h2>
            <p style={styles.searchSubheading}>
              Find the best routes and prices for your trip
            </p>
            
            <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
              <div style={styles.searchInputsContainer}>
                {/* From Input */}
                <div style={styles.inputWrapper}>
                  <div style={styles.inputIcon}>📍</div>
                  <div style={styles.inputContent}>
                    <label style={styles.inputLabel}>From</label>
                    <input
                      type="text"
                      name="from"
                      value={searchData.from}
                      onChange={handleSearchChange}
                      placeholder="Enter departure city"
                      style={styles.input}
                      required
                    />
                  </div>
                </div>
                
                {/* Swap Button */}
                <button 
                  type="button" 
                  style={styles.swapButton}
                  onClick={() => {
                    const temp = searchData.from
                    setSearchData({
                      from: searchData.to,
                      to: temp
                    })
                  }}
                  title="Swap locations"
                >
                  🔄
                </button>
                
                {/* To Input */}
                <div style={styles.inputWrapper}>
                  <div style={styles.inputIcon}>🏁</div>
                  <div style={styles.inputContent}>
                    <label style={styles.inputLabel}>To</label>
                    <input
                      type="text"
                      name="to"
                      value={searchData.to}
                      onChange={handleSearchChange}
                      placeholder="Enter destination city"
                      style={styles.input}
                      required
                    />
                  </div>
                </div>
              </div>
              
              {/* Search Button */}
              <button type="submit" style={styles.searchButton}>
                <span>🔍</span>
                Search Available Schedules
                <span>→</span>
              </button>
            </form>
            
            {/* Popular Cities Section */}
            <div style={styles.popularCities}>
              <p style={styles.popularCitiesLabel}>Popular routes:</p>
              <div style={styles.cityChips}>
                {['Nairobi → Mombasa', 'Nairobi → Kisumu', 'Nairobi → Nakuru', 'Mombasa → Nairobi'].map((route, index) => (
                  <button
                    key={index}
                    style={styles.cityChip}
                    onClick={() => {
                      const [from, to] = route.split(' → ')
                      setSearchData({ from, to })
                    }}
                  >
                    {route}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div style={styles.howItWorks}>
        <div className="container">
          <h2 style={styles.sectionTitle}>How It Works</h2>
          <div style={styles.steps}>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <h3 style={styles.stepTitle}>Search & Select</h3>
              <p style={styles.stepText}>Choose your route and travel date</p>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <h3 style={styles.stepTitle}>Book & Pay</h3>
              <p style={styles.stepText}>Select seat and pay via M-Pesa</p>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <h3 style={styles.stepTitle}>Travel</h3>
              <p style={styles.stepText}>Show digital ticket and enjoy your ride</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    background: 'linear-gradient(135deg, #fef9e8, #fff5e6, #fef3e2)',
    minHeight: '100vh',
  },
  
  // Enhanced Search Section
  searchSection: {
    padding: '40px 20px 60px',
    marginTop: '-30px',
  },
  searchWrapper: {
    maxWidth: '900px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '32px',
    padding: '40px',
    boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
  },
  searchBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#fef3c7',
    color: '#d97706',
    padding: '6px 16px',
    borderRadius: '40px',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '24px',
  },
  searchHeading: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '12px',
    letterSpacing: '-0.02em',
  },
  searchSubheading: {
    fontSize: '18px',
    color: '#64748b',
    marginBottom: '32px',
  },
  searchForm: {
    marginBottom: '32px',
  },
  searchInputsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  inputWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '20px',
    padding: '8px 20px',
    border: '2px solid #e2e8f0',
    transition: 'all 0.3s ease',
  },
  inputIcon: {
    fontSize: '24px',
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '8px 0',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '16px',
    fontWeight: '500',
    color: '#1e293b',
    outline: 'none',
    '::placeholder': {
      color: '#cbd5e1',
      fontWeight: '400',
    },
  },
  swapButton: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': {
      backgroundColor: '#e2e8f0',
      transform: 'scale(1.05)',
    },
  },
  searchButton: {
    width: '100%',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: 'white',
    border: 'none',
    borderRadius: '48px',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 20px -5px rgba(245, 158, 11, 0.3)',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 20px 30px -10px rgba(245, 158, 11, 0.4)',
    },
  },
  popularCities: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  popularCitiesLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
  },
  cityChips: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  cityChip: {
    padding: '8px 20px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '40px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#fef3c7',
      color: '#d97706',
      transform: 'translateY(-2px)',
    },
  },
  
  // How It Works Section
  howItWorks: {
    backgroundColor: 'white',
    padding: '60px 20px',
    borderTop: '1px solid #fed7aa',
    borderBottom: '1px solid #fed7aa',
  },
  sectionTitle: {
    fontSize: '36px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '48px',
    color: '#78350f',
  },
  steps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '40px',
    textAlign: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  step: {
    padding: '20px',
  },
  stepNumber: {
    width: '60px',
    height: '60px',
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 auto 20px',
    boxShadow: '0 10px 20px -5px rgba(245, 158, 11, 0.3)',
  },
  stepTitle: {
    fontSize: '22px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#78350f',
  },
  stepText: {
    color: '#92400e',
    lineHeight: 1.6,
    fontSize: '15px',
  },
}

// Add hover effects
const addStyles = () => {
  const style = document.createElement('style')
  style.textContent = `
    button:hover {
      opacity: 0.9;
    }
    input:focus + div, input:focus {
      border-color: #f59e0b;
    }
    .route-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
    }
  `
  document.head.appendChild(style)
}

// Initialize styles
if (typeof window !== 'undefined') {
  addStyles()
}

export default HomePage