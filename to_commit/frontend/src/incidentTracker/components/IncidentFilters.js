import React from 'react';
import Grid from '@mui/material/Grid2';
import { MenuItem, Paper, TextField } from '@mui/material';

const statusOptions = ['', 'Open', 'In Progress', 'Closed'];
const issueStageOptions = ['', 'Pre-Deployment', 'Post-Deployment'];
const severityOptions = ['', 'P1', 'P2', 'P3', 'P4'];

export default function IncidentFilters({ filters, onChange }) {
  return (
    <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }} elevation={0} variant="outlined">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField fullWidth label="Month" type="month" value={filters.month} onChange={(e) => onChange('month', e.target.value)} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField select fullWidth label="Status" value={filters.status} onChange={(e) => onChange('status', e.target.value)}>
            {statusOptions.map((option) => (
              <MenuItem key={option || 'all'} value={option}>
                {option || 'All'}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField select fullWidth label="Issue Stage" value={filters.issueStage} onChange={(e) => onChange('issueStage', e.target.value)}>
            {issueStageOptions.map((option) => (
              <MenuItem key={option || 'all'} value={option}>
                {option || 'All'}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField select fullWidth label="Severity" value={filters.severity} onChange={(e) => onChange('severity', e.target.value)}>
            {severityOptions.map((option) => (
              <MenuItem key={option || 'all'} value={option}>
                {option || 'All'}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField fullWidth label="Agile Team" value={filters.agileTeam} onChange={(e) => onChange('agileTeam', e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField fullWidth label="Application" value={filters.applicationName} onChange={(e) => onChange('applicationName', e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth label="Program Manager" value={filters.programManager} onChange={(e) => onChange('programManager', e.target.value)} />
        </Grid>
      </Grid>
    </Paper>
  );
}
