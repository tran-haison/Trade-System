const request = require('supertest');
const express = require('express');
const itemRoutes = require('../../routes/itemRoutes');
const Item = require('../../models/Item');
const User = require('../../models/User');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const userId = '507f1f77bcf86cd799439011'; // Use a fixed ObjectId string
let app, mongoServer, agent;

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
    ensureAuthenticated: (req, res, next) => {
        req.user = { _id: userId, id: userId };
        next();
    }
}));

describe('Item API', () => {
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        await mongoose.connect(mongoServer.getUri());
        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));
        app.use((req, res, next) => { req.flash = () => { }; next(); }); // mock flash
        app.use('/items', itemRoutes);
        agent = request.agent(app);
        await User.create({
            _id: userId,
            firstName: 'Test',
            lastName: 'User',
            email: 'testuser@example.com',
            password: 'password'
        });
        // Globally override res.render for all requests
        app.response.render = function (view, options) {
            if (this.headersSent) return;
            this.status(this.statusCode !== 200 ? this.statusCode : 500).json({ view, ...options });
        };
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    afterEach(async () => {
        await Item.deleteMany();
    });

    it('should create an item (POST /items)', async () => {
        const res = await agent
            .post('/items')
            .field('title', 'Test')
            .field('description', 'desc')
            .field('category', 'Electronics')
            .field('condition', 'New')
            .field('location', 'Loc')
            .attach('images', Buffer.from(''), 'dummy.jpg'); // Force multipart/form-data
        expect([200, 302]).toContain(res.status); // Accept either 200 or 302
    });

    // For GET/view tests, override res.render to return JSON
    describe('GET item views', () => {
        beforeAll(() => {
            app.response.render = function (view, options) {
                this.status(200).json({ view, ...options });
            };
        });

        it('should get items (GET /items)', async () => {
            await Item.create({ title: 'A', description: 'desc', category: 'Electronics', condition: 'New', location: 'Loc', images: ['img.jpg'], owner: userId });
            const res = await agent.get('/items');
            expect(res.status).toBe(200);
            expect(res.text).toContain('A');
        });

        it('should get a single item (GET /items/:id)', async () => {
            const item = await Item.create({ title: 'B', description: 'desc', category: 'Electronics', condition: 'New', location: 'Loc', images: ['img.jpg'], owner: userId });
            const res = await agent.get(`/items/${item._id}`);
            expect(res.status).toBe(200);
            expect(res.text).toContain('B');
        });
    });

    it('should update an item (PUT /items/:id)', async () => {
        const item = await Item.create({ title: 'C', description: 'desc', category: 'Electronics', condition: 'New', location: 'Loc', images: ['img.jpg'], owner: userId });
        const res = await agent
            .put(`/items/${item._id}`)
            .set('Accept', 'application/json')
            .field('title', 'C2')
            .field('description', 'desc2')
            .field('category', 'Electronics')
            .field('condition', 'Good')
            .field('location', 'Loc2')
            .field('status', 'Pending')
            .attach('images', Buffer.from(''), 'dummy.jpg'); // Force multipart/form-data
        expect([200, 302]).toContain(res.status); // Accept either 200 (JSON) or 302 (redirect)
        const updated = await Item.findById(item._id);
        expect(updated.title).toBe('C2');
        expect(updated.condition).toBe('Good');
    });

    it('should delete an item (DELETE /items/:id)', async () => {
        const item = await Item.create({ title: 'D', description: 'desc', category: 'Electronics', condition: 'New', location: 'Loc', images: ['img.jpg'], owner: userId });
        const res = await agent.delete(`/items/${item._id}`);
        expect(res.status).toBe(302); // redirect
        const found = await Item.findById(item._id);
        expect(found).toBeNull();
    });

    it('should bulk delete items (POST /items/api/bulk-delete)', async () => {
        const items = await Item.create([
            { title: 'Bulk1', description: 'desc', category: 'Electronics', condition: 'New', location: 'Loc', images: ['img.jpg'], owner: userId },
            { title: 'Bulk2', description: 'desc', category: 'Books', condition: 'Good', location: 'Loc', images: ['img.jpg'], owner: userId }
        ]);
        const ids = items.map(i => i._id);
        const res = await agent
            .post('/items/api/bulk-delete')
            .set('Accept', 'application/json')
            .send({ ids });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const found = await Item.find({ _id: { $in: ids } });
        expect(found.length).toBe(0);
    });

    it('should bulk update items (POST /items/api/bulk-update)', async () => {
        const items = await Item.create([
            { title: 'BulkUp1', description: 'desc', category: 'Electronics', condition: 'New', location: 'Loc', images: ['img.jpg'], owner: userId },
            { title: 'BulkUp2', description: 'desc', category: 'Books', condition: 'Good', location: 'Loc', images: ['img.jpg'], owner: userId }
        ]);
        const ids = items.map(i => i._id);
        const res = await agent
            .post('/items/api/bulk-update')
            .set('Accept', 'application/json')
            .send({ ids, update: { status: 'Traded' } });
        const updated = await Item.find({ _id: { $in: ids } });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(updated.every(i => i.status === 'Traded')).toBe(true);
    });
}); 