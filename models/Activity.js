const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'TRADE_CREATED',
            'TRADE_ACCEPTED',
            'TRADE_REJECTED',
            'TRADE_COMPLETED',
            'TRADE_CANCELLED',
            'ITEM_CREATED',
            'ITEM_UPDATED',
            'ITEM_DELETED',
            'MESSAGE_RECEIVED'
        ]
    },
    message: {
        type: String,
        required: true
    },
    relatedItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
    },
    relatedTrade: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trade'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Activity', activitySchema); 