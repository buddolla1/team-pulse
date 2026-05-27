const express = require('express');
const {
  getAllReleases,
  getReleaseById,
  createRelease,
  updateRelease,
  deleteRelease
} = require('../controllers/releaseManagementController');
const { verifyToken, checkAdminStatus } = require('../middleware/authMiddleware');
const { requirePermission, attachPermissions } = require('../middleware/permissionsMiddleware');

const router = express.Router();

router.use(verifyToken);
router.use(checkAdminStatus);
router.use(attachPermissions);

router.get('/', requirePermission('release_management.view'), getAllReleases);
router.get('/:id', requirePermission('release_management.view'), getReleaseById);
router.post('/', requirePermission('release_management.create'), createRelease);
router.put('/:id', requirePermission('release_management.update'), updateRelease);
router.delete('/:id', requirePermission('release_management.delete'), deleteRelease);

module.exports = router;
