const express = require('express');
const { verifyToken, checkAdminStatus } = require('../middleware/authMiddleware');
const incidentController = require('../controllers/incidentTrackerController');
const upload = require('../middleware/incidentUploadMiddleware');
const { requirePermission, attachPermissions } = require('../middleware/permissionsMiddleware');

const router = express.Router();

router.use(verifyToken);
router.use(checkAdminStatus);
router.use(attachPermissions);

router.get('/reference-data', requirePermission('incident_tracker.view'), incidentController.getReferenceData);
router.get('/', requirePermission('incident_tracker.view'), incidentController.getAll);
router.post('/', requirePermission('incident_tracker.create'), incidentController.create);
router.get('/:id', requirePermission('incident_tracker.view'), incidentController.getOne);
router.put('/:id', requirePermission('incident_tracker.update'), incidentController.update);
router.delete('/:id', requirePermission('incident_tracker.delete'), incidentController.remove);
router.post('/:id/comments', requirePermission('incident_tracker.update'), incidentController.addComment);
router.post('/:id/attachments', requirePermission('incident_tracker.update'), upload.single('file'), incidentController.addAttachment);

module.exports = router;
