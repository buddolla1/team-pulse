const {
  applyReleaseManagementTemplate,
  createField,
  createSchema,
  deleteField,
  deleteRecordValues,
  deleteSchema,
  getLatestSchemaByModuleEntity,
  getRecordValues,
  listSchemas,
  updateField,
  updateSchema,
  upsertRecordValues
} = require('../services/dynamicFieldService');

const sendError = (res, error, fallback) => {
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallback
  });
};

const list = async (req, res) => {
  try {
    const schemas = await listSchemas();
    res.json({ success: true, data: schemas });
  } catch (error) {
    sendError(res, error, 'Failed to fetch dynamic schemas');
  }
};

const getSchema = async (req, res) => {
  try {
    const { moduleKey, entityKey } = req.params;
    const schema = await getLatestSchemaByModuleEntity(moduleKey, entityKey);
    if (!schema) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: schema });
  } catch (error) {
    sendError(res, error, 'Failed to fetch dynamic schema');
  }
};

const create = async (req, res) => {
  try {
    const result = await createSchema(req.body, req.admin?.id || req.employee?.id || null);
    res.status(201).json({ success: true, message: 'Schema created successfully', data: result });
  } catch (error) {
    sendError(res, error, 'Failed to create dynamic schema');
  }
};

const update = async (req, res) => {
  try {
    const result = await updateSchema(req.params.id, req.body, req.admin?.id || req.employee?.id || null);
    res.json({ success: true, message: 'Schema updated successfully', data: result });
  } catch (error) {
    sendError(res, error, 'Failed to update dynamic schema');
  }
};

const remove = async (req, res) => {
  try {
    const deleted = await deleteSchema(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Schema not found' });
    }
    res.json({ success: true, message: 'Schema deleted successfully' });
  } catch (error) {
    sendError(res, error, 'Failed to delete dynamic schema');
  }
};

const createDynamicField = async (req, res) => {
  try {
    const result = await createField(req.params.schemaId, req.body, req.admin?.id || req.employee?.id || null);
    res.status(201).json({ success: true, message: 'Field created successfully', data: result });
  } catch (error) {
    sendError(res, error, 'Failed to create field');
  }
};

const updateDynamicField = async (req, res) => {
  try {
    const result = await updateField(req.params.fieldId, req.body, req.admin?.id || req.employee?.id || null);
    res.json({ success: true, message: 'Field updated successfully', data: result });
  } catch (error) {
    sendError(res, error, 'Failed to update field');
  }
};

const deleteDynamicField = async (req, res) => {
  try {
    const deleted = await deleteField(req.params.fieldId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Field not found' });
    }
    res.json({ success: true, message: 'Field deleted successfully' });
  } catch (error) {
    sendError(res, error, 'Failed to delete field');
  }
};

const getRecord = async (req, res) => {
  try {
    const { recordType, recordId } = req.params;
    const values = await getRecordValues(recordType, recordId);
    res.json({ success: true, data: values });
  } catch (error) {
    sendError(res, error, 'Failed to fetch record values');
  }
};

const saveRecord = async (req, res) => {
  try {
    const { recordType, recordId } = req.params;
    const { schema_id: schemaId, values = {} } = req.body;
    await upsertRecordValues({
      schemaId,
      recordType,
      recordId,
      values,
      actorId: req.admin?.id || req.employee?.id || null
    });
    res.json({ success: true, message: 'Record values saved successfully' });
  } catch (error) {
    sendError(res, error, 'Failed to save record values');
  }
};

const deleteRecord = async (req, res) => {
  try {
    const { recordType, recordId } = req.params;
    await deleteRecordValues(recordType, recordId);
    res.json({ success: true, message: 'Record values deleted successfully' });
  } catch (error) {
    sendError(res, error, 'Failed to delete record values');
  }
};

const createReleaseManagementTemplate = async (req, res) => {
  try {
    const result = await applyReleaseManagementTemplate(req.admin?.id || req.employee?.id || null);
    res.status(201).json({
      success: true,
      message: 'Release Management template loaded successfully',
      data: result
    });
  } catch (error) {
    sendError(res, error, 'Failed to load Release Management template');
  }
};

module.exports = {
  create,
  createReleaseManagementTemplate,
  createDynamicField,
  deleteDynamicField,
  deleteRecord,
  getRecord,
  getSchema,
  list,
  remove,
  saveRecord,
  update,
  updateDynamicField
};
