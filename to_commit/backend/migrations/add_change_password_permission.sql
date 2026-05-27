-- Add admin password change permission and grant it to the manager role.

INSERT INTO permissions (module, action, name, description)
VALUES (
  'admin_users',
  'change_password',
  'admin_users.change_password',
  'Change admin user passwords'
)
ON DUPLICATE KEY UPDATE
  description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.name = 'manager'
  AND p.name = 'admin_users.change_password'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );
