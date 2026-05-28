const XLSX = require('xlsx');
const db = require('../config/database');

const normalizeText = (value) => (value === undefined || value === null || String(value).trim() === '' ? null : String(value).trim());

const normalizeDateOnly = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
};

const parseLocalDate = (value) => {
  const normalized = normalizeDateOnly(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isWeekendDate = (value) => {
  const date = parseLocalDate(value);
  if (!date) {
    return false;
  }

  const day = date.getDay();
  return day === 0 || day === 6;
};

const toDisplayDate = (value) => {
  if (!value) {
    return null;
  }

  return normalizeDateOnly(value);
};

const computeLeaveDays = (startDate, endDate) => {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (!start || !end) {
    return null;
  }

  if (end < start) {
    return null;
  }

  let total = 0;
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      total += 1;
    }
    current.setDate(current.getDate() + 1);
  }

  return total > 0 ? total : null;
};

const generateLeaveRequestId = () => {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LV-${timestamp}-${suffix}`;
};

const ALLOWED_LEAVE_STATUSES = ['Planned', 'Applied', 'Not Taken', 'Revoked'];

const hasLeaveTrackerSsoColumn = async () => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'leave_tracker_leaves'
       AND COLUMN_NAME = 'sso'`
  );

  return Number(rows[0]?.count || 0) > 0;
};

const hasLeaveTrackerStatusColumn = async () => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'leave_tracker_leaves'
       AND COLUMN_NAME = 'status'`
  );

  return Number(rows[0]?.count || 0) > 0;
};

const getActorContext = (actor) => ({
  userType: actor?.user_type === 'employee' ? 'employee' : 'admin',
  userId: actor?.id || null,
  sso: normalizeText(actor?.username || actor?.sso || null),
  userName: normalizeText(actor?.full_name || actor?.name || actor?.username) || `User-${actor?.id || 'unknown'}`,
  roleName: normalizeText(actor?.role_name || actor?.auth_role_name || actor?.role || null),
  createdBy: normalizeText(actor?.full_name || actor?.name || actor?.username) || String(actor?.id || 'System')
});

const mapLeaveRow = (row) => ({
  id: row.id,
  leaveRequestId: row.leave_request_id,
  userType: row.user_type,
  userId: row.user_id,
  sso: row.sso || row.resolved_sso || null,
  userName: row.user_name,
  roleName: row.role_name,
  startDate: toDisplayDate(row.start_date),
  endDate: toDisplayDate(row.end_date),
  noOfDays: Number(row.no_of_days),
  leavesApplied: row.leaves_applied,
  status: row.status || row.resolved_status || 'Applied',
  comments: row.comments,
  createdBy: row.created_by,
  createdDate: row.created_date,
  updatedDate: row.updated_date
});

const buildFilterSql = (query = {}, actorContext, hasStatusColumn = true) => {
  const clauses = [];
  const params = [];
  const isAdmin = actorContext.userType === 'admin';

  if (!isAdmin) {
    clauses.push('user_type = ? AND user_id = ?');
    params.push(actorContext.userType, actorContext.userId);
  }

  if (query.search) {
    const search = `%${String(query.search).trim()}%`;
    const searchClause = hasStatusColumn
      ? `(
          leave_request_id LIKE ?
          OR sso LIKE ?
          OR user_name LIKE ?
          OR role_name LIKE ?
          OR leaves_applied LIKE ?
          OR status LIKE ?
          OR comments LIKE ?
          OR created_by LIKE ?
        )`
      : `(
          leave_request_id LIKE ?
          OR sso LIKE ?
          OR user_name LIKE ?
          OR role_name LIKE ?
          OR leaves_applied LIKE ?
          OR comments LIKE ?
          OR created_by LIKE ?
        )`;
    clauses.push(searchClause);
    params.push(
      search,
      search,
      search,
      search,
      search,
      ...(hasStatusColumn ? [search] : []),
      search,
      search
    );
  }

  if (isAdmin && query.userName) {
    clauses.push('user_name LIKE ?');
    params.push(`%${String(query.userName).trim()}%`);
  }

  if (isAdmin && query.leaveType) {
    clauses.push('leaves_applied LIKE ?');
    params.push(`%${String(query.leaveType).trim()}%`);
  }

  if (query.month) {
    clauses.push("DATE_FORMAT(start_date, '%Y-%m') = ?");
    params.push(String(query.month).slice(0, 7));
  }

  if (query.startDate) {
    clauses.push('start_date >= ?');
    params.push(normalizeDateOnly(query.startDate));
  }

  if (query.endDate) {
    clauses.push('end_date <= ?');
    params.push(normalizeDateOnly(query.endDate));
  }

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  };
};

const validateLeavePayload = (payload) => {
  const startDate = normalizeDateOnly(payload.startDate);
  const endDate = normalizeDateOnly(payload.endDate);
  const leavesApplied = normalizeText(payload.leavesApplied);
  const comments = normalizeText(payload.comments);
  const status = normalizeText(payload.status) || 'Applied';

  const missing = [];
  if (!startDate) missing.push('Start Date');
  if (!endDate) missing.push('End Date');
  if (!leavesApplied) missing.push('Leave Applied');

  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  if (isWeekendDate(startDate) || isWeekendDate(endDate)) {
    const error = new Error('Start Date and End Date must be working days (Monday to Friday).');
    error.statusCode = 400;
    throw error;
  }

  const noOfDays = Number(payload.noOfDays || computeLeaveDays(startDate, endDate));
  if (!Number.isFinite(noOfDays) || noOfDays <= 0) {
    const error = new Error('Leave days must be a positive working-day range and end date must be on or after start date.');
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_LEAVE_STATUSES.includes(status)) {
    const error = new Error(`Status must be one of: ${ALLOWED_LEAVE_STATUSES.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }

  if (new Date(`${endDate}T00:00:00`) < new Date(`${startDate}T00:00:00`)) {
    const error = new Error('End Date must be on or after Start Date.');
    error.statusCode = 400;
    throw error;
  }

  return {
    startDate,
    endDate,
    noOfDays,
    leavesApplied,
    status,
    comments
  };
};

const listLeaves = async (query = {}, actor) => {
  const actorContext = getActorContext(actor);
  const pageSize = Math.max(parseInt(query.pageSize || '10', 10), 1);
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const offset = (page - 1) * pageSize;
  const hasSsoColumn = await hasLeaveTrackerSsoColumn();
  const hasStatusColumn = await hasLeaveTrackerStatusColumn();
  const { whereSql, params } = buildFilterSql(query, actorContext, hasStatusColumn);
  const orderByClause = hasStatusColumn
    ? "ORDER BY FIELD(lt.status, 'Planned', 'Applied', 'Not Taken', 'Revoked'), lt.start_date DESC, lt.created_date DESC"
    : 'ORDER BY lt.start_date DESC, lt.created_date DESC';

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM leave_tracker_leaves ${whereSql}`,
    params
  );

  const [rows] = await db.query(
    `SELECT lt.*,
            COALESCE(${hasSsoColumn ? 'lt.sso' : 'NULL'}, e.sso, au.username) AS resolved_sso,
            ${hasStatusColumn ? 'lt.status' : `'Applied' AS status`}
     FROM leave_tracker_leaves lt
     LEFT JOIN employees e
       ON lt.user_type = 'employee' AND e.id = lt.user_id
     LEFT JOIN admin_users au
      ON lt.user_type = 'admin' AND au.id = lt.user_id
     ${whereSql}
     ${orderByClause}
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    count: countRows[0].total,
    rows: rows.map(mapLeaveRow)
  };
};

const getLeave = async (id, actor) => {
  const actorContext = getActorContext(actor);
  const hasSsoColumn = await hasLeaveTrackerSsoColumn();
  const hasStatusColumn = await hasLeaveTrackerStatusColumn();
  const [rows] = await db.query(
    `SELECT lt.*,
            COALESCE(${hasSsoColumn ? 'lt.sso' : 'NULL'}, e.sso, au.username) AS resolved_sso,
            ${hasStatusColumn ? 'lt.status' : `'Applied' AS status`}
     FROM leave_tracker_leaves lt
     LEFT JOIN employees e
       ON lt.user_type = 'employee' AND e.id = lt.user_id
     LEFT JOIN admin_users au
       ON lt.user_type = 'admin' AND au.id = lt.user_id
     WHERE lt.id = ?`,
    [id]
  );
  if (rows.length === 0) {
    const error = new Error('Leave request not found');
    error.statusCode = 404;
    throw error;
  }

  if (actorContext.userType !== 'admin') {
    const row = rows[0];
    if (row.user_type !== actorContext.userType || Number(row.user_id) !== Number(actorContext.userId)) {
      const error = new Error('Leave request not found');
      error.statusCode = 404;
      throw error;
    }
  }

  return mapLeaveRow(rows[0]);
};

const createLeave = async (payload, actor) => {
  const actorContext = getActorContext(actor);
  if (actorContext.userType !== 'employee') {
    const error = new Error('Only employees can apply for leave.');
    error.statusCode = 403;
    throw error;
  }

  const data = validateLeavePayload(payload);
  const leaveRequestId = normalizeText(payload.leaveRequestId) || generateLeaveRequestId();
  const roleName = actorContext.roleName;
  const now = new Date();
  const hasSsoColumn = await hasLeaveTrackerSsoColumn();
  const hasStatusColumn = await hasLeaveTrackerStatusColumn();

  const [duplicateRows] = await db.query(
    `SELECT id FROM leave_tracker_leaves
     WHERE user_type = ?
       AND user_id = ?
       AND start_date = ?
       AND end_date = ?
       AND leaves_applied = ?`,
    [
      actorContext.userType,
      actorContext.userId,
      data.startDate,
      data.endDate,
      data.leavesApplied
    ]
  );

  if (duplicateRows.length > 0) {
    const error = new Error('Duplicate leave request already exists for the selected dates and leave type.');
    error.statusCode = 409;
    throw error;
  }

  const insertColumns = [
    'leave_request_id',
    'user_type',
    'user_id'
  ];
  const insertValues = [
    leaveRequestId,
    actorContext.userType,
    actorContext.userId
  ];

  if (hasSsoColumn) {
    insertColumns.push('sso');
    insertValues.push(actorContext.sso);
  }

  insertColumns.push(
    'user_name',
    'role_name',
    'start_date',
    'end_date',
    'no_of_days',
    'leaves_applied',
    'comments',
    'created_by',
    'created_date',
    'updated_date'
  );
  if (hasStatusColumn) {
    insertColumns.splice(insertColumns.length - 4, 0, 'status');
  }
  insertValues.push(
    actorContext.userName,
    roleName,
    data.startDate,
    data.endDate,
    data.noOfDays,
    data.leavesApplied,
    ...(hasStatusColumn ? ['Applied'] : []),
    data.comments,
    actorContext.createdBy,
    now,
    now
  );

  const placeholders = insertColumns.map(() => '?').join(', ');
  const [result] = await db.query(
    `INSERT INTO leave_tracker_leaves (${insertColumns.join(', ')})
     VALUES (${placeholders})`,
    insertValues
  );

  return getLeave(result.insertId, actor);
};

const buildWorkbook = (rows) => {
  const formatted = rows.map((row, index) => ({
    'No.': index + 1,
    'Leave ID': row.leaveRequestId,
    SSO: row.sso || 'N/A',
    'User Type': row.userType,
    'User Name': row.userName,
    'Role Name': row.roleName || 'N/A',
    'Start Date': row.startDate,
    'End Date': row.endDate,
    'No. of Days': row.noOfDays,
    'Leave Applied': row.leavesApplied,
    Status: row.status || 'Applied',
    Comments: row.comments || 'N/A',
    'Created By': row.createdBy,
    'Created Date': row.createdDate,
    'Updated Date': row.updatedDate
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(formatted);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 18 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 20 },
    { wch: 35 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Tracker');
  return workbook;
};

const buildExcelReport = async (query = {}, actor) => {
  const actorContext = getActorContext(actor);
  const reportQuery = { ...query, page: 1, pageSize: 10000 };
  const result = await listLeaves(reportQuery, { ...actor, user_type: actorContext.userType });
  const workbook = buildWorkbook(result.rows);
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
};

const updateLeave = async (id, payload, actor) => {
  const actorContext = getActorContext(actor);
  const data = validateLeavePayload(payload);
  const hasStatusColumn = await hasLeaveTrackerStatusColumn();
  const [existingRows] = await db.query('SELECT * FROM leave_tracker_leaves WHERE id = ?', [id]);
  if (existingRows.length === 0) {
    const error = new Error('Leave request not found');
    error.statusCode = 404;
    throw error;
  }

  const existing = existingRows[0];

  if (actorContext.userType !== 'admin') {
    if (existing.user_type !== actorContext.userType || Number(existing.user_id) !== Number(actorContext.userId)) {
      const error = new Error('Leave request not found');
      error.statusCode = 404;
      throw error;
    }
  }

  const [duplicateRows] = await db.query(
    `SELECT id FROM leave_tracker_leaves
     WHERE user_type = ?
       AND user_id = ?
       AND start_date = ?
       AND end_date = ?
       AND leaves_applied = ?
       AND id != ?`,
    [
      existing.user_type,
      existing.user_id,
      data.startDate,
      data.endDate,
      data.leavesApplied,
      id
    ]
  );

  if (duplicateRows.length > 0) {
    const error = new Error('Another leave request already exists for the selected dates and leave type.');
    error.statusCode = 409;
    throw error;
  }

  if (!hasStatusColumn && data.status !== 'Applied') {
    const error = new Error('Status changes require recreating the leave table with the latest schema.');
    error.statusCode = 400;
    throw error;
  }

  if (hasStatusColumn) {
    await db.query(
      `UPDATE leave_tracker_leaves
       SET start_date = ?,
           end_date = ?,
           no_of_days = ?,
           leaves_applied = ?,
           status = ?,
           comments = ?,
           updated_date = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        data.startDate,
        data.endDate,
        data.noOfDays,
        data.leavesApplied,
        data.status,
        data.comments,
        id
      ]
    );
  } else {
    await db.query(
      `UPDATE leave_tracker_leaves
       SET start_date = ?,
           end_date = ?,
           no_of_days = ?,
           leaves_applied = ?,
           comments = ?,
           updated_date = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        data.startDate,
        data.endDate,
        data.noOfDays,
        data.leavesApplied,
        data.comments,
        id
      ]
    );
  }

  return getLeave(id, actor);
};

const revokeLeave = async (id, actor) => {
  const actorContext = getActorContext(actor);
  const hasStatusColumn = await hasLeaveTrackerStatusColumn();
  const [existingRows] = await db.query('SELECT id, user_type, user_id, status FROM leave_tracker_leaves WHERE id = ?', [id]);
  if (existingRows.length === 0) {
    const error = new Error('Leave request not found');
    error.statusCode = 404;
    throw error;
  }

  const existing = existingRows[0];

  if (actorContext.userType !== 'admin') {
    if (existing.user_type !== actorContext.userType || Number(existing.user_id) !== Number(actorContext.userId)) {
      const error = new Error('Leave request not found');
      error.statusCode = 404;
      throw error;
    }
  }

  if (!hasStatusColumn) {
    const error = new Error('Status changes require recreating the leave table with the latest schema.');
    error.statusCode = 400;
    throw error;
  }

  if (String(existing.status || 'Applied') === 'Revoked') {
    const error = new Error('Leave request is already revoked.');
    error.statusCode = 409;
    throw error;
  }

  await db.query(
    `UPDATE leave_tracker_leaves
     SET status = 'Revoked',
         updated_date = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [id]
  );

  return getLeave(id, actor);
};

module.exports = {
  listLeaves,
  getLeave,
  createLeave,
  updateLeave,
  revokeLeave,
  buildExcelReport
};
