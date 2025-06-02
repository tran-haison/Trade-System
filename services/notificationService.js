const nodemailer = require('nodemailer');
const User = require('../models/User');
const { sendTradeNotificationEmail } = require('./emailService');
const Notification = require('../models/Notification');

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Create in-app notification
const createNotification = async (user, type, title, message, relatedTrade = null) => {
    try {
        const notification = new Notification({
            user: user._id,
            type,
            title,
            message,
            relatedTrade,
            read: false
        });
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw new Error('Failed to create notification');
    }
};

// Get user's notifications
const getUserNotifications = async (userId, limit = 20) => {
    try {
        const notifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('relatedTrade');
        return notifications;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        throw new Error('Failed to fetch notifications');
    }
};

// Mark notification as read
const markNotificationAsRead = async (notificationId, userId) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, user: userId },
            { read: true },
            { new: true }
        );
        return notification;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw new Error('Failed to mark notification as read');
    }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (userId) => {
    try {
        await Notification.updateMany(
            { user: userId, read: false },
            { read: true }
        );
        return true;
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw new Error('Failed to mark all notifications as read');
    }
};

// Delete notification
const deleteNotification = async (notificationId, userId) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            user: userId
        });
        return notification;
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw new Error('Failed to delete notification');
    }
};

// Send trade notification email
const sendTradeNotification = async (user, subject, message) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `Trade Notification - ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333; text-align: center;">Trade Notification</h1>
                    <p>Hello ${user.firstName},</p>
                    <div style="
                        background-color: #f4f4f4;
                        padding: 20px;
                        border-radius: 5px;
                        margin: 20px 0;">
                        ${message}
                    </div>
                    <p>You can view the details by logging into your account.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
    } catch (err) {
        console.error('Error sending trade notification:', err);
    }
};

// Notify trade proposal
const notifyTradeProposal = async (trade) => {
    try {
        const receiver = await User.findById(trade.receiver);
        const initiator = await User.findById(trade.initiator);

        // Create in-app notification
        await createNotification(
            receiver,
            'TRADE_PROPOSAL',
            'New Trade Proposal',
            `${initiator.firstName} ${initiator.lastName} has sent you a trade proposal`,
            trade._id
        );

        // Send email notification
        await sendTradeNotificationEmail(receiver, trade, 'proposal');
    } catch (error) {
        console.error('Error notifying trade proposal:', error);
        throw new Error('Failed to send trade proposal notification');
    }
};

// Notify trade status update
const notifyTradeStatusUpdate = async (trade, status) => {
    try {
        const receiver = await User.findById(trade.receiver);
        const initiator = await User.findById(trade.initiator);

        let title, message;
        switch (status) {
            case 'Accepted':
                title = 'Trade Accepted';
                message = `${receiver.firstName} ${receiver.lastName} has accepted your trade proposal`;
                await createNotification(initiator, 'TRADE_ACCEPTED', title, message, trade._id);
                await sendTradeNotificationEmail(initiator, trade, 'status');
                break;
            case 'Rejected':
                title = 'Trade Rejected';
                message = `${receiver.firstName} ${receiver.lastName} has rejected your trade proposal`;
                await createNotification(initiator, 'TRADE_REJECTED', title, message, trade._id);
                await sendTradeNotificationEmail(initiator, trade, 'status');
                break;
            case 'Cancelled':
                title = 'Trade Cancelled';
                message = `The trade has been cancelled`;
                await createNotification(initiator, 'TRADE_CANCELLED', title, message, trade._id);
                await createNotification(receiver, 'TRADE_CANCELLED', title, message, trade._id);
                await sendTradeNotificationEmail(initiator, trade, 'status');
                await sendTradeNotificationEmail(receiver, trade, 'status');
                break;
            case 'Completed':
                title = 'Trade Completed';
                message = `The trade has been completed successfully`;
                await createNotification(initiator, 'TRADE_COMPLETED', title, message, trade._id);
                await createNotification(receiver, 'TRADE_COMPLETED', title, message, trade._id);
                await sendTradeNotificationEmail(initiator, trade, 'status');
                await sendTradeNotificationEmail(receiver, trade, 'status');
                break;
        }
    } catch (error) {
        console.error('Error notifying trade status update:', error);
        throw new Error('Failed to send trade status update notification');
    }
};

// Notify new message
const notifyNewMessage = async (trade, sender, message) => {
    try {
        const receiver = await User.findById(trade.receiver);
        const initiator = await User.findById(trade.initiator);
        
        const recipient = sender._id.toString() === trade.initiator.toString() ? receiver : initiator;
        
        // Create in-app notification
        await createNotification(
            recipient,
            'TRADE_MESSAGE',
            'New Trade Message',
            `${sender.firstName} ${sender.lastName} sent you a message: "${message}"`,
            trade._id
        );

        // Send email notification
        await sendTradeNotificationEmail(recipient, trade, 'message');
    } catch (error) {
        console.error('Error notifying new message:', error);
        throw new Error('Failed to send new message notification');
    }
};

// Notify rating received
const notifyRatingReceived = async (trade, rater, rating) => {
    try {
        const ratedUser = await User.findById(
            rater._id.toString() === trade.initiator.toString() ? trade.receiver : trade.initiator
        );

        // Create in-app notification
        await createNotification(
            ratedUser,
            'RATING_RECEIVED',
            'New Rating Received',
            `${rater.firstName} ${rater.lastName} has rated you ${rating} stars`,
            trade._id
        );
    } catch (error) {
        console.error('Error notifying rating received:', error);
        throw new Error('Failed to send rating notification');
    }
};

module.exports = {
    createNotification,
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    notifyTradeProposal,
    notifyTradeStatusUpdate,
    notifyNewMessage,
    notifyRatingReceived
}; 