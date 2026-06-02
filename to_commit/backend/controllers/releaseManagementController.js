const db = require('../config/database');
const {
  deleteRecordValues,
  getLatestSchemaByModuleEntity,
  getRecordValues,
  upsertRecordValues
} = require('../services/dynamicFieldService');

const ALLOWED_SORT_FIELDS = [
  'id',
  'release_month',
  'planned_release_date',
  'release_planning_status',
  'release_tag',
  'application_name',
  'release_name',
  'release_status',
  'created_at',
  'updated_at'
];

const DATE_FIELDS = ['planned_release_date', 'rts_handover_planned_date'];

const RELEASE_COLUMNS = [
  'release_month',
  'planned_release_date',
  'release_planning_status',
  'rts_handover_planned_date',
  'release_tag',
  'application_name',
  'release_name',
  'build_program_manager',
  'qe_program_manager',
  'release_spoc',
  'pre_deployment_checklist',
  'implementation_plan',
  'rollback_plan',
  'post_deployment_checklist',
  'rts_handover',
  'build_preparation_checklist',
  'test_case_checklist',
  'dor',
  'dod',
  'pre_deployment_checklist_execution',
  'post_deployment_checklist_execution',
  'release_encountered_issue',
  'issue_description',
  'remedy',
  'release_status',
  'retro',
  'remarks',
  'auditor'
];

const RELEASE_DYNAMIC_MODULE = 'release_management';
const RELEASE_DYNAMIC_ENTITY = 'release';
const RELEASE_RECORD_TYPE = 'release_management_release';

const toDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return value;
};

const normalizeRelease = (row) => {
  if (!row) return row;
  return {
    ...row,
    planned_release_date: toDateOnly(row.planned_release_date),
    rts_handover_planned_date: toDateOnly(row.rts_handover_planned_date),
    release_encountered_issue: Boolean(row.release_encountered_issue)
  };
};

const mapPayload = (body) => {
  const data = {};

  RELEASE_COLUMNS.forEach((column) => {
    if (DATE_FIELDS.includes(column)) {
      data[column] = toDateOnly(body[column]);
      return;
    }

    if (column === 'release_encountered_issue') {
      data[column] = Boolean(body[column]);
      return;
    }

    data[column] = body[column] === '' ? null : body[column];
  });

  return data;
};

const validatePayload = (body) => {
  const required = [
    ['release_month', 'Release Month'],
    ['planned_release_date', 'Planned Release Date'],
    ['release_tag', 'Release TAG'],
    ['application_name', 'Application Name'],
    ['release_name', 'Release Name']
  ];

  const missing = required
    .filter(([field]) => body[field] === undefined || body[field] === null || String(body[field]).trim() === '')
    .map(([, label]) => label);

  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
};

const sendError = (res, error, fallback) => {
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Release TAG already exists. Use a unique Release TAG.'
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.sqlMessage || error.message || fallback
  });
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getAllReleases = async (req, res) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = parsePositiveInteger(req.query.limit, 10);
    const offset = (page - 1) * limit;
    const search = req.query.search?.trim();
    const releaseStatus = req.query.release_status;
    const releaseMonth = req.query.release_month;
    const sortField = ALLOWED_SORT_FIELDS.includes(req.query.sortField) ? req.query.sortField : 'created_at';
    const sortOrder = req.query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const conditions = [];
    const params = [];

    if (releaseStatus && releaseStatus !== 'All') {
      conditions.push('release_status = ?');
      params.push(releaseStatus);
    }

    if (releaseMonth) {
      conditions.push('release_month = ?');
      params.push(releaseMonth);
    }

    if (search) {
      conditions.push('(release_tag LIKE ? OR application_name LIKE ? OR release_name LIKE ? OR release_spoc LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM release_management ${whereSql}`,
      params
    );

    const [rows] = await db.query(
      `SELECT * FROM release_management ${whereSql}
       ORDER BY ${sortField} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: rows.map(normalizeRelease),
      pagination: {
        page,
        limit,
        total: countRows[0].total,
        totalPages: Math.ceil(countRows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching releases:', error);
    sendError(res, error, 'Error fetching releases');
  }
};

const getReleaseById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM release_management WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Release not found' });
    }

    const release = normalizeRelease(rows[0]);
    const schema = await getLatestSchemaByModuleEntity(RELEASE_DYNAMIC_MODULE, RELEASE_DYNAMIC_ENTITY);
    const customFields = await getRecordValues(RELEASE_RECORD_TYPE, req.params.id);

    res.json({
      success: true,
      data: {
        ...release,
        custom_fields: customFields,
        custom_field_schema: schema
      }
    });
  } catch (error) {
    console.error('Error fetching release:', error);
    sendError(res, error, 'Error fetching release');
  }
};

const createRelease = async (req, res) => {
  try {
    validatePayload(req.body);
    const data = mapPayload(req.body);
    const customFields = req.body.custom_fields || {};
    data.created_by = req.admin?.id || null;
    data.updated_by = req.admin?.id || null;
    const columns = [...RELEASE_COLUMNS, 'created_by', 'updated_by'];
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((column) => data[column]);

    const [result] = await db.query(
      `INSERT INTO release_management (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );

    const schema = await getLatestSchemaByModuleEntity(RELEASE_DYNAMIC_MODULE, RELEASE_DYNAMIC_ENTITY);
    if (schema && customFields && Object.keys(customFields).length > 0) {
      await upsertRecordValues({
        schemaId: schema.id,
        recordType: RELEASE_RECORD_TYPE,
        recordId: result.insertId,
        values: customFields,
        actorId: req.admin?.id || null
      });
    }

    res.status(201).json({
      success: true,
      message: 'Release created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating release:', error);
    sendError(res, error, 'Error creating release');
  }
};

const updateRelease = async (req, res) => {
  try {
    validatePayload(req.body);
    const [existing] = await db.query('SELECT id FROM release_management WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Release not found' });
    }

    const data = mapPayload(req.body);
    const customFields = req.body.custom_fields || {};
    data.updated_by = req.admin?.id || null;
    const columns = [...RELEASE_COLUMNS, 'updated_by'];
    const assignments = columns.map((column) => `${column} = ?`).join(', ');
    const values = columns.map((column) => data[column]);

    await db.query(
      `UPDATE release_management SET ${assignments} WHERE id = ?`,
      [...values, req.params.id]
    );

    const schema = await getLatestSchemaByModuleEntity(RELEASE_DYNAMIC_MODULE, RELEASE_DYNAMIC_ENTITY);
    if (schema && customFields && Object.keys(customFields).length > 0) {
      await upsertRecordValues({
        schemaId: schema.id,
        recordType: RELEASE_RECORD_TYPE,
        recordId: req.params.id,
        values: customFields,
        actorId: req.admin?.id || null
      });
    }

    res.json({ success: true, message: 'Release updated successfully' });
  } catch (error) {
    console.error('Error updating release:', error);
    sendError(res, error, 'Error updating release');
  }
};

const deleteRelease = async (req, res) => {
  try {
    const [existing] = await db.query('SELECT id FROM release_management WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Release not found' });
    }

    await db.query('DELETE FROM release_management WHERE id = ?', [req.params.id]);
    await deleteRecordValues(RELEASE_RECORD_TYPE, req.params.id);
    res.json({ success: true, message: 'Release deleted successfully' });
  } catch (error) {
    console.error('Error deleting release:', error);
    sendError(res, error, 'Error deleting release');
  }
};

module.exports = {
  getAllReleases,
  getReleaseById,
  createRelease,
  updateRelease,
  deleteRelease
};
