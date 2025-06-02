const tradeService = require('../services/tradeService');
const Trade = require('../models/Trade');
const Item = require('../models/Item');
const User = require('../models/User');
const { notifyTradeProposal, notifyTradeStatusUpdate, notifyNewMessage, notifyRatingReceived } = require('../services/notificationService');
const mongoose = require('mongoose');

// Web routes handlers
exports.getUserTrades = async (req, res) => {
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

        res.render('trades/index', {
            title: 'My Trades',
            trades: trades,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching trades:', error);
        res.status(500).render('error', {
            title: 'Error',
            msg: 'Failed to fetch trades',
            error: error
        });
    }
};

exports.getTradeDetails = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id)
            .populate('initiator', 'firstName lastName email')
            .populate('receiver', 'firstName lastName email')
            .populate('offeredItems')
            .populate('requestedItems');

        if (!trade) {
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Trade not found'
            });
        }

        // Check if user is part of this trade
        if (trade.initiator._id.toString() !== req.user._id.toString() &&
            trade.receiver._id.toString() !== req.user._id.toString()) {
            return res.status(403).render('error', {
                title: 'Error',
                message: 'Not authorized to view this trade'
            });
        }

        res.render('trades/show', {
            title: 'Trade Details',
            trade: trade,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching trade details:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to fetch trade details'
        });
    }
};

exports.createTrade = async (req, res) => {
    try {
        let { requestedItem, offeredItems, message } = req.body;
        
        // Always treat offeredItems as an array
        if (!Array.isArray(offeredItems)) {
            offeredItems = offeredItems ? [offeredItems] : [];
        }

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(requestedItem)) {
            return res.status(400).render('error', {
                title: 'Error',
                msg: 'Invalid requested item',
                error: { status: 400 }
            });
        }

        if (offeredItems.some(id => !mongoose.Types.ObjectId.isValid(id))) {
            return res.status(400).render('error', {
                title: 'Error',
                msg: 'Invalid offered items',
                error: { status: 400 }
            });
        }

        // Validate required fields
        if (!requestedItem) {
            return res.status(400).render('error', {
                title: 'Error',
                msg: 'No item specified for trade',
                error: { status: 400 }
            });
        }

        if (!offeredItems || offeredItems.length === 0) {
            return res.status(400).render('error', {
                title: 'Error',
                msg: 'Please select at least one item to offer',
                error: { status: 400 }
            });
        }

        // Get the requested item to find its owner
        const requestedItemDoc = await Item.findById(requestedItem).populate('owner', 'firstName lastName');
        if (!requestedItemDoc) {
            return res.status(404).render('error', {
                title: 'Error',
                msg: 'Requested item not found',
                error: { status: 404 }
            });
        }

        // Validate that offered items belong to the current user
        const offeredItemsList = await Item.find({
            _id: { $in: offeredItems },
            owner: req.user._id
        });

        if (offeredItemsList.length !== offeredItems.length) {
            return res.status(400).render('error', {
                title: 'Error',
                msg: 'Invalid items selected for trade',
                error: { status: 400 }
            });
        }

        // Set all items involved in the trade to 'Pending' status
        const allItems = [...offeredItemsList, requestedItemDoc];
        for (const item of allItems) {
            await Item.findByIdAndUpdate(item._id, { status: 'Pending' });
        }

        const trade = await Trade.create({
            initiator: req.user._id,
            receiver: requestedItemDoc.owner._id,
            requestedItems: [requestedItem],
            offeredItems: offeredItems,
            status: 'Pending',
            messages: [{
                sender: req.user._id,
                content: message || 'Trade proposal'
            }]
        });

        // Send notification to receiver
        await notifyTradeProposal(trade);

        req.flash('success_msg', 'Trade proposal sent successfully');
        res.redirect(`/trades/${trade._id}`);
    } catch (error) {
        console.error('Error creating trade:', error);
        res.status(500).render('error', {
            title: 'Error',
            msg: 'Failed to create trade',
            error: error
        });
    }
};

exports.updateTradeStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Trade not found'
            });
        }

        // Check if user is authorized to update status
        if (trade.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).render('error', {
                title: 'Error',
                message: 'Not authorized to update trade status'
            });
        }

        // Update trade status
        trade.status = status;
        await trade.save();

        // Update item statuses based on trade status
        if (status === 'Accepted') {
            await Item.updateMany(
                { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
                { status: 'Reserved' }
            );
        } else if (status === 'Rejected' || status === 'Cancelled') {
            await Item.updateMany(
                { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
                { status: 'Available' }
            );
        }

        // Send notification about status update
        await notifyTradeStatusUpdate(trade, status);

        req.flash('success_msg', `Trade ${status.toLowerCase()} successfully`);
        res.redirect(`/trades/${trade._id}`);
    } catch (error) {
        console.error('Error updating trade status:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to update trade status'
        });
    }
};

exports.addTradeMessage = async (req, res) => {
    try {
        const { content } = req.body;
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Trade not found'
            });
        }

        // Check if user is part of this trade
        if (trade.initiator.toString() !== req.user._id.toString() &&
            trade.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).render('error', {
                title: 'Error',
                message: 'Not authorized to message in this trade'
            });
        }

        // Add message
        trade.messages.push({
            sender: req.user._id,
            content,
            timestamp: new Date()
        });
        await trade.save();

        // Send notification about new message
        await notifyNewMessage(trade, req.user, content);

        res.redirect(`/trades/${trade._id}`);
    } catch (error) {
        console.error('Error adding message:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to add message'
        });
    }
};

exports.acceptTrade = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Trade not found'
            });
        }

        // Check if user is authorized to accept
        if (trade.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).render('error', {
                title: 'Error',
                message: 'Not authorized to accept this trade'
            });
        }

        // Update trade status
        trade.status = 'Accepted';
        await trade.save();

        // Update item statuses
        await Item.updateMany(
            { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
            { status: 'Reserved' }
        );

        // Send notification
        await notifyTradeStatusUpdate(trade, 'Accepted');

        req.flash('success_msg', 'Trade accepted successfully');
        res.redirect(`/trades/${trade._id}`);
    } catch (error) {
        console.error('Error accepting trade:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to accept trade'
        });
    }
};

exports.rejectTrade = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Trade not found'
            });
        }

        // Check if user is authorized to reject
        if (trade.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).render('error', {
                title: 'Error',
                message: 'Not authorized to reject this trade'
            });
        }

        // Update trade status
        trade.status = 'Rejected';
        await trade.save();

        // Update item statuses
        await Item.updateMany(
            { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
            { status: 'Available' }
        );

        // Send notification
        await notifyTradeStatusUpdate(trade, 'Rejected');

        req.flash('success_msg', 'Trade rejected successfully');
        res.redirect(`/trades/${trade._id}`);
    } catch (error) {
        console.error('Error rejecting trade:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to reject trade'
        });
    }
};

exports.cancelTrade = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Trade not found'
            });
        }

        // Check if user is authorized to cancel
        if (trade.initiator.toString() !== req.user._id.toString() &&
            trade.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).render('error', {
                title: 'Error',
                message: 'Not authorized to cancel this trade'
            });
        }

        // Update trade status
        trade.status = 'Cancelled';
        await trade.save();

        // Update item statuses
        await Item.updateMany(
            { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
            { status: 'Available' }
        );

        // Send notification
        await notifyTradeStatusUpdate(trade, 'Cancelled');

        req.flash('success_msg', 'Trade cancelled successfully');
        res.redirect(`/trades/${trade._id}`);
    } catch (error) {
        console.error('Error cancelling trade:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to cancel trade'
        });
    }
};

// API handlers
exports.getUserTradesAPI = async (req, res) => {
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

        res.json({
            status: 'success',
            data: trades
        });
    } catch (error) {
        console.error('Error fetching trades:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch trades'
        });
    }
};

exports.getTradeDetailsAPI = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id)
            .populate('initiator', 'firstName lastName email')
            .populate('receiver', 'firstName lastName email')
            .populate('offeredItems')
            .populate('requestedItems');

        if (!trade) {
            return res.status(404).json({
                status: 'error',
                message: 'Trade not found'
            });
        }

        // Check if user is part of this trade
        if (trade.initiator._id.toString() !== req.user._id.toString() &&
            trade.receiver._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Not authorized to view this trade'
            });
        }

        res.json({
            status: 'success',
            data: trade
        });
    } catch (error) {
        console.error('Error fetching trade details:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch trade details'
        });
    }
};

exports.createTradeAPI = async (req, res) => {
    try {
        let { requestedItem, offeredItems, message } = req.body;
        
        // Always treat offeredItems as an array
        if (!Array.isArray(offeredItems)) {
            offeredItems = offeredItems ? [offeredItems] : [];
        }

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(requestedItem)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid requested item'
            });
        }

        if (offeredItems.some(id => !mongoose.Types.ObjectId.isValid(id))) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid offered items'
            });
        }

        // Validate required fields
        if (!requestedItem) {
            return res.status(400).json({
                status: 'error',
                message: 'No item specified for trade'
            });
        }

        if (!offeredItems || offeredItems.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Please select at least one item to offer'
            });
        }

        // Get the requested item to find its owner
        const requestedItemDoc = await Item.findById(requestedItem).populate('owner', 'firstName lastName');
        if (!requestedItemDoc) {
            return res.status(404).json({
                status: 'error',
                message: 'Requested item not found'
            });
        }

        // Validate that offered items belong to the current user
        const offeredItemsList = await Item.find({
            _id: { $in: offeredItems },
            owner: req.user._id
        });

        if (offeredItemsList.length !== offeredItems.length) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid items selected for trade'
            });
        }

        // Set all items involved in the trade to 'Pending' status
        const allItems = [...offeredItemsList, requestedItemDoc];
        for (const item of allItems) {
            await Item.findByIdAndUpdate(item._id, { status: 'Pending' });
        }

        const trade = await Trade.create({
            initiator: req.user._id,
            receiver: requestedItemDoc.owner._id,
            requestedItems: [requestedItem],
            offeredItems: offeredItems,
            status: 'Pending',
            messages: [{
                sender: req.user._id,
                content: message || 'Trade proposal'
            }]
        });

        // Send notification to receiver
        await notifyTradeProposal(trade);

        res.status(201).json({
            status: 'success',
            message: 'Trade proposal sent successfully',
            data: trade
        });
    } catch (error) {
        console.error('Error creating trade:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create trade'
        });
    }
};

exports.updateTradeStatusAPI = async (req, res) => {
    try {
        const { status } = req.body;
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).json({
                status: 'error',
                message: 'Trade not found'
            });
        }

        // Check if user is authorized to update status
        if (trade.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Not authorized to update trade status'
            });
        }

        // Update trade status
        trade.status = status;
        await trade.save();

        // Update item statuses based on trade status
        if (status === 'Accepted') {
            await Item.updateMany(
                { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
                { status: 'Reserved' }
            );
        } else if (status === 'Rejected' || status === 'Cancelled') {
            await Item.updateMany(
                { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
                { status: 'Available' }
            );
        }

        // Send notification about status update
        await notifyTradeStatusUpdate(trade, status);

        res.json({
            status: 'success',
            message: `Trade ${status.toLowerCase()} successfully`,
            data: trade
        });
    } catch (error) {
        console.error('Error updating trade status:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update trade status'
        });
    }
};

exports.addTradeMessageAPI = async (req, res) => {
    try {
        const { content } = req.body;
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).json({
                status: 'error',
                message: 'Trade not found'
            });
        }

        // Check if user is part of this trade
        if (trade.initiator.toString() !== req.user._id.toString() &&
            trade.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Not authorized to message in this trade'
            });
        }

        // Add message
        trade.messages.push({
            sender: req.user._id,
            content,
            timestamp: new Date()
        });
        await trade.save();

        // Send notification about new message
        await notifyNewMessage(trade, req.user, content);

        res.json({
            status: 'success',
            message: 'Message added successfully',
            data: trade
        });
    } catch (error) {
        console.error('Error adding message:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to add message'
        });
    }
};

exports.acceptTradeAPI = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).json({
                status: 'error',
                message: 'Trade not found'
            });
        }

        // Check if user is authorized to accept
        if (trade.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Not authorized to accept this trade'
            });
        }

        // Update trade status
        trade.status = 'Accepted';
        await trade.save();

        // Update item statuses
        await Item.updateMany(
            { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
            { status: 'Reserved' }
        );

        // Send notification
        await notifyTradeStatusUpdate(trade, 'Accepted');

        res.json({
            status: 'success',
            message: 'Trade accepted successfully',
            data: trade
        });
    } catch (error) {
        console.error('Error accepting trade:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to accept trade'
        });
    }
};

exports.rejectTradeAPI = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).json({
                status: 'error',
                message: 'Trade not found'
            });
        }

        // Check if user is authorized to reject
        if (trade.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Not authorized to reject this trade'
            });
        }

        // Update trade status
        trade.status = 'Rejected';
        await trade.save();

        // Update item statuses
        await Item.updateMany(
            { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
            { status: 'Available' }
        );

        // Send notification
        await notifyTradeStatusUpdate(trade, 'Rejected');

        res.json({
            status: 'success',
            message: 'Trade rejected successfully',
            data: trade
        });
    } catch (error) {
        console.error('Error rejecting trade:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to reject trade'
        });
    }
};

exports.cancelTradeAPI = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).json({
                status: 'error',
                message: 'Trade not found'
            });
        }

        // Check if user is authorized to cancel
        if (trade.initiator.toString() !== req.user._id.toString() &&
            trade.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Not authorized to cancel this trade'
            });
        }

        // Update trade status
        trade.status = 'Cancelled';
        await trade.save();

        // Update item statuses
        await Item.updateMany(
            { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
            { status: 'Available' }
        );

        // Send notification
        await notifyTradeStatusUpdate(trade, 'Cancelled');

        res.json({
            status: 'success',
            message: 'Trade cancelled successfully',
            data: trade
        });
    } catch (error) {
        console.error('Error cancelling trade:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to cancel trade'
        });
    }
};

// Complete trade
exports.completeTrade = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);
        if (!trade) {
            req.flash('error_msg', 'Trade not found');
            return res.redirect('/trades');
        }
        // Only initiator or receiver can complete
        if (trade.initiator.toString() !== req.user.id && trade.receiver.toString() !== req.user.id) {
            req.flash('error_msg', 'Not authorized to complete this trade');
            return res.redirect(`/trades/${trade._id}`);
        }
        // Only allow if trade is accepted
        if (trade.status !== 'Accepted') {
            req.flash('error_msg', 'Trade must be in Accepted state to be completed');
            return res.redirect(`/trades/${trade._id}`);
        }
        trade.status = 'Completed';
        await trade.save();
        // Set all items to Traded
        await Item.updateMany(
            { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
            { status: 'Traded' }
        );
        
        // Send completion notifications
        await notifyTradeStatusUpdate(trade, 'Completed');
        
        req.flash('success_msg', 'Trade completed successfully');
        res.redirect(`/trades/${trade._id}`);
    } catch (err) {
        console.error('Error completing trade:', err);
        req.flash('error_msg', 'Failed to complete trade');
        res.redirect('/trades');
    }
};

// Rate trade partner
exports.rateTradePartner = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const trade = await Trade.findById(req.params.id);
        
        if (!trade) {
            req.flash('error_msg', 'Trade not found');
            return res.redirect('/trades');
        }
        
        // Only allow rating if trade is completed
        if (trade.status !== 'Completed') {
            req.flash('error_msg', 'Can only rate completed trades');
            return res.redirect(`/trades/${trade._id}`);
        }
        
        // Determine if user is initiator or receiver
        const isInitiator = trade.initiator.toString() === req.user._id.toString();
        const ratingField = isInitiator ? 'initiatorRating' : 'receiverRating';
        
        // Check if already rated
        if (trade[ratingField].rating) {
            req.flash('error_msg', 'You have already rated this trade');
            return res.redirect(`/trades/${trade._id}`);
        }
        
        // Update rating
        trade[ratingField] = {
            rating: parseInt(rating),
            comment,
            timestamp: new Date()
        };
        await trade.save();
        
        // Update user's average rating
        const ratedUser = await User.findById(isInitiator ? trade.receiver : trade.initiator);
        const userTrades = await Trade.find({
            $or: [
                { initiator: ratedUser._id, 'initiatorRating.rating': { $exists: true } },
                { receiver: ratedUser._id, 'receiverRating.rating': { $exists: true } }
            ]
        });
        
        let totalRating = 0;
        let ratingCount = 0;
        
        userTrades.forEach(t => {
            if (t.initiator.toString() === ratedUser._id.toString() && t.initiatorRating.rating) {
                totalRating += t.initiatorRating.rating;
                ratingCount++;
            }
            if (t.receiver.toString() === ratedUser._id.toString() && t.receiverRating.rating) {
                totalRating += t.receiverRating.rating;
                ratingCount++;
            }
        });
        
        ratedUser.averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
        await ratedUser.save();
        
        req.flash('success_msg', 'Rating submitted successfully');
        res.redirect(`/trades/${trade._id}`);
    } catch (err) {
        console.error('Error submitting rating:', err);
        req.flash('error_msg', 'Failed to submit rating');
        res.redirect('/trades');
    }
};

// Complete trade API
exports.completeTradeAPI = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);
        if (!trade) {
            return res.status(404).json({
                status: 'error',
                message: 'Trade not found'
            });
        }

        // Only initiator or receiver can complete
        if (trade.initiator.toString() !== req.user.id && trade.receiver.toString() !== req.user.id) {
            return res.status(403).json({
                status: 'error',
                message: 'Not authorized to complete this trade'
            });
        }

        // Only allow if trade is accepted
        if (trade.status !== 'Accepted') {
            return res.status(400).json({
                status: 'error',
                message: 'Trade must be in Accepted state to be completed'
            });
        }

        trade.status = 'Completed';
        await trade.save();

        // Set all items to Traded
        await Item.updateMany(
            { _id: { $in: [...trade.offeredItems, ...trade.requestedItems] } },
            { status: 'Traded' }
        );
        
        // Send completion notifications
        await notifyTradeStatusUpdate(trade, 'Completed');
        
        res.json({
            status: 'success',
            message: 'Trade completed successfully',
            data: trade
        });
    } catch (err) {
        console.error('Error completing trade:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to complete trade'
        });
    }
};

// Rate trade partner API
exports.rateTradePartnerAPI = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const trade = await Trade.findById(req.params.id);
        
        if (!trade) {
            return res.status(404).json({
                status: 'error',
                message: 'Trade not found'
            });
        }
        
        // Only allow rating if trade is completed
        if (trade.status !== 'Completed') {
            return res.status(400).json({
                status: 'error',
                message: 'Can only rate completed trades'
            });
        }
        
        // Determine if user is initiator or receiver
        const isInitiator = trade.initiator.toString() === req.user.id;
        const ratingField = isInitiator ? 'initiatorRating' : 'receiverRating';
        
        // Check if already rated
        if (trade[ratingField].rating) {
            return res.status(400).json({
                status: 'error',
                message: 'You have already rated this trade'
            });
        }
        
        // Update rating
        trade[ratingField] = {
            rating: parseInt(rating),
            comment,
            timestamp: new Date()
        };
        await trade.save();
        
        // Update user's average rating
        const ratedUser = await User.findById(isInitiator ? trade.receiver : trade.initiator);
        const userTrades = await Trade.find({
            $or: [
                { initiator: ratedUser._id, 'initiatorRating.rating': { $exists: true } },
                { receiver: ratedUser._id, 'receiverRating.rating': { $exists: true } }
            ]
        });
        
        let totalRating = 0;
        let ratingCount = 0;
        
        userTrades.forEach(t => {
            if (t.initiator.toString() === ratedUser._id.toString() && t.initiatorRating.rating) {
                totalRating += t.initiatorRating.rating;
                ratingCount++;
            }
            if (t.receiver.toString() === ratedUser._id.toString() && t.receiverRating.rating) {
                totalRating += t.receiverRating.rating;
                ratingCount++;
            }
        });
        
        ratedUser.averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
        await ratedUser.save();

        // Send rating notification
        await notifyRatingReceived(trade, req.user, rating);
        
        res.json({
            status: 'success',
            message: 'Rating submitted successfully',
            data: trade
        });
    } catch (err) {
        console.error('Error submitting rating:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to submit rating'
        });
    }
};  
