const mongoose = require('mongoose');
const User = require('../models/User');
const Item = require('../models/Item');
const Trade = require('../models/Trade');
const Activity = require('../models/Activity');

async function clearAllData() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/trade_system');
        console.log('Connected to MongoDB');

        // Clear all collections
        const [usersDeleted, itemsDeleted, tradesDeleted, activitiesDeleted] = await Promise.all([
            User.deleteMany({}),
            Item.deleteMany({}),
            Trade.deleteMany({}),
            Activity.deleteMany({})
        ]);

        console.log('Data cleared successfully:');
        console.log(`- ${usersDeleted.deletedCount} users deleted`);
        console.log(`- ${itemsDeleted.deletedCount} items deleted`);
        console.log(`- ${tradesDeleted.deletedCount} trades deleted`);
        console.log(`- ${activitiesDeleted.deletedCount} activities deleted`);

        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error clearing data:', error);
        process.exit(1);
    }
}

// Run the function
clearAllData(); 