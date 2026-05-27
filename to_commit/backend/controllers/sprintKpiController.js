const db = require('../config/database');

const KPI_HIERARCHY = {
  Build: {
    Requirement: [
      'Definition of Ready (DoR) Signed-Off',
      'Non-Functional Requirements Covered',
      'Requirement Traceability Documented'
    ],
    Design: [
      'Architecture Document Sign-Off',
      'Flow Diagram Sign-Off',
      'User Interface (UI) Sign-Off',
      'Logical Flow (Algorithm) Sign-Off',
      'Enterprise Level Design Sign-Off'
    ],
    Development: [
      'Code Review with Comment Coverage',
      'Average Code Review Duration',
      'Code Review Defect Removal Efficiency',
      'Dependency Matrix Coverage',
      'Label Configuration Items Coverage',
      'Code Coverage',
      'Code Analysis (Smell & Vulnerability Removal)',
      'Defect Density',
      'True Positive Exception Detection',
      'PI Commitment',
      'Backlog Burndown Rate',
      'Team Velocity',
      'Delivered Defect Density'
    ]
  },
  QE: {
    Testing: [
      'Test Case Group Review Coverage',
      'Definition of Done (DoD) Signed-Off',
      'In-Sprint Automation for Regression',
      'Regression Test Suite Utilization',
      'Production Defect Leak %',
      'Regression Test Case Coverage',
      'Regression Automation Coverage',
      'Test Case Peer Review Efficiency'
    ]
  },
  Release: {
    Release: [
      'QCPR Sign-Off',
      'Release Planning Meeting Coverage',
      'Pre-Deployment Checklist Coverage',
      'Deployment Checklist Coverage',
      'Post-Deployment Checklist Coverage',
      'RTS Handover Coverage',
      'Incident Retrospective Coverage',
      'Deployment Postponement Count',
      'Release Defect Density',
      'Deployment Success Rate'
    ]
  },
  'Post Release': {
    KPIs: [
      'Mean Time to Detect (MTTD)',
      'Mean Time to Resolve (MTTR)'
    ]
  }
};

const CATEGORY_ALIASES = {
  Dev: 'Build',
  QA: 'QE'
};

let sprintKpiStoriesHasApplicableCategoryColumn;
let sprintKpiStoriesHasAgileBoardColumn;
let sprintKpiStoriesHasSprintColumn;
let sprintKpiEntriesHasAgileBoardColumn;
let sprintKpiEntriesHasSprintColumn;

const hasApplicableKpiCategoryColumn = async () => {
  if (typeof sprintKpiStoriesHasApplicableCategoryColumn === 'boolean') {
    return sprintKpiStoriesHasApplicableCategoryColumn;
  }

  const [rows] = await db.query(
    `SELECT COUNT(*) AS column_count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'sprint_kpi_stories'
       AND COLUMN_NAME = 'applicable_kpi_category'`
  );

  sprintKpiStoriesHasApplicableCategoryColumn = Number(rows[0]?.column_count) > 0;
  return sprintKpiStoriesHasApplicableCategoryColumn;
};

const hasSprintKpiStoryAgileBoardColumn = async () => {
  if (typeof sprintKpiStoriesHasAgileBoardColumn === 'boolean') {
    return sprintKpiStoriesHasAgileBoardColumn;
  }

  const [rows] = await db.query(
    `SELECT COUNT(*) AS column_count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'sprint_kpi_stories'
       AND COLUMN_NAME = 'agile_board_name'`
  );

  sprintKpiStoriesHasAgileBoardColumn = Number(rows[0]?.column_count) > 0;
  return sprintKpiStoriesHasAgileBoardColumn;
};

const hasSprintKpiStorySprintColumn = async () => {
  if (typeof sprintKpiStoriesHasSprintColumn === 'boolean') {
    return sprintKpiStoriesHasSprintColumn;
  }

  const [rows] = await db.query(
    `SELECT COUNT(*) AS column_count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'sprint_kpi_stories'
       AND COLUMN_NAME = 'sprint_id'`
  );

  sprintKpiStoriesHasSprintColumn = Number(rows[0]?.column_count) > 0;
  return sprintKpiStoriesHasSprintColumn;
};

const hasSprintKpiEntryAgileBoardColumn = async () => {
  if (typeof sprintKpiEntriesHasAgileBoardColumn === 'boolean') {
    return sprintKpiEntriesHasAgileBoardColumn;
  }

  const [rows] = await db.query(
    `SELECT COUNT(*) AS column_count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'sprint_kpi_entries'
       AND COLUMN_NAME = 'agile_board_name'`
  );

  sprintKpiEntriesHasAgileBoardColumn = Number(rows[0]?.column_count) > 0;
  return sprintKpiEntriesHasAgileBoardColumn;
};

const hasSprintKpiEntrySprintColumn = async () => {
  if (typeof sprintKpiEntriesHasSprintColumn === 'boolean') {
    return sprintKpiEntriesHasSprintColumn;
  }

  const [rows] = await db.query(
    `SELECT COUNT(*) AS column_count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'sprint_kpi_entries'
       AND COLUMN_NAME = 'sprint_id'`
  );

  sprintKpiEntriesHasSprintColumn = Number(rows[0]?.column_count) > 0;
  return sprintKpiEntriesHasSprintColumn;
};

const shouldFallbackWithoutApplicableCategory = (error) => (
  error?.code === 'ER_BAD_FIELD_ERROR'
  && String(error?.sqlMessage || error?.message || '').includes('applicable_kpi_category')
);

const normalizeCategory = (value) => {
  const category = normalizeText(value);
  return CATEGORY_ALIASES[category] || category;
};

const getCategoryOrder = () => Object.keys(KPI_HIERARCHY);

const getSubcategoryOrder = (category) => Object.keys(KPI_HIERARCHY[normalizeCategory(category)] || {});

const getOptionOrder = (category, subcategory) => KPI_HIERARCHY[normalizeCategory(category)]?.[subcategory] || [];

const getDefaultCategory = () => getCategoryOrder()[0] || '';

const getDefaultSubcategory = (category) => getSubcategoryOrder(category)[0] || '';

const getDefaultOption = (category, subcategory) => getOptionOrder(category, subcategory)[0] || '';

const getDefaultStoryApplicableCategory = () => getDefaultCategory();

const getSprintKpiProjectContext = async (projectId) => {
  const [rows] = await db.query(
    `SELECT
       p.id AS project_id,
       p.project_team_name,
       (
         SELECT pt.agile_board_name
         FROM project_teams pt
         WHERE pt.project_id = p.id
         ORDER BY pt.id ASC
         LIMIT 1
       ) AS agile_board_name
     FROM projects p
     WHERE p.id = ?`,
    [projectId]
  );

  return rows[0] || null;
};

const getSprintContext = async (sprintId) => {
  const [rows] = await db.query(
    `SELECT
       sp.id,
       sp.project_id,
       sp.agile_board_name,
       sp.sprint_start_date,
       sp.sprint_end_date,
       p.project_team_name
     FROM sprint_kpi_sprints sp
     LEFT JOIN projects p ON p.id = sp.project_id
     WHERE sp.id = ?`,
    [sprintId]
  );

  return rows[0] || null;
};

const getActiveSprintContext = async (sprintId) => {
  const [rows] = await db.query(
    `SELECT
       sp.id,
       sp.project_id,
       sp.agile_board_name,
       sp.sprint_start_date,
       sp.sprint_end_date,
       p.project_team_name
     FROM sprint_kpi_sprints sp
     LEFT JOIN projects p ON p.id = sp.project_id
     WHERE sp.id = ?
       AND sp.sprint_start_date <= CURDATE()
       AND sp.sprint_end_date >= CURDATE()`,
    [sprintId]
  );

  return rows[0] || null;
};

const getEmployeeSprintKpiAccess = async (employeeId) => {
  const [rows] = await db.query(
    `SELECT DISTINCT
       pe.project_id,
       pe.team_id,
       COALESCE(NULLIF(pt.agile_board_name, ''), p.project_team_name) AS agile_board_name,
       p.project_team_name
     FROM project_employees pe
     INNER JOIN projects p ON p.id = pe.project_id
     LEFT JOIN project_teams pt ON pt.id = pe.team_id
     WHERE pe.employee_id = ?`,
    [employeeId]
  );

  return {
    rows,
    projectIds: [...new Set(rows.map((row) => Number(row.project_id)).filter(Boolean))],
    boardNames: [...new Set(rows.map((row) => normalizeText(row.agile_board_name)).filter(Boolean))]
  };
};

const buildEmployeeSprintAccessClause = (access) => {
  const projectIds = Array.isArray(access?.projectIds) ? access.projectIds : [];
  const boardNames = Array.isArray(access?.boardNames) ? access.boardNames : [];

  if (!projectIds.length && !boardNames.length) {
    return {
      whereClause: '1 = 0',
      params: []
    };
  }

  const parts = [];
  const params = [];

  if (projectIds.length) {
    parts.push('sp.project_id IN (?)');
    params.push(projectIds);
  }

  if (boardNames.length) {
    parts.push('sp.agile_board_name IN (?)');
    params.push(boardNames);
  }

  return {
    whereClause: `(${parts.join(' OR ')}) AND sp.sprint_start_date <= CURDATE() AND sp.sprint_end_date >= CURDATE()`,
    params
  };
};

const getEmployeeAccessibleSprintWhereClause = async (employeeId) => {
  const access = await getEmployeeSprintKpiAccess(employeeId);
  return {
    access,
    ...buildEmployeeSprintAccessClause(access)
  };
};

const getSprintKpiStoryContext = async (storyId) => {
  const boardSelect = (await hasSprintKpiStoryAgileBoardColumn())
    ? 's.agile_board_name AS agile_board_name'
    : `(
         SELECT pt.agile_board_name
         FROM project_teams pt
         WHERE pt.project_id = p.id
         ORDER BY pt.id ASC
         LIMIT 1
       ) AS agile_board_name`;

  const [rows] = await db.query(
    `SELECT
       s.id,
       s.story_id,
       s.story_name,
       s.project_id,
       p.project_team_name,
       ${boardSelect}
     FROM sprint_kpi_stories s
     LEFT JOIN projects p ON p.id = s.project_id
     WHERE s.id = ?`,
    [storyId]
  );

  return rows[0] || null;
};

const logSprintKpiAudit = async ({ req, action, entityType, entityId = null, description }) => {
  if (!req?.admin?.id) {
    return;
  }

  try {
    await db.query(
      'INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        req.admin.id,
        action,
        entityType,
        entityId,
        description,
        req.ip || req.headers['x-forwarded-for'] || null,
        req.headers['user-agent'] || null
      ]
    );
  } catch (error) {
    console.warn('Failed to write sprint KPI audit log:', error.message || error);
  }
};

const getSubcategoryOptions = (category) => Object.keys(KPI_HIERARCHY[category] || {});

const getOptionMap = (category) => KPI_HIERARCHY[category] || {};

const findSubcategoryForOption = (category, option) => {
  const hierarchy = KPI_HIERARCHY[category] || {};
  for (const [subcategory, options] of Object.entries(hierarchy)) {
    if (options.includes(option)) {
      return subcategory;
    }
  }
  return null;
};

const findCategoryForSubcategory = (subcategory) => {
  const normalizedSubcategory = normalizeText(subcategory);
  if (!normalizedSubcategory) {
    return null;
  }

  return Object.keys(KPI_HIERARCHY).find((category) => Object.prototype.hasOwnProperty.call(KPI_HIERARCHY[category], normalizedSubcategory)) || null;
};

const findCategoryForOption = (option) => {
  const normalizedOption = normalizeText(option);
  if (!normalizedOption) {
    return null;
  }

  return Object.entries(KPI_HIERARCHY).find(([, subcategories]) => (
    Object.values(subcategories).some((options) => options.includes(normalizedOption))
  ))?.[0] || null;
};

const parsePositiveInteger = (value, fallback = null) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeText = (value) => (value === undefined || value === null || String(value).trim() === '' ? null : String(value).trim());

const getPayloadValue = (body, primaryKey, fallbackKey = null) => normalizeText(body[primaryKey] ?? (fallbackKey ? body[fallbackKey] : undefined));

const getKpiKey = (category, subcategory, option) => `${normalizeCategory(category)}::${subcategory}::${option}`;

const normalizeApplicableKpis = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }
      if (item && typeof item === 'object') {
        return String(item.value || item.key || item.id || '').trim();
      }
      return '';
    }).filter(Boolean))];
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      return normalizeApplicableKpis(JSON.parse(value));
    } catch (error) {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
};

const normalizeApplicableKpiCategory = (value) => normalizeCategory(value) || getDefaultCategory();

const buildSprintKpiStorySelect = async (tableAlias = 's') => {
  if (await hasApplicableKpiCategoryColumn()) {
    return `${tableAlias}.applicable_kpi_category`;
  }

  return 'NULL AS applicable_kpi_category';
};

const buildSprintKpiStoryBoardSelect = async (tableAlias = 's') => {
  if (await hasSprintKpiStoryAgileBoardColumn()) {
    return `${tableAlias}.agile_board_name AS agile_board_name`;
  }

  return 'NULL AS agile_board_name';
};

const buildSprintKpiStorySprintSelect = async (tableAlias = 's') => {
  if (await hasSprintKpiStorySprintColumn()) {
    return `${tableAlias}.sprint_id AS sprint_id`;
  }

  return 'NULL AS sprint_id';
};

const buildSprintKpiEntryBoardSelect = async (tableAlias = 'e') => {
  if (await hasSprintKpiEntryAgileBoardColumn()) {
    return `${tableAlias}.agile_board_name AS agile_board_name`;
  }

  return 'NULL AS agile_board_name';
};

const normalizeMonthValue = (value) => {
  const month = normalizeText(value);
  return month && /^\d{4}-\d{2}$/.test(month) ? month : null;
};

const getLegacySprintStoryJoinClause = (storyAlias = 's', sprintAlias = 'sp', projectAlias = 'p') => (
  `${sprintAlias}.project_id = ${storyAlias}.project_id
    AND COALESCE(NULLIF(${storyAlias}.agile_board_name, ''), ${projectAlias}.project_team_name) = ${sprintAlias}.agile_board_name
    AND DATE(${storyAlias}.created_at) BETWEEN ${sprintAlias}.sprint_start_date AND ${sprintAlias}.sprint_end_date`
);

const addDaysToIsoDate = (dateValue, days) => {
  if (!dateValue) {
    return '';
  }

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const resetApplicableKpiCategoryCache = () => {
  sprintKpiStoriesHasApplicableCategoryColumn = undefined;
  sprintKpiStoriesHasAgileBoardColumn = undefined;
  sprintKpiStoriesHasSprintColumn = undefined;
  sprintKpiEntriesHasAgileBoardColumn = undefined;
  sprintKpiEntriesHasSprintColumn = undefined;
};

const validateKpiPayload = (body) => {
  const explicitCategory = normalizeCategory(getPayloadValue(body, 'kpi_category', 'category'));
  const subcategory = getPayloadValue(body, 'kpi_subcategory', 'subcategory');
  const option = getPayloadValue(body, 'kpi_option', 'option');
  const percentage = parseInt(body.percentage, 10);
  const category = explicitCategory || findCategoryForSubcategory(subcategory) || findCategoryForOption(option);

  if (!category || !KPI_HIERARCHY[category]) {
    const error = new Error('A valid KPI category is required.');
    error.statusCode = 400;
    throw error;
  }

  const availableSubcategories = getSubcategoryOptions(category);
  const inferredSubcategory = findSubcategoryForOption(category, option);
  const normalizedSubcategory = subcategory || inferredSubcategory || availableSubcategories[0];

  if (!normalizedSubcategory || !availableSubcategories.includes(normalizedSubcategory)) {
    const error = new Error('A valid KPI subcategory is required for the selected category.');
    error.statusCode = 400;
    throw error;
  }

  if (!option || !getOptionMap(category)[normalizedSubcategory]?.includes(option)) {
    const error = new Error('A valid KPI option is required for the selected subcategory.');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(percentage) || percentage <= 1 || percentage > 100) {
    const error = new Error('KPI percentage must be greater than 1 and at most 100.');
    error.statusCode = 400;
    throw error;
  }
};

const validateStoryPayload = (body, { requireSprint = true } = {}) => {
  const sprintId = parsePositiveInteger(body.sprint_id);
  const storyId = normalizeText(body.story_id);
  const storyName = normalizeText(body.story_name);

  if (requireSprint && !sprintId) {
    const error = new Error('Sprint is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!storyId) {
    const error = new Error('Story ID is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!storyName) {
    const error = new Error('Story name is required.');
    error.statusCode = 400;
    throw error;
  }
};

const sendError = (res, error, fallback) => {
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'A story or KPI with the same identifier already exists.'
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.sqlMessage || error.message || fallback
  });
};

const attachKpis = async (stories) => {
  if (stories.length === 0) {
    return stories;
  }

  const storyIds = stories.map((story) => story.id);
  const [kpis] = await db.query(
    `SELECT *
     FROM sprint_kpi_entries
     WHERE story_id IN (?)
     ORDER BY created_at ASC`,
    [storyIds]
  );

  const kpisByStory = kpis.reduce((accumulator, kpi) => {
    if (!accumulator[kpi.story_id]) {
      accumulator[kpi.story_id] = [];
    }
    accumulator[kpi.story_id].push({
      ...kpi,
      percentage: Number(kpi.percentage) || 0
    });
    return accumulator;
  }, {});

  return stories.map((story) => ({
    ...story,
    applicable_kpi_category: normalizeApplicableKpiCategory(story.applicable_kpi_category || normalizeApplicableKpis(story.applicable_kpis)[0]?.split('::')?.[0]),
    applicable_kpis: normalizeApplicableKpis(story.applicable_kpis),
    kpis: (kpisByStory[story.id] || []).map((kpi) => ({
      ...kpi,
      agile_board_name: normalizeText(kpi.agile_board_name) || normalizeText(story.agile_board_name) || null
    }))
  }));
};

const getAllSprintKpiSprints = async (req, res) => {
  try {
    const projectId = parsePositiveInteger(req.query.project_id);
    const startDate = normalizeText(req.query.sprint_start_date || req.query.start_date);
    const month = normalizeMonthValue(req.query.month);
    const agileBoardName = normalizeText(req.query.agile_board_name);
    const conditions = [];
    const params = [];
    const isEmployeeUser = req.employee?.user_type === 'employee' || req.admin?.user_type === 'employee';

    if (projectId) {
      conditions.push('sp.project_id = ?');
      params.push(projectId);
    }

    if (startDate) {
      conditions.push('sp.sprint_start_date = ?');
      params.push(startDate);
    }

    if (month) {
      conditions.push("DATE_FORMAT(sp.sprint_start_date, '%Y-%m') = ?");
      params.push(month);
    }

    if (agileBoardName) {
      conditions.push('sp.agile_board_name = ?');
      params.push(agileBoardName);
    }

    if (isEmployeeUser) {
      const { access, whereClause, params: accessParams } = await getEmployeeAccessibleSprintWhereClause(req.employee?.id || req.admin?.id);
      if (!access.projectIds.length && !access.boardNames.length) {
        return res.json({ success: true, data: [] });
      }
      conditions.push(whereClause);
      params.push(...accessParams);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const storyHasSprintColumn = await hasSprintKpiStorySprintColumn();
    const entryHasSprintColumn = await hasSprintKpiEntrySprintColumn();
    const storyJoinClause = storyHasSprintColumn
      ? 'LEFT JOIN sprint_kpi_stories s ON s.sprint_id = sp.id'
      : `LEFT JOIN sprint_kpi_stories s
         ON ${getLegacySprintStoryJoinClause('s', 'sp', 'p')}`;
    const entryJoinClause = entryHasSprintColumn
      ? 'LEFT JOIN sprint_kpi_entries e ON e.sprint_id = sp.id'
      : 'LEFT JOIN sprint_kpi_entries e ON e.story_id = s.id';
    const [rows] = await db.query(
      `SELECT
         sp.id,
         sp.project_id,
         sp.agile_board_name,
         sp.sprint_start_date,
         sp.sprint_end_date,
         sp.created_at,
         sp.updated_at,
         p.project_team_name,
         COUNT(DISTINCT s.id) AS story_count,
         COUNT(DISTINCT e.id) AS kpi_count
       FROM sprint_kpi_sprints sp
       LEFT JOIN projects p ON p.id = sp.project_id
       ${storyJoinClause}
       ${entryJoinClause}
       ${whereClause}
       GROUP BY sp.id, sp.project_id, sp.agile_board_name, sp.sprint_start_date, sp.sprint_end_date, sp.created_at, sp.updated_at, p.project_team_name
       ORDER BY sp.sprint_start_date DESC, sp.id DESC`,
      params
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching sprint KPI sprints:', error);
    sendError(res, error, 'Error fetching sprint KPI sprints');
  }
};

const validateSprintPayload = (body) => {
  const projectId = parsePositiveInteger(body.project_id);
  const agileBoardName = normalizeText(body.agile_board_name);
  const sprintStartDate = normalizeText(body.sprint_start_date);
  const sprintEndDate = normalizeText(body.sprint_end_date);

  if (!projectId) {
    const error = new Error('Project is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!agileBoardName) {
    const error = new Error('Agile board name is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!sprintStartDate) {
    const error = new Error('Sprint start date is required.');
    error.statusCode = 400;
    throw error;
  }

  const resolvedSprintEndDate = sprintEndDate || addDaysToIsoDate(sprintStartDate, 14);

  if (!resolvedSprintEndDate) {
    const error = new Error('Sprint end date is required.');
    error.statusCode = 400;
    throw error;
  }

  if (new Date(resolvedSprintEndDate).getTime() < new Date(sprintStartDate).getTime()) {
    const error = new Error('Sprint end date must be greater than or equal to sprint start date.');
    error.statusCode = 400;
    throw error;
  }
};

const createSprintKpiSprint = async (req, res) => {
  try {
    validateSprintPayload(req.body);

    const projectId = parsePositiveInteger(req.body.project_id);
    const agileBoardName = normalizeText(req.body.agile_board_name);
    const sprintStartDate = normalizeText(req.body.sprint_start_date);
    const sprintEndDate = normalizeText(req.body.sprint_end_date) || addDaysToIsoDate(sprintStartDate, 14);

    const [projectRows] = await db.query('SELECT id, project_team_name FROM projects WHERE id = ?', [projectId]);
    if (projectRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Selected project was not found.'
      });
    }

    const [teamRows] = await db.query(
      'SELECT id, agile_board_name FROM project_teams WHERE project_id = ? AND agile_board_name = ?',
      [projectId, agileBoardName]
    );

    if (teamRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Selected agile board was not found for the project.'
      });
    }

    const [result] = await db.query(
      `INSERT INTO sprint_kpi_sprints
       (project_id, agile_board_name, sprint_start_date, sprint_end_date, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [projectId, agileBoardName, sprintStartDate, sprintEndDate, req.admin?.id || null, req.admin?.id || null]
    );

    await logSprintKpiAudit({
      req,
      action: 'CREATE',
      entityType: 'sprint_kpi_sprint',
      entityId: result.insertId,
      description: `Created sprint for board "${agileBoardName}" in project "${projectRows[0].project_team_name}" from ${sprintStartDate} to ${sprintEndDate}`
    });

    res.status(201).json({
      success: true,
      message: 'Sprint created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating sprint:', error);
    sendError(res, error, 'Error creating sprint');
  }
};

const getAllSprintKpiStories = async (req, res) => {
  try {
    const sprintId = parsePositiveInteger(req.query.sprint_id);
    const projectId = parsePositiveInteger(req.query.project_id);
    const startDate = normalizeText(req.query.sprint_start_date || req.query.start_date);
    const month = normalizeMonthValue(req.query.month);
    const agileBoardName = normalizeText(req.query.agile_board_name);
    const conditions = [];
    const params = [];
    const isEmployeeUser = req.employee?.user_type === 'employee' || req.admin?.user_type === 'employee';
    const employeeAccess = isEmployeeUser ? await getEmployeeSprintKpiAccess(req.employee?.id || req.admin?.id) : null;
    const storyHasSprintColumn = await hasSprintKpiStorySprintColumn();

    if (sprintId) {
      conditions.push(storyHasSprintColumn ? 's.sprint_id = ?' : 'sp.id = ?');
      params.push(sprintId);
    }

    if (projectId) {
      conditions.push('sp.project_id = ?');
      params.push(projectId);
    }

    if (startDate) {
      conditions.push('sp.sprint_start_date = ?');
      params.push(startDate);
    }

    if (month) {
      conditions.push("DATE_FORMAT(sp.sprint_start_date, '%Y-%m') = ?");
      params.push(month);
    }

    if (agileBoardName) {
      conditions.push('sp.agile_board_name = ?');
      params.push(agileBoardName);
    }

    if (isEmployeeUser) {
      if (!employeeAccess?.boardNames?.length) {
        return res.json({
          success: true,
          data: []
        });
      }

      conditions.push('sp.agile_board_name IN (?)');
      params.push(employeeAccess.boardNames);
      conditions.push('sp.sprint_start_date <= CURDATE()');
      conditions.push('sp.sprint_end_date >= CURDATE()');
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const storyCategorySelect = await buildSprintKpiStorySelect();
    const storyBoardSelect = await buildSprintKpiStoryBoardSelect();
    const storySprintSelect = await buildSprintKpiStorySprintSelect();
    const storyQuery = `SELECT s.id, ${storySprintSelect}, sp.project_id, s.story_id, s.story_name, s.description, ${storyBoardSelect}, ${storyCategorySelect}, s.applicable_kpis, s.created_by, s.updated_by, s.created_at, s.updated_at, p.project_team_name, sp.sprint_start_date, sp.sprint_end_date
       FROM sprint_kpi_stories s
       LEFT JOIN projects p ON p.id = s.project_id
       INNER JOIN sprint_kpi_sprints sp ON ${storyHasSprintColumn ? 'sp.id = s.sprint_id' : getLegacySprintStoryJoinClause('s', 'sp', 'p')}
       ${whereClause}
       ORDER BY sp.sprint_start_date DESC, s.created_at DESC`;

    let stories;
    try {
      [stories] = await db.query(storyQuery, params);
    } catch (error) {
      if (shouldFallbackWithoutApplicableCategory(error)) {
        resetApplicableKpiCategoryCache();
        [stories] = await db.query(
          `SELECT s.id, ${storySprintSelect}, sp.project_id, s.story_id, s.story_name, s.description, ${storyBoardSelect}, NULL AS applicable_kpi_category, s.applicable_kpis, s.created_by, s.updated_by, s.created_at, s.updated_at, p.project_team_name, sp.sprint_start_date, sp.sprint_end_date
           FROM sprint_kpi_stories s
           LEFT JOIN projects p ON p.id = s.project_id
           INNER JOIN sprint_kpi_sprints sp ON ${storyHasSprintColumn ? 'sp.id = s.sprint_id' : getLegacySprintStoryJoinClause('s', 'sp', 'p')}
           ${whereClause}
           ORDER BY sp.sprint_start_date DESC, s.created_at DESC`,
          params
        );
      } else {
        throw error;
      }
    }

    const data = await attachKpis(stories);
    const filteredData = isEmployeeUser && (employeeAccess?.projectIds?.length || employeeAccess?.boardNames?.length)
      ? data.filter((story) => (
          employeeAccess.projectIds.includes(Number(story.project_id))
          || employeeAccess.boardNames.includes(normalizeText(story.agile_board_name))
        ))
      : data;

    res.json({
      success: true,
      data: filteredData
    });
  } catch (error) {
    console.error('Error fetching sprint KPI stories:', error);
    sendError(res, error, 'Error fetching sprint KPI stories');
  }
};

const createSprintKpiStory = async (req, res) => {
  let sprintId;
  let storyId;
  let storyName;
  let description;
  let applicableKpiCategory;
  let applicableKpis;
  let sprintContext;
  try {
    validateStoryPayload(req.body);

    sprintId = parsePositiveInteger(req.body.sprint_id);
    storyId = normalizeText(req.body.story_id);
    storyName = normalizeText(req.body.story_name);
    description = normalizeText(req.body.description);
    applicableKpiCategory = normalizeApplicableKpiCategory(req.body.applicable_kpi_category);
    applicableKpis = normalizeApplicableKpis(req.body.applicable_kpis);
    sprintContext = await getActiveSprintContext(sprintId);
    const storyHasSprintColumn = await hasSprintKpiStorySprintColumn();
    const storyBoardHasColumn = await hasSprintKpiStoryAgileBoardColumn();
    if (!sprintContext) {
      return res.status(400).json({
        success: false,
        message: 'Stories can only be created for an active sprint.'
      });
    }

    const storyHasCategoryColumn = await hasApplicableKpiCategoryColumn();
    const insertColumns = [];
    const insertValues = [];

    if (storyHasSprintColumn) {
      insertColumns.push('sprint_id');
      insertValues.push(sprintId);
    }

    insertColumns.push('project_id', 'story_id', 'story_name', 'description');
    insertValues.push(sprintContext.project_id, storyId, storyName, description);

    if (storyBoardHasColumn) {
      insertColumns.push('agile_board_name');
      insertValues.push(sprintContext.agile_board_name);
    }

    if (storyHasCategoryColumn) {
      insertColumns.push('applicable_kpi_category');
      insertValues.push(applicableKpiCategory);
    }

    insertColumns.push('applicable_kpis', 'created_by', 'updated_by');
    insertValues.push(JSON.stringify(applicableKpis), req.admin?.id || null, req.admin?.id || null);

    const [result] = await db.query(
      `INSERT INTO sprint_kpi_stories (${insertColumns.join(', ')})
       VALUES (${insertColumns.map(() => '?').join(', ')})`,
      insertValues
    );

    await logSprintKpiAudit({
      req,
      action: 'CREATE',
      entityType: 'sprint_kpi_story',
      entityId: result.insertId,
      description: `Created sprint KPI story "${storyName}" for sprint ${sprintContext.sprint_start_date} to ${sprintContext.sprint_end_date} on board "${sprintContext.agile_board_name || 'Unknown board'}"${sprintContext?.project_team_name ? ` (project "${sprintContext.project_team_name}")` : ''}`
    });

    res.status(201).json({
      success: true,
      message: 'Sprint story created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    if (shouldFallbackWithoutApplicableCategory(error)) {
      try {
        const fallbackColumns = storyHasSprintColumn
          ? '(sprint_id, project_id, story_id, story_name, description, applicable_kpis, created_by, updated_by)'
          : '(project_id, story_id, story_name, description, applicable_kpis, created_by, updated_by)';
        const fallbackValues = storyHasSprintColumn
          ? [sprintId, sprintContext.project_id, storyId, storyName, description, JSON.stringify(applicableKpis), req.admin?.id || null, req.admin?.id || null]
          : [sprintContext.project_id, storyId, storyName, description, JSON.stringify(applicableKpis), req.admin?.id || null, req.admin?.id || null];
        const [result] = await db.query(
          `INSERT INTO sprint_kpi_stories ${fallbackColumns}
           VALUES (${fallbackValues.map(() => '?').join(', ')})`,
          fallbackValues
        );

        return res.status(201).json({
          success: true,
          message: 'Sprint story created successfully',
          data: { id: result.insertId }
        });
      } catch (retryError) {
        console.error('Retry creating sprint KPI story failed:', retryError);
        sendError(res, retryError, 'Error creating sprint KPI story');
        return;
      }
    }
    console.error('Error creating sprint KPI story:', error);
    sendError(res, error, 'Error creating sprint KPI story');
  }
};

const updateSprintKpiStory = async (req, res) => {
  let storyId;
  let storyCode;
  let storyName;
  let description;
  let applicableKpiCategory;
  let applicableKpis;
  try {
    validateStoryPayload(req.body, { requireSprint: false });

    storyId = parsePositiveInteger(req.params.id);
    const requestedSprintId = parsePositiveInteger(req.body.sprint_id);
    storyCode = normalizeText(req.body.story_id);
    storyName = normalizeText(req.body.story_name);
    description = normalizeText(req.body.description);
    applicableKpiCategory = normalizeApplicableKpiCategory(req.body.applicable_kpi_category);
    applicableKpis = normalizeApplicableKpis(req.body.applicable_kpis);

    const storyHasSprintColumn = await hasSprintKpiStorySprintColumn();
    const [existingRows] = await db.query(
      `SELECT id, ${storyHasSprintColumn ? 'sprint_id' : 'NULL AS sprint_id'}, project_id
       FROM sprint_kpi_stories
       WHERE id = ?`,
      [storyId]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sprint story not found.'
      });
    }

    if (storyHasSprintColumn && requestedSprintId && requestedSprintId !== Number(existingRows[0].sprint_id)) {
      return res.status(400).json({
        success: false,
        message: 'Sprint cannot be modified once the story is created.'
      });
    }

    const sprintContext = storyHasSprintColumn
      ? await getSprintContext(existingRows[0].sprint_id)
      : (requestedSprintId ? await getSprintContext(requestedSprintId) : await getSprintKpiStoryContext(storyId));
    if (!sprintContext) {
      return res.status(404).json({
        success: false,
        message: 'Selected sprint was not found.'
      });
    }

    const storyBoardHasColumn = await hasSprintKpiStoryAgileBoardColumn();
    const storyHasCategoryColumn = await hasApplicableKpiCategoryColumn();
    const updateAssignments = [
      'story_id = ?',
      'story_name = ?',
      'description = ?'
    ];
    const updateParams = [storyCode, storyName, description];

    if (storyHasSprintColumn && requestedSprintId) {
      updateAssignments.push('sprint_id = ?');
      updateParams.push(requestedSprintId);
    }

    if (storyBoardHasColumn) {
      updateAssignments.push('agile_board_name = ?');
      updateParams.push(sprintContext.agile_board_name || null);
    }

    if (storyHasCategoryColumn) {
      updateAssignments.push('applicable_kpi_category = ?');
      updateParams.push(applicableKpiCategory);
    }

    updateAssignments.push('applicable_kpis = ?', 'updated_by = ?');
    updateParams.push(JSON.stringify(applicableKpis), req.admin?.id || null);

    await db.query(
      `UPDATE sprint_kpi_stories
       SET ${updateAssignments.join(', ')}
       WHERE id = ?`,
      [...updateParams, storyId]
    );

    const sprintLabel = sprintContext.sprint_start_date && sprintContext.sprint_end_date
      ? `for sprint ${sprintContext.sprint_start_date} to ${sprintContext.sprint_end_date}`
      : 'for the selected sprint';
    await logSprintKpiAudit({
      req,
      action: 'UPDATE',
      entityType: 'sprint_kpi_story',
      entityId: storyId,
      description: `Updated sprint KPI story "${storyName}" ${sprintLabel} on board "${sprintContext.agile_board_name || 'Unknown board'}"${sprintContext?.project_team_name ? ` (project "${sprintContext.project_team_name}")` : ''}`
    });

    res.json({
      success: true,
      message: 'Sprint story updated successfully'
    });
  } catch (error) {
    if (shouldFallbackWithoutApplicableCategory(error)) {
      try {
        const fallbackAssignments = ['story_id = ?', 'story_name = ?', 'description = ?', 'applicable_kpis = ?', 'updated_by = ?'];
        const fallbackParams = [storyCode, storyName, description, JSON.stringify(applicableKpis), req.admin?.id || null];

        if (storyHasSprintColumn && requestedSprintId) {
          fallbackAssignments.splice(3, 0, 'sprint_id = ?');
          fallbackParams.splice(3, 0, requestedSprintId);
        }

        await db.query(
          `UPDATE sprint_kpi_stories
           SET ${fallbackAssignments.join(', ')}
           WHERE id = ?`,
          [...fallbackParams, storyId]
        );

        return res.json({
          success: true,
          message: 'Sprint story updated successfully'
        });
      } catch (retryError) {
        console.error('Retry updating sprint KPI story failed:', retryError);
        sendError(res, retryError, 'Error updating sprint KPI story');
        return;
      }
    }
    console.error('Error updating sprint KPI story:', error);
    sendError(res, error, 'Error updating sprint KPI story');
  }
};

const deleteSprintKpiStory = async (req, res) => {
  try {
    const storyId = parsePositiveInteger(req.params.id);
    const [existingRows] = await db.query('SELECT id FROM sprint_kpi_stories WHERE id = ?', [storyId]);

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sprint story not found.'
      });
    }

    const storyContext = await getSprintKpiStoryContext(storyId);

    await db.query('DELETE FROM sprint_kpi_stories WHERE id = ?', [storyId]);

    await logSprintKpiAudit({
      req,
      action: 'DELETE',
      entityType: 'sprint_kpi_story',
      entityId: storyId,
      description: `Deleted sprint KPI story "${storyContext?.story_name || storyId}" for board "${storyContext?.agile_board_name || storyContext?.project_team_name || 'Unknown board'}"${storyContext?.project_team_name ? ` (project "${storyContext.project_team_name}")` : ''}`
    });

    res.json({
      success: true,
      message: 'Sprint story deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sprint KPI story:', error);
    sendError(res, error, 'Error deleting sprint KPI story');
  }
};

const createSprintKpiEntry = async (req, res) => {
  try {
    const storyId = parsePositiveInteger(req.params.storyId);
    validateKpiPayload(req.body);

    const storyHasSprintColumn = await hasSprintKpiStorySprintColumn();
    const storySelect = await buildSprintKpiStorySelect('s');
    const storyBoardSelect = await buildSprintKpiStoryBoardSelect('s');
    const storySprintSelect = storyHasSprintColumn ? 's.sprint_id AS sprint_id' : 'sp.id AS sprint_id';
    const storyJoin = storyHasSprintColumn
      ? 'INNER JOIN sprint_kpi_sprints sp ON sp.id = s.sprint_id'
      : `INNER JOIN sprint_kpi_sprints sp
         ON ${getLegacySprintStoryJoinClause('s', 'sp', 'p')}`;
    const [storyRows] = await db.query(
      `SELECT s.id, ${storySprintSelect}, ${storyBoardSelect}, ${storySelect}, s.applicable_kpis
       FROM sprint_kpi_stories s
       LEFT JOIN projects p ON p.id = s.project_id
       ${storyJoin}
       WHERE s.id = ?`,
      [storyId]
    );
    if (storyRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sprint story not found.'
      });
    }

    const data = {
      story_id: storyId,
      sprint_id: storyRows[0].sprint_id,
      kpi_category: normalizeCategory(getPayloadValue(req.body, 'kpi_category', 'category')) || findCategoryForSubcategory(getPayloadValue(req.body, 'kpi_subcategory', 'subcategory')) || findCategoryForOption(getPayloadValue(req.body, 'kpi_option', 'option')),
      kpi_subcategory: getPayloadValue(req.body, 'kpi_subcategory', 'subcategory') || findSubcategoryForOption(normalizeCategory(getPayloadValue(req.body, 'kpi_category', 'category')) || findCategoryForSubcategory(getPayloadValue(req.body, 'kpi_subcategory', 'subcategory')) || findCategoryForOption(getPayloadValue(req.body, 'kpi_option', 'option')), getPayloadValue(req.body, 'kpi_option', 'option')) || getSubcategoryOptions(normalizeCategory(getPayloadValue(req.body, 'kpi_category', 'category')) || findCategoryForSubcategory(getPayloadValue(req.body, 'kpi_subcategory', 'subcategory')) || findCategoryForOption(getPayloadValue(req.body, 'kpi_option', 'option')))[0] || null,
      kpi_option: getPayloadValue(req.body, 'kpi_option', 'option'),
      percentage: parseInt(req.body.percentage, 10),
      comments: getPayloadValue(req.body, 'comments'),
      agile_board_name: normalizeText(storyRows[0].agile_board_name) || null,
      created_by: req.admin?.id || null,
      updated_by: req.admin?.id || null
    };

    const entryBoardHasColumn = await hasSprintKpiEntryAgileBoardColumn();
    const entryHasSprintColumn = await hasSprintKpiEntrySprintColumn();
    const insertColumns = ['story_id'];
    const insertValues = [data.story_id];

    if (entryHasSprintColumn) {
      insertColumns.push('sprint_id');
      insertValues.push(data.sprint_id);
    }

    insertColumns.push(
      'kpi_category',
      'kpi_subcategory',
      'kpi_option',
      'percentage',
      'comments'
    );
    insertValues.push(
      data.kpi_category,
      data.kpi_subcategory,
      data.kpi_option,
      data.percentage,
      data.comments
    );

    if (entryBoardHasColumn) {
      insertColumns.push('agile_board_name');
      insertValues.push(data.agile_board_name);
    }

    insertColumns.push('created_by', 'updated_by');
    insertValues.push(data.created_by, data.updated_by);

    const [result] = await db.query(
      `INSERT INTO sprint_kpi_entries (${insertColumns.join(', ')})
       VALUES (${insertColumns.map(() => '?').join(', ')})`,
      insertValues
    );

    const storyContext = await getSprintKpiStoryContext(storyId);
    await logSprintKpiAudit({
      req,
      action: 'CREATE',
      entityType: 'sprint_kpi_entry',
      entityId: result.insertId,
      description: `Added KPI "${data.kpi_option}" to sprint KPI story "${storyContext?.story_name || storyId}" for board "${storyContext?.agile_board_name || storyContext?.project_team_name || 'Unknown board'}"${storyContext?.project_team_name ? ` (project "${storyContext.project_team_name}")` : ''}`
    });

    res.status(201).json({
      success: true,
      message: 'KPI added successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating sprint KPI entry:', error);
    sendError(res, error, 'Error creating sprint KPI entry');
  }
};

const updateSprintKpiEntry = async (req, res) => {
  try {
    const kpiId = parsePositiveInteger(req.params.id);
    validateKpiPayload(req.body);

    const [existingRows] = await db.query('SELECT id, story_id FROM sprint_kpi_entries WHERE id = ?', [kpiId]);
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'KPI entry not found.'
      });
    }

    const storySelect = await buildSprintKpiStorySelect('s');
    const storyBoardSelect = await buildSprintKpiStoryBoardSelect('s');
    const storyHasSprintColumn = await hasSprintKpiStorySprintColumn();
    const storySprintSelect = storyHasSprintColumn ? 's.sprint_id AS sprint_id' : 'sp.id AS sprint_id';
    const storyJoin = storyHasSprintColumn
      ? 'INNER JOIN sprint_kpi_sprints sp ON sp.id = s.sprint_id'
      : `INNER JOIN sprint_kpi_sprints sp
         ON ${getLegacySprintStoryJoinClause('s', 'sp', 'p')}`;
    const [storyRows] = await db.query(
      `SELECT s.id, ${storySprintSelect}, ${storyBoardSelect}, ${storySelect}, s.applicable_kpis
       FROM sprint_kpi_stories s
       LEFT JOIN projects p ON p.id = s.project_id
       ${storyJoin}
       WHERE s.id = ?`,
      [existingRows[0].story_id]
    );
    if (storyRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sprint story not found.'
      });
    }

    const entryBoardHasColumn = await hasSprintKpiEntryAgileBoardColumn();
    const entryHasSprintColumn = await hasSprintKpiEntrySprintColumn();
    const updateAssignments = [];
    const updateParams = [];

    if (entryHasSprintColumn) {
      updateAssignments.push('sprint_id = ?');
      updateParams.push(storyRows[0].sprint_id);
    }

    updateAssignments.push(
      'kpi_category = ?',
      'kpi_subcategory = ?',
      'kpi_option = ?',
      'percentage = ?',
      'comments = ?'
    );
    updateParams.push(
      normalizeCategory(getPayloadValue(req.body, 'kpi_category', 'category')) || findCategoryForSubcategory(getPayloadValue(req.body, 'kpi_category', 'category')) || findCategoryForOption(getPayloadValue(req.body, 'kpi_option', 'option')),
      getPayloadValue(req.body, 'kpi_subcategory', 'subcategory') || findSubcategoryForOption(normalizeCategory(getPayloadValue(req.body, 'kpi_category', 'category')) || findCategoryForSubcategory(getPayloadValue(req.body, 'kpi_subcategory', 'subcategory')) || findCategoryForOption(getPayloadValue(req.body, 'kpi_option', 'option')), getPayloadValue(req.body, 'kpi_option', 'option')) || getSubcategoryOptions(normalizeCategory(getPayloadValue(req.body, 'kpi_category', 'category')) || findCategoryForSubcategory(getPayloadValue(req.body, 'kpi_subcategory', 'subcategory')) || findCategoryForOption(getPayloadValue(req.body, 'kpi_option', 'option')))[0] || null,
      getPayloadValue(req.body, 'kpi_option', 'option'),
      parseInt(req.body.percentage, 10),
      getPayloadValue(req.body, 'comments')
    );

    if (entryBoardHasColumn) {
      updateAssignments.push('agile_board_name = ?');
      updateParams.push(normalizeText(storyRows[0].agile_board_name) || null);
    }

    updateAssignments.push('updated_by = ?');
    updateParams.push(req.admin?.id || null, kpiId);

    await db.query(
      `UPDATE sprint_kpi_entries
       SET ${updateAssignments.join(', ')}
       WHERE id = ?`,
      updateParams
    );

    const storyContext = await getSprintKpiStoryContext(existingRows[0].story_id);
    await logSprintKpiAudit({
      req,
      action: 'UPDATE',
      entityType: 'sprint_kpi_entry',
      entityId: kpiId,
      description: `Updated KPI "${getPayloadValue(req.body, 'kpi_option', 'option')}" on sprint KPI story "${storyContext?.story_name || existingRows[0].story_id}" for board "${storyContext?.agile_board_name || storyContext?.project_team_name || 'Unknown board'}"${storyContext?.project_team_name ? ` (project "${storyContext.project_team_name}")` : ''}`
    });

    res.json({
      success: true,
      message: 'KPI updated successfully'
    });
  } catch (error) {
    console.error('Error updating sprint KPI entry:', error);
    sendError(res, error, 'Error updating sprint KPI entry');
  }
};

const deleteSprintKpiEntry = async (req, res) => {
  try {
    const kpiId = parsePositiveInteger(req.params.id);
    const [existingRows] = await db.query('SELECT id FROM sprint_kpi_entries WHERE id = ?', [kpiId]);

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'KPI entry not found.'
      });
    }

    const [storyRows] = await db.query(
      `SELECT s.id, s.story_name, s.project_id, p.project_team_name, (
         SELECT pt.agile_board_name
         FROM project_teams pt
         WHERE pt.project_id = p.id
         ORDER BY pt.id ASC
         LIMIT 1
       ) AS agile_board_name
       FROM sprint_kpi_entries e
       INNER JOIN sprint_kpi_stories s ON s.id = e.story_id
       LEFT JOIN projects p ON p.id = s.project_id
       WHERE e.id = ?`,
      [kpiId]
    );

    await db.query('DELETE FROM sprint_kpi_entries WHERE id = ?', [kpiId]);

    const storyContext = storyRows[0] || null;
    await logSprintKpiAudit({
      req,
      action: 'DELETE',
      entityType: 'sprint_kpi_entry',
      entityId: kpiId,
      description: `Deleted KPI on sprint KPI story "${storyContext?.story_name || existingRows[0].story_id}" for board "${storyContext?.agile_board_name || storyContext?.project_team_name || 'Unknown board'}"${storyContext?.project_team_name ? ` (project "${storyContext.project_team_name}")` : ''}`
    });

    res.json({
      success: true,
      message: 'KPI deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sprint KPI entry:', error);
    sendError(res, error, 'Error deleting sprint KPI entry');
  }
};

module.exports = {
  KPI_HIERARCHY,
  getAllSprintKpiSprints,
  getAllSprintKpiStories,
  createSprintKpiSprint,
  createSprintKpiStory,
  updateSprintKpiStory,
  deleteSprintKpiStory,
  createSprintKpiEntry,
  updateSprintKpiEntry,
  deleteSprintKpiEntry
};
