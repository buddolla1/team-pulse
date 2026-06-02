const db = require('../config/database');

const normalizeBoolean = (value) => value === true || value === 1 || value === '1' || value === 'true';

const toSlug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '');

const derivePermissionName = (payload = {}) => {
  const explicit = String(payload.permission_name || '').trim();
  if (explicit) {
    return explicit;
  }

  const base = toSlug(payload.menu_key || payload.label || 'menu');
  return `${base || 'menu'}.view`;
};

const deriveMenuKey = (payload = {}) => {
  const explicit = String(payload.menu_key || '').trim();
  if (explicit) {
    return explicit;
  }

  return toSlug(payload.label || payload.route_path || 'menu');
};

const derivePermissionDetails = (permissionName, permissionDescription, label) => {
  const [modulePart, actionPart] = String(permissionName || '').split('.');
  return {
    module: modulePart || 'navigation',
    action: actionPart || 'view',
    name: permissionName,
    description: permissionDescription || `Access ${label || permissionName}`
  };
};

const ensurePermissionExists = async (connection, { permissionName, permissionDescription, label, actorId = null }) => {
  const [existing] = await connection.query(
    'SELECT id FROM permissions WHERE name = ? LIMIT 1',
    [permissionName]
  );

  if (existing.length > 0) {
    return existing[0].id;
  }

  const details = derivePermissionDetails(permissionName, permissionDescription, label);
  const [result] = await connection.query(
    `INSERT INTO permissions (module, action, name, description)
     VALUES (?, ?, ?, ?)`,
    [
      details.module,
      details.action,
      details.name,
      details.description
    ]
  );

  return result.insertId;
};

const serializeNavigationItem = (row) => ({
  ...row,
  show_in_sidebar: Boolean(row.show_in_sidebar),
  show_in_topnav: Boolean(row.show_in_topnav),
  is_active: Boolean(row.is_active)
});

const ensureNavigationInfrastructure = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS navigation_menu_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      menu_key VARCHAR(100) NOT NULL,
      label VARCHAR(150) NOT NULL,
      route_path VARCHAR(255) NOT NULL,
      match_type ENUM('exact', 'prefix') NOT NULL DEFAULT 'exact',
      permission_name VARCHAR(100) NOT NULL,
      permission_description VARCHAR(255) NULL,
      icon_class VARCHAR(100) NULL,
      show_in_sidebar TINYINT(1) NOT NULL DEFAULT 1,
      show_in_topnav TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_by VARCHAR(100) NULL,
      updated_by VARCHAR(100) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_navigation_menu_key (menu_key),
      INDEX idx_navigation_sidebar (show_in_sidebar, is_active, sort_order),
      INDEX idx_navigation_topnav (show_in_topnav, is_active, sort_order),
      INDEX idx_navigation_permission (permission_name)
    )
  `);

  await db.query(`
    INSERT INTO permissions (module, action, name, description)
    VALUES ('navigation', 'manage', 'navigation.manage', 'Manage navigation menu items')
    ON DUPLICATE KEY UPDATE
      description = VALUES(description),
      module = VALUES(module),
      action = VALUES(action)
  `);

  await db.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name IN ('super_admin', 'admin')
      AND p.name = 'navigation.manage'
      AND NOT EXISTS (
        SELECT 1 FROM role_permissions rp
        WHERE rp.role_id = r.id AND rp.permission_id = p.id
      )
  `);

  const defaultItems = [
    ['dashboard', 'Dashboard', '/admin/dashboard', 'exact', 'dashboard.view', 'View the admin dashboard', 'pi pi-home', 1, 1, 10, 1],
    ['employees', 'Employees', '/admin/employees', 'exact', 'employees.view', 'View employee records', 'pi pi-users', 1, 1, 20, 1],
    ['projects', 'Projects', '/admin/projects', 'exact', 'projects.view', 'View project records', 'pi pi-briefcase', 1, 1, 30, 1],
    ['assets', 'Assets', '/admin/assets', 'exact', 'assets.view', 'View asset records', 'pi pi-desktop', 1, 0, 40, 1],
    ['invoices', 'Invoices', '/admin/invoices', 'exact', 'invoices.view', 'View invoices', 'pi pi-file-edit', 1, 0, 50, 1],
    ['purchase-orders', 'Purchase Orders', '/admin/pos', 'exact', 'pos.view', 'View purchase orders', 'pi pi-shopping-cart', 1, 0, 60, 1],
    ['incident-tracker', 'Incident Tracker', '/admin/incident-tracker/dashboard', 'prefix', 'incident_tracker.view', 'View incident tracker', 'pi pi-exclamation-circle', 1, 1, 70, 1],
    ['leave-tracker', 'Leave Tracker', '/admin/leave-tracker', 'exact', 'leave_tracker.view', 'View leave tracker', 'pi pi-calendar', 1, 1, 80, 1],
    ['release-management', 'Release Management', '/admin/release-management', 'exact', 'release_management.view', 'View release management', 'pi pi-send', 1, 1, 90, 1],
    ['sprint-kpi', 'Sprint KPI', '/admin/sprint-kpi', 'exact', 'sprint_kpi.view', 'View sprint KPI', 'pi pi-chart-line', 1, 1, 100, 1],
    ['admin-users', 'Admin Users', '/admin/users', 'exact', 'admin_users.view', 'View admin users', 'pi pi-id-card', 1, 1, 110, 1],
    ['roles', 'Roles', '/admin/roles', 'exact', 'roles.view', 'View roles and permissions', 'pi pi-shield', 1, 1, 120, 1],
    ['dynamic-fields', 'Dynamic Fields', '/admin/dynamic-fields', 'exact', 'roles.view', 'View and manage dynamic fields', 'pi pi-sliders-h', 1, 1, 130, 1],
    ['navigation-settings', 'Navigation Settings', '/admin/navigation', 'exact', 'navigation.manage', 'Manage sidebar and top navigation items', 'pi pi-sitemap', 1, 0, 140, 1]
  ];

  for (const item of defaultItems) {
    await db.query(
      `INSERT INTO navigation_menu_items
       (menu_key, label, route_path, match_type, permission_name, permission_description, icon_class, show_in_sidebar, show_in_topnav, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         label = VALUES(label),
         route_path = VALUES(route_path),
         match_type = VALUES(match_type),
         permission_name = VALUES(permission_name),
         permission_description = VALUES(permission_description),
         icon_class = VALUES(icon_class),
         show_in_sidebar = VALUES(show_in_sidebar),
         show_in_topnav = VALUES(show_in_topnav),
         sort_order = VALUES(sort_order),
         is_active = VALUES(is_active)`,
      item
    );
  }
};

const listNavigationItems = async (surface = null) => {
  await ensureNavigationInfrastructure();

  const conditions = [];
  const values = [];

  if (surface === 'sidebar') {
    conditions.push('show_in_sidebar = 1');
  } else if (surface === 'topnav') {
    conditions.push('show_in_topnav = 1');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT *
     FROM navigation_menu_items
     ${whereClause}
     ORDER BY sort_order ASC, id ASC`,
    values
  );

  return rows.map(serializeNavigationItem);
};

const createNavigationItem = async (payload, actorId = null) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const menuKey = deriveMenuKey(payload);
    const permissionName = derivePermissionName(payload);
    const label = String(payload.label || '').trim();
    const routePath = String(payload.route_path || '').trim();

    if (!label || !routePath) {
      const error = new Error('label and route_path are required');
      error.statusCode = 400;
      throw error;
    }

    await ensurePermissionExists(connection, {
      permissionName,
      permissionDescription: payload.permission_description,
      label,
      actorId
    });

    const [result] = await connection.query(
      `INSERT INTO navigation_menu_items
       (menu_key, label, route_path, match_type, permission_name, permission_description,
        icon_class, show_in_sidebar, show_in_topnav, sort_order, is_active, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        menuKey,
        label,
        routePath,
        payload.match_type === 'prefix' ? 'prefix' : 'exact',
        permissionName,
        payload.permission_description || null,
        payload.icon_class || null,
        normalizeBoolean(payload.show_in_sidebar) ? 1 : 0,
        normalizeBoolean(payload.show_in_topnav) ? 1 : 0,
        Number.isFinite(Number(payload.sort_order)) ? Number(payload.sort_order) : 0,
        payload.is_active === undefined ? 1 : normalizeBoolean(payload.is_active) ? 1 : 0,
        actorId,
        actorId
      ]
    );

    await connection.commit();
    return { id: result.insertId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const updateNavigationItem = async (id, payload, actorId = null) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      'SELECT * FROM navigation_menu_items WHERE id = ? LIMIT 1',
      [id]
    );

    if (existing.length === 0) {
      const error = new Error('Navigation item not found');
      error.statusCode = 404;
      throw error;
    }

    const current = existing[0];
    const menuKey = deriveMenuKey(payload.menu_key ? payload : { ...payload, menu_key: current.menu_key });
    const permissionName = derivePermissionName(payload.permission_name ? payload : { ...payload, permission_name: current.permission_name });
    const label = String(payload.label ?? current.label ?? '').trim();
    const routePath = String(payload.route_path ?? current.route_path ?? '').trim();

    if (!label || !routePath) {
      const error = new Error('label and route_path are required');
      error.statusCode = 400;
      throw error;
    }

    await ensurePermissionExists(connection, {
      permissionName,
      permissionDescription: payload.permission_description ?? current.permission_description ?? null,
      label,
      actorId
    });

    const updates = [];
    const values = [];
    const allowed = [
      ['menu_key', menuKey],
      ['label', label],
      ['route_path', routePath],
      ['match_type', payload.match_type ? (payload.match_type === 'prefix' ? 'prefix' : 'exact') : current.match_type],
      ['permission_name', permissionName],
      ['permission_description', payload.permission_description !== undefined ? payload.permission_description : current.permission_description],
      ['icon_class', payload.icon_class !== undefined ? payload.icon_class : current.icon_class],
      ['show_in_sidebar', payload.show_in_sidebar !== undefined ? (normalizeBoolean(payload.show_in_sidebar) ? 1 : 0) : current.show_in_sidebar],
      ['show_in_topnav', payload.show_in_topnav !== undefined ? (normalizeBoolean(payload.show_in_topnav) ? 1 : 0) : current.show_in_topnav],
      ['sort_order', payload.sort_order !== undefined ? (Number.isFinite(Number(payload.sort_order)) ? Number(payload.sort_order) : 0) : current.sort_order],
      ['is_active', payload.is_active !== undefined ? (normalizeBoolean(payload.is_active) ? 1 : 0) : current.is_active]
    ];

    allowed.forEach(([key, value]) => {
      updates.push(`${key} = ?`);
      values.push(value);
    });
    updates.push('updated_by = ?');
    values.push(actorId);
    values.push(id);

    await connection.query(
      `UPDATE navigation_menu_items SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    await connection.commit();
    return { id: Number(id) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const deleteNavigationItem = async (id) => {
  const [result] = await db.query('DELETE FROM navigation_menu_items WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = {
  createNavigationItem,
  deleteNavigationItem,
  listNavigationItems,
  updateNavigationItem
};
