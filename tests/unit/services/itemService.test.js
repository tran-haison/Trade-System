const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Item = require('../../../models/Item');
const itemService = require('../../../services/itemService');
require('../../../models/User');

describe('itemService', () => {
    let mongoServer;
    let userId;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        await mongoose.connect(mongoServer.getUri(), { useNewUrlParser: true, useUnifiedTopology: true });
        userId = new mongoose.Types.ObjectId();
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    afterEach(async () => {
        await Item.deleteMany();
    });

    it('should create an item', async () => {
        const data = {
            title: 'Test Item',
            description: 'A test item',
            category: 'Electronics',
            condition: 'New',
            location: 'Test City',
            images: ['img1.jpg'],
            owner: userId
        };
        const item = await itemService.createItemService(data);
        expect(item).toBeDefined();
        expect(item.title).toBe('Test Item');
        expect(item.status).toBe('Available');
    });

    it('should update an item', async () => {
        const item = await Item.create({
            title: 'Old',
            description: 'desc',
            category: 'Electronics',
            condition: 'New',
            location: 'Loc',
            images: ['img.jpg'],
            owner: userId
        });
        const updated = await itemService.updateItemService(item._id, userId, {
            title: 'Updated',
            description: 'desc2',
            category: 'Electronics',
            condition: 'Good',
            location: 'Loc2',
            status: 'Pending',
            images: ['img2.jpg']
        });
        expect(updated.title).toBe('Updated');
        expect(updated.condition).toBe('Good');
        expect(updated.status).toBe('Pending');
        expect(updated.images[0]).toBe('img2.jpg');
    });

    it('should delete an item', async () => {
        const item = await Item.create({
            title: 'ToDelete',
            description: 'desc',
            category: 'Electronics',
            condition: 'New',
            location: 'Loc',
            images: ['img.jpg'],
            owner: userId
        });
        const deleted = await itemService.deleteItemService(item._id, userId);
        expect(deleted).toBeDefined();
        const found = await Item.findById(item._id);
        expect(found).toBeNull();
    });

    it('should get paginated items with filters', async () => {
        await Item.create([
            { title: 'A', description: 'desc', category: 'Electronics', condition: 'New', location: 'Loc', images: ['img.jpg'], owner: userId },
            { title: 'B', description: 'desc', category: 'Books', condition: 'Good', location: 'Loc', images: ['img.jpg'], owner: userId }
        ]);
        const { items, currentPage, pages } = await itemService.getItemsService({ page: 1, search: 'A' });
        expect(Array.isArray(items)).toBe(true);
        expect(currentPage).toBe(1);
        expect(pages).toBeGreaterThanOrEqual(1);
        expect(items[0].title).toBe('A');
    });

    it('should get user items with status and search filters', async () => {
        await Item.create([
            { title: 'Item1', description: 'desc', category: 'Electronics', condition: 'New', location: 'Loc', images: ['img.jpg'], owner: userId, status: 'Available' },
            { title: 'Item2', description: 'desc', category: 'Books', condition: 'Good', location: 'Loc', images: ['img.jpg'], owner: userId, status: 'Traded' }
        ]);
        const available = await itemService.getUserItemsWithFilters(userId, { status: 'Available' });
        expect(available.length).toBe(1);
        expect(available[0].status).toBe('Available');
        const search = await itemService.getUserItemsWithFilters(userId, { search: 'Item2' });
        expect(search.length).toBe(1);
        expect(search[0].title).toBe('Item2');
    });

    it('should bulk delete items by IDs and owner', async () => {
        const items = await Item.create([
            { title: 'Bulk1', description: 'desc', category: 'Electronics', condition: 'New', location: 'Loc', images: ['img.jpg'], owner: userId },
            { title: 'Bulk2', description: 'desc', category: 'Books', condition: 'Good', location: 'Loc', images: ['img.jpg'], owner: userId }
        ]);
        const ids = items.map(i => i._id);
        const result = await itemService.deleteItemsByIdsAndOwner(ids, userId);
        expect(result.deletedCount).toBe(2);
        const found = await Item.find({ _id: { $in: ids } });
        expect(found.length).toBe(0);
    });

    it('should bulk update items by IDs and owner', async () => {
        const items = await Item.create([
            { title: 'BulkUp1', description: 'desc', category: 'Electronics', condition: 'New', location: 'Loc', images: ['img.jpg'], owner: userId },
            { title: 'BulkUp2', description: 'desc', category: 'Books', condition: 'Good', location: 'Loc', images: ['img.jpg'], owner: userId }
        ]);
        const ids = items.map(i => i._id);
        const result = await itemService.updateItemsByIdsAndOwner(ids, userId, { status: 'Traded' });
        expect(result.modifiedCount || result.nModified).toBe(2);
        const updated = await Item.find({ _id: { $in: ids } });
        expect(updated.every(i => i.status === 'Traded')).toBe(true);
    });
}); 