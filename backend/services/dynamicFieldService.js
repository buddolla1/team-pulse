const db = require('../config/database');

const normalizeBoolean = (value) => value === true || value === 1 || value === '1' || value === 'true';

const toJson = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }

  return value;
};

const normalizeOptionList = (options = []) => {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option, index) => {
      if (typeof option === 'string') {
        const trimmed = option.trim();
        if (!trimmed) {
          return null;
        }
        return {
          option_key: trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
          option_label: trimmed,
          option_value: trimmed,
          is_default: false,
          display_order: index,
          is_active: true
        };
      }

      if (!option || typeof option !== 'object') {
        return null;
      }

      const label = String(option.option_label ?? option.label ?? option.value ?? '').trim();
      if (!label) {
        return null;
      }

      const value = String(option.option_value ?? option.value ?? label).trim();
      const key = String(option.option_key ?? option.key ?? label)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

      return {
        option_key: key || `option_${index + 1}`,
        option_label: label,
        option_value: value,
        is_default: normalizeBoolean(option.is_default),
        display_order: Number.isFinite(Number(option.display_order)) ? Number(option.display_order) : index,
        is_active: option.is_active === undefined ? true : normalizeBoolean(option.is_active)
      };
    })
    .filter(Boolean);
};

const serializeField = (row, options = []) => ({
  ...row,
  is_required: Boolean(row.is_required),
  is_active: Boolean(row.is_active),
  is_read_only: Boolean(row.is_read_only),
  validation_rules: row.validation_rules ? toJson(row.validation_rules) : null,
  ui_config: row.ui_config ? toJson(row.ui_config) : null,
  default_value: row.default_value ? toJson(row.default_value) : null,
  options
});

const RELEASE_MANAGEMENT_TEMPLATE = {
  schema_key: 'release_management_release_v1',
  module_key: 'release_management',
  entity_key: 'release',
  schema_name: 'Release Management Custom Fields',
  description: 'Custom fields for release records',
  fields: [
    {
      field_key: 'release_month',
      field_label: 'Release Month',
      field_type: 'date',
      help_text: 'Release month in YYYY-MM format',
      placeholder: '',
      is_required: true,
      display_order: 1,
      ui_config: { span: 1, inputType: 'month' }
    },
    {
      field_key: 'planned_release_date',
      field_label: 'Planned Release Date',
      field_type: 'date',
      help_text: 'Planned release date',
      placeholder: '',
      is_required: true,
      display_order: 2,
      ui_config: { span: 1 }
    },
    {
      field_key: 'release_planning_status',
      field_label: 'Release Planning Status',
      field_type: 'select',
      help_text: '',
      placeholder: 'Select status',
      is_required: false,
      display_order: 3,
      ui_config: { span: 1 },
      options: ['Not Started', 'In Progress', 'Completed', 'Blocked', 'On Hold']
    },
    {
      field_key: 'rts_handover_planned_date',
      field_label: 'RTS Handover Planned Date',
      field_type: 'date',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 4,
      ui_config: { span: 1 }
    },
    {
      field_key: 'release_tag',
      field_label: 'Release TAG',
      field_type: 'text',
      help_text: '',
      placeholder: 'Enter release tag',
      is_required: true,
      display_order: 5,
      ui_config: { span: 1 }
    },
    {
      field_key: 'application_name',
      field_label: 'Application Name',
      field_type: 'text',
      help_text: '',
      placeholder: 'Enter application name',
      is_required: true,
      display_order: 6,
      ui_config: { span: 1 }
    },
    {
      field_key: 'release_name',
      field_label: 'Release Name',
      field_type: 'text',
      help_text: '',
      placeholder: 'Enter release name',
      is_required: true,
      display_order: 7,
      ui_config: { span: 1 }
    },
    {
      field_key: 'build_program_manager',
      field_label: 'Build Program Manager',
      field_type: 'text',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 8,
      ui_config: { span: 1 }
    },
    {
      field_key: 'qe_program_manager',
      field_label: 'QE Program Manager',
      field_type: 'text',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 9,
      ui_config: { span: 1 }
    },
    {
      field_key: 'release_spoc',
      field_label: 'Release SPOC',
      field_type: 'text',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 10,
      ui_config: { span: 1 }
    },
    {
      field_key: 'pre_deployment_checklist',
      field_label: 'Pre-Deployment Checklist',
      field_type: 'textarea',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 11,
      ui_config: { span: 2 }
    },
    {
      field_key: 'implementation_plan',
      field_label: 'Implementation Plan',
      field_type: 'textarea',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 12,
      ui_config: { span: 2 }
    },
    {
      field_key: 'rollback_plan',
      field_label: 'Rollback Plan',
      field_type: 'textarea',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 13,
      ui_config: { span: 2 }
    },
    {
      field_key: 'post_deployment_checklist',
      field_label: 'Post-Deployment Checklist',
      field_type: 'textarea',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 14,
      ui_config: { span: 2 }
    },
    {
      field_key: 'rts_handover',
      field_label: 'RTS Handover',
      field_type: 'textarea',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 15,
      ui_config: { span: 2 }
    },
    {
      field_key: 'build_preparation_checklist',
      field_label: 'Build Preparation Checklist',
      field_type: 'textarea',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 16,
      ui_config: { span: 2 }
    },
    {
      field_key: 'test_case_checklist',
      field_label: 'Test Case Check List',
      field_type: 'textarea',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 17,
      ui_config: { span: 2 }
    },
    {
      field_key: 'dor',
      field_label: 'DOR',
      field_type: 'textarea',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 18,
      ui_config: { span: 2 }
    },
    {
      field_key: 'dod',
      field_label: 'DOD',
      field_type: 'textarea',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 19,
      ui_config: { span: 2 }
    },
    {
      field_key: 'pre_deployment_checklist_execution',
      field_label: 'Pre-Deployment Checklist Execution',
      field_type: 'select',
      help_text: '',
      placeholder: 'Select status',
      is_required: false,
      display_order: 20,
      ui_config: { span: 1 },
      options: ['Not Started', 'In Progress', 'Completed', 'Blocked', 'Not Applicable']
    },
    {
      field_key: 'post_deployment_checklist_execution',
      field_label: 'Post-Deployment Checklist Execution',
      field_type: 'select',
      help_text: '',
      placeholder: 'Select status',
      is_required: false,
      display_order: 21,
      ui_config: { span: 1 },
      options: ['Not Started', 'In Progress', 'Completed', 'Blocked', 'Not Applicable']
    },
    {
      field_key: 'release_encountered_issue',
      field_label: 'Release Encountered Issue?',
      field_type: 'checkbox',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 22,
      ui_config: { span: 1 }
    },
    {
      field_key: 'issue_description',
      field_label: 'Issue Description',
      field_type: 'textarea',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 23,
      ui_config: { span: 2 }
    },
    {
      field_key: 'remedy',
      field_label: 'Remedy',
      field_type: 'textarea',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 24,
      ui_config: { span: 2 }
    },
    {
      field_key: 'release_status',
      field_label: 'Release Status',
      field_type: 'select',
      help_text: '',
      placeholder: 'Select release status',
      is_required: false,
      display_order: 25,
      ui_config: { span: 1 },
      options: ['Planned', 'In Progress', 'Released', 'Failed', 'Rolled Back', 'Cancelled', 'On Hold']
    },
    {
      field_key: 'retro',
      field_label: 'Retro',
      field_type: 'textarea',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 26,
      ui_config: { span: 2 }
    },
    {
      field_key: 'remarks',
      field_label: 'Remarks',
      field_type: 'textarea',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 27,
      ui_config: { span: 2 }
    },
    {
      field_key: 'auditor',
      field_label: 'Auditor',
      field_type: 'text',
      help_text: '',
      placeholder: '',
      is_required: false,
      display_order: 28,
      ui_config: { span: 1 }
    }
  ]
};

const loadSchemaFields = async (schemaId) => {
  const [fields] = await db.query(
    `SELECT *
     FROM dynamic_fields
     WHERE schema_id = ?
     ORDER BY display_order ASC, id ASC`,
    [schemaId]
  );

  if (fields.length === 0) {
    return [];
  }

  const fieldIds = fields.map((field) => field.id);
  const [options] = await db.query(
    `SELECT *
     FROM dynamic_field_options
     WHERE field_id IN (?)
     ORDER BY field_id ASC, display_order ASC, id ASC`,
    [fieldIds]
  );

  const optionsByFieldId = options.reduce((acc, option) => {
    if (!acc[option.field_id]) {
      acc[option.field_id] = [];
    }
    acc[option.field_id].push({
      ...option,
      is_default: Boolean(option.is_default),
      is_active: Boolean(option.is_active)
    });
    return acc;
  }, {});

  return fields.map((field) => serializeField(field, optionsByFieldId[field.id] || []));
};

const getLatestSchemaByModuleEntity = async (moduleKey, entityKey) => {
  const [schemas] = await db.query(
    `SELECT *
     FROM dynamic_schemas
     WHERE module_key = ? AND entity_key = ? AND is_active = 1
     ORDER BY version DESC, id DESC
     LIMIT 1`,
    [moduleKey, entityKey]
  );

  if (schemas.length === 0) {
    return null;
  }

  const schema = schemas[0];
  const fields = await loadSchemaFields(schema.id);
  return {
    ...schema,
    is_active: Boolean(schema.is_active),
    fields
  };
};

const listSchemas = async () => {
  const [schemas] = await db.query(
    `SELECT ds.*,
            COUNT(df.id) AS field_count
     FROM dynamic_schemas ds
     LEFT JOIN dynamic_fields df ON df.schema_id = ds.id
     GROUP BY ds.id
     ORDER BY ds.module_key, ds.entity_key, ds.version DESC, ds.id DESC`
  );

  return schemas.map((schema) => ({
    ...schema,
    is_active: Boolean(schema.is_active),
    field_count: Number(schema.field_count || 0)
  }));
};

const createSchema = async (payload, actorId = null) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      schema_key,
      module_key,
      entity_key,
      schema_name,
      description = '',
      is_active = true
    } = payload;

    if (!schema_key || !module_key || !entity_key || !schema_name) {
      const error = new Error('schema_key, module_key, entity_key, and schema_name are required');
      error.statusCode = 400;
      throw error;
    }

    const [result] = await connection.query(
      `INSERT INTO dynamic_schemas
       (schema_key, module_key, entity_key, schema_name, description, version, is_active, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        schema_key.trim(),
        module_key.trim(),
        entity_key.trim(),
        schema_name.trim(),
        description?.trim() || null,
        normalizeBoolean(is_active) ? 1 : 0,
        actorId,
        actorId
      ]
    );

    await connection.commit();
    return { id: result.insertId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const updateSchema = async (schemaId, payload, actorId = null) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT id FROM dynamic_schemas WHERE id = ?', [schemaId]);
    if (rows.length === 0) {
      const error = new Error('Schema not found');
      error.statusCode = 404;
      throw error;
    }

    const updates = [];
    const values = [];
    const allowed = ['schema_key', 'module_key', 'entity_key', 'schema_name', 'description', 'is_active'];

    allowed.forEach((key) => {
      if (payload[key] !== undefined) {
        updates.push(`${key} = ?`);
        if (key === 'is_active') {
          values.push(normalizeBoolean(payload[key]) ? 1 : 0);
        } else if (typeof payload[key] === 'string') {
          values.push(payload[key].trim());
        } else {
          values.push(payload[key]);
        }
      }
    });

    if (updates.length === 0) {
      await connection.commit();
      return { id: Number(schemaId) };
    }

    updates.push('version = version + 1');
    updates.push('updated_by = ?');
    values.push(actorId);
    values.push(schemaId);

    await connection.query(
      `UPDATE dynamic_schemas SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    await connection.commit();
    return { id: Number(schemaId) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const deleteSchema = async (schemaId) => {
  const [result] = await db.query('DELETE FROM dynamic_schemas WHERE id = ?', [schemaId]);
  return result.affectedRows > 0;
};

const createField = async (schemaId, payload, actorId = null) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [schemas] = await connection.query('SELECT id FROM dynamic_schemas WHERE id = ?', [schemaId]);
    if (schemas.length === 0) {
      const error = new Error('Schema not found');
      error.statusCode = 404;
      throw error;
    }

    const {
      field_key,
      field_label,
      field_type = 'text',
      help_text = null,
      placeholder = null,
      is_required = false,
      is_active = true,
      is_read_only = false,
      display_order = 0,
      validation_rules = null,
      ui_config = null,
      default_value = null,
      options = []
    } = payload;

    if (!field_key || !field_label) {
      const error = new Error('field_key and field_label are required');
      error.statusCode = 400;
      throw error;
    }

    const [result] = await connection.query(
      `INSERT INTO dynamic_fields
       (schema_id, field_key, field_label, field_type, help_text, placeholder, is_required, is_active, is_read_only,
        display_order, validation_rules, ui_config, default_value, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schemaId,
        field_key.trim(),
        field_label.trim(),
        field_type,
        help_text?.trim() || null,
        placeholder?.trim() || null,
        normalizeBoolean(is_required) ? 1 : 0,
        normalizeBoolean(is_active) ? 1 : 0,
        normalizeBoolean(is_read_only) ? 1 : 0,
        Number.isFinite(Number(display_order)) ? Number(display_order) : 0,
        validation_rules ? JSON.stringify(validation_rules) : null,
        ui_config ? JSON.stringify(ui_config) : null,
        default_value !== undefined && default_value !== null ? JSON.stringify(default_value) : null,
        actorId,
        actorId
      ]
    );

    const fieldId = result.insertId;
    const normalizedOptions = normalizeOptionList(options);

    if (normalizedOptions.length > 0) {
      await connection.query(
        `INSERT INTO dynamic_field_options
         (field_id, option_key, option_label, option_value, is_default, display_order, is_active, created_by, updated_by)
         VALUES ?`,
        [normalizedOptions.map((option) => [
          fieldId,
          option.option_key,
          option.option_label,
          option.option_value,
          option.is_default ? 1 : 0,
          option.display_order,
          option.is_active ? 1 : 0,
          actorId,
          actorId
        ])]
      );
    }

    await connection.commit();
    return { id: fieldId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const updateField = async (fieldId, payload, actorId = null) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [fields] = await connection.query('SELECT * FROM dynamic_fields WHERE id = ?', [fieldId]);
    if (fields.length === 0) {
      const error = new Error('Field not found');
      error.statusCode = 404;
      throw error;
    }

    const updates = [];
    const values = [];
    const allowed = [
      'field_key',
      'field_label',
      'field_type',
      'help_text',
      'placeholder',
      'is_required',
      'is_active',
      'is_read_only',
      'display_order',
      'validation_rules',
      'ui_config',
      'default_value'
    ];

    allowed.forEach((key) => {
      if (payload[key] !== undefined) {
        updates.push(`${key} = ?`);
        if (['is_required', 'is_active', 'is_read_only'].includes(key)) {
          values.push(normalizeBoolean(payload[key]) ? 1 : 0);
        } else if (key === 'display_order') {
          values.push(Number.isFinite(Number(payload[key])) ? Number(payload[key]) : 0);
        } else if (['validation_rules', 'ui_config', 'default_value'].includes(key)) {
          values.push(payload[key] === null ? null : JSON.stringify(payload[key]));
        } else if (typeof payload[key] === 'string') {
          values.push(payload[key].trim());
        } else {
          values.push(payload[key]);
        }
      }
    });

    updates.push('updated_by = ?');
    values.push(actorId);
    values.push(fieldId);

    await connection.query(
      `UPDATE dynamic_fields SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (payload.options !== undefined) {
      await connection.query('DELETE FROM dynamic_field_options WHERE field_id = ?', [fieldId]);
      const normalizedOptions = normalizeOptionList(payload.options);
      if (normalizedOptions.length > 0) {
        await connection.query(
          `INSERT INTO dynamic_field_options
           (field_id, option_key, option_label, option_value, is_default, display_order, is_active, created_by, updated_by)
           VALUES ?`,
          [normalizedOptions.map((option) => [
            fieldId,
            option.option_key,
            option.option_label,
            option.option_value,
            option.is_default ? 1 : 0,
            option.display_order,
            option.is_active ? 1 : 0,
            actorId,
            actorId
          ])]
        );
      }
    }

    await connection.commit();
    return { id: Number(fieldId) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const deleteField = async (fieldId) => {
  const [result] = await db.query('DELETE FROM dynamic_fields WHERE id = ?', [fieldId]);
  return result.affectedRows > 0;
};

const getRecordValues = async (recordType, recordId) => {
  const [rows] = await db.query(
    `SELECT drv.*, df.field_key, df.field_label, df.field_type
     FROM dynamic_record_values drv
     JOIN dynamic_fields df ON df.id = drv.field_id
     WHERE drv.record_type = ? AND drv.record_id = ?
     ORDER BY df.display_order ASC, df.id ASC`,
    [recordType, recordId]
  );

  return rows.reduce((acc, row) => {
    let value = row.value_text;

    if (row.field_type === 'number' || row.field_type === 'decimal') {
      value = row.value_number;
    } else if (row.field_type === 'date') {
      value = row.value_date ? row.value_date.toISOString().slice(0, 10) : null;
    } else if (row.field_type === 'datetime') {
      value = row.value_datetime ? row.value_datetime.toISOString() : null;
    } else if (row.field_type === 'json' || row.field_type === 'multiselect') {
      value = row.value_json ?? toJson(row.value_text);
    } else if (row.field_type === 'checkbox') {
      value = normalizeBoolean(row.value_text);
    }

    acc[row.field_key] = value;
    return acc;
  }, {});
};

const upsertRecordValues = async ({ schemaId, recordType, recordId, values = {}, actorId = null }) => {
  if (!schemaId || !recordType || !recordId) {
    return;
  }

  const [fields] = await db.query(
    `SELECT id, field_key, field_type
     FROM dynamic_fields
     WHERE schema_id = ? AND is_active = 1`,
    [schemaId]
  );

  if (fields.length === 0) {
    return;
  }

  const fieldByKey = fields.reduce((acc, field) => {
    acc[field.field_key] = field;
    return acc;
  }, {});

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    for (const [fieldKey, rawValue] of Object.entries(values || {})) {
      const field = fieldByKey[fieldKey];
      if (!field) {
        continue;
      }

      const payload = {
        schema_id: schemaId,
        field_id: field.id,
        record_type: recordType,
        record_id: recordId,
        value_text: null,
        value_number: null,
        value_date: null,
        value_datetime: null,
        value_json: null,
        created_by: actorId,
        updated_by: actorId
      };

      if (field.field_type === 'number' || field.field_type === 'decimal') {
        payload.value_number = rawValue === '' || rawValue === null || rawValue === undefined ? null : Number(rawValue);
      } else if (field.field_type === 'date') {
        payload.value_date = rawValue ? rawValue : null;
      } else if (field.field_type === 'datetime') {
        payload.value_datetime = rawValue ? rawValue : null;
      } else if (field.field_type === 'json' || field.field_type === 'multiselect') {
        payload.value_json = rawValue === undefined ? null : JSON.stringify(rawValue);
      } else if (field.field_type === 'checkbox') {
        payload.value_text = normalizeBoolean(rawValue) ? '1' : '0';
      } else {
        payload.value_text = rawValue === null || rawValue === undefined ? null : String(rawValue);
      }

      await connection.query(
        `INSERT INTO dynamic_record_values
         (schema_id, field_id, record_type, record_id, value_text, value_number, value_date, value_datetime, value_json, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           value_text = VALUES(value_text),
           value_number = VALUES(value_number),
           value_date = VALUES(value_date),
           value_datetime = VALUES(value_datetime),
           value_json = VALUES(value_json),
           updated_by = VALUES(updated_by)`,
        [
          payload.schema_id,
          payload.field_id,
          payload.record_type,
          payload.record_id,
          payload.value_text,
          payload.value_number,
          payload.value_date,
          payload.value_datetime,
          payload.value_json,
          payload.created_by,
          payload.updated_by
        ]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const deleteRecordValues = async (recordType, recordId) => {
  await db.query('DELETE FROM dynamic_record_values WHERE record_type = ? AND record_id = ?', [recordType, recordId]);
};

const upsertDynamicFieldRow = async (connection, schemaId, field, actorId = null) => {
  const [existing] = await connection.query(
    'SELECT id FROM dynamic_fields WHERE schema_id = ? AND field_key = ? LIMIT 1',
    [schemaId, field.field_key]
  );

  const payload = {
    schema_id: schemaId,
    field_key: field.field_key,
    field_label: field.field_label,
    field_type: field.field_type || 'text',
    help_text: field.help_text || null,
    placeholder: field.placeholder || null,
    is_required: field.is_required ? 1 : 0,
    is_active: field.is_active === undefined ? 1 : field.is_active ? 1 : 0,
    is_read_only: field.is_read_only ? 1 : 0,
    display_order: Number.isFinite(Number(field.display_order)) ? Number(field.display_order) : 0,
    validation_rules: field.validation_rules ? JSON.stringify(field.validation_rules) : null,
    ui_config: field.ui_config ? JSON.stringify(field.ui_config) : null,
    default_value: field.default_value !== undefined ? JSON.stringify(field.default_value) : null,
    created_by: actorId,
    updated_by: actorId
  };

  let fieldId = existing[0]?.id || null;

  if (!fieldId) {
    const [result] = await connection.query(
      `INSERT INTO dynamic_fields
       (schema_id, field_key, field_label, field_type, help_text, placeholder, is_required, is_active, is_read_only,
        display_order, validation_rules, ui_config, default_value, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.schema_id,
        payload.field_key,
        payload.field_label,
        payload.field_type,
        payload.help_text,
        payload.placeholder,
        payload.is_required,
        payload.is_active,
        payload.is_read_only,
        payload.display_order,
        payload.validation_rules,
        payload.ui_config,
        payload.default_value,
        payload.created_by,
        payload.updated_by
      ]
    );
    fieldId = result.insertId;
  } else {
    await connection.query(
      `UPDATE dynamic_fields
       SET field_label = ?, field_type = ?, help_text = ?, placeholder = ?, is_required = ?, is_active = ?,
           is_read_only = ?, display_order = ?, validation_rules = ?, ui_config = ?, default_value = ?, updated_by = ?
       WHERE id = ?`,
      [
        payload.field_label,
        payload.field_type,
        payload.help_text,
        payload.placeholder,
        payload.is_required,
        payload.is_active,
        payload.is_read_only,
        payload.display_order,
        payload.validation_rules,
        payload.ui_config,
        payload.default_value,
        payload.updated_by,
        fieldId
      ]
    );
    await connection.query('DELETE FROM dynamic_field_options WHERE field_id = ?', [fieldId]);
  }

  const normalizedOptions = normalizeOptionList(field.options || []);
  if (normalizedOptions.length > 0) {
    await connection.query(
      `INSERT INTO dynamic_field_options
       (field_id, option_key, option_label, option_value, is_default, display_order, is_active, created_by, updated_by)
       VALUES ?`,
      [normalizedOptions.map((option) => [
        fieldId,
        option.option_key,
        option.option_label,
        option.option_value,
        option.is_default ? 1 : 0,
        option.display_order,
        option.is_active ? 1 : 0,
        actorId,
        actorId
      ])]
    );
  }

  return fieldId;
};

const applyReleaseManagementTemplate = async (actorId = null) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [schemas] = await connection.query(
      'SELECT id FROM dynamic_schemas WHERE schema_key = ? LIMIT 1',
      [RELEASE_MANAGEMENT_TEMPLATE.schema_key]
    );

    let schemaId = schemas[0]?.id || null;
    if (!schemaId) {
      const [result] = await connection.query(
        `INSERT INTO dynamic_schemas
         (schema_key, module_key, entity_key, schema_name, description, version, is_active, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`,
        [
          RELEASE_MANAGEMENT_TEMPLATE.schema_key,
          RELEASE_MANAGEMENT_TEMPLATE.module_key,
          RELEASE_MANAGEMENT_TEMPLATE.entity_key,
          RELEASE_MANAGEMENT_TEMPLATE.schema_name,
          RELEASE_MANAGEMENT_TEMPLATE.description,
          actorId,
          actorId
        ]
      );
      schemaId = result.insertId;
    } else {
      await connection.query(
        `UPDATE dynamic_schemas
         SET module_key = ?, entity_key = ?, schema_name = ?, description = ?, is_active = 1, updated_by = ?
         WHERE id = ?`,
        [
          RELEASE_MANAGEMENT_TEMPLATE.module_key,
          RELEASE_MANAGEMENT_TEMPLATE.entity_key,
          RELEASE_MANAGEMENT_TEMPLATE.schema_name,
          RELEASE_MANAGEMENT_TEMPLATE.description,
          actorId,
          schemaId
        ]
      );
    }

    for (const field of RELEASE_MANAGEMENT_TEMPLATE.fields) {
      await upsertDynamicFieldRow(connection, schemaId, field, actorId);
    }

    await connection.commit();
    return {
      schema_id: schemaId,
      schema_key: RELEASE_MANAGEMENT_TEMPLATE.schema_key
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  applyReleaseManagementTemplate,
  createField,
  createSchema,
  deleteField,
  deleteRecordValues,
  deleteSchema,
  getLatestSchemaByModuleEntity,
  getRecordValues,
  listSchemas,
  loadSchemaFields,
  normalizeOptionList,
  serializeField,
  updateField,
  updateSchema,
  upsertRecordValues
};
