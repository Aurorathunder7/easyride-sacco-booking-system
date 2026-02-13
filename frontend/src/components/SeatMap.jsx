import React from 'react'

function SeatMap({ capacity = 14, bookedSeats = [], selectedSeats = [], onSeatSelect, maxSelectable = 1 }) {
  // Common matatu layouts
  const layouts = {
    14: {
      rows: 4,
      cols: 4,
      driverSeat: 0,
      layout: [
        ['D', 'E', 'E', 'E'],
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
        [13, 14, null, null]
      ]
    },
    33: {
      rows: 8,
      cols: 4,
      driverSeat: 0,
      layout: [
        ['D', 'E', 'E', 'E'],
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
        [13, 14, 15, 16],
        [17, 18, 19, 20],
        [21, 22, 23, 24],
        [25, 26, 27, 28],
        [29, 30, 31, 32],
        [33, null, null, null]
      ]
    },
    25: {
      rows: 7,
      cols: 4,
      driverSeat: 0,
      layout: [
        ['D', 'E', 'E', 'E'],
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
        [13, 14, 15, 16],
        [17, 18, 19, 20],
        [21, 22, 23, 24],
        [25, null, null, null]
      ]
    }
  }

  const getLayout = () => {
    if (layouts[capacity]) return layouts[capacity]
    // Default to 14-seater layout
    return layouts[14]
  }

  const { layout } = getLayout()

  const getSeatStatus = (seat) => {
    if (seat === 'D') return 'driver'
    if (seat === 'E') return 'empty'
    if (bookedSeats.includes(seat)) return 'booked'
    if (selectedSeats.includes(seat)) return 'selected'
    return 'available'
  }

  const handleSeatClick = (seat) => {
    if (typeof seat !== 'number' || bookedSeats.includes(seat)) return
    
    if (selectedSeats.includes(seat)) {
      // Deselect seat
      onSeatSelect(selectedSeats.filter(s => s !== seat))
    } else {
      // Select seat (respecting maxSelectable)
      if (selectedSeats.length < maxSelectable) {
        onSeatSelect([...selectedSeats, seat])
      } else {
        alert(`Maximum ${maxSelectable} seat${maxSelectable > 1 ? 's' : ''} can be selected`)
      }
    }
  }

  const getSeatStyle = (seat, status) => {
    const baseStyle = {
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: status === 'available' || status === 'selected' ? 'pointer' : 'default',
      transition: 'all 0.2s',
      border: '2px solid transparent',
    }

    switch(status) {
      case 'driver':
        return {
          ...baseStyle,
          backgroundColor: '#374151',
          color: 'white',
          cursor: 'default',
        }
      case 'empty':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          border: '2px dashed #d1d5db',
          cursor: 'default',
        }
      case 'booked':
        return {
          ...baseStyle,
          backgroundColor: '#ef4444',
          color: 'white',
          cursor: 'not-allowed',
          opacity: 0.6,
        }
      case 'selected':
        return {
          ...baseStyle,
          backgroundColor: '#10b981',
          color: 'white',
          border: '2px solid #059669',
          transform: 'scale(1.05)',
        }
      case 'available':
        return {
          ...baseStyle,
          backgroundColor: '#f3f4f6',
          color: '#374151',
          border: '2px solid #d1d5db',
          ':hover': {
            backgroundColor: '#e5e7eb',
            borderColor: '#9ca3af',
          }
        }
      default:
        return baseStyle
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.titleContainer}>
        <h3 style={styles.title}>Seat Map - {capacity} Seater Matatu</h3>
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <div style={{...styles.legendBox, backgroundColor: '#f3f4f6', border: '2px solid #d1d5db'}}></div>
            <span>Available</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{...styles.legendBox, backgroundColor: '#10b981'}}></div>
            <span>Selected</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{...styles.legendBox, backgroundColor: '#ef4444', opacity: 0.6}}></div>
            <span>Booked</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{...styles.legendBox, backgroundColor: '#374151'}}></div>
            <span>Driver</span>
          </div>
        </div>
      </div>

      <div style={styles.seatMap}>
        {/* Top view representation */}
        <div style={styles.vehicleOutline}>
          {/* Windshield */}
          <div style={styles.windshield}></div>
          
          {/* Seat grid */}
          <div style={styles.grid}>
            {layout.map((row, rowIndex) => (
              <div key={rowIndex} style={styles.row}>
                {row.map((seat, colIndex) => (
                  <div key={`${rowIndex}-${colIndex}`} style={styles.cell}>
                    {seat !== null && (
                      <div
                        style={getSeatStyle(seat, getSeatStatus(seat))}
                        onClick={() => handleSeatClick(seat)}
                        title={typeof seat === 'number' ? `Seat ${seat}` : seat === 'D' ? 'Driver' : 'Empty'}
                      >
                        {seat === 'D' ? '🚗' : seat === 'E' ? '' : seat}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          {/* Rear bumper */}
          <div style={styles.rearBumper}></div>
        </div>
      </div>

      <div style={styles.info}>
        <p style={styles.infoText}>
          Selected: {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
          {maxSelectable > 1 && ` (Max: ${maxSelectable})`}
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '30px',
  },
  titleContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    flexWrap: 'wrap',
    gap: '15px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
  },
  legend: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#6b7280',
  },
  legendBox: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    border: '1px solid #d1d5db',
  },
  seatMap: {
    display: 'flex',
    justifyContent: 'center',
  },
  vehicleOutline: {
    position: 'relative',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
  },
  windshield: {
    width: '200px',
    height: '30px',
    backgroundColor: '#60a5fa',
    borderRadius: '8px 8px 0 0',
    margin: '0 auto 20px',
    opacity: 0.3,
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  row: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  cell: {
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rearBumper: {
    width: '200px',
    height: '20px',
    backgroundColor: '#1f2937',
    borderRadius: '0 0 8px 8px',
    margin: '20px auto 0',
    opacity: 0.2,
  },
  info: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    borderLeft: '4px solid #0ea5e9',
  },
  infoText: {
    margin: 0,
    color: '#0369a1',
    fontWeight: '500',
  },
}

export default SeatMap