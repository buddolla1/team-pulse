import React, { useState } from 'react';
import Grid from '@mui/material/Grid2';
import { Alert, Card, CardContent, List, ListItem, ListItemText } from '@mui/material';
import PageHeader from '../components/PageHeader';
import ReportActions from '../components/ReportActions';
import { exportCsv, exportPdf } from '../services/incidentService';

export default function ReportsPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const runExport = async (exporter) => {
    try {
      setError('');
      setLoading(true);
      await exporter();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to export report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="Monthly incident reporting, RCA review, team-wise analysis, and deployment failure exports." />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card elevation={0} variant="outlined">
            <CardContent>
              <ReportActions
                loading={loading}
                onCsv={() => runExport(exportCsv)}
                onPdf={() => runExport(exportPdf)}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} variant="outlined">
            <CardContent>
              <List dense>
                {['Monthly incident report', 'RCA report', 'Team-wise report', 'Deployment failure report', 'SLA performance report'].map((item) => (
                  <ListItem key={item}>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
