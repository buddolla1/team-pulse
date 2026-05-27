CREATE DATABASE IF NOT EXISTS employee_management;
USE employee_management;

-- Leave Tracker tables for employee and admin leave applications.
-- No seed data and no workflow tables.
DROP TABLE IF EXISTS leave_tracker_leaves;

CREATE TABLE leave_tracker_leaves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leave_request_id VARCHAR(50) NOT NULL UNIQUE,
  user_type ENUM('admin', 'employee') NOT NULL,
  user_id INT NOT NULL,
  sso VARCHAR(100) NULL,
  user_name VARCHAR(100) NOT NULL,
  role_name VARCHAR(100) NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  no_of_days DECIMAL(5, 2) NOT NULL,
  leaves_applied VARCHAR(100) NOT NULL,
  status ENUM('Planned', 'Applied', 'Not Taken', 'Revoked') NOT NULL DEFAULT 'Planned',
  comments TEXT NULL,
  created_by VARCHAR(100) NOT NULL,
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_lt_request_id (leave_request_id),
  INDEX idx_lt_user (user_type, user_id),
  INDEX idx_lt_sso (sso),
  INDEX idx_lt_start_date (start_date),
  INDEX idx_lt_end_date (end_date),
  INDEX idx_lt_leave_type (leaves_applied),
  INDEX idx_lt_status (status),
  INDEX idx_lt_status_date (status, created_date),
  INDEX idx_lt_user_status (user_type, user_id, status),
  INDEX idx_lt_created_by (created_by),
  UNIQUE KEY uniq_lt_user_leave_period (user_type, user_id, start_date, end_date, leaves_applied)
);
