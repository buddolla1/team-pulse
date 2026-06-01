ALTER TABLE incident_tracker_incidents
MODIFY COLUMN rca_category ENUM('Code-Issue', 'Requirement-Gap', 'Process-Gap') NOT NULL;