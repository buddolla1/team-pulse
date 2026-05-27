-- Sprint KPI module schema and permissions

CREATE TABLE IF NOT EXISTS sprint_kpi_sprints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  agile_board_name VARCHAR(255) NOT NULL,
  sprint_start_date DATE NOT NULL,
  sprint_end_date DATE NOT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_project_board_sprint (project_id, agile_board_name, sprint_start_date, sprint_end_date),
  INDEX idx_project_id (project_id),
  INDEX idx_board_start_date (agile_board_name, sprint_start_date),
  CONSTRAINT fk_sprint_kpi_sprints_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sprint_kpi_stories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sprint_id INT NOT NULL,
  project_id INT NOT NULL,
  agile_board_name VARCHAR(255) DEFAULT NULL,
  story_id VARCHAR(100) NOT NULL,
  story_name VARCHAR(255) NOT NULL,
  description TEXT,
  applicable_kpi_category VARCHAR(50),
  applicable_kpis TEXT,
  created_by INT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_sprint_story (sprint_id, story_id),
  INDEX idx_sprint_id (sprint_id),
  INDEX idx_project_id (project_id),
  INDEX idx_story_board (agile_board_name),
  CONSTRAINT fk_sprint_kpi_stories_sprint
    FOREIGN KEY (sprint_id) REFERENCES sprint_kpi_sprints(id) ON DELETE CASCADE,
  CONSTRAINT fk_sprint_kpi_stories_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sprint_kpi_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  story_id INT NOT NULL,
  sprint_id INT NOT NULL,
  kpi_category ENUM('Build', 'QE', 'Release', 'Post Release') NOT NULL,
  kpi_subcategory VARCHAR(100) NOT NULL,
  kpi_option VARCHAR(100) NOT NULL,
  percentage INT NOT NULL DEFAULT 0,
  comments TEXT,
  agile_board_name VARCHAR(255) DEFAULT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_story_kpi (story_id, kpi_category, kpi_subcategory, kpi_option),
  INDEX idx_story_id (story_id),
  INDEX idx_sprint_id (sprint_id),
  INDEX idx_entry_board (agile_board_name),
  CONSTRAINT fk_sprint_kpi_entries_sprint
    FOREIGN KEY (sprint_id) REFERENCES sprint_kpi_sprints(id) ON DELETE CASCADE,
  CONSTRAINT fk_sprint_kpi_entries_story
    FOREIGN KEY (story_id) REFERENCES sprint_kpi_stories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO permissions (module, action, name, description) VALUES
('sprint_kpi', 'view', 'sprint_kpi.view', 'View sprint KPI stories and KPI entries'),
('sprint_kpi', 'create', 'sprint_kpi.create', 'Create sprint KPI stories and KPI entries'),
('sprint_kpi', 'update', 'sprint_kpi.update', 'Update sprint KPI stories and KPI entries'),
('sprint_kpi', 'delete', 'sprint_kpi.delete', 'Delete sprint KPI stories and KPI entries')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'admin', 'generaluser')
  AND p.module = 'sprint_kpi'
ON DUPLICATE KEY UPDATE role_id = role_id;
