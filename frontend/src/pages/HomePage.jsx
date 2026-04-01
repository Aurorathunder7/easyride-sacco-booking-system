import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Hero from '../components/Hero'

// HomePage - main dashboard after login
function HomePage() {
  const navigate = useNavigate()
  
  // State to store search form data (from, to, date)
  const [searchData, setSearchData] = useState({
    from: '',
    to: '',
    date: ''
  })

  // Mock data for popular routes - would come from API in real app
  const popularRoutes = [
    { id: 1, from: 'Nairobi', to: 'Mombasa', duration: '8 hours', price: '1,200' },
    { id: 2, from: 'Nairobi', to: 'Kisumu', duration: '6 hours', price: '800' },
    { id: 3, from: 'Nairobi', to: 'Nakuru', duration: '3 hours', price: '500' },
    { id: 4, from: 'Mombasa', to: 'Nakuru', duration: '10 hours', price: '1,500' },
  ]

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

  // Handle click on a popular route card
  const handleRouteClick = (route) => {
    // Navigate to booking page with pre-filled from/to fields
    navigate('/book', { 
      state: { 
        from: route.from,
        to: route.to
      } 
    })
  }

  return (
    // Main container with cream gradient background
    <div style={styles.container}>
      <Hero />
      {/* Search Section - floating card with search form */}
      <div style={styles.searchContainer}>
        <div className="container">
          <div style={styles.searchCard}>
            <h2 style={styles.searchTitle}>Find Your Perfect Ride</h2>
            {/* Search form */}
            <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
              <div style={styles.searchGrid}>
                {/* Origin(from) input field */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>From</label>
                  <input
                    type="text"
                    name="from"
                    value={searchData.from}
                    onChange={handleSearchChange}
                    placeholder="e.g., Nairobi"
                    style={styles.input}
                    required
                  />
                </div>
                
                {/* Destination(to) input field */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>To</label>
                  <input
                    type="text"
                    name="to"
                    value={searchData.to}
                    onChange={handleSearchChange}
                    placeholder="e.g., Mombasa"
                    style={styles.input}
                    required
                  />
                </div>
                
                {/* Date input field */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Travel Date</label>
                  <input
                    type="date"
                    name="date"
                    value={searchData.date}
                    onChange={handleSearchChange}
                    min={new Date().toISOString().split('T')[0]}
                    style={styles.input}
                  />
                </div>
              </div>
              
              {/* Search button container */}
              <div style={styles.searchButtonContainer}>
                <button type="submit" style={styles.searchButton}>
                  Search Schedules
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Popular Routes Section */}
      <div style={styles.section}>
        <div className="container">
          <h2 style={styles.sectionTitle}>Popular Routes</h2>
          {/* Grid of popular route cards */}
          <div style={styles.routesGrid}>
            {/* Map through popularRoutes array to create cards */}
            {popularRoutes.map((route) => (
              <div 
                key={route.id}
                style={styles.routeCard}
                onClick={() => handleRouteClick(route)}
              >
                {/* Route header with origin, destination and duration */}
                <div style={styles.routeHeader}>
                  <h3 style={styles.routeTitle}>
                    {route.from} → {route.to}
                  </h3>
                  <span style={styles.duration}>{route.duration}</span>
                </div>
                {/* Route footer with price and book button */}
                <div style={styles.routeFooter}>
                  <div style={styles.price}>
                    <span style={styles.priceLabel}>From</span>
                    <span style={styles.priceValue}>KSh {route.price}</span>
                  </div>
                  <button style={styles.bookButton}>
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section - explains the booking process */}
      <div style={styles.howItWorks}>
        <div className="container">
          <h2 style={styles.sectionTitle}>How It Works</h2>
          {/* Three-step process */}
          <div style={styles.steps}>
            {/* Step 1: Search */}
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <h3 style={styles.stepTitle}>Search & Select</h3>
              <p style={styles.stepText}>Choose your route and travel date</p>
            </div>
            {/* Step 2: Book & Pay */}
            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <h3 style={styles.stepTitle}>Book & Pay</h3>
              <p style={styles.stepText}>Select seat and pay via M-Pesa</p>
            </div>
            {/* Step 3: Travel */}
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

// STYLES - Warm Cream/Amber Theme
const styles = {
  // Main container
  container: {
    background: 'linear-gradient(135deg, #fef9e8, #fff5e6, #fef3e2)',
    minHeight: '100vh',
  },
  // Search container
  searchContainer: {
    padding: '0 20px',
    marginBottom: '50px',
  },
  // Search card
  searchCard: {
    backgroundColor: 'white',
    borderRadius: '1rem',
    padding: '30px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.02)',
    marginTop: '-50px',
    position: 'relative',
    zIndex: 10,
    border: '1px solid #fed7aa',
  },
  // Search title
  searchTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    textAlign: 'center',
    color: '#78350f',
  },
  // Search form container
  searchForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  // Grid layout for search inputs
  searchGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  // Container for each input field
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  // Input field labels
  label: {
    marginBottom: '8px',
    fontWeight: '500',
    color: '#b45309',
  },
  // Input fields
  input: {
    padding: '12px',
    border: '1px solid #fed7aa',
    borderRadius: '0.75rem',
    fontSize: '16px',
    backgroundColor: '#fffbef',
    transition: 'all 0.3s',
    outline: 'none',
    color: '#78350f',
  },
  // Search button container
  searchButtonContainer: {
    textAlign: 'center',
  },
  // Search button
  searchButton: {
    background: 'linear-gradient(135deg, #059669, #10b981)',
    color: 'white',
    padding: '15px 30px',
    border: 'none',
    borderRadius: '0.75rem',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  // Section container
  section: {
    padding: '50px 0',
  },
  // Section title
  sectionTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '40px',
    color: '#78350f',
  },
  // Grid layout for popular routes
  routesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  // Individual route card
  routeCard: {
    backgroundColor: 'white',
    borderRadius: '1rem',
    padding: '20px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    cursor: 'pointer',
    transition: 'transform 0.3s, box-shadow 0.3s',
    border: '1px solid #fed7aa',
  },

  // Route header container
  routeHeader: {
    marginBottom: '20px',
  },
  // Route title (origin → destination)
  routeTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '5px',
    color: '#78350f',
  },
  // Journey duration
  duration: {
    fontSize: '14px',
    color: '#92400e',
  },
  // Route footer with price and button
  routeFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Price container
  price: {
    display: 'flex',
    flexDirection: 'column',
  },
  // "From" label
  priceLabel: {
    fontSize: '12px',
    color: '#b45309',
  },
  // Price value
  priceValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#d97706',
  },
  // Book now button
  bookButton: {
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '0.5rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },

  // How it works section
  howItWorks: {
    backgroundColor: 'white',
    padding: '50px 0',
    borderTop: '1px solid #fed7aa',
    borderBottom: '1px solid #fed7aa',
  },
  // Steps container
  steps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '30px',
    textAlign: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  // Individual step
  step: {
    padding: '20px',
  },
  // Step number circle
  stepNumber: {
    width: '50px',
    height: '50px',
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 auto 20px',
  },
  // Step title
  stepTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#78350f',
  },
  // Step description text
  stepText: {
    color: '#92400e',
    lineHeight: 1.6,
  },
}

// Add hover effects
const addStyles = () => {
  const style = document.createElement('style')
  style.textContent = `
    button:hover {
      opacity: 0.9;
      transform: translateY(-2px);
    }
    .search-button:hover {
      background: linear-gradient(135deg, #047857, #059669);
    }
    .book-button:hover {
      background: linear-gradient(135deg, #d97706, #f59e0b);
    }
    .route-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
    }
    input:focus {
      border-color: #f59e0b;
      outline: none;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
    }
  `
  document.head.appendChild(style)
}

// Initialize styles
if (typeof window !== 'undefined') {
  addStyles()
}

export default HomePage