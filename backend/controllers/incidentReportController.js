const incidentTrackerService = require('../services/incidentTrackerService');

const exportCsv = async (req, res) => {
  try {
    const csv = await incidentTrackerService.buildCsv(req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=incident-report.csv');
    res.send(csv);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to export CSV report.'
    });
  }
};

const exportPdf = async (req, res) => {
  try {
    const pdf = await incidentTrackerService.buildPdf(req.query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=incident-report.pdf');
    res.send(pdf);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to export PDF report.'
    });
  }
};

module.exports = {
  exportCsv,
  exportPdf
};
