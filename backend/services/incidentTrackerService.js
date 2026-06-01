const db = require('../config/database');
const PDFDocument = require('pdfkit');

const INCIDENT_COLUMNS = [
  'incident_id',
  'change_request_id',
  'incident_date',
  'incident_month',
  'incident_description',
  'program_manager',
  'application_name',
  'agile_team',
  'issue_stage',
  'severity',
  'environment',
  'explanation',
  'developer',
  'tech_lead',
  'tester',
  'test_lead',
  'requirement_gathering',
  'impact_analysis',
  'design_review',
  'development_completed',
  'unit_testing_completed',
  'code_review_completed',
  'test_case_preparation',
  'test_case_review',
  'testing_completed',
  'pre_deployment_verification',
  'post_deployment_verification',
  'rca_category',
  'rca_details',
  'corrective_action',
  'preventive_action',
  'status',
  'created_by',
  'created_date',
  'updated_date'
];

let incidentSchemaPromise = null;

const getIncidentSchema = async () => {
  if (!incidentSchemaPromise) {
    incidentSchemaPromise = db
      .query('SHOW COLUMNS FROM incident_tracker_incidents')
      .then(([rows]) => {
        const columns = new Set(rows.map((row) => row.Field));
        const applicationColumn = columns.has('application_name')
          ? 'application_name'
          : (columns.has('application_agile_team') ? 'application_agile_team' : null);
        const agileColumn = columns.has('agile_team') ? 'agile_team' : null;

        return {
          columns,
          applicationColumn,
          agileColumn
        };
      })
      .catch(() => ({
        columns: new Set(),
        applicationColumn: 'application_name',
        agileColumn: 'agile_team'
      }));
  }

  return incidentSchemaPromise;
};

const getIncidentPersistenceColumns = async () => {
  const schema = await getIncidentSchema();
  return INCIDENT_COLUMNS.flatMap((column) => {
    if (column === 'application_name') {
      return schema.applicationColumn ? [schema.applicationColumn] : [];
    }
    if (column === 'agile_team') {
      return schema.agileColumn ? [schema.agileColumn] : [];
    }
    return [column];
  }).filter((column, index, columns) => columns.indexOf(column) === index);
};

const ISSUE_STAGE_VALUES = ['Pre-Deployment', 'Post-Deployment'];
const SEVERITY_VALUES = ['P1', 'P2', 'P3', 'P4'];
const RCA_CATEGORY_VALUES = ['Code-Issue', 'Requirement-Gap', 'Process-Gap'];
const ENVIRONMENT_VALUES = ['DEV', 'UAT', 'QA', 'PROD'];
const YES_NO_VALUES = ['Yes', 'No'];
const STATUS_VALUES = ['Open', 'In Progress', 'Closed'];

const SORT_MAP = {
  incidentDate: 'incident_date',
  incidentMonth: 'incident_month',
  incidentId: 'incident_id',
  status: 'status',
  severity: 'severity',
  agileTeam: 'agile_team',
  applicationName: 'application_name',
  programManager: 'program_manager',
  rcaCategory: 'rca_category',
  createdDate: 'created_date'
};

const normalizeText = (value) => (value === undefined || value === null || String(value).trim() === '' ? null : String(value).trim());

const normalizeChoice = (value, allowed, fallback = null) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return fallback;
  }

  const matched = allowed.find((item) => item.toLowerCase() === normalized.toLowerCase());
  return matched || fallback;
};

const normalizeYesNo = (value, fallback = 'No') => {
  if (value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'yes') {
    return 'Yes';
  }
  if (value === false || value === 0 || value === '0' || String(value).toLowerCase() === 'no') {
    return 'No';
  }
  return normalizeChoice(value, YES_NO_VALUES, fallback);
};

const mapLegacyIssueStage = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }
  if (normalized.toLowerCase() === 'deployment') {
    return 'Pre-Deployment';
  }
  if (normalized.toLowerCase() === 'postdeployment' || normalized.toLowerCase() === 'post-deployment') {
    return 'Post-Deployment';
  }
  return normalizeChoice(normalized, ISSUE_STAGE_VALUES, null);
};

const mapLegacySeverity = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }
  const lookup = {
    critical: 'P1',
    high: 'P2',
    medium: 'P3',
    low: 'P4',
    p1: 'P1',
    p2: 'P2',
    p3: 'P3',
    p4: 'P4'
  };
  return lookup[normalized.toLowerCase()] || normalizeChoice(normalized, SEVERITY_VALUES, null);
};

const toDateOnly = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  return value;
};

const requireIncidentFields = (payload) => {
  const requiredFields = [
    ['incidentId', 'Incident ID'],
    ['changeRequestId', 'Change Request ID'],
    ['incidentDate', 'Incident Date'],
    ['incidentMonth', 'Incident Month'],
    ['incidentDescription', 'Incident Description'],
    ['programManager', 'Program Manager'],
    ['applicationName', 'Application Name'],
    ['agileTeam', 'Agile Team'],
    ['issueStage', 'Issue Stage'],
    ['severity', 'Severity'],
    ['explanation', 'Explanation'],
    ['developer', 'Developer'],
    ['techLead', 'Tech Lead'],
    ['tester', 'Tester'],
    ['testLead', 'Test Lead'],
    ['rcaCategory', 'RCA Category']
  ];

  const missing = requiredFields
    .filter(([field]) => payload[field] === undefined || payload[field] === null || String(payload[field]).trim() === '')
    .map(([, label]) => label);

  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
};

const mapIncidentPayload = (payload, admin, existing = {}, schema = {}) => {
  const now = new Date();
  const incidentMonth = normalizeText(payload.incidentMonth) || toDateOnly(payload.incidentDate)?.slice(0, 7) || existing.incident_month || null;
  const applicationName = normalizeText(
    payload.applicationName || payload.applicationAgileTeam || existing.application_name || existing.application_agile_team
  );
  const agileTeam = normalizeText(payload.agileTeam || payload.applicationAgileTeam || existing.agile_team || existing.application_agile_team);
  const issueStage = normalizeChoice(payload.issueStage || payload.deploymentType || existing.issue_stage, ISSUE_STAGE_VALUES, existing.issue_stage || ISSUE_STAGE_VALUES[0]);
  const severity = normalizeChoice(payload.severity || payload.priority || existing.severity || mapLegacySeverity(existing.priority), SEVERITY_VALUES, existing.severity || SEVERITY_VALUES[2]);
  const environment = normalizeChoice(payload.environment || existing.environment, ENVIRONMENT_VALUES, existing.environment || ENVIRONMENT_VALUES[3] || 'PROD');

  const data = {
    incident_id: normalizeText(payload.incidentId) || existing.incident_id || null,
    change_request_id: normalizeText(payload.changeRequestId) || existing.change_request_id || null,
    incident_date: toDateOnly(payload.incidentDate || existing.incident_date),
    incident_month: incidentMonth,
    incident_description: normalizeText(payload.incidentDescription) || existing.incident_description || null,
    program_manager: normalizeText(payload.programManager) || existing.program_manager || null,
    application_name: applicationName,
    agile_team: agileTeam,
    issue_stage: issueStage,
    severity,
    environment,
    explanation: normalizeText(payload.explanation || payload.explanationDeveloper || existing.explanation),
    developer: normalizeText(payload.developer || existing.developer),
    tech_lead: normalizeText(payload.techLead) || existing.tech_lead || null,
    tester: normalizeText(payload.tester) || existing.tester || null,
    test_lead: normalizeText(payload.testLead) || existing.test_lead || null,
    requirement_gathering: normalizeYesNo(payload.requirementGathering || existing.requirement_gathering || 'No'),
    impact_analysis: normalizeYesNo(payload.impactAnalysis || payload.impactAnalysisDesign || existing.impact_analysis || 'No'),
    design_review: normalizeYesNo(payload.designReview || existing.design_review || 'No'),
    development_completed: normalizeYesNo(payload.developmentCompleted || payload.developmentUnitTesting || existing.development_completed || 'No'),
    unit_testing_completed: normalizeYesNo(payload.unitTestingCompleted || existing.unit_testing_completed || 'No'),
    code_review_completed: normalizeYesNo(payload.codeReviewCompleted || payload.codeReviewTestCasePreparation || existing.code_review_completed || 'No'),
    test_case_preparation: normalizeYesNo(payload.testCasePreparation || existing.test_case_preparation || 'No'),
    test_case_review: normalizeYesNo(payload.testCaseReview || existing.test_case_review || 'No'),
    testing_completed: normalizeYesNo(payload.testingCompleted || payload.testing || existing.testing_completed || 'No'),
    pre_deployment_verification: normalizeYesNo(payload.preDeploymentVerification || existing.pre_deployment_verification || 'No'),
    post_deployment_verification: normalizeYesNo(payload.postDeploymentVerification || existing.post_deployment_verification || 'No'),
    rca_category: normalizeChoice(payload.rcaCategory || existing.rca_category, RCA_CATEGORY_VALUES, existing.rca_category || RCA_CATEGORY_VALUES[0]),
    rca_details: normalizeText(payload.rcaDetails) || existing.rca_details || null,
    corrective_action: normalizeText(payload.correctiveAction || payload.action || existing.corrective_action),
    preventive_action: normalizeText(payload.preventiveAction || existing.preventive_action),
    status: normalizeChoice(payload.status || existing.status, STATUS_VALUES, existing.status || STATUS_VALUES[0]),
    created_by: normalizeText(existing.created_by) || admin.full_name || admin.username || String(admin.id),
    created_date: existing.created_date || existing.created_at || now,
    updated_date: now
  };

  if (schema.applicationColumn && schema.applicationColumn !== 'application_name') {
    data[schema.applicationColumn] = applicationName;
  }
  if (schema.agileColumn && schema.agileColumn !== 'agile_team') {
    data[schema.agileColumn] = agileTeam;
  }

  return data;
};

const mapIncidentRow = (row) => ({
  id: row.id,
  incidentId: row.incident_id,
  changeRequestId: row.change_request_id,
  incidentDate: toDateOnly(row.incident_date),
  incidentMonth: row.incident_month,
  incidentDescription: row.incident_description,
  programManager: row.program_manager,
  applicationName: row.application_name || row.application_agile_team || null,
  agileTeam: row.agile_team || row.application_agile_team || null,
  issueStage: row.issue_stage || mapLegacyIssueStage(row.deployment_type) || null,
  severity: row.severity || mapLegacySeverity(row.priority) || null,
  environment: row.environment || null,
  explanation: row.explanation || row.explanation_developer || null,
  developer: row.developer || null,
  techLead: row.tech_lead,
  tester: row.tester,
  testLead: row.test_lead,
  requirementGathering: row.requirement_gathering || 'No',
  impactAnalysis: row.impact_analysis || 'No',
  designReview: row.design_review || 'No',
  developmentCompleted: row.development_completed || 'No',
  unitTestingCompleted: row.unit_testing_completed || 'No',
  codeReviewCompleted: row.code_review_completed || 'No',
  testCasePreparation: row.test_case_preparation || 'No',
  testCaseReview: row.test_case_review || 'No',
  testingCompleted: row.testing_completed || 'No',
  preDeploymentVerification: normalizeYesNo(row.pre_deployment_verification || 'No', 'No'),
  postDeploymentVerification: normalizeYesNo(row.post_deployment_verification || 'No', 'No'),
  rcaCategory: row.rca_category,
  rcaDetails: row.rca_details,
  correctiveAction: row.corrective_action || row.action || null,
  preventiveAction: row.preventive_action || null,
  status: row.status,
  createdBy: row.created_by,
  createdDate: toDateOnly(row.created_date || row.created_at),
  updatedDate: toDateOnly(row.updated_date || row.updated_at),
  // legacy aliases used by older screens
  applicationAgileTeam: row.application_name || row.application_agile_team || null,
  deploymentType: row.issue_stage || mapLegacyIssueStage(row.deployment_type) || null,
  incidentCategory: row.severity || mapLegacySeverity(row.priority) || null,
  explanationDeveloper: row.explanation || row.explanation_developer || null,
  respMember: row.resp_member || null,
  impactAnalysisDesign: row.impact_analysis || row.impact_analysis_design || 'No',
  developmentUnitTesting: row.development_completed || row.development_unit_testing || 'No',
  codeReviewTestCasePreparation: row.code_review_completed || row.code_review_test_case_preparation || 'No',
  testing: row.testing_completed || row.testing || 'No',
  priority: row.severity || mapLegacySeverity(row.priority) || null,
  action: row.corrective_action || row.action || null,
  createdAt: toDateOnly(row.created_date || row.created_at),
  updatedAt: toDateOnly(row.updated_date || row.updated_at)
});

const buildFilterSql = async (filters = {}) => {
  const schema = await getIncidentSchema();
  const applicationColumn = schema.applicationColumn || 'application_name';
  const clauses = [];
  const params = [];

  if (filters.search) {
    const searchTerm = `%${String(filters.search).trim()}%`;
    const searchParts = [
      'incident_id LIKE ?',
      'change_request_id LIKE ?',
      'incident_description LIKE ?',
      `${applicationColumn} LIKE ?`
    ];
    if (schema.agileColumn) {
      searchParts.push(`${schema.agileColumn} LIKE ?`);
    }
    searchParts.push(
      'issue_stage LIKE ?',
      'severity LIKE ?',
      'environment LIKE ?',
      'explanation LIKE ?',
      'developer LIKE ?',
      'tech_lead LIKE ?',
      'tester LIKE ?',
      'test_lead LIKE ?',
      'rca_category LIKE ?',
      'status LIKE ?',
      'program_manager LIKE ?',
      'created_by LIKE ?'
    );
    clauses.push(`(${searchParts.join(' OR ')})`);
    params.push(
      searchTerm, searchTerm, searchTerm, searchTerm,
      ...(schema.agileColumn ? [searchTerm] : []),
      searchTerm, searchTerm, searchTerm, searchTerm, searchTerm,
      searchTerm, searchTerm, searchTerm, searchTerm, searchTerm,
      searchTerm, searchTerm
    );
  }
  if (filters.month) {
    clauses.push('incident_month = ?');
    params.push(filters.month);
  }
  if (filters.rcaCategory) {
    clauses.push('rca_category = ?');
    params.push(filters.rcaCategory);
  }
  if (filters.status) {
    clauses.push('status = ?');
    params.push(filters.status);
  }
  if (filters.programManager) {
    clauses.push('program_manager LIKE ?');
    params.push(`%${String(filters.programManager).trim()}%`);
  }
  if (filters.agileTeam) {
    if (schema.agileColumn) {
      clauses.push(`${schema.agileColumn} = ?`);
    } else if (schema.applicationColumn) {
      clauses.push(`${schema.applicationColumn} = ?`);
    }
    params.push(filters.agileTeam);
  }
  if (filters.applicationName) {
    clauses.push(`${applicationColumn} = ?`);
    params.push(filters.applicationName);
  }
  if (filters.issueStage) {
    clauses.push('issue_stage = ?');
    params.push(filters.issueStage);
  }
  if (filters.severity) {
    clauses.push('severity = ?');
    params.push(filters.severity);
  }
  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  };
};

const insertActivityLog = async (incidentId, adminId, actionType, actionDetails) => {
  await db.query(
    `INSERT INTO incident_tracker_activity_logs
      (incident_id, user_id, action_type, action_details, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [incidentId, adminId, actionType, actionDetails, adminId, adminId]
  );
};

const notifyUsers = async (actor, incidentId, title, message) => {
  const [admins] = await db.query(
    `SELECT id
     FROM admin_users
     WHERE status = 'Active' AND id <> ?`,
    [actor.id]
  );

  if (admins.length === 0) {
    return;
  }

  const values = admins.map((admin) => [
    admin.id,
    incidentId,
    title,
    message,
    actor.id,
    actor.id
  ]);

  await db.query(
    `INSERT INTO incident_tracker_notifications
      (user_id, incident_id, title, message, created_by, updated_by)
     VALUES ?`,
    [values]
  );
};

const getIncidentOrThrow = async (id) => {
  const [rows] = await db.query(
    'SELECT * FROM incident_tracker_incidents WHERE id = ?',
    [id]
  );

  if (rows.length === 0) {
    const error = new Error('Incident not found');
    error.statusCode = 404;
    throw error;
  }

  return rows[0];
};

const listIncidents = async (query = {}, reportMode = false) => {
  const pageSize = reportMode ? 1000 : Math.max(parseInt(query.pageSize || '10', 10), 1);
  const page = reportMode ? 1 : Math.max(parseInt(query.page || '1', 10), 1);
  const offset = reportMode ? 0 : (page - 1) * pageSize;
  const sortBy = SORT_MAP[query.sortBy] || 'incident_date';
  const sortDirection = query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
  const { whereSql, params } = await buildFilterSql(query);

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM incident_tracker_incidents
     ${whereSql}`,
    params
  );

  const [rows] = await db.query(
    `SELECT *
     FROM incident_tracker_incidents
     ${whereSql}
     ORDER BY ${sortBy} ${sortDirection}
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    count: countRows[0].total,
    rows: rows.map(mapIncidentRow)
  };
};

const getIncident = async (id) => {
  const incidentRow = await getIncidentOrThrow(id);

  const [comments, attachments, activityLogs] = await Promise.all([
    db.query(
      `SELECT c.id, c.body, c.created_at, au.id AS user_id, au.full_name, au.email
       FROM incident_tracker_comments c
       JOIN admin_users au ON au.id = c.user_id
       WHERE c.incident_id = ?
       ORDER BY c.created_at DESC`,
      [id]
    ),
    db.query(
      `SELECT a.id, a.original_name, a.stored_name, a.mime_type, a.size, a.created_at,
              au.id AS uploader_id, au.full_name, au.email
       FROM incident_tracker_attachments a
       JOIN admin_users au ON au.id = a.uploaded_by
       WHERE a.incident_id = ?
       ORDER BY a.created_at DESC`,
      [id]
    ),
    db.query(
      `SELECT l.id, l.action_type, l.action_details, l.created_at, au.id AS user_id, au.full_name, au.email
       FROM incident_tracker_activity_logs l
       JOIN admin_users au ON au.id = l.user_id
       WHERE l.incident_id = ?
       ORDER BY l.created_at DESC`,
      [id]
    )
  ]);

  return {
    ...mapIncidentRow(incidentRow),
    comments: comments[0].map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        name: row.full_name,
        email: row.email
      }
    })),
    attachments: attachments[0].map((row) => ({
      id: row.id,
      originalName: row.original_name,
      storedName: row.stored_name,
      mimeType: row.mime_type,
      size: row.size,
      createdAt: row.created_at,
      uploader: {
        id: row.uploader_id,
        name: row.full_name,
        email: row.email
      }
    })),
    activityLogs: activityLogs[0].map((row) => ({
      id: row.id,
      actionType: row.action_type,
      actionDetails: row.action_details,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        name: row.full_name,
        email: row.email
      }
    }))
  };
};

const createIncident = async (payload, admin) => {
  requireIncidentFields(payload);
  const schema = await getIncidentSchema();
  const columns = await getIncidentPersistenceColumns();
  const data = mapIncidentPayload(payload, admin, {}, schema);

  const values = columns.map((column) => data[column]);
  const placeholders = columns.map(() => '?').join(', ');

  const [result] = await db.query(
    `INSERT INTO incident_tracker_incidents (${columns.join(', ')})
     VALUES (${placeholders})`,
    values
  );

  await insertActivityLog(result.insertId, admin.id, 'INCIDENT_CREATED', `Created incident ${payload.incidentId}`);
  await notifyUsers(
    admin,
    result.insertId,
    'Incident Created',
    `Incident ${payload.incidentId} was created for team ${payload.agileTeam || payload.applicationAgileTeam || 'Unknown'}`
  );

  return getIncident(result.insertId);
};

const updateIncident = async (id, payload, admin) => {
  requireIncidentFields(payload);
  const existing = mapIncidentRow(await getIncidentOrThrow(id));
  const schema = await getIncidentSchema();
  const columns = await getIncidentPersistenceColumns();
  const data = mapIncidentPayload(payload, admin, existing, schema);
  const updateColumns = columns.filter((column) => column !== 'created_by');
  const assignments = updateColumns.map((column) => `${column} = ?`).join(', ');
  const values = updateColumns.map((column) => data[column]);

  await db.query(
    `UPDATE incident_tracker_incidents
     SET ${assignments}
     WHERE id = ?`,
    [...values, id]
  );

  await insertActivityLog(id, admin.id, 'INCIDENT_UPDATED', `Updated incident ${payload.incidentId}`);
  await notifyUsers(
    admin,
    id,
    'Incident Updated',
    `Incident ${payload.incidentId} status is ${payload.status}`
  );

  return getIncident(id);
};

const deleteIncident = async (id, admin) => {
  const incident = await getIncidentOrThrow(id);
  await db.query('DELETE FROM incident_tracker_incidents WHERE id = ?', [id]);
  await db.query(
    `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, description, ip_address, user_agent)
     VALUES (?, 'DELETE', 'incident_tracker_incidents', ?, ?, '', '')`,
    [admin.id, id, `Deleted incident ${incident.incident_id}`]
  );
};

const addComment = async (incidentId, body, admin) => {
  await getIncidentOrThrow(incidentId);
  const [result] = await db.query(
    `INSERT INTO incident_tracker_comments
      (incident_id, user_id, body, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?)`,
    [incidentId, admin.id, body, admin.id, admin.id]
  );

  await insertActivityLog(incidentId, admin.id, 'COMMENT_ADDED', 'Added incident comment');

  const [rows] = await db.query(
    `SELECT c.id, c.body, c.created_at, au.id AS user_id, au.full_name, au.email
     FROM incident_tracker_comments c
     JOIN admin_users au ON au.id = c.user_id
     WHERE c.id = ?`,
    [result.insertId]
  );

  return {
    id: rows[0].id,
    body: rows[0].body,
    createdAt: rows[0].created_at,
    user: {
      id: rows[0].user_id,
      name: rows[0].full_name,
      email: rows[0].email
    }
  };
};

const addAttachment = async (incidentId, file, admin) => {
  await getIncidentOrThrow(incidentId);
  if (!file) {
    const error = new Error('Attachment file is required');
    error.statusCode = 400;
    throw error;
  }

  const [result] = await db.query(
    `INSERT INTO incident_tracker_attachments
      (incident_id, original_name, stored_name, mime_type, size, uploaded_by, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [incidentId, file.originalname, file.filename, file.mimetype, file.size, admin.id, admin.id, admin.id]
  );

  await insertActivityLog(incidentId, admin.id, 'ATTACHMENT_ADDED', `Uploaded file ${file.originalname}`);

  return {
    id: result.insertId,
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size
  };
};

const getDashboard = async (month) => {
  const runNewSchemaDashboard = async () => {
    const params = [];
    const monthClause = month ? 'WHERE incident_month = ?' : '';
    if (month) {
      params.push(month);
    }

    const [totalRows] = await db.query(`SELECT COUNT(*) AS count FROM incident_tracker_incidents ${monthClause}`, params);
    const [openRows] = await db.query(
      `SELECT COUNT(*) AS count FROM incident_tracker_incidents ${month ? 'WHERE incident_month = ? AND status <> ?' : 'WHERE status <> ?'}`,
      month ? [month, 'Closed'] : ['Closed']
    );
    const [closedRows] = await db.query(
      `SELECT COUNT(*) AS count FROM incident_tracker_incidents ${month ? 'WHERE incident_month = ? AND status = ?' : 'WHERE status = ?'}`,
      month ? [month, 'Closed'] : ['Closed']
    );

    const [bySeverity] = await db.query(
      `SELECT severity AS severity, COUNT(*) AS count
       FROM incident_tracker_incidents ${monthClause}
       GROUP BY severity
       ORDER BY severity ASC`,
      params
    );
    const [byRca] = await db.query(
      `SELECT rca_category AS rcaCategory, COUNT(*) AS count
       FROM incident_tracker_incidents ${monthClause}
       GROUP BY rca_category`,
      params
    );
    const [byTeam] = await db.query(
      `SELECT agile_team AS agileTeam, COUNT(*) AS count
       FROM incident_tracker_incidents ${monthClause}
       GROUP BY agile_team
       ORDER BY agile_team ASC`,
      params
    );
    const [byEnvironment] = await db.query(
      `SELECT environment AS environment, COUNT(*) AS count
       FROM incident_tracker_incidents ${monthClause}
       GROUP BY environment
       ORDER BY environment ASC`,
      params
    );
    const [byIssueStage] = await db.query(
      `SELECT issue_stage AS issueStage, COUNT(*) AS count
       FROM incident_tracker_incidents ${monthClause}
       GROUP BY issue_stage
       ORDER BY issue_stage ASC`,
      params
    );
    const [monthlyTrend] = await db.query(
      `SELECT incident_month AS incidentMonth, COUNT(*) AS count
       FROM incident_tracker_incidents
       GROUP BY incident_month
       ORDER BY incident_month ASC`
    );
    const [statusTrend] = await db.query(
      `SELECT status, COUNT(*) AS count
       FROM incident_tracker_incidents ${monthClause}
       GROUP BY status`,
      params
    );
    const [statusRows] = await db.query(
      `SELECT
          SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS closedCount,
          SUM(CASE WHEN status <> 'Closed' THEN 1 ELSE 0 END) AS openCount
       FROM incident_tracker_incidents ${monthClause}`,
      params
    );

    return {
      total: totalRows[0].count,
      open: openRows[0].count,
      closed: closedRows[0].count,
      bySeverity,
      byRca,
      byTeam,
      byEnvironment,
      byIssueStage,
      monthlyTrend,
      statusTrend,
      slaMetrics: {
        dataValues: {
          breached: Number(statusRows[0].openCount || 0),
          withinSla: Number(statusRows[0].closedCount || 0)
        }
      }
    };
  };

  const runLegacySchemaDashboard = async () => {
    const params = [];
    const monthClause = month ? 'WHERE incident_month = ?' : '';
    if (month) {
      params.push(month);
    }

    const [totalRows] = await db.query(`SELECT COUNT(*) AS count FROM incident_tracker_incidents ${monthClause}`, params);
    const [openRows] = await db.query(
      `SELECT COUNT(*) AS count FROM incident_tracker_incidents ${month ? 'WHERE incident_month = ? AND status <> ?' : 'WHERE status <> ?'}`,
      month ? [month, 'Closed'] : ['Closed']
    );
    const [closedRows] = await db.query(
      `SELECT COUNT(*) AS count FROM incident_tracker_incidents ${month ? 'WHERE incident_month = ? AND status = ?' : 'WHERE status = ?'}`,
      month ? [month, 'Closed'] : ['Closed']
    );

    const [bySeverity] = await db.query(
      `SELECT priority AS severity, COUNT(*) AS count
       FROM incident_tracker_incidents ${monthClause}
       GROUP BY priority
       ORDER BY priority ASC`,
      params
    );
    const [byRca] = await db.query(
      `SELECT incident_category AS rcaCategory, COUNT(*) AS count
       FROM incident_tracker_incidents ${monthClause}
       GROUP BY incident_category`,
      params
    );
    const [byTeam] = await db.query(
      `SELECT application_agile_team AS agileTeam, COUNT(*) AS count
       FROM incident_tracker_incidents ${monthClause}
       GROUP BY application_agile_team
       ORDER BY application_agile_team ASC`,
      params
    );
    const [monthlyTrend] = await db.query(
      `SELECT incident_month AS incidentMonth, COUNT(*) AS count
       FROM incident_tracker_incidents
       GROUP BY incident_month
       ORDER BY incident_month ASC`
    );
    const [statusTrend] = await db.query(
      `SELECT status, COUNT(*) AS count
       FROM incident_tracker_incidents ${monthClause}
       GROUP BY status`,
      params
    );
    const [statusRows] = await db.query(
      `SELECT
          SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS closedCount,
          SUM(CASE WHEN status <> 'Closed' THEN 1 ELSE 0 END) AS openCount
       FROM incident_tracker_incidents ${monthClause}`,
      params
    );

    return {
      total: totalRows[0].count,
      open: openRows[0].count,
      closed: closedRows[0].count,
      bySeverity,
      byRca,
      byTeam,
      byEnvironment: [],
      byIssueStage: [],
      monthlyTrend,
      statusTrend,
      slaMetrics: {
        dataValues: {
          breached: Number(statusRows[0].openCount || 0),
          withinSla: Number(statusRows[0].closedCount || 0)
        }
      }
    };
  };

  try {
    return await runNewSchemaDashboard();
  } catch (error) {
    if (error.code !== 'ER_BAD_FIELD_ERROR') {
      throw error;
    }
    return runLegacySchemaDashboard();
  }
};

const getNotifications = async (adminId) => {
  const [rows] = await db.query(
    `SELECT id, user_id AS userId, incident_id AS incidentId, title, message,
            is_read AS isRead, created_at AS createdAt, updated_at AS updatedAt
     FROM incident_tracker_notifications
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [adminId]
  );
  return rows;
};

const markNotificationAsRead = async (id, adminId) => {
  await db.query(
    `UPDATE incident_tracker_notifications
     SET is_read = TRUE, updated_by = ?
     WHERE id = ? AND user_id = ?`,
    [adminId, id, adminId]
  );

  const [rows] = await db.query(
    `SELECT id, user_id AS userId, incident_id AS incidentId, title, message,
            is_read AS isRead, created_at AS createdAt, updated_at AS updatedAt
     FROM incident_tracker_notifications
     WHERE id = ?`,
    [id]
  );

  return rows[0] || null;
};

const getReportRows = async (filters = {}) => {
  const result = await listIncidents(filters, true);
  return result.rows;
};

const buildCsv = async (filters = {}) => {
  const rows = await getReportRows(filters);
  const headers = [
    'incidentId',
    'month',
    'applicationName',
    'agileTeam',
    'issueStage',
    'severity',
    'status',
    'rcaCategory',
    'programManager'
  ];
  const csvRows = rows.map((row) => [
    row.incidentId,
    row.incidentMonth,
    row.applicationName,
    row.agileTeam,
    row.issueStage,
    row.severity,
    row.status,
    row.rcaCategory,
    row.programManager
  ]);

  return [
    headers.join(','),
    ...csvRows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
};

const buildPdf = async (filters = {}) => {
  const rows = await getReportRows(filters);
  const doc = new PDFDocument({ margin: 40 });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.fontSize(18).text('Incident Report', { align: 'center' });
  doc.moveDown();

  rows.forEach((incident) => {
    doc
      .fontSize(11)
      .text(`${incident.incidentId} | ${incident.incidentMonth} | ${incident.applicationName || incident.agileTeam || '-'} | ${incident.status}`)
      .text(`Severity: ${incident.severity || '-'} | RCA: ${incident.rcaCategory || '-'}`)
      .text(`Description: ${incident.incidentDescription}`)
      .moveDown();
  });

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

module.exports = {
  listIncidents,
  getIncident,
  createIncident,
  updateIncident,
  deleteIncident,
  addComment,
  addAttachment,
  getDashboard,
  getNotifications,
  markNotificationAsRead,
  buildCsv,
  buildPdf
};
