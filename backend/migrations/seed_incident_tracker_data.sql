CREATE DATABASE IF NOT EXISTS employee_management;
USE employee_management;

-- Seed data for the Incident Tracker module merged into the BSL backend.
-- This script uses existing BSL admin_users for ownership instead of the
-- standalone incident_tracker.users table.

SET @it_admin_id := COALESCE(
  (SELECT id FROM admin_users WHERE username = 'admin' LIMIT 1),
  (SELECT MIN(id) FROM admin_users WHERE status = 'Active')
);

SET @it_manager_id := COALESCE(
  (SELECT id FROM admin_users WHERE username = 'manager-user' LIMIT 1),
  @it_admin_id
);

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE incident_tracker_activity_logs;
TRUNCATE TABLE incident_tracker_notifications;
TRUNCATE TABLE incident_tracker_attachments;
TRUNCATE TABLE incident_tracker_comments;
TRUNCATE TABLE incident_tracker_incidents;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO incident_tracker_incidents (
  id, incident_id, change_request_id, incident_date, incident_month, incident_description,
  program_manager, application_name, agile_team, issue_stage, severity, environment,
  explanation, developer, tech_lead, tester, test_lead,
  requirement_gathering, impact_analysis, design_review, development_completed,
  unit_testing_completed, code_review_completed, test_case_preparation,
  test_case_review, testing_completed, pre_deployment_verification,
  post_deployment_verification, rca_category, rca_details, corrective_action,
  preventive_action, status, created_by, created_date, updated_date
) VALUES
  (
    1, 'INC-2026-001', 'CR-9001', '2026-05-03', '2026-05',
    'Checkout service returned 500 responses after deployment.',
    'Maya Patel', 'Checkout Service', 'Checkout', 'Post-Deployment', 'P1', 'PROD',
    'Regression in payment token validation', 'Arjun Rao', 'Lina Scott', 'Noah Kim', 'Chris Lee',
    'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'No',
    'Code Defect', 'Validation branch missed null token fallback for legacy carts.',
    'Add regression tests and tighten release checklist.',
    'Add automated release gate checks.', 'Closed',
    'System Administrator', '2026-05-21 00:00:00', '2026-05-21 00:00:00'
  ),
  (
    2, 'INC-2026-002', 'CR-9007', '2026-05-11', '2026-05',
    'Delayed downstream sync after post-deployment database patch.',
    'Maya Patel', 'Platform Gateway', 'Platform', 'Post-Deployment', 'P2', 'UAT',
    'Batch job not replayed after rollback', 'Nina Brooks', 'Oliver Mason', 'Ella Stone', 'Victor Chen',
    'Yes', 'Yes', 'Yes', 'Yes', 'No', 'No', 'Yes', 'No', 'No', 'Yes', 'Yes',
    'Process Gap', 'Rollback validation did not include batch replay verification.',
    'Add rollback readiness checks and owner signoff.',
    'Automate rollback replay verification.', 'In Progress',
    'Manager User', '2026-05-21 00:00:00', '2026-05-21 00:00:00'
  );

INSERT INTO incident_tracker_comments (
  incident_id, user_id, body, created_by, updated_by, created_at, updated_at
) VALUES
  (1, @it_admin_id, 'RCA approved after production validation review.', @it_admin_id, @it_admin_id, '2026-05-21 00:00:00', '2026-05-21 00:00:00'),
  (2, @it_manager_id, 'Awaiting final signoff from platform release lead.', @it_manager_id, @it_manager_id, '2026-05-21 00:00:00', '2026-05-21 00:00:00');

INSERT INTO incident_tracker_activity_logs (
  incident_id, user_id, action_type, action_details, created_by, updated_by, created_at, updated_at
) VALUES
  (1, @it_admin_id, 'INCIDENT_CREATED', 'Created incident INC-2026-001', @it_admin_id, @it_admin_id, '2026-05-21 00:00:00', '2026-05-21 00:00:00'),
  (2, @it_manager_id, 'INCIDENT_CREATED', 'Created incident INC-2026-002', @it_manager_id, @it_manager_id, '2026-05-21 00:00:00', '2026-05-21 00:00:00');
