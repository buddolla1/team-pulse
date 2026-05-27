const express = require('express');
const { verifyToken, checkAdminStatus } = require('../middleware/authMiddleware');
const { requirePermission, attachPermissions } = require('../middleware/permissionsMiddleware');
const incidentNotificationController = require('../controllers/incidentNotificationController');

const router = express.Router();

router.use(verifyToken);
router.use(checkAdminStatus);
router.use(attachPermissions);

router.get('/', requirePermission('incident_tracker.view'), incidentNotificationController.getMine);
router.patch('/:id/read', requirePermission('incident_tracker.view'), incidentNotificationController.markAsRead);

module.exports = router;
