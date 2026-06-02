const express = require('express');
const router = express.Router();

const dynamicFieldController = require('../controllers/dynamicFieldController');
const { verifyToken, checkAdminStatus } = require('../middleware/authMiddleware');
const { attachPermissions } = require('../middleware/permissionsMiddleware');

router.use(verifyToken);
router.use(checkAdminStatus);
router.use(attachPermissions);

router.get('/schemas', dynamicFieldController.list);
router.get('/schemas/:moduleKey/:entityKey', dynamicFieldController.getSchema);
router.post('/schemas', dynamicFieldController.create);
router.put('/schemas/:id', dynamicFieldController.update);
router.delete('/schemas/:id', dynamicFieldController.remove);
router.post('/templates/release-management', dynamicFieldController.createReleaseManagementTemplate);

router.post('/schemas/:schemaId/fields', dynamicFieldController.createDynamicField);
router.put('/fields/:fieldId', dynamicFieldController.updateDynamicField);
router.delete('/fields/:fieldId', dynamicFieldController.deleteDynamicField);

router.get('/records/:recordType/:recordId', dynamicFieldController.getRecord);
router.put('/records/:recordType/:recordId', dynamicFieldController.saveRecord);
router.delete('/records/:recordType/:recordId', dynamicFieldController.deleteRecord);

module.exports = router;
