const express = require('express');
const { verifyToken, checkAdminStatus } = require('../middleware/authMiddleware');
const { attachPermissions, requirePermission } = require('../middleware/permissionsMiddleware');
const leaveTrackerController = require('../controllers/leaveTrackerController');

const router = express.Router();

router.use(verifyToken);
router.use(checkAdminStatus);
router.use(attachPermissions);

router.get('/', requirePermission('leave_tracker.view'), leaveTrackerController.getAll);
router.get('/export/excel', requirePermission('leave_tracker.export'), leaveTrackerController.exportExcel);
router.get('/:id', requirePermission('leave_tracker.view'), leaveTrackerController.getOne);
router.post('/', requirePermission('leave_tracker.create'), leaveTrackerController.create);
router.put('/:id', leaveTrackerController.update);
router.patch('/:id/revoke', leaveTrackerController.revoke);

module.exports = router;
