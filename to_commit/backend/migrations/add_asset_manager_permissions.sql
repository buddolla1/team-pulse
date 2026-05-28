-- Grant manager the same asset permissions as admin for existing databases.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.name = 'manager'
  AND p.module = 'assets'
  AND p.action IN ('view', 'create', 'update', 'delete', 'assign', 'export')
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );
