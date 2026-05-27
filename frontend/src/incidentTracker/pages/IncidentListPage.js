import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from '@mui/material';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import IncidentFilters from '../components/IncidentFilters';
import IncidentTable from '../components/IncidentTable';
import { deleteIncident, fetchIncidents } from '../services/incidentService';
import authService from '../../services/authService';
import { buildIncidentTrackerPath } from '../utils/routing';

const getCurrentMonthValue = () => new Date().toISOString().slice(0, 7);

export default function IncidentListPage() {
  const [filters, setFilters] = useState({
    month: getCurrentMonthValue(),
    status: '',
    agileTeam: '',
    applicationName: '',
    issueStage: '',
    severity: '',
    programManager: '',
    page: 1,
    pageSize: 10,
  });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const canCreateIncident = authService.hasPermission('incident_tracker.create');

  const loadIncidents = useCallback(async () => {
    try {
      setError('');
      const result = await fetchIncidents(filters);
      setRows(result.rows || []);
      setTotal(result.count || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load incidents.');
    }
  }, [filters]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  return (
    <>
      <PageHeader
        title="Incidents"
        subtitle="Filter and manage incident records."
        action={canCreateIncident ? { label: 'Create Incident', component: Link, to: buildIncidentTrackerPath('/incidents/create') } : null}
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <IncidentFilters
        filters={filters}
        onChange={(name, value) => setFilters((current) => ({ ...current, [name]: value, page: 1 }))}
      />
      <IncidentTable
        rows={rows}
        page={filters.page - 1}
        pageSize={filters.pageSize}
        total={total}
        onPageChange={(page) => setFilters((current) => ({ ...current, page: page + 1 }))}
        onPageSizeChange={(pageSize) => setFilters((current) => ({ ...current, pageSize, page: 1 }))}
        onDelete={async (id) => {
          if (!window.confirm('Delete this incident?')) {
            return;
          }

          try {
            setError('');
            await deleteIncident(id);
            await loadIncidents();
          } catch (err) {
            setError(err.response?.data?.message || 'Unable to delete incident.');
          }
        }}
      />
    </>
  );
}
