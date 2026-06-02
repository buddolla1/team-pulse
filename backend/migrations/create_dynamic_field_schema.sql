CREATE DATABASE IF NOT EXISTS employee_management;
USE employee_management;

-- Dynamic field schema for modules that need runtime-configurable forms and tables.
-- This keeps the base application tables intact while allowing admin-managed custom fields.

CREATE TABLE IF NOT EXISTS dynamic_schemas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schema_key VARCHAR(100) NOT NULL,
  module_key VARCHAR(100) NOT NULL,
  entity_key VARCHAR(100) NOT NULL,
  schema_name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  version INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by VARCHAR(100) NULL,
  updated_by VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_dynamic_schema_key (schema_key),
  INDEX idx_dynamic_schema_module_entity (module_key, entity_key),
  INDEX idx_dynamic_schema_active (is_active)
);

CREATE TABLE IF NOT EXISTS dynamic_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schema_id INT NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  field_label VARCHAR(150) NOT NULL,
  field_type ENUM(
    'text',
    'textarea',
    'number',
    'decimal',
    'date',
    'datetime',
    'select',
    'multiselect',
    'checkbox',
    'radio',
    'email',
    'tel',
    'url',
    'json'
  ) NOT NULL DEFAULT 'text',
  help_text VARCHAR(255) NULL,
  placeholder VARCHAR(255) NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_read_only TINYINT(1) NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  validation_rules JSON NULL,
  ui_config JSON NULL,
  default_value JSON NULL,
  created_by VARCHAR(100) NULL,
  updated_by VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_dynamic_field_key (schema_id, field_key),
  INDEX idx_dynamic_fields_schema_order (schema_id, display_order),
  INDEX idx_dynamic_fields_active (schema_id, is_active),
  CONSTRAINT fk_dynamic_fields_schema
    FOREIGN KEY (schema_id) REFERENCES dynamic_schemas(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dynamic_field_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_id INT NOT NULL,
  option_key VARCHAR(100) NOT NULL,
  option_label VARCHAR(150) NOT NULL,
  option_value VARCHAR(255) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by VARCHAR(100) NULL,
  updated_by VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_dynamic_field_option_key (field_id, option_key),
  INDEX idx_dynamic_field_options_field_order (field_id, display_order),
  CONSTRAINT fk_dynamic_field_options_field
    FOREIGN KEY (field_id) REFERENCES dynamic_fields(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dynamic_record_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schema_id INT NOT NULL,
  field_id INT NOT NULL,
  record_type VARCHAR(100) NOT NULL,
  record_id INT NOT NULL,
  value_text TEXT NULL,
  value_number DECIMAL(18, 4) NULL,
  value_date DATE NULL,
  value_datetime DATETIME NULL,
  value_json JSON NULL,
  created_by VARCHAR(100) NULL,
  updated_by VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_dynamic_record_field (record_type, record_id, field_id),
  INDEX idx_dynamic_record_lookup (record_type, record_id),
  INDEX idx_dynamic_record_schema (schema_id),
  INDEX idx_dynamic_record_field (field_id),
  CONSTRAINT fk_dynamic_record_schema
    FOREIGN KEY (schema_id) REFERENCES dynamic_schemas(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_dynamic_record_field
    FOREIGN KEY (field_id) REFERENCES dynamic_fields(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dynamic_schema_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schema_id INT NOT NULL,
  version INT NOT NULL,
  change_summary TEXT NULL,
  schema_snapshot JSON NOT NULL,
  created_by VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_dynamic_schema_version (schema_id, version),
  INDEX idx_dynamic_schema_versions_schema (schema_id),
  CONSTRAINT fk_dynamic_schema_versions_schema
    FOREIGN KEY (schema_id) REFERENCES dynamic_schemas(id)
    ON DELETE CASCADE
);
