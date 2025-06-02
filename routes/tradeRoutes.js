const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Trade = require('../models/Trade');
const User = require('../models/User');
const Item = require('../models/Item');
const mongoose = require('mongoose');
const tradeController = require('../controllers/tradeController');

// Helper function to check if request is API request
const isApiRequest = (req) => {
    return req.path.startsWith('/api/') || req.get('Accept') === 'application/json';
};

// Helper function to create activities for both users in a trade
async function createTradeActivity(trade, type, actionUser) {
    try {

        const initiator = await User.findById(trade.initiator);
        const receiver = await User.findById(trade.receiver);
        
        // Determine if actionUser is initiator or receiver
        const isInitiator = actionUser.toString() === trade.initiator.toString();

        // Create activities for both users
        const activities = [];

        // Activity for initiator
        let initiatorMessage;
        switch (type) {
            case 'TRADE_CREATED':
                initiatorMessage = `You have proposed a trade with ${receiver.firstName} ${receiver.lastName}`;
                break;
            case 'TRADE_ACCEPTED':
                initiatorMessage = `${receiver.firstName} ${receiver.lastName} has accepted your trade proposal`;
                break;
            case 'TRADE_REJECTED':
                initiatorMessage = `${receiver.firstName} ${receiver.lastName} has rejected your trade proposal`;
                break;
            case 'TRADE_COMPLETED':
                initiatorMessage = `${receiver.firstName} ${receiver.lastName} has completed the trade with you`;
                break;
            case 'TRADE_CANCELLED':
                initiatorMessage = `You have cancelled your trade with ${receiver.firstName} ${receiver.lastName}`;
                break;
            default:
                initiatorMessage = 'Trade activity occurred';
        }

        // Activity for receiver
        let receiverMessage;
        switch (type) {
            case 'TRADE_CREATED':
                receiverMessage = `${initiator.firstName} ${initiator.lastName} has sent you a trade proposal`;
                break;
            case 'TRADE_ACCEPTED':
                receiverMessage = `You have accepted the trade proposal from ${initiator.firstName} ${initiator.lastName}`;
                break;
            case 'TRADE_REJECTED':
                receiverMessage = `You have rejected the trade proposal from ${initiator.firstName} ${initiator.lastName}`;
                break;
            case 'TRADE_COMPLETED':
                receiverMessage = `You have completed the trade with ${initiator.firstName} ${initiator.lastName}`;
                break;
            case 'TRADE_CANCELLED':
                receiverMessage = `${initiator.firstName} ${initiator.lastName} has cancelled the trade`;
                break;
            default:
                receiverMessage = 'Trade activity occurred';
        }

        // Create activity for initiator
        const initiatorActivity = await Activity.create({
            creator: actionUser,
            receiver: trade.initiator,
            type: type,
            message: initiatorMessage,
            relatedTrade: trade._id
        });
        activities.push(initiatorActivity);

        // Create activity for receiver
        const receiverActivity = await Activity.create({
            creator: actionUser,
            receiver: trade.receiver,
            type: type,
            message: receiverMessage,
            relatedTrade: trade._id
        });
        activities.push(receiverActivity);

        
    } catch (error) {
        console.error('Error creating trade activity:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
    }
}

// Get all trades for the logged-in user
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const trades = await Trade.find({
            $or: [
                { initiator: req.user._id },
                { receiver: req.user._id }
            ]
        })
        .populate('initiator', 'firstName lastName email')
        .populate('receiver', 'firstName lastName email')
        .populate('offeredItems')
        .populate('requestedItems')
        .sort({ updatedAt: -1 });

        if (isApiRequest(req)) {
            return res.json(trades);
        }

        res.render('trades/index', {
            title: 'My Trades',
            trades: trades,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching trades:', error);
        if (isApiRequest(req)) {
            return res.status(500).json({ error: 'Failed to fetch trades' });
        }
        res.status(500).render('error', {
            title: 'Error',
            msg: 'Failed to fetch trades',
            error: error
        });
    }
});

// Create trade
router.post('/', ensureAuthenticated, upload.none(), async (req, res) => {
    try {
        const { receiverId, offeredItems, requestedItems, message } = req.body;
        
        // Parse the item IDs from the request
        const offeredItemsArray = Array.isArray(offeredItems) ? offeredItems : JSON.parse(offeredItems);
        const requestedItemsArray = Array.isArray(requestedItems) ? requestedItems : JSON.parse(requestedItems);
        
        // Validate items
        const offeredItemsList = await Item.find({ _id: { $in: offeredItemsArray } });
        const requestedItemsList = await Item.find({ _id: { $in: requestedItemsArray } });
        
        if (offeredItemsList.length !== offeredItemsArray.length || requestedItemsList.length !== requestedItemsArray.length) {
            return res.status(400).json({ message: 'One or more items not found' });
        }

        // Check if items are available
        const unavailableItems = [...offeredItemsList, ...requestedItemsList].filter(item => item.status !== 'Available');
        if (unavailableItems.length > 0) {
            return res.status(400).json({ message: 'One or more items are not available for trade' });
        }

        // Create trade
        const trade = await Trade.create({
            initiator: req.user._id,
            receiver: receiverId,
            offeredItems: offeredItemsArray,
            requestedItems: requestedItemsArray,
            messages: [{
                sender: req.user._id,
                content: message || 'Trade proposal'
            }]
        });

        // Create activities for both users
        await createTradeActivity(trade, 'TRADE_CREATED', req.user._id);

        if (isApiRequest(req)) {
            return res.status(201).json(trade);
        }

        req.flash('success_msg', 'Trade proposal sent successfully');
        return res.redirect('/trades');
    } catch (error) {
        console.error('Error creating trade:', error);
        if (isApiRequest(req)) {
            return res.status(500).json({ error: 'Failed to create trade' });
        }
        res.status(500).render('error', {
            title: 'Error',
            msg: 'Failed to create trade',
            error: error
        });
    }
});

// Update trade status
router.post('/:id/status', ensureAuthenticated, async (req, res) => {
    try {
        const { status } = req.body;
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            if (isApiRequest(req)) {
                return res.status(404).json({ error: 'Trade not found' });
            }
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Trade not found'
            });
        }

        // Check if user is authorized to update status
        if (trade.receiver.toString() !== req.user._id.toString()) {
            if (isApiRequest(req)) {
                return res.status(403).json({ error: 'Not authorized to update trade status' });
            }
            return res.status(403).render('error', {
                title: 'Error',
                message: 'Not authorized to update trade status'
            });
        }

        if (!['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled'].includes(status)) {
            if (isApiRequest(req)) {
                return res.status(400).json({ error: 'Invalid status value' });
            }
            return res.status(400).render('error', {
                title: 'Error',
                message: 'Invalid status value'
            });
        }

        // Update trade status
        trade.status = status;
        await trade.save();

        // Update items status based on trade status
        if (status === 'Accepted') {
            await Item.updateMany(
                { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
                { status: 'Traded' }
            );
        } else if (status === 'Rejected' || status === 'Cancelled') {
            await Item.updateMany(
                { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
                { status: 'Available' }
            );
        }

        // Create activities for both users based on status
        let activityType;
        switch (status) {
            case 'Accepted':
                activityType = 'TRADE_ACCEPTED';
                break;
            case 'Rejected':
                activityType = 'TRADE_REJECTED';
                break;
            case 'Completed':
                activityType = 'TRADE_COMPLETED';
                break;
            case 'Cancelled':
                activityType = 'TRADE_CANCELLED';
                break;
            default:
                activityType = 'TRADE_CREATED';
        }

        // Create activities for both users
        await createTradeActivity(trade, activityType, req.user._id);

        if (isApiRequest(req)) {
            return res.json(trade);
        }

        req.flash('success_msg', `Trade ${status.toLowerCase()} successfully`);
        return res.redirect(`/trades/${trade._id}`);
    } catch (error) {
        console.error('Error updating trade status:', error);
        if (isApiRequest(req)) {
            return res.status(500).json({ error: 'Failed to update trade status' });
        }
        return res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to update trade status'
        });
    }
});

// Add message to trade
router.post('/:id/messages', ensureAuthenticated, async (req, res) => {
    try {
        const { content } = req.body;
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).json({ error: 'Trade not found' });
        }

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Check if user is part of this trade
        if (trade.initiator.toString() !== req.user._id.toString() &&
            trade.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to message in this trade' });
        }

        await trade.addMessage(req.user._id, content);
        
        if (isApiRequest(req)) {
            return res.json(trade);
        }

        res.redirect(`/trades/${trade._id}`);
    } catch (error) {
        console.error('Error adding message:', error);
        if (isApiRequest(req)) {
            return res.status(500).json({ error: 'Failed to add message' });
        }
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to add message'
        });
    }
});

// Get trade details
router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id)
            .populate('initiator', 'firstName lastName email')
            .populate('receiver', 'firstName lastName email')
            .populate('offeredItems')
            .populate('requestedItems')
            .populate('messages.sender', 'firstName lastName');

    if (!trade) {
      return res.status(404).render('error', { title: 'Error', message: 'Trade not found' });
    }

        // Check if user is part of this trade
        if (trade.initiator._id.toString() !== req.user._id.toString() &&
            trade.receiver._id.toString() !== req.user._id.toString()) {
            if (isApiRequest(req)) {
                return res.status(403).json({ error: 'Not authorized to view this trade' });
            }
            return res.status(403).render('error', {
                title: 'Error',
                message: 'Not authorized to view this trade'
            });
        }

        if (isApiRequest(req)) {
            return res.json(trade);
        }

        res.render('trades/show', {
            title: 'Trade Details',
            trade: trade,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching trade details:', error);
        if (isApiRequest(req)) {
            return res.status(500).json({ error: 'Failed to fetch trade details' });
        }
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to fetch trade details'
        });
    }
});

// Delete trade
router.delete('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).json({ error: 'Trade not found' });
        }

        // Only initiator can delete the trade
        if (trade.initiator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to delete this trade' });
        }

        // Set items back to Available
        await Item.updateMany(
            { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
            { status: 'Available' }
        );

        await trade.deleteOne();

        if (isApiRequest(req)) {
            return res.json({ message: 'Trade deleted successfully' });
        }

        res.redirect('/trades');
    } catch (error) {
        console.error('Error deleting trade:', error);
        if (isApiRequest(req)) {
            return res.status(500).json({ error: 'Failed to delete trade' });
        }
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to delete trade'
        });
    }
});

// Rate trade partner
router.post('/:id/rate', ensureAuthenticated, tradeController.rateTradePartner);

// Complete trade
router.post('/:id/complete', ensureAuthenticated, async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            if (isApiRequest(req)) {
                return res.status(404).json({ error: 'Trade not found' });
            }
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Trade not found'
            });
        }

        // Check if user is authorized to complete the trade
        if (trade.initiator.toString() !== req.user._id.toString() && 
            trade.receiver.toString() !== req.user._id.toString()) {
            if (isApiRequest(req)) {
                return res.status(403).json({ error: 'Not authorized to complete this trade' });
            }
            return res.status(403).render('error', {
                title: 'Error',
                message: 'Not authorized to complete this trade'
            });
        }

        // Check if trade is in Accepted state
        if (trade.status !== 'Accepted') {
            if (isApiRequest(req)) {
                return res.status(400).json({ error: 'Trade must be in Accepted state to complete' });
            }
            return res.status(400).render('error', {
                title: 'Error',
                message: 'Trade must be in Accepted state to complete'
            });
        }

        // Update trade status to Completed
        trade.status = 'Completed';
        await trade.save();

        // Update items status to Traded
        await Item.updateMany(
            { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
            { status: 'Traded' }
        );

        // Increment totalTrades for both users
        await User.findByIdAndUpdate(trade.initiator, { $inc: { totalTrades: 1 } });
        await User.findByIdAndUpdate(trade.receiver, { $inc: { totalTrades: 1 } });

        // Create activities for both users
        await createTradeActivity(trade, 'TRADE_COMPLETED', req.user._id);

        if (isApiRequest(req)) {
            return res.json(trade);
        }

        req.flash('success_msg', 'Trade completed successfully');
        return res.redirect(`/trades/${trade._id}`);
    } catch (error) {
        console.error('Error completing trade:', error);
        if (isApiRequest(req)) {
            return res.status(500).json({ error: 'Failed to complete trade' });
        }
        return res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to complete trade'
        });
    }
});

module.exports = router;
