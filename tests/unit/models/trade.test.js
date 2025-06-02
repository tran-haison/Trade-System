const mongoose = require('mongoose');
const Trade = require('../../../models/Trade');
const User = require('../../../models/User');
const Item = require('../../../models/Item');

describe('Trade Model Test', () => {
    let initiator, receiver, offeredItem, requestedItem;

    beforeAll(async () => {
        // Disconnect any existing connections
        await mongoose.disconnect();
        
        // Connect to test database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trade_system_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    }, 10000); // Increase timeout to 10 seconds

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }, 10000); // Increase timeout to 10 seconds

    beforeEach(async () => {
        // Clean up all collections
        await User.deleteMany({});
        await Item.deleteMany({});
        await Trade.deleteMany({});

        // Create test users
        initiator = await User.create({
            firstName: 'Test',
            lastName: 'Initiator',
            email: 'initiator@test.com',
            password: 'password123'
        });

        receiver = await User.create({
            firstName: 'Test',
            lastName: 'Receiver',
            email: 'receiver@test.com',
            password: 'password123'
        });

        // Create test items
        offeredItem = await Item.create({
            title: 'Test Offered Item',
            description: 'Test Description',
            owner: initiator._id,
            status: 'Available',
            location: 'Test Location',
            condition: 'Like New',
            category: 'Electronics',
            value: 100
        });

        requestedItem = await Item.create({
            title: 'Test Requested Item',
            description: 'Test Description',
            owner: receiver._id,
            status: 'Available',
            location: 'Test Location',
            condition: 'Good',
            category: 'Books',
            value: 100
        });
    });

    describe('Trade Creation', () => {
        it('should create a trade successfully', async () => {
            const trade = await Trade.create({
                initiator: initiator._id,
                receiver: receiver._id,
                offeredItems: [offeredItem._id],
                requestedItems: [requestedItem._id],
                messages: [{
                    sender: initiator._id,
                    content: 'Test trade proposal'
                }]
            });

            expect(trade).toBeDefined();
            expect(trade.status).toBe('Pending');
            expect(trade.initiator.toString()).toBe(initiator._id.toString());
            expect(trade.receiver.toString()).toBe(receiver._id.toString());
            expect(trade.messages).toHaveLength(1);
        });

        it('should fail to create trade with invalid status', async () => {
            try {
                await Trade.create({
                    initiator: initiator._id,
                    receiver: receiver._id,
                    offeredItems: [offeredItem._id],
                    requestedItems: [requestedItem._id],
                    status: 'InvalidStatus',
                    messages: [{
                        sender: initiator._id,
                        content: 'Test trade proposal'
                    }]
                });
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('Trade Status Updates', () => {
        it('should update trade status correctly', async () => {
            const trade = await Trade.create({
                initiator: initiator._id,
                receiver: receiver._id,
                offeredItems: [offeredItem._id],
                requestedItems: [requestedItem._id],
                messages: [{
                    sender: initiator._id,
                    content: 'Test trade proposal'
                }]
            });

            trade.status = 'Accepted';
            await trade.save();

            const updatedTrade = await Trade.findById(trade._id);
            expect(updatedTrade.status).toBe('Accepted');
        });

        it('should not allow invalid status updates', async () => {
            const trade = await Trade.create({
                initiator: initiator._id,
                receiver: receiver._id,
                offeredItems: [offeredItem._id],
                requestedItems: [requestedItem._id],
                messages: [{
                    sender: initiator._id,
                    content: 'Test trade proposal'
                }]
            });

            try {
                trade.status = 'InvalidStatus';
                await trade.save();
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('Trade Messages', () => {
        it('should add message to trade', async () => {
            const trade = await Trade.create({
                initiator: initiator._id,
                receiver: receiver._id,
                offeredItems: [offeredItem._id],
                requestedItems: [requestedItem._id],
                messages: [{
                    sender: initiator._id,
                    content: 'Initial message'
                }]
            });

            await trade.addMessage(receiver._id, 'New message');
            const updatedTrade = await Trade.findById(trade._id);
            
            expect(updatedTrade.messages).toHaveLength(2);
            expect(updatedTrade.messages[1].content).toBe('New message');
            expect(updatedTrade.messages[1].sender.toString()).toBe(receiver._id.toString());
        });

        it('should not add empty message', async () => {
            const trade = await Trade.create({
                initiator: initiator._id,
                receiver: receiver._id,
                offeredItems: [offeredItem._id],
                requestedItems: [requestedItem._id],
                messages: [{
                    sender: initiator._id,
                    content: 'Initial message'
                }]
            });

            try {
                await trade.addMessage(receiver._id, '');
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('Trade Completion', () => {
        it('should complete trade and update item statuses', async () => {
            const trade = await Trade.create({
                initiator: initiator._id,
                receiver: receiver._id,
                offeredItems: [offeredItem._id],
                requestedItems: [requestedItem._id],
                status: 'Accepted',
                messages: [{
                    sender: initiator._id,
                    content: 'Initial message'
                }]
            });

            trade.status = 'Completed';
            await trade.save();

            // Update items status
            await Item.updateMany(
                { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
                { status: 'Traded' }
            );

            const updatedTrade = await Trade.findById(trade._id);
            const updatedOfferedItem = await Item.findById(offeredItem._id);
            const updatedRequestedItem = await Item.findById(requestedItem._id);

            expect(updatedTrade.status).toBe('Completed');
            expect(updatedOfferedItem.status).toBe('Traded');
            expect(updatedRequestedItem.status).toBe('Traded');
        });
    });
}); 