import React, { useState } from 'react';
import { Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import IncidentForm from '../components/IncidentForm';
import { createIncident } from '../services/incidentService';
import { getCurrentMonth } from '../utils/date';
import { buildIncidentTrackerPath } from '../utils/routing';

const defaultValues = {
  incidentId: '',
  changeRequestId: '',
  incidentDate: new Date().toISOString().slice(0, 10),
  incidentMonth: getCurrentMonth(),
  incidentDescription: '',
  programManager: '',
  applicationName: '',
  agileTeam: '',
  issueStage: 'Pre-Deployment',
  severity: 'P3',
  explanation: '',
  developer: '',
  techLead: '',
  tester: '',
  testLead: '',
  requirementGathering: false,
  impactAnalysis: false,
  designReview: false,
  developmentCompleted: false,
  unitTestingCompleted: false,
  codeReviewCompleted: false,
  testCasePreparation: false,
  testCaseReview: false,
  testingCompleted: false,
  preDeploymentVerification: false,
  postDeploymentVerification: false,
  rcaCategory: '',
  rcaDetails: '',
  correctiveAction: '',
  preventiveAction: '',
  status: 'Open',
};

export default function IncidentCreatePage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  return (
    <>
      <PageHeader title="Create Incident" subtitle="Capture ownership, deployment context, and RCA details." />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <IncidentForm
        defaultValues={defaultValues}
        onSubmit={async (values) => {
          try {
            setError('');
            const incident = await createIncident(values);
            navigate(buildIncidentTrackerPath(`/incidents/${incident.id}`));
          } catch (err) {
            setError(err.response?.data?.message || 'Unable to create incident.');
          }
        }}
      />
    </>
  );
}
