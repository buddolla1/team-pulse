const incidentTrackerService = require('../services/incidentTrackerService');

const getMine = async (req, res) => {
  try {
    const notifications = await incidentTrackerService.getNotifications(req.admin.id);
    res.json(notifications);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch notifications.'
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await incidentTrackerService.markNotificationAsRead(req.params.id, req.admin.id);
    res.json(notification);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update notification.'
    });
  }
};

module.exports = {
  getMine,
  markAsRead
};
