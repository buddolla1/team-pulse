const express = require('express');
const { verifyToken, checkAdminStatus } = require('../middleware/authMiddleware');
const { requirePermission, attachPermissions } = require('../middleware/permissionsMiddleware');
const incidentReportController = require('../controllers/incidentReportController');

const router = express.Router();

router.use(verifyToken);
router.use(checkAdminStatus);
router.use(attachPermissions);

router.get('/csv', requirePermission('incident_tracker.export'), incidentReportController.exportCsv);
router.get('/pdf', requirePermission('incident_tracker.export'), incidentReportController.exportPdf);

module.exports = router;
