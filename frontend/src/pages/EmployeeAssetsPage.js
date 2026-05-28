import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { getMyAssets } from '../services/api';
import authService from '../services/authService';
import AssetFormPrime from '../components/assets/AssetFormPrime';
import './Employees.css';

const EmployeeAssetsPage = () => {
  const employee = authService.getCurrentEmployee();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const canCreateAsset = authService.hasPermission('assets.create');
  const canUpdateAsset = authService.hasPermission('assets.update');

  useEffect(() => {
    loadAssets();
  }, [refreshTrigger]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const response = await getMyAssets();
      setAssets(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load your assets');
      console.error('Error loading employee assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusBodyTemplate = (rowData) => {
    const statusColors = {
      Available: 'success',
      Assigned: 'info',
      Returned: 'warning',
      'Under Repair': 'warning',
      Retired: 'secondary',
      Lost: 'danger'
    };

    return <Tag value={rowData.status} severity={statusColors[rowData.status] || 'info'} />;
  };

  const handleAdd = () => {
    setSelectedAsset(null);
    setShowForm(true);
  };

  const handleEdit = (asset) => {
    setSelectedAsset(asset);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedAsset(null);
  };

  const handleFormSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    toast.success('Asset added successfully');
  };

  return (
    <div className="employees-page">
      <div className="card">
        <div className="flex justify-content-between align-items-center mb-3" style={{ gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2 className="m-0">My Assets</h2>
            <small className="text-500">Assets assigned to {employee?.name || 'you'}</small>
          </div>
          {canCreateAsset && <Button label="Add Asset" icon="pi pi-plus" onClick={handleAdd} />}
        </div>

        <DataTable
          value={assets}
          loading={loading}
          emptyMessage="No assets assigned yet"
          paginator={assets.length > 10}
          rows={10}
          responsiveLayout="scroll"
          stripedRows
          showGridlines
        >
          <Column field="asset_tag" header="Asset Tag" style={{ minWidth: '150px' }} />
          <Column field="asset_type" header="Type" style={{ minWidth: '120px' }} />
          <Column field="brand" header="Brand" style={{ minWidth: '120px' }} />
          <Column field="model" header="Model" style={{ minWidth: '150px' }} />
          <Column field="serial_number" header="Host Name" style={{ minWidth: '150px' }} />
          <Column field="status" header="Status" body={statusBodyTemplate} style={{ minWidth: '120px' }} />
          <Column
            field="assigned_date"
            header="Assigned Date"
            body={(rowData) => (rowData.assigned_date ? new Date(rowData.assigned_date).toLocaleDateString() : '-')}
            style={{ minWidth: '140px' }}
          />
          {canUpdateAsset && (
            <Column
              header="Actions"
              body={(rowData) => (
                <Button
                  icon="pi pi-pencil"
                  rounded
                  outlined
                  className="p-button-success"
                  onClick={() => handleEdit(rowData)}
                  tooltip="Edit"
                  tooltipOptions={{ position: 'top' }}
                />
              )}
              style={{ minWidth: '100px' }}
            />
          )}
        </DataTable>
      </div>

      {showForm && (
        <AssetFormPrime
          asset={selectedAsset}
          visible={showForm}
          onHide={handleCloseForm}
          onSuccess={handleFormSuccess}
          employeeMode
          currentEmployeeId={employee?.id}
        />
      )}
    </div>
  );
};

export default EmployeeAssetsPage;
