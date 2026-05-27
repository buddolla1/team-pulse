CREATE DATABASE IF NOT EXISTS employee_management;
USE employee_management;

-- Incident Tracker schema recreation script.
-- Creates the tables only. No seed data, no truncation, no upgrade logic.

CREATE TABLE IF NOT EXISTS incident_tracker_incidents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incident_id VARCHAR(50) NOT NULL UNIQUE,
  change_request_id VARCHAR(50) NOT NULL,
  incident_date DATE NOT NULL,
  incident_month VARCHAR(20) NOT NULL,
  incident_description TEXT NOT NULL,
  program_manager VARCHAR(100) NOT NULL,
  application_name VARCHAR(100) NOT NULL,
  agile_team VARCHAR(100) NOT NULL,
  issue_stage ENUM('Pre-Deployment', 'Post-Deployment') NOT NULL,
  severity ENUM('P1', 'P2', 'P3', 'P4') NOT NULL,
  environment ENUM('DEV', 'UAT', 'QA', 'PROD') NOT NULL,
  explanation TEXT NOT NULL,
  developer VARCHAR(100) NOT NULL,
  tech_lead VARCHAR(100) NOT NULL,
  tester VARCHAR(100) NOT NULL,
  test_lead VARCHAR(100) NOT NULL,
  requirement_gathering ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  impact_analysis ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  design_review ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  development_completed ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  unit_testing_completed ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  code_review_completed ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  test_case_preparation ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  test_case_review ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  testing_completed ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  pre_deployment_verification ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  post_deployment_verification ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
  rca_category VARCHAR(100) NOT NULL,
  rca_details TEXT NULL,
  corrective_action TEXT NULL,
  preventive_action TEXT NULL,
  status ENUM('Open', 'In Progress', 'Closed') NOT NULL DEFAULT 'Open',
  created_by VARCHAR(100) NOT NULL,
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_it_incident_month (incident_month),
  INDEX idx_it_status (status),
  INDEX idx_it_agile_team (agile_team),
  INDEX idx_it_application_name (application_name),
  INDEX idx_it_severity (severity),
  INDEX idx_it_environment (environment),
  INDEX idx_it_rca_category (rca_category),
  INDEX idx_it_incident_created_by (created_by)
);

CREATE TABLE IF NOT EXISTS incident_tracker_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incident_id INT NOT NULL,
  user_id INT NOT NULL,
  body TEXT NOT NULL,
  created_by INT NOT NULL,
  updated_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_it_comments_incident FOREIGN KEY (incident_id) REFERENCES incident_tracker_incidents(id) ON DELETE CASCADE,
  CONSTRAINT fk_it_comments_user FOREIGN KEY (user_id) REFERENCES admin_users(id),
  CONSTRAINT fk_it_comments_created_by FOREIGN KEY (created_by) REFERENCES admin_users(id),
  CONSTRAINT fk_it_comments_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS incident_tracker_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incident_id INT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INT NOT NULL,
  uploaded_by INT NOT NULL,
  created_by INT NOT NULL,
  updated_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_it_attachments_incident FOREIGN KEY (incident_id) REFERENCES incident_tracker_incidents(id) ON DELETE CASCADE,
  CONSTRAINT fk_it_attachments_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES admin_users(id),
  CONSTRAINT fk_it_attachments_created_by FOREIGN KEY (created_by) REFERENCES admin_users(id),
  CONSTRAINT fk_it_attachments_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS incident_tracker_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  incident_id INT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_by INT NOT NULL,
  updated_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_it_notifications_user FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_it_notifications_incident FOREIGN KEY (incident_id) REFERENCES incident_tracker_incidents(id) ON DELETE SET NULL,
  CONSTRAINT fk_it_notifications_created_by FOREIGN KEY (created_by) REFERENCES admin_users(id),
  CONSTRAINT fk_it_notifications_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS incident_tracker_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incident_id INT NOT NULL,
  user_id INT NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  action_details TEXT NOT NULL,
  created_by INT NOT NULL,
  updated_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_it_activity_incident FOREIGN KEY (incident_id) REFERENCES incident_tracker_incidents(id) ON DELETE CASCADE,
  CONSTRAINT fk_it_activity_user FOREIGN KEY (user_id) REFERENCES admin_users(id),
  CONSTRAINT fk_it_activity_created_by FOREIGN KEY (created_by) REFERENCES admin_users(id),
  CONSTRAINT fk_it_activity_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users(id)
);
