import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toolbar } from 'primereact/toolbar';
import { Checkbox } from 'primereact/checkbox';
import {
  createNavigationItem,
  deleteNavigationItem,
  getNavigationItems,
  updateNavigationItem
} from '../services/api';

const initialFormData = {
  menu_key: '',
  label: '',
  route_path: '',
  match_type: 'exact',
  permission_name: '',
  permission_description: '',
  icon_class: '',
  show_in_sidebar: true,
  show_in_topnav: false,
  sort_order: 0,
  is_active: true
};

const NavigationManagementPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await getNavigationItems();
      setItems(response.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load navigation items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const resetForm = () => {
    setEditingItem(null);
    setFormData(initialFormData);
    setErrors({});
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogVisible(true);
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setFormData({
      menu_key: item.menu_key || '',
      label: item.label || '',
      route_path: item.route_path || '',
      match_type: item.match_type || 'exact',
      permission_name: item.permission_name || '',
      permission_description: item.permission_description || '',
      icon_class: item.icon_class || '',
      show_in_sidebar: Boolean(item.show_in_sidebar),
      show_in_topnav: Boolean(item.show_in_topnav),
      sort_order: Number(item.sort_order || 0),
      is_active: Boolean(item.is_active)
    });
    setErrors({});
    setDialogVisible(true);
  };

  const handleChange = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: null }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.label.trim()) nextErrors.label = 'Label is required';
    if (!formData.route_path.trim()) nextErrors.route_path = 'Route path is required';
    if (!formData.menu_key.trim()) nextErrors.menu_key = 'Menu key is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        menu_key: formData.menu_key.trim(),
        label: formData.label.trim(),
        route_path: formData.route_path.trim(),
        permission_name: formData.permission_name.trim() || null,
        permission_description: formData.permission_description.trim() || null,
        icon_class: formData.icon_class.trim() || null
      };

      if (editingItem) {
        await updateNavigationItem(editingItem.id, payload);
        toast.success('Navigation item updated successfully');
      } else {
        await createNavigationItem(payload);
        toast.success('Navigation item created successfully');
      }

      setDialogVisible(false);
      resetForm();
      loadItems();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save navigation item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item) => {
    confirmDialog({
      message: `Delete navigation item ${item.label}?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await deleteNavigationItem(item.id);
          toast.success('Navigation item deleted successfully');
          loadItems();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete navigation item');
        }
      }
    });
  };

  const surfaceTemplate = (row) => (
    <div className="flex gap-2 flex-wrap">
      {row.show_in_sidebar ? <span className="p-tag p-tag-success">Sidebar</span> : null}
      {row.show_in_topnav ? <span className="p-tag p-tag-info">Top nav</span> : null}
      {!row.show_in_sidebar && !row.show_in_topnav ? <span className="p-tag p-tag-secondary">Hidden</span> : null}
    </div>
  );

  const activeTemplate = (row) => (
    <span className={`p-tag ${row.is_active ? 'p-tag-success' : 'p-tag-secondary'}`}>
      {row.is_active ? 'Active' : 'Inactive'}
    </span>
  );

  const actionTemplate = (row) => (
    <div className="flex gap-2">
      <Button icon="pi pi-pencil" rounded outlined onClick={() => openEditDialog(row)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
      <Button icon="pi pi-trash" rounded outlined severity="danger" onClick={() => handleDelete(row)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />
    </div>
  );

  const toolbarLeft = () => <h2 className="m-0">Navigation Settings</h2>;
  const toolbarRight = () => (
    <Button icon="pi pi-plus" label="New Item" className="p-button-success" onClick={openCreateDialog} />
  );

  const footer = (
    <div className="flex justify-content-end gap-2">
      <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={submitting} />
      <Button label={submitting ? 'Saving...' : 'Save'} icon="pi pi-check" onClick={handleSubmit} loading={submitting} disabled={submitting} />
    </div>
  );

  const matchTypeOptions = useMemo(() => [
    { label: 'Exact', value: 'exact' },
    { label: 'Prefix', value: 'prefix' }
  ], []);

  return (
    <div className="navigation-management-page">
      <ConfirmDialog />
      <Toolbar className="p-mb-4" left={toolbarLeft} right={toolbarRight} />

      <DataTable
        value={items}
        loading={loading}
        paginator
        rows={10}
        dataKey="id"
        emptyMessage="No navigation items found"
        responsiveLayout="scroll"
      >
        <Column field="label" header="Label" sortable />
        <Column field="menu_key" header="Key" sortable />
        <Column field="route_path" header="Route" sortable />
        <Column field="permission_name" header="Permission" sortable />
        <Column field="icon_class" header="Icon" />
        <Column header="Surface" body={surfaceTemplate} />
        <Column field="sort_order" header="Order" sortable style={{ width: '100px' }} />
        <Column header="Status" body={activeTemplate} style={{ width: '120px' }} />
        <Column header="Actions" body={actionTemplate} style={{ width: '150px' }} />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editingItem ? 'Edit Navigation Item' : 'Create Navigation Item'}
        modal
        className="p-fluid"
        style={{ width: '760px', maxWidth: '96vw' }}
        footer={footer}
      >
        <div className="grid">
          <div className="col-12 md:col-6">
            <label className="block mb-2">Menu Key *</label>
            <InputText value={formData.menu_key} onChange={(e) => handleChange('menu_key', e.target.value)} className={errors.menu_key ? 'p-invalid w-full' : 'w-full'} />
            {errors.menu_key ? <small className="p-error">{errors.menu_key}</small> : null}
          </div>
          <div className="col-12 md:col-6">
            <label className="block mb-2">Label *</label>
            <InputText value={formData.label} onChange={(e) => handleChange('label', e.target.value)} className={errors.label ? 'p-invalid w-full' : 'w-full'} />
            {errors.label ? <small className="p-error">{errors.label}</small> : null}
          </div>
          <div className="col-12 md:col-8">
            <label className="block mb-2">Route Path *</label>
            <InputText value={formData.route_path} onChange={(e) => handleChange('route_path', e.target.value)} className={errors.route_path ? 'p-invalid w-full' : 'w-full'} />
            {errors.route_path ? <small className="p-error">{errors.route_path}</small> : null}
          </div>
          <div className="col-12 md:col-4">
            <label className="block mb-2">Match Type</label>
            <Dropdown value={formData.match_type} options={matchTypeOptions} onChange={(e) => handleChange('match_type', e.value)} className="w-full" />
          </div>
          <div className="col-12 md:col-6">
            <label className="block mb-2">Permission Name</label>
            <InputText value={formData.permission_name} onChange={(e) => handleChange('permission_name', e.target.value)} className="w-full" />
            <small className="text-600">Leave blank to auto-create one from the label.</small>
          </div>
          <div className="col-12 md:col-6">
            <label className="block mb-2">Permission Description</label>
            <InputTextarea value={formData.permission_description} onChange={(e) => handleChange('permission_description', e.target.value)} rows={2} autoResize className="w-full" />
          </div>
          <div className="col-12 md:col-6">
            <label className="block mb-2">Icon Class</label>
            <InputText value={formData.icon_class} onChange={(e) => handleChange('icon_class', e.target.value)} className="w-full" placeholder="pi pi-users" />
          </div>
          <div className="col-12 md:col-3">
            <label className="block mb-2">Sort Order</label>
            <InputNumber value={formData.sort_order} onValueChange={(e) => handleChange('sort_order', e.value ?? 0)} className="w-full" />
          </div>
          <div className="col-12 md:col-3">
            <label className="block mb-2">Active</label>
            <div className="flex align-items-center gap-2">
              <Checkbox checked={formData.is_active} onChange={(e) => handleChange('is_active', e.checked)} />
              <span>{formData.is_active ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
          <div className="col-12 md:col-6">
            <label className="block mb-2">Show in Sidebar</label>
            <div className="flex align-items-center gap-2">
              <Checkbox checked={formData.show_in_sidebar} onChange={(e) => handleChange('show_in_sidebar', e.checked)} />
              <span>{formData.show_in_sidebar ? 'Visible' : 'Hidden'}</span>
            </div>
          </div>
          <div className="col-12 md:col-6">
            <label className="block mb-2">Show in Top Nav</label>
            <div className="flex align-items-center gap-2">
              <Checkbox checked={formData.show_in_topnav} onChange={(e) => handleChange('show_in_topnav', e.checked)} />
              <span>{formData.show_in_topnav ? 'Visible' : 'Hidden'}</span>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default NavigationManagementPage;
