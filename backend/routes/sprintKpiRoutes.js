const express = require('express');

const {
  getAllSprintKpiSprints,
  getAllSprintKpiStories,
  createSprintKpiSprint,
  createSprintKpiStory,
  updateSprintKpiStory,
  deleteSprintKpiStory,
  createSprintKpiEntry,
  updateSprintKpiEntry,
  deleteSprintKpiEntry
} = require('../controllers/sprintKpiController');
const { verifyToken, checkAdminStatus } = require('../middleware/authMiddleware');
const { requirePermission, attachPermissions } = require('../middleware/permissionsMiddleware');

const router = express.Router();

router.use(verifyToken);
router.use(checkAdminStatus);
router.use(attachPermissions);

router.get('/sprints', requirePermission('sprint_kpi.view'), getAllSprintKpiSprints);
router.post('/sprints', requirePermission('sprint_kpi.create'), createSprintKpiSprint);
router.get('/stories', requirePermission('sprint_kpi.view'), getAllSprintKpiStories);
router.post('/stories', requirePermission('sprint_kpi.create'), createSprintKpiStory);
router.put('/stories/:id', requirePermission('sprint_kpi.update'), updateSprintKpiStory);
router.delete('/stories/:id', requirePermission('sprint_kpi.delete'), deleteSprintKpiStory);

router.post('/stories/:storyId/kpis', requirePermission('sprint_kpi.create'), createSprintKpiEntry);
router.put('/kpis/:id', requirePermission('sprint_kpi.update'), updateSprintKpiEntry);
router.delete('/kpis/:id', requirePermission('sprint_kpi.delete'), deleteSprintKpiEntry);

module.exports = router;
