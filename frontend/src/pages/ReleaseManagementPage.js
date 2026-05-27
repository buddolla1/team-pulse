import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { Toolbar } from 'primereact/toolbar';
import { classNames } from 'primereact/utils';
import {
  createRelease,
  deleteRelease,
  getAllReleases,
  updateRelease
} from '../services/api';
import authService from '../services/authService';
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

const planningStatusOptions = ['Not Started', 'In Progress', 'Completed', 'Blocked', 'On Hold'].map((value) => ({ label: value, value }));
const executionStatusOptions = ['Not Started', 'In Progress', 'Completed', 'Blocked', 'Not Applicable'].map((value) => ({ label: value, value }));
const releaseStatusOptions = ['Planned', 'In Progress', 'Released', 'Failed', 'Rolled Back', 'Cancelled', 'On Hold'].map((value) => ({ label: value, value }));
const releaseStatusFilterOptions = [{ label: 'All', value: 'All' }, ...releaseStatusOptions];

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

  const resetForm = () => {
    setSelectedRelease(null);
    setFormData(initialFormData);
    setErrors({});
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogVisible(true);
  };

  const openEditDialog = (release) => {
    setSelectedRelease(release);
    setFormData({
      ...initialFormData,
      ...release,
      planned_release_date: toDate(release.planned_release_date),
      rts_handover_planned_date: toDate(release.rts_handover_planned_date)
    });
    setErrors({});
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
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
    if (!formData.release_month) nextErrors.release_month = 'Release month is required';
    if (!formData.planned_release_date) nextErrors.planned_release_date = 'Planned release date is required';
    if (!formData.release_tag?.trim()) nextErrors.release_tag = 'Release TAG is required';
    if (!formData.application_name?.trim()) nextErrors.application_name = 'Application name is required';
    if (!formData.release_name?.trim()) nextErrors.release_name = 'Release name is required';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildSubmitData = () => ({
    ...formData,
    planned_release_date: toDateOnly(formData.planned_release_date),
    rts_handover_planned_date: toDateOnly(formData.rts_handover_planned_date)
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
      <Button label="Cancel" icon="pi pi-times" onClick={closeDialog} className="p-button-text" disabled={submitting} />
      <Button label={submitting ? 'Saving...' : 'Save'} icon="pi pi-check" onClick={handleSubmit} loading={submitting} disabled={submitting} />
    </div>
  );

  const textField = (name, label, required = false) => (
    <div className="release-form-field">
      <label htmlFor={name}>{label}{required ? <span className="p-error"> *</span> : null}</label>
      <InputText
        id={name}
        value={formData[name] || ''}
        onChange={(e) => handleChange(name, e.target.value)}
        className={classNames({ 'p-invalid': errors[name] })}
      />
      {errors[name] ? <small className="p-error">{errors[name]}</small> : null}
    </div>
  );

  const textareaField = (name, label) => (
    <div className="release-form-field full-width">
      <label htmlFor={name}>{label}</label>
      <InputTextarea
        id={name}
        value={formData[name] || ''}
        onChange={(e) => handleChange(name, e.target.value)}
        rows={3}
        autoResize
      />
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
        <div className="release-form-grid">
          <div className="release-form-field">
            <label htmlFor="release_month">Release Month <span className="p-error">*</span></label>
            <Calendar
              id="release_month"
              value={formData.release_month ? new Date(`${formData.release_month}-01`) : null}
              onChange={(e) => handleChange('release_month', toMonth(e.value))}
              view="month"
              dateFormat="yy-mm"
              showIcon
              className={classNames({ 'p-invalid': errors.release_month })}
            />
            {errors.release_month ? <small className="p-error">{errors.release_month}</small> : null}
          </div>
          <div className="release-form-field">
            <label htmlFor="planned_release_date">Planned Release Date <span className="p-error">*</span></label>
            <Calendar
              id="planned_release_date"
              value={formData.planned_release_date}
              onChange={(e) => handleChange('planned_release_date', e.value)}
              dateFormat="yy-mm-dd"
              showIcon
              className={classNames({ 'p-invalid': errors.planned_release_date })}
            />
            {errors.planned_release_date ? <small className="p-error">{errors.planned_release_date}</small> : null}
          </div>
          <div className="release-form-field">
            <label htmlFor="release_planning_status">Release Planning Status</label>
            <Dropdown id="release_planning_status" value={formData.release_planning_status} options={planningStatusOptions} onChange={(e) => handleChange('release_planning_status', e.value)} />
          </div>
          <div className="release-form-field">
            <label htmlFor="rts_handover_planned_date">RTS Handover Planned Date</label>
            <Calendar id="rts_handover_planned_date" value={formData.rts_handover_planned_date} onChange={(e) => handleChange('rts_handover_planned_date', e.value)} dateFormat="yy-mm-dd" showIcon />
          </div>
          {textField('release_tag', 'Release TAG', true)}
          {textField('application_name', 'Application Name', true)}
          {textField('release_name', 'Release Name', true)}
          {textField('build_program_manager', 'Build Program Manager')}
          {textField('qe_program_manager', 'QE Program Manager')}
          {textField('release_spoc', 'Release SPOC')}
          <div className="release-form-field">
            <label htmlFor="pre_deployment_checklist_execution">Pre-Deployment Checklist Execution</label>
            <Dropdown id="pre_deployment_checklist_execution" value={formData.pre_deployment_checklist_execution} options={executionStatusOptions} onChange={(e) => handleChange('pre_deployment_checklist_execution', e.value)} />
          </div>
          <div className="release-form-field">
            <label htmlFor="post_deployment_checklist_execution">Post-Deployment Checklist Execution</label>
            <Dropdown id="post_deployment_checklist_execution" value={formData.post_deployment_checklist_execution} options={executionStatusOptions} onChange={(e) => handleChange('post_deployment_checklist_execution', e.value)} />
          </div>
          <div className="release-form-field">
            <label htmlFor="release_status">Release Status</label>
            <Dropdown id="release_status" value={formData.release_status} options={releaseStatusOptions} onChange={(e) => handleChange('release_status', e.value)} />
          </div>
          <div className="release-form-field">
            <label htmlFor="release_encountered_issue">Release Encountered Issue?</label>
            <InputSwitch checked={formData.release_encountered_issue} onChange={(e) => handleChange('release_encountered_issue', e.value)} />
          </div>
          {textareaField('pre_deployment_checklist', 'Pre-Deployment Checklist')}
          {textareaField('implementation_plan', 'Implementation Plan')}
          {textareaField('rollback_plan', 'Rollback Plan')}
          {textareaField('post_deployment_checklist', 'Post-Deployment Checklist')}
          {textareaField('rts_handover', 'RTS Handover')}
          {textareaField('build_preparation_checklist', 'Build Preparation Checklist')}
          {textareaField('test_case_checklist', 'Test Case Check List')}
          {textareaField('dor', 'DOR')}
          {textareaField('dod', 'DOD')}
          {textareaField('issue_description', 'Issue Description')}
          {textareaField('remedy', 'Remedy')}
          {textareaField('retro', 'Retro')}
          {textareaField('remarks', 'Remarks')}
          {textField('auditor', 'Auditor')}
        </div>
      </Dialog>
    </div>
  );
};

export default ReleaseManagementPage;
