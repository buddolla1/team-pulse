const express = require('express');
const { verifyToken, checkAdminStatus } = require('../middleware/authMiddleware');
const { requirePermission, attachPermissions } = require('../middleware/permissionsMiddleware');
const incidentDashboardController = require('../controllers/incidentDashboardController');

const router = express.Router();

router.use(verifyToken);
router.use(checkAdminStatus);
router.use(attachPermissions);

router.get('/', requirePermission('incident_tracker.view'), incidentDashboardController.getSummary);

module.exports = router;
