# Access Management Queries

This file collects the common insert and update statements for roles, permissions, employees, and admin users.

Important:

- Admin access is driven by `roles`, `permissions`, and `role_permissions`.
- Employee login access is also controlled by `backend/utils/employeeAccess.js`.
- Updating the database alone does not change employee runtime permissions unless the backend helper is updated too.

## 1. Roles

Create a role:

```sql
INSERT INTO roles (name, display_name, description, is_system_role)
VALUES ('manager', 'Manager', 'Can view and manage employees, limited administrative functions', TRUE);
```

Update a role:

```sql
UPDATE roles
SET display_name = 'Manager',
    description = 'Can view and manage employees and selected modules',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'manager';
```

Delete a role:

```sql
DELETE FROM roles
WHERE name = 'manager';
```

## 2. Permissions

Create a permission:

```sql
INSERT INTO permissions (module, action, name, description)
VALUES ('admin_users', 'change_password', 'admin_users.change_password', 'Change admin user passwords');
```

Update a permission:

```sql
UPDATE permissions
SET description = 'Change admin user passwords'
WHERE name = 'admin_users.change_password';
```

Delete a permission:

```sql
DELETE FROM permissions
WHERE name = 'admin_users.change_password';
```

## 3. Role Permissions

Grant a permission to a role:

```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.name = 'generaluser'
  AND p.name = 'release_management.update'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );
```

Grant manager access to change admin passwords:

```sql
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
```

Remove a permission from a role:

```sql
DELETE rp
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.name = 'generaluser'
  AND p.name = 'release_management.update';
```

Replace all permissions for a role:

```sql
DELETE rp
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE r.name = 'generaluser';
```

## 4. Admin Users

Create an admin user:

```sql
INSERT INTO admin_users (username, email, password_hash, full_name, status, role_id)
VALUES ('admin2', 'admin2@example.com', '$2b$10$HASH_HERE', 'Admin User 2', 'Active', 2);
```

Update an admin user:

```sql
UPDATE admin_users
SET email = 'admin2@example.com',
    full_name = 'Admin User 2',
    status = 'Active',
    role_id = 2,
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin2';
```

Change admin password:

```sql
UPDATE admin_users
SET password_hash = '$2b$10$HASH_HERE',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin2';
```

Deactivate or reactivate an admin:

```sql
UPDATE admin_users
SET status = 'Inactive',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin2';
```

## 5. Employees

Create an employee:

```sql
INSERT INTO employees (password_hash, must_change_password, role_id, name, role, role_type, status, created_at, updated_at)
VALUES ('$2b$10$HASH_HERE', 1, 6, 'New Employee', 'Team Member', 'DEV', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

Update employee role or status:

```sql
UPDATE employees
SET role_id = 6,
    role = 'Team Lead',
    role_type = 'DEV',
    status = 'Active',
    updated_at = CURRENT_TIMESTAMP
WHERE id = <employee_id>;
```

Change employee password:

```sql
UPDATE employees
SET password_hash = '$2b$10$HASH_HERE',
    must_change_password = 0,
    password_changed_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = <employee_id>;
```

Force a password reset on next login:

```sql
UPDATE employees
SET password_hash = '$2b$10$TEMP_HASH_HERE',
    must_change_password = 1,
    password_changed_at = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE id = <employee_id>;
```

Deactivate or reactivate an employee:

```sql
UPDATE employees
SET status = 'Inactive',
    updated_at = CURRENT_TIMESTAMP
WHERE id = <employee_id>;
```

## 6. Employee Runtime Access

Employee login permissions are returned by the backend helper:

- `backend/utils/employeeAccess.js`

Current behavior:

- `Team Member` and `Team Lead` are treated as limited employee roles.
- The helper returns the permissions array that the frontend stores in `employeePermissions`.
- If you change the helper, restart the backend so the new permissions are returned on login.

If you want every employee to have full Sprint KPI access, update the helper and frontend permission constants so the same permission set is used everywhere.

## 7. Password Hash Generation

Generate a bcrypt hash from a password:

```bash
cd backend
node scripts/passwordTool.js hash 'yourPasswordHere'
```

Verify a password against a hash:

```bash
cd backend
node scripts/passwordTool.js verify 'yourPasswordHere' '$2b$10$...'
```

Default passwords used in this repo:

- Admin login: `admin123`
- Employee reset password: `Temp@1234`
