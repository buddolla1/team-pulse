import * as XLSX from 'xlsx';

export const exportAssetsToExcel = (assets, filename = 'assets') => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);

    return `${month}/${day}/${year}`;
  };

  const formattedData = assets.map((asset, index) => ({
    'No.': index + 1,
    'Asset ID': asset.id,
    'Asset Tag': asset.asset_tag || 'N/A',
    'Asset Type': asset.asset_type || 'N/A',
    'Brand': asset.brand || 'N/A',
    'Model': asset.model || 'N/A',
    'Host Name': asset.serial_number || 'N/A',
    'Status': asset.status || 'N/A',
    'Assigned To': asset.assigned_employee_name
      ? `${asset.assigned_employee_name}${asset.assigned_employee_sso ? ` (${asset.assigned_employee_sso})` : ''}`
      : 'Unassigned',
    'Assigned Date': formatDate(asset.assigned_date),
    'Notes': asset.notes || 'N/A',
    'Created At': formatDate(asset.created_at),
    'Updated At': formatDate(asset.updated_at)
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(formattedData);

  ws['!cols'] = [
    { wch: 5 },
    { wch: 10 },
    { wch: 18 },
    { wch: 15 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 24 },
    { wch: 14 },
    { wch: 35 },
    { wch: 16 },
    { wch: 16 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Assets');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const fullFilename = `${filename}_${timestamp}.xlsx`;

  XLSX.writeFile(wb, fullFilename);
  return fullFilename;
};
