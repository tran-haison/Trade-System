const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'TRADE_PROPOSAL',
            'TRADE_ACCEPTED',
            'TRADE_REJECTED',
            'TRADE_CANCELLED',
            'TRADE_COMPLETED',
            'TRADE_MESSAGE',
            'RATING_RECEIVED'
        ]
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    relatedTrade: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trade'
    },
    read: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for faster queries
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 