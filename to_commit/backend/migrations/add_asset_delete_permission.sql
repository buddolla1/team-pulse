-- Grant asset delete permission to the admin role for existing databases.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.name = 'admin'
  AND p.module = 'assets'
  AND p.action = 'delete'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );


SELECT
    r.id AS role_id,
    r.name AS role_name,
    r.display_name,
    p.id AS permission_id,
    p.name AS permission_name,
    p.module,
    p.action
FROM roles r
         LEFT JOIN role_permissions rp ON rp.role_id = r.id
         LEFT JOIN permissions p ON p.id = rp.permission_id
ORDER BY r.name, p.module, p.action;