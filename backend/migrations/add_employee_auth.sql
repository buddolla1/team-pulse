ALTER TABLE employees
  ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL AFTER sso,
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1 AFTER password_hash,
  ADD COLUMN password_changed_at TIMESTAMP NULL DEFAULT NULL AFTER must_change_password,
  ADD COLUMN last_login TIMESTAMP NULL DEFAULT NULL AFTER password_changed_at;

UPDATE employees
SET password_hash = '$2b$10$2M/kF0XYmTIc0zwyeFMqsOFWrBlfE73eaFadGJIumeqC4TdO.n9pO',
    must_change_password = 1
WHERE password_hash IS NULL OR password_hash = '';
