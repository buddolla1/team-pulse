const express = require('express');
const router = express.Router();

const navigationController = require('../controllers/navigationController');
const { verifyToken, checkAdminStatus } = require('../middleware/authMiddleware');
const { attachPermissions, requirePermission } = require('../middleware/permissionsMiddleware');

router.use(verifyToken);
router.use(checkAdminStatus);
router.use(attachPermissions);

router.get('/', navigationController.list);
router.post('/', requirePermission('navigation.manage'), navigationController.create);
router.put('/:id', requirePermission('navigation.manage'), navigationController.update);
router.delete('/:id', requirePermission('navigation.manage'), navigationController.remove);

module.exports = router;
