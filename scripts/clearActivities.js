const mongoose = require('mongoose');
const Activity = require('../models/Activity');

const clearActivities = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barter-trading');
        console.log('Connected to MongoDB');

        const result = await Activity.deleteMany({});
        console.log(`Deleted ${result.deletedCount} activities`);

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

clearActivities(); 