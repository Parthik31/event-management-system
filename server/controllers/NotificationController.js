import Notification from '../models/Notification.js';

// @desc    Get user's notifications
// @route   GET /api/v1/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to recent 50 to maintain performance

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.status(200).json({ success: true, unreadCount, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark a single or all notifications as read
// @route   PUT /api/v1/notifications/read/:id?
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    if (req.params.id) {
      // Mark specific notification
      await Notification.findOneAndUpdate(
        { _id: req.params.id, user: req.user.id },
        { isRead: true }
      );
    } else {
      // Mark all as read
      await Notification.updateMany(
        { user: req.user.id, isRead: false },
        { isRead: true }
      );
    }
    
    res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
