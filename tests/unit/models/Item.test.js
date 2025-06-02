const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Item = require('../../../models/Item');

let mongoServer;

describe('Item Model', () => {
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        await mongoose.connect(mongoServer.getUri(), { useNewUrlParser: true, useUnifiedTopology: true });
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    afterEach(async () => {
        await Item.deleteMany();
    });

    it('should require all required fields', async () => {
        const item = new Item();
        let err;
        try {
            await item.validate();
        } catch (e) {
            err = e;
        }
        expect(err.errors.title).toBeDefined();
        expect(err.errors.description).toBeDefined();
        expect(err.errors.category).toBeDefined();
        expect(err.errors.condition).toBeDefined();
        expect(err.errors.owner).toBeDefined();
        expect(err.errors.location).toBeDefined();
    });

    it('should only allow valid enum values for category, condition, and status', async () => {
        const item = new Item({
            title: 'Test',
            description: 'Test desc',
            category: 'InvalidCat',
            condition: 'InvalidCond',
            images: ['img.jpg'],
            owner: new mongoose.Types.ObjectId(),
            location: 'Test',
            status: 'InvalidStatus'
        });
        let err;
        try {
            await item.validate();
        } catch (e) {
            err = e;
        }
        expect(err.errors.category).toBeDefined();
        expect(err.errors.condition).toBeDefined();
        expect(err.errors.status).toBeDefined();
    });

    it('should set default values for status, createdAt, and updatedAt', async () => {
        const item = new Item({
            title: 'Test',
            description: 'Test desc',
            category: 'Electronics',
            condition: 'New',
            images: ['img.jpg'],
            owner: new mongoose.Types.ObjectId(),
            location: 'Test'
        });
        await item.save();
        expect(item.status).toBe('Available');
        expect(item.createdAt).toBeInstanceOf(Date);
        expect(item.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on save', async () => {
        const item = new Item({
            title: 'Test',
            description: 'Test desc',
            category: 'Electronics',
            condition: 'New',
            images: ['img.jpg'],
            owner: new mongoose.Types.ObjectId(),
            location: 'Test'
        });
        await item.save();
        const oldUpdatedAt = item.updatedAt;
        item.title = 'Updated';
        await item.save();
        expect(item.updatedAt.getTime()).toBeGreaterThanOrEqual(oldUpdatedAt.getTime());
    });

    it('should have a text index on title and description', async () => {
        const indexes = await Item.collection.getIndexes({ full: true });
        const textIndex = indexes.find(idx => idx.key && idx.key._fts === 'text');
        expect(textIndex).toBeDefined();
        expect(textIndex.weights).toHaveProperty('title', 1);
        expect(textIndex.weights).toHaveProperty('description', 1);
    });
}); 