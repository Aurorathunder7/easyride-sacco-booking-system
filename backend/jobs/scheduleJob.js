// backend/jobs/scheduleJob.js
const cron = require('node-cron');
const { generateSchedulesForDate } = require('../utils/scheduleGenerator');

// Run every day at 12:01 AM
cron.schedule('1 0 * * *', async () => {
    console.log('🕐 Running daily schedule generation...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    await generateSchedulesForDate(tomorrowStr);
    
    // Also ensure schedules for the next 7 days exist
    for (let i = 2; i <= 7; i++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + i);
        const dateStr = futureDate.toISOString().split('T')[0];
        await generateSchedulesForDate(dateStr);
    }
    
    console.log('✅ Daily schedule generation complete');
});

console.log('📅 Schedule generator job started - will run daily at 12:01 AM');