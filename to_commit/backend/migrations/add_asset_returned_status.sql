-- Add Returned to the asset status enum for existing databases.

ALTER TABLE assets
MODIFY status ENUM('Available', 'Assigned', 'Returned', 'Under Repair', 'Retired', 'Lost')
DEFAULT 'Available'
COMMENT 'Current status of the asset';

INSERT INTO common_lookups (category, type_id, type_name, description, sort_order, is_active)
VALUES ('Asset Status', 'Returned', 'Returned', 'Asset has been returned and is ready for review', 3, TRUE)
ON DUPLICATE KEY UPDATE
  type_name = VALUES(type_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);
