USE employee_management;

ALTER TABLE leave_tracker_leaves
  ADD COLUMN sso VARCHAR(100) NULL AFTER user_id;

ALTER TABLE leave_tracker_leaves
  ADD COLUMN status ENUM('Applied', 'Not Taken', 'Revoked') NOT NULL DEFAULT 'Applied' AFTER leaves_applied;

CREATE INDEX idx_lt_sso ON leave_tracker_leaves (sso);
CREATE INDEX idx_lt_status ON leave_tracker_leaves (status);
