// backend/models/scheduleModel.js
const db = require('../config/db'); // Your database connection

const Schedule = {
  // Create schedules table - FIXED data types to match routes/vehicles tables
  createTable: async () => {
    const query = `
      CREATE TABLE IF NOT EXISTS schedules (
        scheduleID VARCHAR(50) PRIMARY KEY,
        routeID INT NOT NULL,
        vehicleID INT NOT NULL,
        departureTime DATETIME NOT NULL,
        arrivalTime DATETIME NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        capacity INT DEFAULT 14,
        bookedSeats JSON,
        status ENUM('active', 'full', 'cancelled', 'completed') DEFAULT 'active',
        version INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_route_date (routeID, departureTime),
        INDEX idx_status (status),
        FOREIGN KEY (routeID) REFERENCES routes(routeID) ON DELETE CASCADE,
        FOREIGN KEY (vehicleID) REFERENCES vehicles(vehicleID) ON DELETE CASCADE
      )
    `;
    return db.execute(query);
  },

  // Create a new schedule
  create: async (scheduleData) => {
    const { scheduleID, routeID, vehicleID, departureTime, arrivalTime, price, capacity, bookedSeats = [], status = 'active' } = scheduleData;
    const query = `
      INSERT INTO schedules (scheduleID, routeID, vehicleID, departureTime, arrivalTime, price, capacity, bookedSeats, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [scheduleID, parseInt(routeID), parseInt(vehicleID), departureTime, arrivalTime, price, capacity, JSON.stringify(bookedSeats), status];
    return db.execute(query, values);
  },

  // Get schedules by route and date - FIXED to use INT for routeID
  getByRouteAndDate: async (routeID, date) => {
    const query = `
      SELECT s.*, 
             r.origin, r.destination, r.routeName,
             v.vehicleNumber, v.vehicleType
      FROM schedules s
      JOIN routes r ON s.routeID = r.routeID
      JOIN vehicles v ON s.vehicleID = v.vehicleID
      WHERE s.routeID = ? 
        AND DATE(s.departureTime) = ?
        AND s.status IN ('active', 'full')
      ORDER BY s.departureTime ASC
    `;
    const [rows] = await db.execute(query, [parseInt(routeID), date]);
    
    // Parse JSON bookedSeats for each schedule
    return rows.map(row => ({
      ...row,
      bookedSeats: row.bookedSeats ? 
        (typeof row.bookedSeats === 'string' ? JSON.parse(row.bookedSeats) : row.bookedSeats) : []
    }));
  },

  // Get single schedule by ID
  getById: async (scheduleID) => {
    const query = `
      SELECT s.*, 
             r.origin, r.destination, r.routeName, r.baseFare,
             v.vehicleNumber, v.vehicleType, v.capacity
      FROM schedules s
      JOIN routes r ON s.routeID = r.routeID
      JOIN vehicles v ON s.vehicleID = v.vehicleID
      WHERE s.scheduleID = ?
    `;
    const [rows] = await db.execute(query, [scheduleID]);
    if (rows.length === 0) return null;
    
    return {
      ...rows[0],
      bookedSeats: rows[0].bookedSeats ? 
        (typeof rows[0].bookedSeats === 'string' ? JSON.parse(rows[0].bookedSeats) : rows[0].bookedSeats) : []
    };
  },

  // Book seats (atomic operation to prevent double booking)
  bookSeats: async (scheduleID, seatNumbers, connection = null) => {
    const dbConnection = connection || db;
    
    // First, get current schedule with version check
    const [schedule] = await dbConnection.execute(
      'SELECT bookedSeats, version, capacity FROM schedules WHERE scheduleID = ? FOR UPDATE',
      [scheduleID]
    );
    
    if (schedule.length === 0) {
      throw new Error('Schedule not found');
    }
    
    let bookedSeats = schedule[0].bookedSeats ? 
      (typeof schedule[0].bookedSeats === 'string' ? JSON.parse(schedule[0].bookedSeats) : schedule[0].bookedSeats) : [];
    const currentVersion = schedule[0].version;
    const capacity = schedule[0].capacity || 14;
    
    // Check if seats are available
    for (const seat of seatNumbers) {
      if (bookedSeats.includes(seat.toString())) {
        throw new Error(`Seat ${seat} is already booked`);
      }
    }
    
    // Add new seats
    const newBookedSeats = [...bookedSeats, ...seatNumbers.map(s => s.toString())];
    const newStatus = newBookedSeats.length >= capacity ? 'full' : 'active';
    
    // Update with version check (optimistic locking)
    const updateQuery = `
      UPDATE schedules 
      SET bookedSeats = ?, 
          status = ?, 
          version = version + 1,
          updatedAt = NOW()
      WHERE scheduleID = ? AND version = ?
    `;
    
    const [result] = await dbConnection.execute(updateQuery, [
      JSON.stringify(newBookedSeats),
      newStatus,
      scheduleID,
      currentVersion
    ]);
    
    if (result.affectedRows === 0) {
      throw new Error('Booking failed. Please try again.');
    }
    
    return { success: true, bookedSeats: newBookedSeats };
  },

  // Release seats (for cancellations)
  releaseSeats: async (scheduleID, seatNumbers, connection = null) => {
    const dbConnection = connection || db;
    
    const [schedule] = await dbConnection.execute(
      'SELECT bookedSeats, version FROM schedules WHERE scheduleID = ? FOR UPDATE',
      [scheduleID]
    );
    
    if (schedule.length === 0) return;
    
    let bookedSeats = schedule[0].bookedSeats ? 
      (typeof schedule[0].bookedSeats === 'string' ? JSON.parse(schedule[0].bookedSeats) : schedule[0].bookedSeats) : [];
    const currentVersion = schedule[0].version;
    
    const seatNumbersStr = seatNumbers.map(s => s.toString());
    const newBookedSeats = bookedSeats.filter(seat => !seatNumbersStr.includes(seat));
    const newStatus = 'active';
    
    const updateQuery = `
      UPDATE schedules 
      SET bookedSeats = ?, 
          status = ?, 
          version = version + 1,
          updatedAt = NOW()
      WHERE scheduleID = ? AND version = ?
    `;
    
    await dbConnection.execute(updateQuery, [
      JSON.stringify(newBookedSeats),
      newStatus,
      scheduleID,
      currentVersion
    ]);
    
    return { success: true };
  },

  // Generate seat numbers based on capacity
  generateSeatNumbers: (capacity) => {
    const seats = [];
    const rows = Math.ceil(capacity / 4);
    for (let row = 1; row <= rows; row++) {
      for (let col of ['A', 'B', 'C', 'D']) {
        if (seats.length < capacity) {
          seats.push(`${row}${col}`);
        }
      }
    }
    return seats;
  },

  // Get available seats for a schedule
  getAvailableSeats: async (scheduleID) => {
    const schedule = await Schedule.getById(scheduleID);
    if (!schedule) return [];
    
    const allSeats = Schedule.generateSeatNumbers(schedule.capacity || 14);
    const bookedSeats = schedule.bookedSeats || [];
    return allSeats.filter(seat => !bookedSeats.includes(seat));
  },

  // Initialize schedules for the next 7 days
  initializeSchedules: async (routes, vehicles) => {
    const schedules = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      for (const route of routes) {
        // Morning departure (8:00 AM)
        const morningDeparture = new Date(`${dateStr}T08:00:00`);
        const morningArrival = new Date(morningDeparture.getTime() + 8 * 60 * 60 * 1000);
        
        // Evening departure (5:00 PM)
        const eveningDeparture = new Date(`${dateStr}T17:00:00`);
        const eveningArrival = new Date(eveningDeparture.getTime() + 8 * 60 * 60 * 1000);
        
        // Assign random vehicle
        const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
        
        const scheduleID1 = `SCH_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const scheduleID2 = `SCH_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        schedules.push({
          scheduleID: scheduleID1,
          routeID: route.routeID,
          vehicleID: vehicle.vehicleID,
          departureTime: morningDeparture,
          arrivalTime: morningArrival,
          price: route.baseFare,
          capacity: vehicle.capacity || 14,
          bookedSeats: [],
          status: 'active'
        });
        
        schedules.push({
          scheduleID: scheduleID2,
          routeID: route.routeID,
          vehicleID: vehicle.vehicleID,
          departureTime: eveningDeparture,
          arrivalTime: eveningArrival,
          price: route.baseFare,
          capacity: vehicle.capacity || 14,
          bookedSeats: [],
          status: 'active'
        });
      }
    }
    
    for (const schedule of schedules) {
      await Schedule.create(schedule);
    }
    
    return schedules.length;
  }
};

module.exports = Schedule;