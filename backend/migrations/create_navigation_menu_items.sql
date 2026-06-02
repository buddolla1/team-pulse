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
);

INSERT INTO permissions (module, action, name, description)
VALUES ('navigation', 'manage', 'navigation.manage', 'Manage navigation menu items')
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  module = VALUES(module),
  action = VALUES(action);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'admin')
  AND p.name = 'navigation.manage'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO navigation_menu_items (
  menu_key, label, route_path, match_type, permission_name, permission_description,
  icon_class, show_in_sidebar, show_in_topnav, sort_order, is_active
) VALUES
('dashboard', 'Dashboard', '/admin/dashboard', 'exact', 'dashboard.view', 'View the admin dashboard', 'pi pi-home', 1, 1, 10, 1),
('employees', 'Employees', '/admin/employees', 'exact', 'employees.view', 'View employee records', 'pi pi-users', 1, 1, 20, 1),
('projects', 'Projects', '/admin/projects', 'exact', 'projects.view', 'View project records', 'pi pi-briefcase', 1, 1, 30, 1),
('assets', 'Assets', '/admin/assets', 'exact', 'assets.view', 'View asset records', 'pi pi-desktop', 1, 0, 40, 1),
('invoices', 'Invoices', '/admin/invoices', 'exact', 'invoices.view', 'View invoices', 'pi pi-file-edit', 1, 0, 50, 1),
('purchase-orders', 'Purchase Orders', '/admin/pos', 'exact', 'pos.view', 'View purchase orders', 'pi pi-shopping-cart', 1, 0, 60, 1),
('incident-tracker', 'Incident Tracker', '/admin/incident-tracker/dashboard', 'prefix', 'incident_tracker.view', 'View incident tracker', 'pi pi-exclamation-circle', 1, 1, 70, 1),
('leave-tracker', 'Leave Tracker', '/admin/leave-tracker', 'exact', 'leave_tracker.view', 'View leave tracker', 'pi pi-calendar', 1, 1, 80, 1),
('release-management', 'Release Management', '/admin/release-management', 'exact', 'release_management.view', 'View release management', 'pi pi-send', 1, 1, 90, 1),
('sprint-kpi', 'Sprint KPI', '/admin/sprint-kpi', 'exact', 'sprint_kpi.view', 'View sprint KPI', 'pi pi-chart-line', 1, 1, 100, 1),
('admin-users', 'Admin Users', '/admin/users', 'exact', 'admin_users.view', 'View admin users', 'pi pi-id-card', 1, 1, 110, 1),
('roles', 'Roles', '/admin/roles', 'exact', 'roles.view', 'View roles and permissions', 'pi pi-shield', 1, 1, 120, 1),
('dynamic-fields', 'Dynamic Fields', '/admin/dynamic-fields', 'exact', 'roles.view', 'View and manage dynamic fields', 'pi pi-sliders-h', 1, 1, 130, 1),
('navigation-settings', 'Navigation Settings', '/admin/navigation', 'exact', 'navigation.manage', 'Manage sidebar and top navigation items', 'pi pi-sitemap', 1, 0, 140, 1)
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
  is_active = VALUES(is_active);
