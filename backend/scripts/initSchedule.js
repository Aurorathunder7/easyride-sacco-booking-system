// backend/scripts/initSchedules.js
const { generateFutureSchedules } = require('../utils/scheduleGenerator');

async function init() {
    console.log('🚀 Initializing schedules for next 30 days...');
    await generateFutureSchedules(30);
    console.log('🎉 Initialization complete!');
    process.exit(0);
}

init();