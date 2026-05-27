USE employee_management;

-- Remove duplicate leave requests, keeping the oldest row for each unique leave period.
DELETE lt1
FROM leave_tracker_leaves lt1
INNER JOIN leave_tracker_leaves lt2
  ON lt1.user_type = lt2.user_type
 AND lt1.user_id = lt2.user_id
 AND lt1.start_date = lt2.start_date
 AND lt1.end_date = lt2.end_date
 AND lt1.leaves_applied = lt2.leaves_applied
 AND lt1.id > lt2.id;

-- Enforce uniqueness at the database layer.
ALTER TABLE leave_tracker_leaves
  ADD UNIQUE KEY uniq_lt_user_leave_period (user_type, user_id, start_date, end_date, leaves_applied);
