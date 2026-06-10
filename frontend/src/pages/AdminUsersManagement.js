import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toolbar } from 'primereact/toolbar';
import { Card } from 'primereact/card';
import { Panel } from 'primereact/panel';
import { Message } from 'primereact/message';
import { Timeline } from 'primereact/timeline';
import { classNames } from 'primereact/utils';
import authService from '../services/authService';
import PermissionGuard from '../components/auth/PermissionGuard';
import { getAllEmployees, resetEmployeePassword } from '../services/api';

const AdminUsersManagement = () => {
  const ROLE_CREATE_HIERARCHY = {
    super_admin: ['admin', 'manager', 'viewer', 'generaluser'],
    admin: ['manager', 'viewer', 'generaluser'],
    manager: ['viewer', 'generaluser']
  };

  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({ all: [], grouped: {} });
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditSearchInput, setAuditSearchInput] = useState('');
  const [showEmployeeResetDialog, setShowEmployeeResetDialog] = useState(false);
  const [employeeResetSearch, setEmployeeResetSearch] = useState('');
  const [employeeResetSearchInput, setEmployeeResetSearchInput] = useState('');
  const [employeeResetResults, setEmployeeResetResults] = useState([]);
  const [employeeResetLoading, setEmployeeResetLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [selectedRoleDetails, setSelectedRoleDetails] = useState(null);
  const [rolePermissionIds, setRolePermissionIds] = useState([]);
  const [rolePermissionLoading, setRolePermissionLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    status: 'Active',
    role_id: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const dt = useRef(null);
  const navigate = useNavigate();
  const canViewRolePermissions = authService.hasPermission('roles.view') || authService.hasPermission('roles.update');
  const isSuperAdminUser = currentUser?.role_name === 'super_admin' || currentUser?.role_id === 1;
  const canEditRolePermissions = authService.hasPermission('roles.update') || isSuperAdminUser;
  const canEditSystemRolePermissions = canEditRolePermissions || isSuperAdminUser;

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    fetchAdmins();
    fetchRoles();
  }, [pagination.page]);

  useEffect(() => {
    if (canViewRolePermissions) {
      fetchPermissions();
    }
  }, [canViewRolePermissions]);

  const fetchRoles = async () => {
    try {
      const response = await authService.getAllRoles();
      if (response.success) {
        setRoles(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await authService.getAllPermissions();
      if (response.success) {
        setPermissions(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  };

  const fetchRoleDetails = async (roleId) => {
    if (!roleId || !canViewRolePermissions) {
      setSelectedRoleDetails(null);
      setRolePermissionIds([]);
      return;
    }

    try {
      setRolePermissionLoading(true);
      const response = await authService.getRoleById(roleId);
      if (response.success) {
        setSelectedRoleDetails(response.data);
        setRolePermissionIds((response.data.permissions || []).map(permission => permission.id));
      } else {
        setSelectedRoleDetails(null);
        setRolePermissionIds([]);
        toast.error(response.message || 'Failed to load role permissions');
      }
    } catch (err) {
      setSelectedRoleDetails(null);
      setRolePermissionIds([]);
      toast.error(err.response?.data?.message || 'Failed to load role permissions');
    } finally {
      setRolePermissionLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await authService.getAllAdmins(pagination.page, pagination.limit);
      if (response.success) {
        setAdmins(response.data);
        setPagination(prev => ({ ...prev, total: response.pagination.total }));
      } else {
        toast.error(response.message || 'Failed to load admin users');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'An error occurred while fetching admin users');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await authService.getAuditLogs(auditPagination.page, auditPagination.limit, {
        search: auditSearch.trim()
      });
      if (response.success) {
        setAuditLogs(response.data);
        setAuditPagination(prev => ({ ...prev, total: response.pagination.total }));
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  useEffect(() => {
    if (showAuditLogs) {
      fetchAuditLogs();
    }
  }, [showAuditLogs, auditPagination.page, auditSearch]);

  const handleAuditSearch = () => {
    setAuditPagination(prev => ({ ...prev, page: 1 }));
    setAuditSearch(auditSearchInput.trim());
  };

  const clearAuditSearch = () => {
    setAuditSearchInput('');
    setAuditPagination(prev => ({ ...prev, page: 1 }));
    setAuditSearch('');
  };

  const closeEmployeeResetDialog = () => {
    setShowEmployeeResetDialog(false);
    setEmployeeResetSearch('');
    setEmployeeResetSearchInput('');
    setEmployeeResetResults([]);
    setEmployeeResetLoading(false);
  };

  const searchEmployeesForReset = async () => {
    const query = employeeResetSearchInput.trim();
    if (!query) {
      toast.warn('Enter an employee name or SSO to search.');
      return;
    }

    try {
      setEmployeeResetLoading(true);
      const response = await getAllEmployees(1, 10, null, 'name', 'ASC', query);
      if (response.data?.success) {
        setEmployeeResetSearch(query);
        setEmployeeResetResults(response.data.data || []);
      } else {
        setEmployeeResetResults([]);
        toast.error(response.data?.message || 'Failed to search employees');
      }
    } catch (err) {
      setEmployeeResetResults([]);
      toast.error(err.response?.data?.message || 'Failed to search employees');
    } finally {
      setEmployeeResetLoading(false);
    }
  };

  const handleResetEmployeePassword = (employee) => {
    confirmDialog({
      message: `Reset ${employee.name}'s password to Temp@1234 and force a change on next login?`,
      header: 'Reset Employee Password',
      icon: 'pi pi-key',
      accept: async () => {
        try {
          await resetEmployeePassword(employee.id);
          toast.success(`${employee.name}'s password has been reset to Temp@1234`);
          closeEmployeeResetDialog();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to reset employee password');
          console.error('Error resetting employee password:', err);
        }
      }
    });
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const togglePermission = (permissionId) => {
    setRolePermissionIds(prev => (
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    ));
  };

  const isModuleFullySelected = (module) => {
    const modulePermissions = permissions.grouped[module] || [];
    return modulePermissions.length > 0 && modulePermissions.every(permission => rolePermissionIds.includes(permission.id));
  };

  const toggleModulePermissions = (module) => {
    const modulePermissions = permissions.grouped[module] || [];
    const modulePermissionIds = modulePermissions.map(permission => permission.id);
    const allSelected = modulePermissionIds.every(id => rolePermissionIds.includes(id));

    setRolePermissionIds(prev => (
      allSelected
        ? prev.filter(id => !modulePermissionIds.includes(id))
        : [...new Set([...prev, ...modulePermissionIds])]
    ));
  };

  const handleRoleChange = async (roleId) => {
    handleInputChange('role_id', roleId);
    setSelectedRoleDetails(null);
    setRolePermissionIds([]);

    if (roleId && canViewRolePermissions) {
      await fetchRoleDetails(roleId);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!selectedAdmin && !formData.password) newErrors.password = 'Password is required';
    if (formData.password && formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (
        selectedAdmin &&
        canEditRolePermissions &&
        selectedRoleDetails &&
        (!selectedRoleDetails.is_system_role || canEditSystemRolePermissions)
      ) {
        const roleUpdatePayload = {
          display_name: selectedRoleDetails.display_name,
          description: selectedRoleDetails.description || '',
          permission_ids: rolePermissionIds
        };

        const roleResponse = await authService.updateRole(selectedRoleDetails.id, roleUpdatePayload);
        if (!roleResponse.success) {
          throw new Error(roleResponse.message || 'Failed to update role permissions');
        }

        await authService.refreshPermissions();
      }

      if (selectedAdmin) {
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        const response = await authService.updateAdmin(selectedAdmin.id, updateData);
        if (response.success) {
          fetchAdmins();
          resetForm();
          toast.success('Admin user updated successfully!');
        }
      } else {
        const response = await authService.createAdmin(formData);
        if (response.success) {
          fetchAdmins();
          resetForm();
          toast.success('Admin user created successfully!');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'An error occurred while saving admin user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      username: admin.username,
      email: admin.email,
      password: '',
      full_name: admin.full_name,
      status: admin.status,
      role_id: admin.role_id || ''
    });
    setShowForm(true);

    if (admin.role_id && canViewRolePermissions) {
      fetchRoleDetails(admin.role_id);
    } else {
      setSelectedRoleDetails(null);
      setRolePermissionIds([]);
    }
  };

  const handleDelete = (admin) => {
    confirmDialog({
      message: `Are you sure you want to delete admin user ${admin.username}?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          const response = await authService.deleteAdmin(admin.id);
          if (response.success) {
            fetchAdmins();
            toast.success('Admin user deleted successfully!');
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'An error occurred while deleting admin user');
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
      status: 'Active',
      role_id: ''
    });
    setSelectedAdmin(null);
    setSelectedRoleDetails(null);
    setRolePermissionIds([]);
    setRolePermissionLoading(false);
    setShowForm(false);
    setErrors({});
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  // Column templates
  const statusBodyTemplate = (rowData) => {
    const getSeverity = (status) => {
      switch (status) {
        case 'Active': return 'success';
        case 'Inactive': return 'warning';
        case 'Suspended': return 'danger';
        default: return null;
      }
    };
    return <Tag value={rowData.status} severity={getSeverity(rowData.status)} />;
  };

  const lastLoginBodyTemplate = (rowData) => {
    return formatDate(rowData.last_login);
  };

  const actionBodyTemplate = (rowData) => {
    const isCurrentUser = currentUser?.id === rowData.id;
    return (
      <div className="flex gap-2">
        <PermissionGuard permission="admin_users.update">
          <Button
            icon="pi pi-pencil"
            rounded
            outlined
            className="p-button-success"
            onClick={() => handleEdit(rowData)}
            tooltip="Edit"
            tooltipOptions={{ position: 'top' }}
          />
        </PermissionGuard>
        <PermissionGuard permission="admin_users.delete">
          <Button
            icon="pi pi-trash"
            rounded
            outlined
            severity="danger"
            onClick={() => handleDelete(rowData)}
            disabled={isCurrentUser}
            tooltip={isCurrentUser ? "Cannot delete yourself" : "Delete"}
            tooltipOptions={{ position: 'top' }}
          />
        </PermissionGuard>
      </div>
    );
  };

  const roleBodyTemplate = (rowData) => {
    const role = roles.find(r => r.id === rowData.role_id);
    return role ? <Tag value={role.display_name} severity="info" /> : <span className="text-500">No Role</span>;
  };

  const getAllowedRoleNames = () => {
    if (!currentUser?.role_name) return [];
    return ROLE_CREATE_HIERARCHY[currentUser.role_name] || [];
  };

  const getAllowedRoleLabels = () => {
    const allowedRoleNames = getAllowedRoleNames();
    return roles
      .filter(role => allowedRoleNames.includes(role.name))
      .map(role => role.display_name);
  };

  const getRoleOptions = () => {
    const allowedRoleNames = getAllowedRoleNames();
    const filteredRoles = roles.filter(role => allowedRoleNames.includes(role.name));
    const currentSelectedRole = selectedAdmin ? roles.find(role => role.id === selectedAdmin.role_id) : null;

    const normalizedOptions = filteredRoles.map(role => ({
      label: `${role.display_name} (${role.permission_count} permissions)`,
      value: role.id
    }));

    if (currentSelectedRole && !allowedRoleNames.includes(currentSelectedRole.name)) {
      normalizedOptions.unshift({
        label: `${currentSelectedRole.display_name} (${currentSelectedRole.permission_count} permissions)`,
        value: currentSelectedRole.id
      });
    }

    return [
      { label: 'No Role Assigned', value: '' },
      ...normalizedOptions
    ];
  };

  // Toolbar templates
  const leftToolbarTemplate = () => {
    return (
      <div className="flex flex-wrap gap-2">
        <h2 className="m-0">User Management</h2>
      </div>
    );
  };

  const rightToolbarTemplate = () => {
    return (
      <div className="flex gap-2">
        <PermissionGuard permission="audit.view">
          <Button
            label={showAuditLogs ? 'Hide Audit Logs' : 'View Audit Logs'}
            icon="pi pi-history"
            onClick={() => setShowAuditLogs(!showAuditLogs)}
            className="p-button-help"
          />
        </PermissionGuard>
        <PermissionGuard permission="admin_users.create">
          <Button
            label="Add User"
            icon="pi pi-plus"
            onClick={() => setShowForm(true)}
            className="p-button-success"
          />
        </PermissionGuard>
        <PermissionGuard permission="employees.update">
          <Button
            label="Reset Employee Password"
            icon="pi pi-key"
            onClick={() => setShowEmployeeResetDialog(true)}
            className="p-button-warning"
          />
        </PermissionGuard>
        <Button
          label="Back to Dashboard"
          icon="pi pi-arrow-left"
          onClick={() => navigate('/admin/dashboard')}
          className="p-button-secondary"
        />
      </div>
    );
  };

  // Dialog footer
  const dialogFooter = (
    <div>
      <Button label="Cancel" icon="pi pi-times" onClick={resetForm} className="p-button-text" aria-label="Cancel" />
      <Button
        label="Save"
        icon="pi pi-check"
        onClick={handleSubmit}
        loading={submitting}
        disabled={rolePermissionLoading && selectedAdmin && canEditRolePermissions}
      />
    </div>
  );

  const statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Suspended', value: 'Suspended' }
  ];

  const roleOptions = getRoleOptions();
  const selectedRole = roles.find(role => Number(role.id) === Number(formData.role_id)) || selectedRoleDetails;
  const rolePermissionsGrouped = permissions.grouped || {};
  const canModifySelectedRolePermissions = Boolean(
    selectedAdmin &&
    canEditRolePermissions &&
    selectedRole &&
    (!selectedRole.is_system_role || canEditSystemRolePermissions)
  );

  // Audit log customization
  const auditLogMarker = (item) => {
    const iconMap = {
      'LOGIN': 'pi-sign-in',
      'LOGOUT': 'pi-sign-out',
      'CREATE': 'pi-plus',
      'UPDATE': 'pi-pencil',
      'DELETE': 'pi-trash'
    };
    const colorMap = {
      'LOGIN': 'success',
      'LOGOUT': 'info',
      'CREATE': 'success',
      'UPDATE': 'warning',
      'DELETE': 'danger'
    };
    return (
      <span className={`flex w-2rem h-2rem align-items-center justify-content-center text-white border-circle z-1 shadow-1`}
        style={{ backgroundColor: `var(--${colorMap[item.action]}-color)` }}>
        <i className={`pi ${iconMap[item.action]}`}></i>
      </span>
    );
  };

  const auditLogContent = (item) => {
    return (
      <Card title={`${item.full_name || item.username} - ${item.action}`} subTitle={formatDate(item.created_at)}>
        <p>{item.description}</p>
        <small className="text-500">IP: {item.ip_address}</small>
      </Card>
    );
  };

  return (
    <div className="card">
      <ConfirmDialog />
      <Toolbar className="" left={leftToolbarTemplate} right={rightToolbarTemplate} />

      {/* Audit Logs Section */}
      {showAuditLogs && (
        <Card title="Audit Logs" className="mb-4">
          <div className="flex flex-wrap gap-2 mb-3 align-items-center">
            <span className="p-input-icon-left" style={{ minWidth: '280px', flex: '1 1 280px' }}>
              <i className="pi pi-search" />
              <InputText
                value={auditSearchInput}
                onChange={(e) => setAuditSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAuditSearch();
                  }
                }}
                placeholder="Search sprint KPI logs, actions, users, boards"
                style={{ width: '100%' }}
              />
            </span>
            <Button label="Search" icon="pi pi-search" onClick={handleAuditSearch} />
            <Button label="Clear" icon="pi pi-times" text onClick={clearAuditSearch} disabled={!auditSearch && !auditSearchInput} />
          </div>
          {auditLogs.length > 0 ? (
            <Timeline value={auditLogs} align="alternate" content={auditLogContent} marker={auditLogMarker} />
          ) : (
            <p className="text-center text-500">No audit logs found</p>
          )}
        </Card>
      )}

      <Dialog
        visible={showEmployeeResetDialog}
        style={{ width: '60vw' }}
        breakpoints={{ '960px': '80vw', '641px': '95vw' }}
        header="Reset Employee Password"
        modal
        className="p-fluid"
        onHide={closeEmployeeResetDialog}
      >
        <div className="flex flex-wrap gap-2 mb-3 align-items-center">
          <span className="p-input-icon-left" style={{ minWidth: '280px', flex: '1 1 280px' }}>
            <i className="pi pi-search" />
            <InputText
              value={employeeResetSearchInput}
              onChange={(e) => setEmployeeResetSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchEmployeesForReset();
                }
              }}
              placeholder="Search employee by name or SSO"
              style={{ width: '100%' }}
            />
          </span>
          <Button label="Search" icon="pi pi-search" onClick={searchEmployeesForReset} loading={employeeResetLoading} />
          <Button
            label="Clear"
            icon="pi pi-times"
            text
            onClick={() => {
              setEmployeeResetSearchInput('');
              setEmployeeResetSearch('');
              setEmployeeResetResults([]);
            }}
            disabled={!employeeResetSearchInput && !employeeResetSearch}
          />
        </div>

        <DataTable
          value={employeeResetResults}
          loading={employeeResetLoading}
          emptyMessage="Search for an employee to reset their password"
          responsiveLayout="scroll"
          stripedRows
          showGridlines
          size="small"
        >
          <Column field="id" header="ID" style={{ minWidth: '80px' }} />
          <Column field="sso" header="SSO" style={{ minWidth: '120px' }} />
          <Column field="name" header="Name" style={{ minWidth: '150px' }} />
          <Column field="role" header="Role" style={{ minWidth: '150px' }} />
          <Column field="status" header="Status" style={{ minWidth: '110px' }} />
          <Column
            header="Action"
            body={(rowData) => (
              <Button
                label="Reset"
                icon="pi pi-refresh"
                className="p-button-warning p-button-sm"
                onClick={() => handleResetEmployeePassword(rowData)}
              />
            )}
            exportable={false}
            style={{ minWidth: '130px' }}
          />
        </DataTable>
      </Dialog>

      {/* Admin Users DataTable */}
      <DataTable
        ref={dt}
        value={admins}
        loading={loading}
        paginator={pagination.total > 10}
        rows={pagination.limit}
        totalRecords={pagination.total}
        onPage={(e) => setPagination(prev => ({ ...prev, page: e.page + 1 }))}
        emptyMessage="No admin users found"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} Admins"
        responsiveLayout="scroll"
        stripedRows
        showGridlines
      >
        <Column field="id" header="ID" sortable style={{ minWidth: '80px' }} />
        <Column field="username" header="Username" sortable style={{ minWidth: '120px' }} />
        <Column field="full_name" header="Full Name" sortable style={{ minWidth: '150px' }} />
        <Column field="email" header="Email" sortable style={{ minWidth: '200px' }} />
        <Column field="role_id" header="Role" body={roleBodyTemplate} style={{ minWidth: '150px' }} />
        <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '110px' }} />
        <Column field="last_login" header="Last Login" body={lastLoginBodyTemplate} sortable style={{ minWidth: '180px' }} />
        <Column header="Actions" body={actionBodyTemplate} exportable={false} style={{ minWidth: '150px' }} />
      </DataTable>

      {/* Add/Edit Dialog */}
      <Dialog
        visible={showForm}
        style={{ width: '50vw' }}
        breakpoints={{ '960px': '75vw', '641px': '95vw' }}
        header={selectedAdmin ? 'Edit User' : 'Add User'}
        modal
        className="p-fluid"
        footer={dialogFooter}
        onHide={resetForm}
      >
        <div className="formgrid grid">
          <div className="field col-12 md:col-6">
            <label htmlFor="username">Username *</label>
            <InputText
              id="username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              disabled={!!selectedAdmin}
              className={classNames({ 'p-invalid': errors.username })}
            />
            {errors.username && <small className="p-error">{errors.username}</small>}
          </div>

          <div className="field col-12 md:col-6">
            <label htmlFor="email">Email *</label>
            <InputText
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={classNames({ 'p-invalid': errors.email })}
            />
            {errors.email && <small className="p-error">{errors.email}</small>}
          </div>

          <div className="field col-12 md:col-6">
            <label htmlFor="full_name">Full Name *</label>
            <InputText
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className={classNames({ 'p-invalid': errors.full_name })}
            />
            {errors.full_name && <small className="p-error">{errors.full_name}</small>}
          </div>

          <div className="field col-12 md:col-6">
            <label htmlFor="status">Status *</label>
            <Dropdown
              id="status"
              value={formData.status}
              options={statusOptions}
              onChange={(e) => handleInputChange('status', e.value)}
            />
          </div>

          <div className="field col-12 md:col-6">
            <label htmlFor="role_id">Role</label>
            <Dropdown
              id="role_id"
              value={formData.role_id}
              options={roleOptions}
              onChange={(e) => handleRoleChange(e.value)}
              filter
              filterPlaceholder="Search roles"
              showClear
            />
            <small className="block mt-1">
              Available roles: {getAllowedRoleLabels().length > 0 ? getAllowedRoleLabels().join(', ') : 'None'}
            </small>
          </div>

          {selectedAdmin && isSuperAdminUser && (
            <div className="field col-12">
              <Panel
                header="Role Permissions"
                toggleable
                collapsed={false}
              >
                {!canViewRolePermissions ? (
                  <Message severity="info" text="You can change the user's role here, but your current access does not allow viewing or editing role permissions." />
                ) : !selectedRole ? (
                  <Message severity="info" text="Select a role to view its permissions." />
                ) : (
                  <>
                    <Message
                      severity="info"
                      className="mb-3"
                      text="Editing permissions here updates the selected role and affects every admin assigned to it."
                    />

                    <div className="flex align-items-center justify-content-between mb-3">
                      <strong>{selectedRole.display_name}</strong>
                      <span className="text-500">
                        {rolePermissionIds.length} permission{rolePermissionIds.length === 1 ? '' : 's'} selected
                      </span>
                    </div>

                    {rolePermissionLoading ? (
                      <p className="text-500">Loading permissions...</p>
                    ) : Object.keys(rolePermissionsGrouped).length > 0 ? (
                      <div className="grid">
                        {Object.keys(rolePermissionsGrouped).map(module => (
                          <div className="col-12 md:col-6" key={module}>
                            <Panel
                              header={
                                <div className="flex align-items-center justify-content-between gap-2">
                                  <span>{module}</span>
                                  <Button
                                    type="button"
                                    label={isModuleFullySelected(module) ? 'Clear' : 'Select All'}
                                    className="p-button-text p-button-sm"
                                    disabled={!canModifySelectedRolePermissions}
                                    onClick={() => toggleModulePermissions(module)}
                                  />
                                </div>
                              }
                              toggleable
                            >
                              <div className="flex flex-column gap-2">
                                {rolePermissionsGrouped[module].map(permission => (
                                  <div key={permission.id} className="flex align-items-start gap-2">
                                    <Checkbox
                                      inputId={`perm-${permission.id}`}
                                      checked={rolePermissionIds.includes(permission.id)}
                                      disabled={!canModifySelectedRolePermissions}
                                      onChange={() => togglePermission(permission.id)}
                                    />
                                    <label htmlFor={`perm-${permission.id}`} className="cursor-pointer">
                                      <div className="font-medium">{permission.description || permission.name}</div>
                                      <small className="text-500">{permission.name}</small>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </Panel>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-500">No permissions available.</p>
                    )}
                  </>
                )}
              </Panel>
            </div>
          )}

          <div className="field col-12 md:col-6">
            <label htmlFor="password">
              Password {!selectedAdmin && '*'}
              {selectedAdmin && ' (leave blank to keep current)'}
            </label>
            <InputText
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={classNames({ 'p-invalid': errors.password })}
            />
            {errors.password && <small className="p-error">{errors.password}</small>}
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default AdminUsersManagement;
