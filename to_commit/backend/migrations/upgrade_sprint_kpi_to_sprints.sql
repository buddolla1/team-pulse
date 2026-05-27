-- Upgrade sprint KPI module to sprint-scoped stories and KPI entries

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

ALTER TABLE sprint_kpi_stories
  ADD COLUMN sprint_id INT NULL AFTER id;

ALTER TABLE sprint_kpi_entries
  ADD COLUMN sprint_id INT NULL AFTER story_id;

ALTER TABLE sprint_kpi_entries
  MODIFY COLUMN kpi_category ENUM('Dev', 'QA', 'Build', 'QE', 'Release', 'Post Release') NOT NULL;

INSERT INTO sprint_kpi_sprints (project_id, agile_board_name, sprint_start_date, sprint_end_date, created_at, updated_at)
SELECT DISTINCT
  s.project_id,
  COALESCE(NULLIF(s.agile_board_name, ''), p.project_team_name) AS agile_board_name,
  DATE_FORMAT(MIN(s.created_at), '%Y-%m-01') AS sprint_start_date,
  LAST_DAY(MIN(s.created_at)) AS sprint_end_date,
  MIN(s.created_at) AS created_at,
  MAX(s.updated_at) AS updated_at
FROM sprint_kpi_stories s
LEFT JOIN projects p ON p.id = s.project_id
GROUP BY
  s.project_id,
  COALESCE(NULLIF(s.agile_board_name, ''), p.project_team_name),
  DATE_FORMAT(s.created_at, '%Y-%m');

UPDATE sprint_kpi_stories s
INNER JOIN sprint_kpi_sprints sp
  ON sp.project_id = s.project_id
 AND sp.agile_board_name = COALESCE(NULLIF(s.agile_board_name, ''), (
   SELECT p.project_team_name
   FROM projects p
   WHERE p.id = s.project_id
   LIMIT 1
 ))
 AND DATE(s.created_at) BETWEEN sp.sprint_start_date AND sp.sprint_end_date
SET s.sprint_id = sp.id;

UPDATE sprint_kpi_entries e
INNER JOIN sprint_kpi_stories s ON s.id = e.story_id
SET e.sprint_id = s.sprint_id,
    e.agile_board_name = COALESCE(NULLIF(e.agile_board_name, ''), s.agile_board_name)
WHERE e.sprint_id IS NULL;

UPDATE sprint_kpi_entries
SET kpi_category = 'Build'
WHERE kpi_category = 'Dev';

UPDATE sprint_kpi_entries
SET kpi_category = 'QE'
WHERE kpi_category = 'QA';

ALTER TABLE sprint_kpi_entries
  MODIFY COLUMN kpi_category ENUM('Build', 'QE', 'Release', 'Post Release') NOT NULL;

ALTER TABLE sprint_kpi_stories
  MODIFY COLUMN sprint_id INT NOT NULL,
  DROP INDEX unique_project_story,
  ADD UNIQUE KEY unique_sprint_story (sprint_id, story_id),
  ADD INDEX idx_sprint_id (sprint_id),
  ADD CONSTRAINT fk_sprint_kpi_stories_sprint FOREIGN KEY (sprint_id) REFERENCES sprint_kpi_sprints(id) ON DELETE CASCADE;

ALTER TABLE sprint_kpi_entries
  MODIFY COLUMN sprint_id INT NOT NULL,
  ADD INDEX idx_sprint_id (sprint_id),
  ADD CONSTRAINT fk_sprint_kpi_entries_sprint FOREIGN KEY (sprint_id) REFERENCES sprint_kpi_sprints(id) ON DELETE CASCADE;
