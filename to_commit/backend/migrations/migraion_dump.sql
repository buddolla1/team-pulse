-- Existing-database migration dump.
-- This script assumes the required tables already exist.

-- 1) Seed / upsert common lookup values
INSERT INTO common_lookups (category, type_id, type_name, description, sort_order, is_active) VALUES
('Role Type', 'DEV', 'DEV', 'Development team member', 1, TRUE),
('Role Type', 'QA', 'QA', 'Quality Assurance team member', 2, TRUE),
('Role Type', 'Team Lead', 'Team Lead', 'Team Lead responsible for a team', 3, TRUE),
('Role Type', 'Manager', 'Manager', 'Manager overseeing multiple teams or projects', 4, TRUE)
ON DUPLICATE KEY UPDATE
  type_name = VALUES(type_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);

INSERT INTO common_lookups (category, type_id, type_name, description, sort_order, is_active) VALUES
('Attrition', 'No', 'No', 'Employee is not planning to leave', 1, TRUE),
('Attrition', 'Yes', 'Yes', 'Employee has confirmed departure', 2, TRUE),
('Attrition', 'At Risk', 'At Risk', 'Employee is at risk of leaving', 3, TRUE),
('Attrition', 'Gd', 'Gd', 'Gd', 4, TRUE),
('Attrition', 'St', 'St', 'St', 5, TRUE),
('Attrition', 'Gd- Working on BC2', 'Gd- Working on BC2', 'Gd- Working on BC2', 6, TRUE),
('Attrition', 'Below Avg', 'Below Avg', 'Below Avg', 7, TRUE),
('Attrition', 'High', 'High', 'High', 8, TRUE),
('Attrition', 'Gd- Working on NATE2', 'Gd- Working on NATE2', 'Gd- Working on NATE2', 9, TRUE),
('Attrition', 'Need to get back up', 'Need to get back up', 'Need to get back up', 10, TRUE)
ON DUPLICATE KEY UPDATE
  type_name = VALUES(type_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);

INSERT INTO common_lookups (category, type_id, type_name, description, sort_order, is_active) VALUES
('Work Location', 'Offshore', 'Offshore', 'Employee works from offshore location', 1, TRUE),
('Work Location', 'Onsite', 'Onsite', 'Employee works from onsite location', 2, TRUE)
ON DUPLICATE KEY UPDATE
  type_name = VALUES(type_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);

INSERT INTO common_lookups (category, type_id, type_name, description, sort_order, is_active) VALUES
('Criticality', 'Low', 'Low', 'Low criticality to the project', 1, TRUE),
('Criticality', 'Medium', 'Medium', 'Medium criticality to the project', 2, TRUE),
('Criticality', 'High', 'High', 'High criticality to the project', 3, TRUE),
('Criticality', 'Critical', 'Critical', 'Critical to project success', 4, TRUE)
ON DUPLICATE KEY UPDATE
  type_name = VALUES(type_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);

INSERT INTO common_lookups (category, type_id, type_name, description, sort_order, is_active) VALUES
('Status', 'Active', 'Active', 'Employee is currently active', 1, TRUE),
('Status', 'Inactive', 'Inactive', 'Employee is inactive', 2, TRUE),
('Status', 'On Leave', 'On Leave', 'Employee is on leave', 3, TRUE),
('Status', 'Terminated', 'Terminated', 'Employee has been terminated', 4, TRUE),
('Status', 'Closed', 'Closed', 'Closed', 5, TRUE),
('Status', 'Exit', 'Exit', 'Exit', 6, TRUE),
('Status', 'Hold', 'Hold', 'Hold', 7, TRUE),
('Status', 'Left the Team', 'Left the Team', 'Left the Team', 8, TRUE),
('Status', 'Resinged', 'Resinged', 'Resinged', 9, TRUE),
('Status', 'Absconded', 'Absconded', 'Absconded', 10, TRUE),
('Status', 'Active-R', 'Active-R', 'Active-R', 11, TRUE),
('Status', 'Active-R [Maternity Leave]', 'Active-R [Maternity Leave]', 'Active-R [Maternity Leave]', 12, TRUE)
ON DUPLICATE KEY UPDATE
  type_name = VALUES(type_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);

INSERT INTO common_lookups (category, type_id, type_name, description, sort_order, is_active) VALUES
('Visa Type', 'None', 'None', 'No visa required', 1, TRUE),
('Visa Type', 'H1B', 'H1B', 'H1B work visa', 2, TRUE),
('Visa Type', 'L1', 'L1', 'L1 intracompany transfer visa', 3, TRUE),
('Visa Type', 'L2', 'L2', 'L2 dependent visa', 4, TRUE),
('Visa Type', 'Green Card', 'Green Card', 'Permanent resident card', 5, TRUE),
('Visa Type', 'US Citizen', 'US Citizen', 'United States citizen', 6, TRUE),
('Visa Type', 'Other', 'Other', 'Other visa type', 7, TRUE)
ON DUPLICATE KEY UPDATE
  type_name = VALUES(type_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);

INSERT INTO common_lookups (category, type_id, type_name, description, sort_order, is_active) VALUES
('Project Status', 'Active', 'Active', 'Project is currently active', 1, TRUE),
('Project Status', 'On Hold', 'On Hold', 'Project is on hold', 2, TRUE),
('Project Status', 'Completed', 'Completed', 'Project has been completed', 3, TRUE),
('Project Status', 'Cancelled', 'Cancelled', 'Project has been cancelled', 4, TRUE)
ON DUPLICATE KEY UPDATE
  type_name = VALUES(type_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);

INSERT INTO common_lookups (category, type_id, type_name, description, sort_order, is_active) VALUES
('Asset Type', 'Laptop', 'Laptop', 'Laptop computer', 1, TRUE),
('Asset Type', 'Desktop', 'Desktop', 'Desktop computer', 2, TRUE),
('Asset Type', 'Monitor', 'Monitor', 'Computer monitor/display', 3, TRUE),
('Asset Type', 'Keyboard', 'Keyboard', 'Computer keyboard', 4, TRUE),
('Asset Type', 'Mouse', 'Mouse', 'Computer mouse', 5, TRUE),
('Asset Type', 'Headset', 'Headset', 'Headset/headphones', 6, TRUE),
('Asset Type', 'Phone', 'Phone', 'Mobile phone', 7, TRUE),
('Asset Type', 'Tablet', 'Tablet', 'Tablet device', 8, TRUE),
('Asset Type', 'Dock', 'Dock', 'Docking station', 9, TRUE),
('Asset Type', 'Other', 'Other', 'Other asset type', 10, TRUE)
ON DUPLICATE KEY UPDATE
  type_name = VALUES(type_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);

INSERT INTO common_lookups (category, type_id, type_name, description, sort_order, is_active) VALUES
('Asset Status', 'Available', 'Available', 'Asset is available for assignment', 1, TRUE),
('Asset Status', 'Assigned', 'Assigned', 'Asset is currently assigned to an employee', 2, TRUE),
('Asset Status', 'Returned', 'Returned', 'Asset has been returned and is ready for review', 3, TRUE),
('Asset Status', 'Under Repair', 'Under Repair', 'Asset is being repaired', 4, TRUE),
('Asset Status', 'Retired', 'Retired', 'Asset has been retired from service', 5, TRUE),
('Asset Status', 'Lost', 'Lost', 'Asset has been lost', 6, TRUE)
ON DUPLICATE KEY UPDATE
  type_name = VALUES(type_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);

INSERT INTO common_lookups (category, type_id, type_name, description, sort_order, is_active) VALUES
('Invoice Status', 'Draft', 'Draft', 'Invoice is in draft state', 1, TRUE),
('Invoice Status', 'Pending', 'Pending', 'Invoice is pending approval', 2, TRUE),
('Invoice Status', 'Approved', 'Approved', 'Invoice has been approved', 3, TRUE),
('Invoice Status', 'Paid', 'Paid', 'Invoice has been paid', 4, TRUE),
('Invoice Status', 'Cancelled', 'Cancelled', 'Invoice has been cancelled', 5, TRUE)
ON DUPLICATE KEY UPDATE
  type_name = VALUES(type_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);

-- 2) Asset table schema adjustment
ALTER TABLE assets
MODIFY status ENUM('Available', 'Assigned', 'Returned', 'Under Repair', 'Retired', 'Lost')
DEFAULT 'Available'
COMMENT 'Current status of the asset';

-- 3) Permission rows
INSERT INTO permissions (module, action, name, description) VALUES
('assets', 'view', 'assets.view', 'View assets'),
('assets', 'create', 'assets.create', 'Create new assets'),
('assets', 'update', 'assets.update', 'Update existing assets'),
('assets', 'delete', 'assets.delete', 'Delete assets'),
('assets', 'assign', 'assets.assign', 'Assign assets to employees'),
('assets', 'export', 'assets.export', 'Export assets to Excel')
ON DUPLICATE KEY UPDATE module = module;

-- 4) Role-to-permission mapping
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
  AND p.module = 'assets'
ON DUPLICATE KEY UPDATE role_id = role_id;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.module = 'assets'
  AND p.action IN ('view', 'create', 'update', 'delete', 'assign', 'export')
ON DUPLICATE KEY UPDATE role_id = role_id;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager'
  AND p.module = 'assets'
  AND p.action IN ('view', 'create', 'update', 'delete', 'assign', 'export')
ON DUPLICATE KEY UPDATE role_id = role_id;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'viewer'
  AND p.module = 'assets'
  AND p.action = 'view'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 5) Existing-db backfill for delete permission and manager permissions
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
