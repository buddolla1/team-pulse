import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toolbar } from 'primereact/toolbar';
import { classNames } from 'primereact/utils';
import {
  createDynamicField,
  createDynamicSchema,
  deleteDynamicField,
  deleteDynamicSchema,
  getDynamicSchema,
  listDynamicSchemas,
  loadReleaseManagementTemplate,
  updateDynamicField,
  updateDynamicSchema
} from '../services/api';

const FIELD_TYPES = [
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
].map((value) => ({ label: value, value }));

const DynamicFieldManagerPage = () => {
  const [schemas, setSchemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [schemaDialogVisible, setSchemaDialogVisible] = useState(false);
  const [schemaForm, setSchemaForm] = useState({
    schema_key: '',
    module_key: '',
    entity_key: '',
    schema_name: '',
    description: '',
    is_active: true
  });
  const [schemaErrors, setSchemaErrors] = useState({});
  const [schemaSubmitting, setSchemaSubmitting] = useState(false);
  const [fieldDialogVisible, setFieldDialogVisible] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [fieldForm, setFieldForm] = useState({
    field_key: '',
    field_label: '',
    field_type: 'text',
    help_text: '',
    placeholder: '',
    is_required: false,
    is_active: true,
    is_read_only: false,
    display_order: 0,
    validation_rules_json: '',
    ui_config_json: '',
    default_value_json: '',
    options_text: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldSubmitting, setFieldSubmitting] = useState(false);

  const loadSchemas = async () => {
    try {
      setLoading(true);
      const response = await listDynamicSchemas();
      if (response.data?.success) {
        setSchemas(response.data.data || []);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load dynamic schemas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchemas();
  }, []);

  const resetSchemaForm = () => {
    setSelectedSchema(null);
    setSchemaForm({
      schema_key: '',
      module_key: '',
      entity_key: '',
      schema_name: '',
      description: '',
      is_active: true
    });
    setSchemaErrors({});
  };

  const resetFieldForm = () => {
    setSelectedField(null);
    setFieldForm({
      field_key: '',
      field_label: '',
      field_type: 'text',
      help_text: '',
      placeholder: '',
      is_required: false,
      is_active: true,
      is_read_only: false,
      display_order: 0,
      validation_rules_json: '',
      ui_config_json: '',
      default_value_json: '',
      options_text: ''
    });
    setFieldErrors({});
  };

  const loadSchema = async (schemaRow) => {
    try {
      setSchemaLoading(true);
      const response = await getDynamicSchema(schemaRow.module_key, schemaRow.entity_key);
      const schema = response.data?.data;
      if (!schema) {
        toast.warn('Schema not found');
        return;
      }

      setSelectedSchema(schema);
      setSchemaDialogVisible(true);
      setSchemaForm({
        schema_key: schema.schema_key || '',
        module_key: schema.module_key || '',
        entity_key: schema.entity_key || '',
        schema_name: schema.schema_name || '',
        description: schema.description || '',
        is_active: Boolean(schema.is_active)
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load schema');
    } finally {
      setSchemaLoading(false);
    }
  };

  const validateSchema = () => {
    const nextErrors = {};
    if (!schemaForm.schema_key.trim()) nextErrors.schema_key = 'Schema key is required';
    if (!schemaForm.module_key.trim()) nextErrors.module_key = 'Module key is required';
    if (!schemaForm.entity_key.trim()) nextErrors.entity_key = 'Entity key is required';
    if (!schemaForm.schema_name.trim()) nextErrors.schema_name = 'Schema name is required';
    setSchemaErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveSchema = async () => {
    if (!validateSchema()) return;

    try {
      setSchemaSubmitting(true);
      if (selectedSchema?.id) {
        await updateDynamicSchema(selectedSchema.id, schemaForm);
        toast.success('Schema updated successfully');
      } else {
        await createDynamicSchema(schemaForm);
        toast.success('Schema created successfully');
      }
      await loadSchemas();
      const current = selectedSchema ? { module_key: schemaForm.module_key, entity_key: schemaForm.entity_key } : schemaForm;
      const response = await getDynamicSchema(current.module_key, current.entity_key);
      if (response.data?.data) {
        setSelectedSchema(response.data.data);
      }
      setSchemaDialogVisible(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save schema');
    } finally {
      setSchemaSubmitting(false);
    }
  };

  const handleDeleteSchema = (schema) => {
    confirmDialog({
      message: `Delete schema "${schema.schema_name}"? This removes its fields and values.`,
      header: 'Delete Schema',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await deleteDynamicSchema(schema.id);
          toast.success('Schema deleted successfully');
          if (selectedSchema?.id === schema.id) {
            resetSchemaForm();
            setSchemaDialogVisible(false);
          }
          await loadSchemas();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete schema');
        }
      }
    });
  };

  const openFieldDialog = (field = null) => {
    if (!selectedSchema) {
      toast.warn('Load or create a schema first');
      return;
    }

    if (field) {
      setSelectedField(field);
      setFieldForm({
        field_key: field.field_key || '',
        field_label: field.field_label || '',
        field_type: field.field_type || 'text',
        help_text: field.help_text || '',
        placeholder: field.placeholder || '',
        is_required: Boolean(field.is_required),
        is_active: Boolean(field.is_active),
        is_read_only: Boolean(field.is_read_only),
        display_order: field.display_order || 0,
        validation_rules_json: field.validation_rules ? JSON.stringify(field.validation_rules, null, 2) : '',
        ui_config_json: field.ui_config ? JSON.stringify(field.ui_config, null, 2) : '',
        default_value_json: field.default_value !== null && field.default_value !== undefined ? JSON.stringify(field.default_value, null, 2) : '',
        options_text: (field.options || []).map((option) => `${option.option_key}|${option.option_label}|${option.option_value}`).join('\n')
      });
    } else {
      resetFieldForm();
    }

    setFieldDialogVisible(true);
  };

  const parseJsonField = (value, label) => {
    if (!value || !value.trim()) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      throw new Error(`${label} must be valid JSON`);
    }
  };

  const parseOptions = (text) => {
    if (!text || !text.trim()) {
      return [];
    }

    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [rawKey, rawLabel, rawValue] = line.split('|').map((part) => part.trim());
        const label = rawLabel || rawKey || rawValue || line;
        return {
          option_key: rawKey || label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `option_${index + 1}`,
          option_label: label,
          option_value: rawValue || label,
          display_order: index,
          is_active: true
        };
      });
  };

  const validateField = () => {
    const nextErrors = {};
    if (!fieldForm.field_key.trim()) nextErrors.field_key = 'Field key is required';
    if (!fieldForm.field_label.trim()) nextErrors.field_label = 'Field label is required';
    if (!fieldForm.field_type.trim()) nextErrors.field_type = 'Field type is required';
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveField = async () => {
    if (!validateField()) return;

    try {
      setFieldSubmitting(true);
      const payload = {
        ...fieldForm,
        validation_rules: parseJsonField(fieldForm.validation_rules_json, 'Validation rules'),
        ui_config: parseJsonField(fieldForm.ui_config_json, 'UI config'),
        default_value: parseJsonField(fieldForm.default_value_json, 'Default value'),
        options: ['select', 'multiselect', 'radio'].includes(fieldForm.field_type) ? parseOptions(fieldForm.options_text) : []
      };
      delete payload.validation_rules_json;
      delete payload.ui_config_json;
      delete payload.default_value_json;
      delete payload.options_text;

      if (selectedField?.id) {
        await updateDynamicField(selectedField.id, payload);
        toast.success('Field updated successfully');
      } else {
        await createDynamicField(selectedSchema.id, payload);
        toast.success('Field created successfully');
      }

      setFieldDialogVisible(false);
      resetFieldForm();
      const response = await getDynamicSchema(selectedSchema.module_key, selectedSchema.entity_key);
      setSelectedSchema(response.data.data);
      await loadSchemas();
    } catch (error) {
      toast.error(error.message || error.response?.data?.message || 'Failed to save field');
    } finally {
      setFieldSubmitting(false);
    }
  };

  const handleDeleteField = (field) => {
    confirmDialog({
      message: `Delete field "${field.field_label}"?`,
      header: 'Delete Field',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await deleteDynamicField(field.id);
          toast.success('Field deleted successfully');
          const response = await getDynamicSchema(selectedSchema.module_key, selectedSchema.entity_key);
          setSelectedSchema(response.data.data);
          await loadSchemas();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete field');
        }
      }
    });
  };

  const selectedFields = useMemo(() => selectedSchema?.fields || [], [selectedSchema]);

  const leftToolbarTemplate = () => <h2 className="m-0">Dynamic Fields</h2>;
  const rightToolbarTemplate = () => (
    <div className="flex gap-2">
      <Button
        label="Load Release Template"
        icon="pi pi-download"
        className="p-button-secondary"
        onClick={async () => {
          try {
            setLoading(true);
            const response = await loadReleaseManagementTemplate();
            toast.success(response.data?.message || 'Release Management template loaded');
            await loadSchemas();
            const schemaResponse = await getDynamicSchema('release_management', 'release');
            if (schemaResponse.data?.data) {
              setSelectedSchema(schemaResponse.data.data);
              setSchemaForm({
                schema_key: schemaResponse.data.data.schema_key || '',
                module_key: schemaResponse.data.data.module_key || '',
                entity_key: schemaResponse.data.data.entity_key || '',
                schema_name: schemaResponse.data.data.schema_name || '',
                description: schemaResponse.data.data.description || '',
                is_active: Boolean(schemaResponse.data.data.is_active)
              });
            }
          } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load release template');
          } finally {
            setLoading(false);
          }
        }}
      />
      <Button
        label="New Schema"
        icon="pi pi-plus"
        className="p-button-success"
        onClick={() => {
          resetSchemaForm();
          setSchemaDialogVisible(true);
        }}
      />
    </div>
  );

  const schemaActions = (row) => (
    <div className="flex gap-2">
      <Button icon="pi pi-folder-open" rounded text onClick={() => loadSchema(row)} tooltip="Load" tooltipOptions={{ position: 'top' }} />
      <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => handleDeleteSchema(row)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />
    </div>
  );

  const fieldActions = (row) => (
    <div className="flex gap-2">
      <Button icon="pi pi-pencil" rounded text onClick={() => openFieldDialog(row)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
      <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => handleDeleteField(row)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />
    </div>
  );

  return (
    <div className="p-4">
      <ConfirmDialog />
      <Toolbar left={leftToolbarTemplate} right={rightToolbarTemplate} className="mb-3" />

      <div className="grid">
        <div className="col-12 xl:col-4">
          <DataTable value={schemas} loading={loading} dataKey="id" size="small" emptyMessage="No schemas configured yet">
            <Column field="schema_name" header="Schema" />
            <Column field="module_key" header="Module" />
            <Column field="entity_key" header="Entity" />
            <Column field="field_count" header="Fields" />
            <Column body={schemaActions} header="Actions" style={{ width: '120px' }} />
          </DataTable>
        </div>

        <div className="col-12 xl:col-8">
          <div className="surface-card border-1 border-300 border-round p-3">
            <div className="flex justify-content-between align-items-center mb-3">
              <div>
                <h3 className="m-0">{selectedSchema?.schema_name || 'Schema Fields'}</h3>
                <small className="text-600">{selectedSchema ? `${selectedSchema.module_key} / ${selectedSchema.entity_key}` : 'Load a schema to manage fields.'}</small>
              </div>
              <Button label="Add Field" icon="pi pi-plus" onClick={() => openFieldDialog()} disabled={!selectedSchema} />
            </div>

            <DataTable value={selectedFields} dataKey="id" size="small" emptyMessage="No fields added yet">
              <Column field="display_order" header="#" style={{ width: '70px' }} />
              <Column field="field_key" header="Key" />
              <Column field="field_label" header="Label" />
              <Column field="field_type" header="Type" />
              <Column
                field="is_required"
                header="Required"
                body={(row) => (row.is_required ? 'Yes' : 'No')}
                style={{ width: '100px' }}
              />
              <Column body={fieldActions} header="Actions" style={{ width: '120px' }} />
            </DataTable>
          </div>
        </div>
      </div>

      <Dialog
        visible={schemaDialogVisible}
        onHide={() => setSchemaDialogVisible(false)}
        header={selectedSchema ? 'Edit Schema' : 'New Schema'}
        style={{ width: '760px', maxWidth: '95vw' }}
        modal
      >
        <div className="grid">
          <div className="col-12 md:col-6">
            <label className="block mb-2">Schema Key</label>
            <InputText
              value={schemaForm.schema_key}
              onChange={(e) => setSchemaForm((current) => ({ ...current, schema_key: e.target.value }))}
              className={classNames({ 'p-invalid': schemaErrors.schema_key })}
            />
            {schemaErrors.schema_key ? <small className="p-error">{schemaErrors.schema_key}</small> : null}
          </div>
          <div className="col-12 md:col-6">
            <label className="block mb-2">Schema Name</label>
            <InputText
              value={schemaForm.schema_name}
              onChange={(e) => setSchemaForm((current) => ({ ...current, schema_name: e.target.value }))}
              className={classNames({ 'p-invalid': schemaErrors.schema_name })}
            />
            {schemaErrors.schema_name ? <small className="p-error">{schemaErrors.schema_name}</small> : null}
          </div>
          <div className="col-12 md:col-6">
            <label className="block mb-2">Module Key</label>
            <InputText
              value={schemaForm.module_key}
              onChange={(e) => setSchemaForm((current) => ({ ...current, module_key: e.target.value }))}
              className={classNames({ 'p-invalid': schemaErrors.module_key })}
            />
            {schemaErrors.module_key ? <small className="p-error">{schemaErrors.module_key}</small> : null}
          </div>
          <div className="col-12 md:col-6">
            <label className="block mb-2">Entity Key</label>
            <InputText
              value={schemaForm.entity_key}
              onChange={(e) => setSchemaForm((current) => ({ ...current, entity_key: e.target.value }))}
              className={classNames({ 'p-invalid': schemaErrors.entity_key })}
            />
            {schemaErrors.entity_key ? <small className="p-error">{schemaErrors.entity_key}</small> : null}
          </div>
          <div className="col-12">
            <label className="block mb-2">Description</label>
            <InputTextarea
              value={schemaForm.description}
              onChange={(e) => setSchemaForm((current) => ({ ...current, description: e.target.value }))}
              rows={2}
              autoResize
            />
          </div>
          <div className="col-12 flex align-items-center gap-2">
            <InputSwitch
              checked={schemaForm.is_active}
              onChange={(e) => setSchemaForm((current) => ({ ...current, is_active: e.value }))}
            />
            <span>Active</span>
          </div>
        </div>

        <div className="flex justify-content-end gap-2 mt-4">
          <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setSchemaDialogVisible(false)} />
          <Button
            label={schemaSubmitting ? 'Saving...' : 'Save Schema'}
            icon="pi pi-check"
            onClick={handleSaveSchema}
            loading={schemaSubmitting || schemaLoading}
          />
        </div>
      </Dialog>

      <Dialog
        visible={fieldDialogVisible}
        onHide={() => setFieldDialogVisible(false)}
        header={selectedField ? 'Edit Field' : 'Add Field'}
        style={{ width: '900px', maxWidth: '95vw' }}
        modal
      >
        <div className="grid">
          <div className="col-12 md:col-6">
            <label className="block mb-2">Field Key</label>
            <InputText
              value={fieldForm.field_key}
              onChange={(e) => setFieldForm((current) => ({ ...current, field_key: e.target.value }))}
              className={classNames({ 'p-invalid': fieldErrors.field_key })}
            />
            {fieldErrors.field_key ? <small className="p-error">{fieldErrors.field_key}</small> : null}
          </div>
          <div className="col-12 md:col-6">
            <label className="block mb-2">Field Label</label>
            <InputText
              value={fieldForm.field_label}
              onChange={(e) => setFieldForm((current) => ({ ...current, field_label: e.target.value }))}
              className={classNames({ 'p-invalid': fieldErrors.field_label })}
            />
            {fieldErrors.field_label ? <small className="p-error">{fieldErrors.field_label}</small> : null}
          </div>
          <div className="col-12 md:col-4">
            <label className="block mb-2">Field Type</label>
            <Dropdown
              value={fieldForm.field_type}
              options={FIELD_TYPES}
              onChange={(e) => setFieldForm((current) => ({ ...current, field_type: e.value }))}
              className={classNames({ 'p-invalid': fieldErrors.field_type })}
            />
            {fieldErrors.field_type ? <small className="p-error">{fieldErrors.field_type}</small> : null}
          </div>
          <div className="col-12 md:col-4">
            <label className="block mb-2">Display Order</label>
            <InputNumber
              value={fieldForm.display_order}
              onValueChange={(e) => setFieldForm((current) => ({ ...current, display_order: e.value || 0 }))}
            />
          </div>
          <div className="col-12 md:col-4 flex align-items-center gap-3 pt-5">
            <div className="flex align-items-center gap-2">
              <InputSwitch
                checked={fieldForm.is_required}
                onChange={(e) => setFieldForm((current) => ({ ...current, is_required: e.value }))}
              />
              <span>Required</span>
            </div>
            <div className="flex align-items-center gap-2">
              <InputSwitch
                checked={fieldForm.is_active}
                onChange={(e) => setFieldForm((current) => ({ ...current, is_active: e.value }))}
              />
              <span>Active</span>
            </div>
          </div>
          <div className="col-12 md:col-6">
            <label className="block mb-2">Placeholder</label>
            <InputText
              value={fieldForm.placeholder}
              onChange={(e) => setFieldForm((current) => ({ ...current, placeholder: e.target.value }))}
            />
          </div>
          <div className="col-12 md:col-6">
            <label className="block mb-2">Help Text</label>
            <InputText
              value={fieldForm.help_text}
              onChange={(e) => setFieldForm((current) => ({ ...current, help_text: e.target.value }))}
            />
          </div>
          <div className="col-12">
            <label className="block mb-2">Default Value JSON</label>
            <InputTextarea
              value={fieldForm.default_value_json}
              onChange={(e) => setFieldForm((current) => ({ ...current, default_value_json: e.target.value }))}
              rows={3}
              autoResize
            />
          </div>
          <div className="col-12 md:col-6">
            <label className="block mb-2">Validation Rules JSON</label>
            <InputTextarea
              value={fieldForm.validation_rules_json}
              onChange={(e) => setFieldForm((current) => ({ ...current, validation_rules_json: e.target.value }))}
              rows={4}
              autoResize
            />
          </div>
          <div className="col-12 md:col-6">
            <label className="block mb-2">UI Config JSON</label>
            <InputTextarea
              value={fieldForm.ui_config_json}
              onChange={(e) => setFieldForm((current) => ({ ...current, ui_config_json: e.target.value }))}
              rows={4}
              autoResize
            />
          </div>
          {['select', 'multiselect', 'radio'].includes(fieldForm.field_type) ? (
            <div className="col-12">
              <label className="block mb-2">Options</label>
              <InputTextarea
                value={fieldForm.options_text}
                onChange={(e) => setFieldForm((current) => ({ ...current, options_text: e.target.value }))}
                rows={5}
                autoResize
                placeholder="One option per line. Use key|label|value if you need control over labels and values."
              />
            </div>
          ) : null}
        </div>

        <div className="flex justify-content-end gap-2 mt-4">
          <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setFieldDialogVisible(false)} />
          <Button label={fieldSubmitting ? 'Saving...' : 'Save Field'} icon="pi pi-check" onClick={handleSaveField} loading={fieldSubmitting} />
        </div>
      </Dialog>
    </div>
  );
};

export default DynamicFieldManagerPage;
