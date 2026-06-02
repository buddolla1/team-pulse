# Dynamic Field Schema

This schema supports runtime-configurable forms and table columns without changing the base entity tables.

## Tables

- `dynamic_schemas`
  - identifies a configurable module/entity pair
  - example: `incident_tracker / incident`, `leave_tracker / leave`, `employee / employee`

- `dynamic_fields`
  - stores the field definition
  - includes type, label, validation, order, and visibility flags

- `dynamic_field_options`
  - stores select/radio/multiselect options

- `dynamic_record_values`
  - stores the actual value per record and field

- `dynamic_schema_versions`
  - stores versioned snapshots of schema changes

## Recommended Use

- keep core columns in the existing business tables
- store optional/custom fields in `dynamic_record_values`
- use `dynamic_schemas` + `dynamic_fields` to render forms and table columns in the frontend

## Example

```sql
INSERT INTO dynamic_schemas (schema_key, module_key, entity_key, schema_name)
VALUES ('incident_tracker_incident_v1', 'incident_tracker', 'incident', 'Incident Tracker Fields');
```

