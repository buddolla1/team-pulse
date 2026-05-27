const incidentTrackerService = require('../services/incidentTrackerService');

const getSummary = async (req, res) => {
  try {
    const summary = await incidentTrackerService.getDashboard(req.query.month);
    res.json(summary);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch incident dashboard.'
    });
  }
};

module.exports = {
  getSummary
};
