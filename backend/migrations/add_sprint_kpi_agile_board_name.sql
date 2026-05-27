-- Add board visibility to sprint KPI stories and entries

ALTER TABLE sprint_kpi_stories
  ADD COLUMN agile_board_name VARCHAR(255) DEFAULT NULL AFTER project_id;

ALTER TABLE sprint_kpi_entries
  ADD COLUMN agile_board_name VARCHAR(255) DEFAULT NULL AFTER comments;

CREATE INDEX idx_story_board ON sprint_kpi_stories (agile_board_name);
CREATE INDEX idx_entry_board ON sprint_kpi_entries (agile_board_name);

UPDATE sprint_kpi_stories s
SET s.agile_board_name = (
  SELECT pt.agile_board_name
  FROM project_teams pt
  WHERE pt.project_id = s.project_id
  ORDER BY pt.id ASC
  LIMIT 1
)
WHERE s.agile_board_name IS NULL OR s.agile_board_name = '';

UPDATE sprint_kpi_entries e
INNER JOIN sprint_kpi_stories s ON s.id = e.story_id
SET e.agile_board_name = COALESCE(NULLIF(e.agile_board_name, ''), s.agile_board_name)
WHERE e.agile_board_name IS NULL OR e.agile_board_name = '';

