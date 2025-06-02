const Trade = require('../models/Trade');
const Item = require('../models/Item');
const User = require('../models/User');
const Activity = require('../models/Activity');

// Create a new trade
async function createTrade(initiatorId, receiverId, offeredItems, requestedItems, message) {
    try {
        // Validate items
        const offeredItemsList = await Item.find({ _id: { $in: offeredItems } });
        const requestedItemsList = await Item.find({ _id: { $in: requestedItems } });
        
        if (offeredItemsList.length !== offeredItems.length || requestedItemsList.length !== requestedItems.length) {
            throw new Error('One or more items not found');
        }

        // Check if items are available
        const unavailableItems = [...offeredItemsList, ...requestedItemsList].filter(item => item.status !== 'Available');
        if (unavailableItems.length > 0) {
            throw new Error('One or more items are not available for trade');
        }

        // Create trade
        const trade = await Trade.create({
            initiator: initiatorId,
            receiver: receiverId,
            offeredItems: offeredItems,
            requestedItems: requestedItems,
            messages: [{
                sender: initiatorId,
                content: message || 'Trade proposal'
            }]
        });

        return trade;
    } catch (error) {
        throw error;
    }
}

// Update trade status
async function updateTradeStatus(tradeId, status, userId) {
    try {
        const trade = await Trade.findById(tradeId);
        
        if (!trade) {
            throw new Error('Trade not found');
        }

        // Check if user is authorized to update status
        if (trade.receiver.toString() !== userId.toString()) {
            throw new Error('Not authorized to update trade status');
        }

        if (!['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled'].includes(status)) {
            throw new Error('Invalid status value');
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

        return trade;
    } catch (error) {
        throw error;
    }
}

// Get user's trades
async function getUserTrades(userId) {
    try {
        const trades = await Trade.find({
            $or: [
                { initiator: userId },
                { receiver: userId }
            ]
        })
        .populate('initiator', 'firstName lastName email')
        .populate('receiver', 'firstName lastName email')
        .populate('offeredItems')
        .populate('requestedItems')
        .sort({ updatedAt: -1 });

        return trades;
    } catch (error) {
        throw error;
    }
}

// Get trade details
async function getTradeDetails(tradeId, userId) {
    try {
        const trade = await Trade.findById(tradeId)
            .populate('initiator', 'firstName lastName email')
            .populate('receiver', 'firstName lastName email')
            .populate('offeredItems')
            .populate('requestedItems')
            .populate('messages.sender', 'firstName lastName');

        if (!trade) {
            throw new Error('Trade not found');
        }

        // Check if user is part of this trade
        if (trade.initiator._id.toString() !== userId.toString() &&
            trade.receiver._id.toString() !== userId.toString()) {
            throw new Error('Not authorized to view this trade');
        }

        return trade;
    } catch (error) {
        throw error;
    }
}

// Add message to trade
async function addTradeMessage(tradeId, userId, content) {
    try {
        const trade = await Trade.findById(tradeId);

        if (!trade) {
            throw new Error('Trade not found');
        }

        if (!content || content.trim() === '') {
            throw new Error('Message content is required');
        }

        // Check if user is part of this trade
        if (trade.initiator.toString() !== userId.toString() &&
            trade.receiver.toString() !== userId.toString()) {
            throw new Error('Not authorized to message in this trade');
        }

        await trade.addMessage(userId, content);
        return trade;
    } catch (error) {
        throw error;
    }
}

// Complete trade
async function completeTrade(tradeId, userId) {
    try {
        const trade = await Trade.findById(tradeId);

        if (!trade) {
            throw new Error('Trade not found');
        }

        // Check if user is authorized to complete the trade
        if (trade.initiator.toString() !== userId.toString() && 
            trade.receiver.toString() !== userId.toString()) {
            throw new Error('Not authorized to complete this trade');
        }

        // Check if trade is in Accepted state
        if (trade.status !== 'Accepted') {
            throw new Error('Trade must be in Accepted state to complete');
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

        return trade;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    createTrade,
    updateTradeStatus,
    getUserTrades,
    getTradeDetails,
    addTradeMessage,
    completeTrade
}; 