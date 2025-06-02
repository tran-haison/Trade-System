const mongoose = require('mongoose');

// Connect to test database
beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trade-system-test', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
});

// Clean up database before each test
beforeEach(async () => {
    const collections = Object.keys(mongoose.connection.collections);
    for (const collectionName of collections) {
        await mongoose.connection.collections[collectionName].deleteMany({});
    }
});

// Close database connection after all tests
afterAll(async () => {
    await mongoose.connection.close();
}); 