// backend/utils/scheduleGenerator.js
const pool = require('../config/db');

async function generateSchedulesForDate(date) {
    try {
        console.log(`📅 Generating schedules for: ${date}`);
        
        // Get all routes (no status filter since column may not exist)
        const [routes] = await pool.query(
            "SELECT routeID, baseFare FROM routes"
        );
        
        // Get all vehicles
        const [vehicles] = await pool.query(
            "SELECT vehicleID, capacity FROM vehicles"
        );
        
        if (routes.length === 0) {
            console.log('⚠️ No routes found');
            return 0;
        }
        
        if (vehicles.length === 0) {
            console.log('⚠️ No vehicles found');
            return 0;
        }
        
        console.log(`📋 Found ${routes.length} routes and ${vehicles.length} vehicles`);
        
        const departureTimes = [
            { dep: '06:00:00', arr: '12:00:00' },
            { dep: '08:00:00', arr: '14:00:00' },
            { dep: '10:00:00', arr: '16:00:00' },
            { dep: '12:00:00', arr: '18:00:00' },
            { dep: '14:00:00', arr: '20:00:00' },
            { dep: '16:00:00', arr: '22:00:00' },
            { dep: '18:00:00', arr: '00:00:00' }
        ];
        
        let insertedCount = 0;
        let existingCount = 0;
        
        for (const route of routes) {
            for (const vehicle of vehicles) {
                for (const time of departureTimes) {
                    const scheduleID = `SCH_${date.replace(/-/g, '')}_${route.routeID}_${vehicle.vehicleID}_${time.dep.replace(/:/g, '')}`;
                    
                    // Check if already exists
                    const [existing] = await pool.query(
                        'SELECT scheduleID FROM schedules WHERE scheduleID = ?',
                        [scheduleID]
                    );
                    
                    if (existing.length === 0) {
                        await pool.query(
                            `INSERT INTO schedules 
                             (scheduleID, routeID, vehicleID, departureTime, arrivalTime, price, capacity, bookedSeats, status) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'active')`,
                            [
                                scheduleID,
                                route.routeID,
                                vehicle.vehicleID,
                                `${date} ${time.dep}`,
                                `${date} ${time.arr}`,
                                route.baseFare,
                                vehicle.capacity || 14
                            ]
                        );
                        insertedCount++;
                    } else {
                        existingCount++;
                    }
                }
            }
        }
        
        console.log(`📊 ${date}: ${insertedCount} new, ${existingCount} existing schedules`);
        return insertedCount;
        
    } catch (error) {
        console.error('❌ Error generating schedules:', error.message);
        return 0;
    }
}

async function generateFutureSchedules(days = 14) {
    console.log(`📅 Generating schedules for next ${days} days...`);
    let total = 0;
    
    for (let i = 1; i <= days; i++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + i);
        const dateStr = futureDate.toISOString().split('T')[0];
        
        const count = await generateSchedulesForDate(dateStr);
        total += count;
    }
    
    console.log(`✅ Total ${total} new schedules generated for next ${days} days`);
    return total;
}

// Also generate for today if needed
async function generateTodaySchedules() {
    const today = new Date().toISOString().split('T')[0];
    return await generateSchedulesForDate(today);
}

module.exports = { generateSchedulesForDate, generateFutureSchedules, generateTodaySchedules };