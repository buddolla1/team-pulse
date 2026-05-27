import React, { useEffect, useState } from 'react';
import { Alert } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import IncidentForm from '../components/IncidentForm';
import { fetchIncident, updateIncident } from '../services/incidentService';
import { buildIncidentTrackerPath } from '../utils/routing';

export default function IncidentEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchIncident(id).then(setIncident);
  }, [id]);

  if (!incident) {
    return null;
  }

  return (
    <>
      <PageHeader title="Edit Incident" subtitle={`Update ${incident.incidentId}`} />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <IncidentForm
        defaultValues={incident}
        onSubmit={async (values) => {
          try {
            setError('');
            await updateIncident(id, values);
            navigate(buildIncidentTrackerPath(`/incidents/${id}`));
          } catch (err) {
            setError(err.response?.data?.message || 'Unable to update incident.');
          }
        }}
      />
    </>
  );
}
