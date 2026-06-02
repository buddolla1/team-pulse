USE employee_management;

INSERT INTO dynamic_schemas (
  schema_key,
  module_key,
  entity_key,
  schema_name,
  description,
  version,
  is_active
) VALUES (
  'release_management_release_v1',
  'release_management',
  'release',
  'Release Management Custom Fields',
  'Custom fields for release records',
  1,
  1
)
ON DUPLICATE KEY UPDATE
  module_key = VALUES(module_key),
  entity_key = VALUES(entity_key),
  schema_name = VALUES(schema_name),
  description = VALUES(description),
  is_active = VALUES(is_active);

SET @schema_id := (
  SELECT id
  FROM dynamic_schemas
  WHERE schema_key = 'release_management_release_v1'
  LIMIT 1
);

INSERT INTO dynamic_fields (
  schema_id,
  field_key,
  field_label,
  field_type,
  help_text,
  placeholder,
  is_required,
  is_active,
  is_read_only,
  display_order,
  validation_rules,
  ui_config,
  default_value
) VALUES
(
  @schema_id,
  'release_owner',
  'Release Owner',
  'text',
  'Person responsible for the release',
  'Enter release owner',
  1,
  1,
  0,
  1,
  NULL,
  JSON_OBJECT('span', 1),
  NULL
),
(
  @schema_id,
  'business_unit',
  'Business Unit',
  'select',
  'Business unit owning this release',
  'Select business unit',
  0,
  1,
  0,
  2,
  NULL,
  JSON_OBJECT('span', 1),
  NULL
),
(
  @schema_id,
  'deployment_notes',
  'Deployment Notes',
  'textarea',
  'Extra deployment notes',
  'Add deployment notes',
  0,
  1,
  0,
  3,
  NULL,
  JSON_OBJECT('span', 2),
  NULL
)
ON DUPLICATE KEY UPDATE
  field_label = VALUES(field_label),
  field_type = VALUES(field_type),
  help_text = VALUES(help_text),
  placeholder = VALUES(placeholder),
  is_required = VALUES(is_required),
  is_active = VALUES(is_active),
  is_read_only = VALUES(is_read_only),
  display_order = VALUES(display_order),
  validation_rules = VALUES(validation_rules),
  ui_config = VALUES(ui_config),
  default_value = VALUES(default_value);

DELETE FROM dynamic_field_options
WHERE field_id IN (
  SELECT id FROM dynamic_fields WHERE schema_id = @schema_id AND field_key = 'business_unit'
);

INSERT INTO dynamic_field_options (
  field_id,
  option_key,
  option_label,
  option_value,
  is_default,
  display_order,
  is_active
)
SELECT
  df.id,
  opts.option_key,
  opts.option_label,
  opts.option_value,
  opts.is_default,
  opts.display_order,
  opts.is_active
FROM dynamic_fields df
JOIN (
  SELECT 'it' AS option_key, 'IT' AS option_label, 'IT' AS option_value, 0 AS is_default, 1 AS display_order, 1 AS is_active
  UNION ALL
  SELECT 'operations', 'Operations', 'Operations', 0, 2, 1
  UNION ALL
  SELECT 'finance', 'Finance', 'Finance', 0, 3, 1
  UNION ALL
  SELECT 'shared_services', 'Shared Services', 'Shared Services', 0, 4, 1
) opts
WHERE df.schema_id = @schema_id
  AND df.field_key = 'business_unit';
