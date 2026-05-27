# Admin Database Quick Reference

Use this file when you want to control access from the database instead of changing application code.

## Core Tables

- `roles`: RBAC roles such as `super_admin`, `admin`, `manager`, `viewer`, `generaluser`
- `permissions`: individual permissions such as `incident_tracker.view`
- `role_permissions`: mapping between roles and permissions
- `admin_users`: admin login users
- `employees`: employee records and employee-level role label in `employees.role`

## Important Rule

- Admin access is controlled by `admin_users.role_id`
- Employee access is controlled by `employees.role`
- For employee login, the app currently treats:
  - `Team Member` as limited access
  - `Team Lead` as limited access
  - any other employee role as full access

## RBAC Roles And Access

| Role | Access Level | Permission Names |
| --- | --- | --- |
| `super_admin` | Full system access | All permission names in `permissions` |
| `admin` | Broad admin access | `dashboard.view`, `employees.view`, `employees.create`, `employees.update`, `employees.delete`, `projects.view`, `projects.create`, `projects.update`, `projects.delete`, `assets.view`, `assets.create`, `assets.update`, `assets.delete`, `invoices.view`, `invoices.create`, `pos.view`, `pos.create`, `pos.update`, `pos.delete`, `incident_tracker.view`, `incident_tracker.create`, `incident_tracker.update`, `incident_tracker.delete`, `incident_tracker.export`, `release_management.view`, `release_management.create`, `release_management.update`, `release_management.delete`, `release_management.export`, `sprint_kpi.view`, `sprint_kpi.create`, `sprint_kpi.update`, `sprint_kpi.delete` |
| `manager` | Operational access | `employees.view`, `employees.update`, `dashboard.view`, `audit_logs.view` |
| `viewer` | Read-only access | `employees.view`, `dashboard.view`, `audit_logs.view` |
| `generaluser` | Limited business access | `incident_tracker.view`, `release_management.view`, `sprint_kpi.view` |

### Employee Role Labels

| Employee Role Label | Effective Access |
| --- | --- |
| `Team Member` | Limited access to incident tracker, release management, and sprint KPI |
| `Team Lead` | Limited access to incident tracker, release management, and sprint KPI |
| Any other employee role | Full employee access, including projects |

## Inspect Current Access

### List all roles

```sql
SELECT id, name, display_name, description, is_system_role
FROM roles
ORDER BY id;
```

### List all permissions

```sql
SELECT id, module, action, name, description
FROM permissions
ORDER BY module, action;
```

### Show permissions for one role

```sql
SELECT r.name AS role_name, p.module, p.action, p.name AS permission_name
FROM roles r
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.name = 'generaluser'
ORDER BY p.module, p.action;
```

### Show an admin user with their role

```sql
SELECT au.id, au.username, au.email, au.full_name, au.status, r.name AS role_name, r.display_name
FROM admin_users au
LEFT JOIN roles r ON r.id = au.role_id
WHERE au.username = 'admin';
```

### Show an employee access profile

```sql
SELECT
  e.id,
  e.name,
  e.sso,
  e.role AS employee_role,
  CASE
    WHEN LOWER(TRIM(e.role)) IN ('team member', 'team lead') THEN 'LIMITED'
    ELSE 'FULL'
  END AS access_level
FROM employees e
WHERE e.id = 123;
```

## Admin User Queries

### Create or refresh the super admin role

```sql
INSERT INTO roles (name, display_name, description, is_system_role)
VALUES ('super_admin', 'Super Administrator', 'Full system access', TRUE)
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  is_system_role = VALUES(is_system_role);
```

### Grant all permissions to super admin

```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );
```

### Create an admin role assignment

```sql
UPDATE admin_users
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE username = 'example_admin';
```

### Promote an admin to super admin

```sql
UPDATE admin_users
SET role_id = (SELECT id FROM roles WHERE name = 'super_admin')
WHERE username = 'example_admin';
```

### Demote a super admin to admin

```sql
UPDATE admin_users
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE username = 'example_admin';
```

### Show admin users by role

```sql
SELECT r.name AS role_name, COUNT(*) AS user_count
FROM admin_users au
LEFT JOIN roles r ON r.id = au.role_id
GROUP BY r.name
ORDER BY user_count DESC;
```

### Create a new admin user

```sql
INSERT INTO admin_users (username, email, password_hash, full_name, status, role_id)
VALUES (
  'new_admin',
  'new_admin@example.com',
  '<bcrypt_password_hash>',
  'New Admin',
  'Active',
  (SELECT id FROM roles WHERE name = 'admin')
);
```

### Reset an admin password

```sql
UPDATE admin_users
SET password_hash = '<bcrypt_password_hash>'
WHERE username = 'example_admin';
```

### Disable an admin user

```sql
UPDATE admin_users
SET status = 'Inactive'
WHERE username = 'example_admin';
```

### Re-enable an admin user

```sql
UPDATE admin_users
SET status = 'Active'
WHERE username = 'example_admin';
```

## Role and Permission Management

### Create a custom role

```sql
INSERT INTO roles (name, display_name, description, is_system_role)
VALUES ('custom_role', 'Custom Role', 'Custom access profile', FALSE);
```

### Rename or update a role

```sql
UPDATE roles
SET display_name = 'Updated Name',
    description = 'Updated description'
WHERE name = 'custom_role';
```

### Grant one permission to a role

```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.name = 'generaluser'
  AND p.name = 'incident_tracker.view'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );
```

### Grant all permissions from a module to a role

```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.name = 'admin'
  AND p.module = 'release_management'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );
```

### Remove one permission from a role

```sql
DELETE rp
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.name = 'generaluser'
  AND p.name = 'projects.view';
```

### Copy permissions from one role to another

```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT target_role.id, rp.permission_id
FROM roles source_role
JOIN role_permissions rp ON rp.role_id = source_role.id
JOIN roles target_role
WHERE source_role.name = 'generaluser'
  AND target_role.name = 'viewer'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions existing
    WHERE existing.role_id = target_role.id
      AND existing.permission_id = rp.permission_id
  );
```

## General User Access

### Show current generaluser permissions

```sql
SELECT p.module, p.action, p.name
FROM roles r
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.name = 'generaluser'
ORDER BY p.module, p.action;
```

### Give generaluser incident, release, and sprint KPI view access

```sql
START TRANSACTION;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.name = 'generaluser'
  AND p.name IN (
    'incident_tracker.view',
    'release_management.view',
    'sprint_kpi.view'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );

COMMIT;
```

### Remove all non-view permissions from generaluser

```sql
START TRANSACTION;

DELETE rp
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.name = 'generaluser'
  AND p.module IN ('incident_tracker', 'release_management', 'sprint_kpi')
  AND p.action <> 'view';

COMMIT;
```

### Make generaluser read-only for one module only

```sql
START TRANSACTION;

DELETE rp
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.name = 'generaluser'
  AND p.module = 'release_management'
  AND p.action <> 'view';

COMMIT;
```

## Employee-Level Access

### Set an employee to Team Member

```sql
UPDATE employees
SET role = 'Team Member'
WHERE id = 123;
```

### Set an employee to Team Lead

```sql
UPDATE employees
SET role = 'Team Lead'
WHERE id = 123;
```

### Give an employee full access by assigning a non-limited role name

```sql
UPDATE employees
SET role = 'Developer'
WHERE id = 123;
```

### Bulk promote employees out of limited access

```sql
UPDATE employees
SET role = 'Developer'
WHERE role IN ('Team Member', 'Team Lead');
```

### Bulk set employees to limited access

```sql
UPDATE employees
SET role = 'Team Member'
WHERE id IN (123, 124, 125);
```

### Reset an employee password to Temp@1234

```sql
UPDATE employees
SET password_hash = '$2b$10$2M/kF0XYmTIc0zwyeFMqsOFWrBlfE73eaFadGJIumeqC4TdO.n9pO',
    must_change_password = 1,
    password_changed_at = NULL
WHERE id = 123;
```

### Mark employee as force-change-password after reset

```sql
UPDATE employees
SET must_change_password = 1
WHERE id = 123;
```

### Show employee effective access from the app rule

```sql
SELECT
  e.id,
  e.name,
  e.sso,
  e.role,
  CASE
    WHEN LOWER(TRIM(e.role)) IN ('team member', 'team lead') THEN 'LIMITED'
    ELSE 'FULL'
  END AS effective_access
FROM employees e
WHERE e.id = 123;
```

## Useful Operational Checks

### Check if a role exists before assigning it

```sql
SELECT id, name, display_name
FROM roles
WHERE name = 'super_admin';
```

### Check if a permission exists before granting it

```sql
SELECT id, module, action, name
FROM permissions
WHERE name = 'projects.view';
```

### Verify a user after changing access

```sql
SELECT id, username, role_id, status, last_login
FROM admin_users
WHERE username = 'example_admin';

SELECT id, name, sso, role
FROM employees
WHERE id = 123;
```

### Count employees by role label

```sql
SELECT role, COUNT(*) AS count
FROM employees
GROUP BY role
ORDER BY count DESC, role;
```

### Find employees without a role label

```sql
SELECT id, name, sso
FROM employees
WHERE role IS NULL OR TRIM(role) = '';
```

### Check whether a permission exists in a role before assigning it

```sql
SELECT EXISTS (
  SELECT 1
  FROM roles r
  JOIN role_permissions rp ON rp.role_id = r.id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE r.name = 'generaluser'
    AND p.name = 'incident_tracker.view'
) AS has_permission;
```

## Notes

- Changes to roles and permissions take effect after the user logs in again.
- If you change an employee role or admin role in the database, refresh or re-login to reload the token permissions.
- Prefer `START TRANSACTION` / `COMMIT` around grants and revokes.
- Keep `super_admin` reserved for full system access.
- If you need a different access policy for employee roles, update `employees.role` values first, then verify the effective access query above.
