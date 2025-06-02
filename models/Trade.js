const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    initiator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    offeredItems: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: true
    }],
    requestedItems: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: true
    }],
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    initiatorRating: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            maxlength: 500
        },
        timestamp: {
            type: Date
        }
    },
    receiverRating: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            maxlength: 500
        },
        timestamp: {
            type: Date
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
tradeSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Method to add a message to the trade
tradeSchema.methods.addMessage = async function (senderId, content) {
    this.messages.push({
        sender: senderId,
        content: content
    });
    return this.save();
};

// Method to update trade status
tradeSchema.methods.updateStatus = async function (newStatus) {
    this.status = newStatus;
    return this.save();
};

module.exports = mongoose.model('Trade', tradeSchema); 