import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Toolbar } from 'primereact/toolbar';
import {
  createRelease,
  deleteRelease,
  getDynamicSchema,
  getAllReleases,
  getReleaseById,
  loadReleaseManagementTemplate,
  updateRelease
} from '../services/api';
import authService from '../services/authService';
import DynamicFieldRenderer from '../components/dynamic-fields/DynamicFieldRenderer';
import './ReleaseManagementPage.css';

const initialFormData = {
  release_month: '',
  planned_release_date: null,
  release_planning_status: 'Not Started',
  rts_handover_planned_date: null,
  release_tag: '',
  application_name: '',
  release_name: '',
  build_program_manager: '',
  qe_program_manager: '',
  release_spoc: '',
  pre_deployment_checklist: '',
  implementation_plan: '',
  rollback_plan: '',
  post_deployment_checklist: '',
  rts_handover: '',
  build_preparation_checklist: '',
  test_case_checklist: '',
  dor: '',
  dod: '',
  pre_deployment_checklist_execution: 'Not Started',
  post_deployment_checklist_execution: 'Not Started',
  release_encountered_issue: false,
  issue_description: '',
  remedy: '',
  release_status: 'Planned',
  retro: '',
  remarks: '',
  auditor: ''
};

const releaseStatusOptions = ['Planned', 'In Progress', 'Released', 'Failed', 'Rolled Back', 'Cancelled', 'On Hold'].map((value) => ({ label: value, value }));
const releaseStatusFilterOptions = [{ label: 'All', value: 'All' }, ...releaseStatusOptions];
const RELEASE_DYNAMIC_MODULE = 'release_management';
const RELEASE_DYNAMIC_ENTITY = 'release';

const toDate = (value) => (value ? new Date(value) : null);
const toDateOnly = (value) => (value ? value.toISOString().split('T')[0] : null);
const toMonth = (value) => (value ? value.toISOString().slice(0, 7) : '');
const getCurrentMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1);

const statusSeverity = {
  Planned: 'info',
  'In Progress': 'warning',
  Released: 'success',
  Failed: 'danger',
  'Rolled Back': 'danger',
  Cancelled: 'secondary',
  'On Hold': 'warning'
};

const ReleaseManagementPage = () => {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState(getCurrentMonth());
  const [customSchema, setCustomSchema] = useState(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [lazyState, setLazyState] = useState({
    first: 0,
    rows: 10,
    page: 0,
    sortField: 'created_at',
    sortOrder: -1
  });
  const dt = useRef(null);
  const canCreateRelease = authService.hasPermission('release_management.create');
  const canUpdateRelease = authService.hasPermission('release_management.update');
  const canDeleteRelease = authService.hasPermission('release_management.delete');

  const normalizeLazyState = (event = {}) => {
    const rows = Number(event.rows || lazyState.rows || 10);
    const first = Number.isFinite(Number(event.first)) ? Number(event.first) : 0;
    const eventPage = Number(event.page);
    const page = Number.isFinite(eventPage) ? eventPage : Math.floor(first / rows);

    return {
      ...lazyState,
      ...event,
      first,
      rows,
      page,
      sortField: event.sortField || lazyState.sortField || 'created_at',
      sortOrder: event.sortOrder || lazyState.sortOrder || -1
    };
  };

  const handlePage = (event) => {
    setLazyState(normalizeLazyState(event));
  };

  const handleSort = (event) => {
    setLazyState(normalizeLazyState({ ...event, first: 0, page: 0 }));
  };

  const loadReleases = useCallback(async () => {
    try {
      setLoading(true);
      const sortOrder = lazyState.sortOrder === 1 ? 'ASC' : 'DESC';
      const response = await getAllReleases(
        lazyState.page + 1,
        lazyState.rows,
        statusFilter,
        lazyState.sortField || 'created_at',
        sortOrder,
        globalFilter,
        toMonth(monthFilter)
      );
      setReleases(response.data.data || []);
      setTotalRecords(response.data.pagination?.total || 0);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch releases');
    } finally {
      setLoading(false);
    }
  }, [globalFilter, lazyState, monthFilter, statusFilter]);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  const refreshCustomSchema = useCallback(async (autoCreate = false) => {
    const fetchSchema = async () => {
      const response = await getDynamicSchema(RELEASE_DYNAMIC_MODULE, RELEASE_DYNAMIC_ENTITY);
      return response.data?.data || null;
    };

    try {
      let schema = await fetchSchema();

      if (!schema && autoCreate) {
        await loadReleaseManagementTemplate();
        schema = await fetchSchema();
      }

      setCustomSchema(schema);
      return schema;
    } catch (error) {
      if (autoCreate) {
        try {
          await loadReleaseManagementTemplate();
          const schema = await fetchSchema();
          setCustomSchema(schema);
          return schema;
        } catch (createError) {
          setCustomSchema(null);
          toast.error(createError.response?.data?.message || 'Failed to load release schema');
          return null;
        }
      }

      setCustomSchema(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshCustomSchema(true);
  }, [refreshCustomSchema]);

  const resetForm = () => {
    setSelectedRelease(null);
    setFormData(initialFormData);
    setErrors({});
  };

  const openCreateDialog = async () => {
    resetForm();
    setDialogVisible(true);
    setDialogLoading(true);
    await refreshCustomSchema(true);
    setDialogLoading(false);
  };

  const openEditDialog = async (release) => {
    try {
      setDialogVisible(true);
      setDialogLoading(true);
      await refreshCustomSchema(true);
      const response = await getReleaseById(release.id);
      const releaseData = response.data.data;
      setSelectedRelease(releaseData);
      setFormData({
        ...initialFormData,
        ...releaseData,
        planned_release_date: toDate(releaseData.planned_release_date),
        rts_handover_planned_date: toDate(releaseData.rts_handover_planned_date)
      });
      setErrors({});
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load release details');
    } finally {
      setDialogLoading(false);
    }
  };

  const closeDialog = () => {
    setDialogVisible(false);
    setDialogLoading(false);
    resetForm();
  };

  const handleChange = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: null }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    const fieldsToValidate = customSchema?.fields?.length ? customSchema.fields : [];

    if (fieldsToValidate.length > 0) {
      fieldsToValidate.forEach((field) => {
        if (!field.is_required) return;
        const value = formData[field.field_key];
        const emptyArray = Array.isArray(value) && value.length === 0;
        const emptyValue = value === null || value === undefined || value === '';
        if (emptyArray || emptyValue) {
          nextErrors[field.field_key] = `${field.field_label} is required`;
        }
      });
    } else {
      if (!formData.release_month) nextErrors.release_month = 'Release month is required';
      if (!formData.planned_release_date) nextErrors.planned_release_date = 'Planned release date is required';
      if (!formData.release_tag?.trim()) nextErrors.release_tag = 'Release TAG is required';
      if (!formData.application_name?.trim()) nextErrors.application_name = 'Application name is required';
      if (!formData.release_name?.trim()) nextErrors.release_name = 'Release name is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildSubmitData = () => ({
    ...formData,
    planned_release_date: toDateOnly(formData.planned_release_date),
    rts_handover_planned_date: toDateOnly(formData.rts_handover_planned_date),
  });

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      const submitData = buildSubmitData();
      if (selectedRelease) {
        await updateRelease(selectedRelease.id, submitData);
        toast.success('Release updated successfully');
      } else {
        await createRelease(submitData);
        toast.success('Release created successfully');
      }
      closeDialog();
      loadReleases();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save release');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (release) => {
    confirmDialog({
      message: `Delete release ${release.release_tag}?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await deleteRelease(release.id);
          toast.success('Release deleted successfully');
          loadReleases();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete release');
        }
      }
    });
  };

  const dateTemplate = (row, field) => {
    if (!row[field]) return '-';
    return new Date(row[field]).toLocaleDateString();
  };

  const statusTemplate = (row) => (
    <Tag value={row.release_status} severity={statusSeverity[row.release_status] || 'info'} />
  );

  const issueTemplate = (row) => (
    <Tag value={row.release_encountered_issue ? 'Yes' : 'No'} severity={row.release_encountered_issue ? 'danger' : 'success'} />
  );

  const actionsTemplate = (row) => (
    <div className="action-buttons">
      {canUpdateRelease ? (
        <Button
          icon="pi pi-pencil"
          className="p-button-rounded p-button-text p-button-warning"
          onClick={() => openEditDialog(row)}
          tooltip="Edit"
          tooltipOptions={{ position: 'top' }}
        />
      ) : null}
      {canDeleteRelease ? (
        <Button
          icon="pi pi-trash"
          className="p-button-rounded p-button-text p-button-danger"
          onClick={() => handleDelete(row)}
          tooltip="Delete"
          tooltipOptions={{ position: 'top' }}
        />
      ) : null}
    </div>
  );

  const leftToolbarTemplate = () => <h2 className="p-m-0">Release Management</h2>;
  const rightToolbarTemplate = () => canCreateRelease ? (
    <Button label="New Release" icon="pi pi-plus" className="p-button-success" onClick={openCreateDialog} />
  ) : null;

  const tableHeader = (
    <div className="release-table-header">
      <div className="release-table-filters">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search releases..."
            style={{ minWidth: '250px' }}
          />
        </span>
        <Dropdown
          value={statusFilter}
          options={releaseStatusFilterOptions}
          onChange={(e) => setStatusFilter(e.value)}
          placeholder="Status"
          style={{ minWidth: '160px' }}
        />
        <Calendar
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.value)}
          view="month"
          dateFormat="yy-mm"
          placeholder="Release month"
          showIcon
        />
        {monthFilter ? (
          <Button icon="pi pi-times" className="p-button-text" onClick={() => setMonthFilter(getCurrentMonth())} tooltip="Reset to current month" />
        ) : null}
      </div>
      <div className="release-table-actions">
        <Button icon="pi pi-search" label="Search" className="p-button-secondary" onClick={loadReleases} />
      </div>
    </div>
  );

  const dialogFooter = (
    <div className="release-form-actions">
      <Button label="Cancel" icon="pi pi-times" onClick={closeDialog} className="p-button-text" disabled={submitting || dialogLoading} />
      <Button label={submitting ? 'Saving...' : 'Save'} icon="pi pi-check" onClick={handleSubmit} loading={submitting} disabled={submitting || dialogLoading} />
    </div>
  );

  return (
    <div className="release-management-page">
      <ConfirmDialog />
      <Toolbar className="p-mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

      <DataTable
        ref={dt}
        value={releases}
        lazy
        paginator
        first={lazyState.first}
        rows={lazyState.rows}
        totalRecords={totalRecords}
        onPage={handlePage}
        onSort={handleSort}
        sortField={lazyState.sortField}
        sortOrder={lazyState.sortOrder}
        loading={loading}
        header={tableHeader}
        dataKey="id"
        emptyMessage="No releases found"
        responsiveLayout="scroll"
        rowsPerPageOptions={[10, 25, 50]}
      >
        <Column field="release_tag" header="Release TAG" sortable />
        <Column field="release_month" header="Month" sortable />
        <Column field="planned_release_date" header="Planned Date" body={(row) => dateTemplate(row, 'planned_release_date')} sortable />
        <Column field="application_name" header="Application" sortable />
        <Column field="release_name" header="Release Name" sortable />
        <Column field="release_spoc" header="SPOC" />
        <Column field="release_status" header="Status" body={statusTemplate} sortable />
        <Column field="release_encountered_issue" header="Issue?" body={issueTemplate} />
        {(canUpdateRelease || canDeleteRelease) ? <Column body={actionsTemplate} header="Actions" style={{ width: '120px' }} /> : null}
      </DataTable>

      <Dialog
        visible={dialogVisible}
        style={{ width: '900px', maxWidth: '95vw' }}
        header={selectedRelease ? 'Edit Release' : 'Create Release'}
        modal
        className="p-fluid"
        footer={dialogFooter}
        onHide={closeDialog}
      >
        {dialogLoading ? (
          <div className="p-4">Loading release schema...</div>
        ) : (
          <div className="release-form-grid">
            {customSchema?.fields?.length ? (
              <DynamicFieldRenderer
                fields={customSchema.fields}
                values={formData}
                errors={errors}
                onChange={handleChange}
                columns={2}
              />
            ) : (
              <div className="release-form-field full-width">
                <small className="text-600">No release schema is configured.</small>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default ReleaseManagementPage;
