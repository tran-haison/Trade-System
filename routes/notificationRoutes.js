const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
} = require('../services/notificationService');

// Get user's notifications
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const notifications = await getUserNotifications(req.user._id);
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
});

// Mark notification as read
router.patch('/:id/read', ensureAuthenticated, async (req, res) => {
    try {
        const notification = await markNotificationAsRead(req.params.id, req.user._id);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json(notification);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read
router.patch('/read-all', ensureAuthenticated, async (req, res) => {
    try {
        await markAllNotificationsAsRead(req.user._id);
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
});

// Delete notification
router.delete('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const notification = await deleteNotification(req.params.id, req.user._id);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ message: 'Failed to delete notification' });
    }
});

module.exports = router; 