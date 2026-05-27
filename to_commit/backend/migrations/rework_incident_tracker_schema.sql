-- Upgrade the legacy incident tracker schema to the new incident model.
-- This script is intended for databases that already have the old incident tables.

ALTER TABLE incident_tracker_incidents
  MODIFY COLUMN incident_id VARCHAR(50) NOT NULL,
  MODIFY COLUMN change_request_id VARCHAR(50) NOT NULL,
  MODIFY COLUMN incident_month VARCHAR(20) NOT NULL,
  MODIFY COLUMN incident_description TEXT NOT NULL,
  MODIFY COLUMN program_manager VARCHAR(100) NOT NULL,
  MODIFY COLUMN requirement_gathering ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  ADD COLUMN IF NOT EXISTS application_name VARCHAR(100) NULL AFTER program_manager,
  ADD COLUMN IF NOT EXISTS agile_team VARCHAR(100) NULL AFTER application_name,
  ADD COLUMN IF NOT EXISTS issue_stage ENUM('Pre-Deployment', 'Post-Deployment') NULL AFTER agile_team,
  ADD COLUMN IF NOT EXISTS severity ENUM('P1', 'P2', 'P3', 'P4') NULL AFTER issue_stage,
  ADD COLUMN IF NOT EXISTS environment ENUM('DEV', 'UAT', 'QA', 'PROD') NULL AFTER severity,
  ADD COLUMN IF NOT EXISTS explanation TEXT NULL AFTER environment,
  ADD COLUMN IF NOT EXISTS developer VARCHAR(100) NULL AFTER explanation,
  MODIFY COLUMN test_case_review ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  MODIFY COLUMN pre_deployment_verification ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  MODIFY COLUMN post_deployment_verification ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  MODIFY COLUMN status ENUM('Open', 'In Progress', 'Closed') NOT NULL DEFAULT 'Open',
  MODIFY COLUMN created_by VARCHAR(100) NOT NULL,
  ADD COLUMN IF NOT EXISTS impact_analysis ENUM('Yes', 'No') NOT NULL DEFAULT 'No' AFTER requirement_gathering,
  ADD COLUMN IF NOT EXISTS design_review ENUM('Yes', 'No') NOT NULL DEFAULT 'No' AFTER impact_analysis,
  ADD COLUMN IF NOT EXISTS development_completed ENUM('Yes', 'No') NOT NULL DEFAULT 'No' AFTER design_review,
  ADD COLUMN IF NOT EXISTS unit_testing_completed ENUM('Yes', 'No') NOT NULL DEFAULT 'No' AFTER development_completed,
  ADD COLUMN IF NOT EXISTS code_review_completed ENUM('Yes', 'No') NOT NULL DEFAULT 'No' AFTER unit_testing_completed,
  ADD COLUMN IF NOT EXISTS test_case_preparation ENUM('Yes', 'No') NOT NULL DEFAULT 'No' AFTER code_review_completed,
  ADD COLUMN IF NOT EXISTS testing_completed ENUM('Yes', 'No') NOT NULL DEFAULT 'No' AFTER test_case_review,
  ADD COLUMN IF NOT EXISTS corrective_action TEXT NULL AFTER rca_details,
  ADD COLUMN IF NOT EXISTS preventive_action TEXT NULL AFTER corrective_action,
  ADD COLUMN IF NOT EXISTS created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER created_by,
  ADD COLUMN IF NOT EXISTS updated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_date;

UPDATE incident_tracker_incidents
SET
  application_name = COALESCE(NULLIF(application_name, ''), NULLIF(application_agile_team, '')),
  agile_team = COALESCE(NULLIF(agile_team, ''), NULLIF(application_agile_team, '')),
  issue_stage = COALESCE(issue_stage,
    CASE
      WHEN deployment_type = 'Deployment' THEN 'Pre-Deployment'
      WHEN deployment_type = 'PostDeployment' THEN 'Post-Deployment'
      ELSE NULL
    END),
  severity = COALESCE(severity,
    CASE
      WHEN priority = 'Critical' THEN 'P1'
      WHEN priority = 'High' THEN 'P2'
      WHEN priority = 'Medium' THEN 'P3'
      WHEN priority = 'Low' THEN 'P4'
      ELSE NULL
    END),
  environment = COALESCE(environment, 'PROD'),
  explanation = COALESCE(NULLIF(explanation, ''), NULLIF(explanation_developer, '')),
  developer = COALESCE(NULLIF(developer, ''), NULLIF(resp_member, '')),
  impact_analysis = CASE
    WHEN impact_analysis IN ('Yes', 'No') THEN impact_analysis
    WHEN impact_analysis_design = 1 THEN 'Yes'
    ELSE 'No'
  END,
  design_review = CASE
    WHEN design_review IN ('Yes', 'No') THEN design_review
    ELSE 'No'
  END,
  development_completed = CASE
    WHEN development_completed IN ('Yes', 'No') THEN development_completed
    WHEN development_unit_testing = 1 THEN 'Yes'
    ELSE 'No'
  END,
  unit_testing_completed = CASE
    WHEN unit_testing_completed IN ('Yes', 'No') THEN unit_testing_completed
    ELSE 'No'
  END,
  code_review_completed = CASE
    WHEN code_review_completed IN ('Yes', 'No') THEN code_review_completed
    WHEN code_review_test_case_preparation = 1 THEN 'Yes'
    ELSE 'No'
  END,
  test_case_preparation = CASE
    WHEN test_case_preparation IN ('Yes', 'No') THEN test_case_preparation
    ELSE 'No'
  END,
  testing_completed = CASE
    WHEN testing_completed IN ('Yes', 'No') THEN testing_completed
    WHEN testing = 1 THEN 'Yes'
    ELSE 'No'
  END,
  corrective_action = COALESCE(NULLIF(corrective_action, ''), NULLIF(action, '')),
  preventive_action = COALESCE(NULLIF(preventive_action, ''), NULL),
  created_by = COALESCE(NULLIF(created_by, ''), 'System Administrator');

UPDATE incident_tracker_incidents
SET status = 'In Progress'
WHERE status = 'Pending RCA Approval';
