-- Add General User role with access limited to incident, leave, and release data.

INSERT INTO roles (name, display_name, description, is_system_role)
VALUES ('generaluser', 'General User', 'Access limited to incident, leave, and release data', TRUE)
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  is_system_role = VALUES(is_system_role);

INSERT INTO permissions (module, action, name, description) VALUES
('incident_tracker', 'view', 'incident_tracker.view', 'View incident dashboard, incident records, notifications, and details'),
('incident_tracker', 'create', 'incident_tracker.create', 'Create incident records'),
('incident_tracker', 'update', 'incident_tracker.update', 'Update incident records, comments, and attachments'),
('incident_tracker', 'delete', 'incident_tracker.delete', 'Delete incident records'),
('incident_tracker', 'export', 'incident_tracker.export', 'Export incident reports'),
('leave_tracker', 'view', 'leave_tracker.view', 'View leave requests and leave tracker records'),
('leave_tracker', 'create', 'leave_tracker.create', 'Create leave requests'),
('leave_tracker', 'export', 'leave_tracker.export', 'Export leave tracker reports'),
('release_management', 'view', 'release_management.view', 'View release management records'),
('release_management', 'create', 'release_management.create', 'Create release management records'),
('release_management', 'update', 'release_management.update', 'Update release management records'),
('release_management', 'delete', 'release_management.delete', 'Delete release management records'),
('release_management', 'export', 'release_management.export', 'Export release management records')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);

-- Keep privileged admin roles aligned after adding new permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'admin')
  AND p.module IN ('incident_tracker', 'leave_tracker', 'release_management')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'generaluser'
  AND (
    p.module IN ('incident_tracker', 'release_management')
    OR (p.module = 'leave_tracker' AND p.action IN ('view', 'create'))
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
