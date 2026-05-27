import React from 'react';
import Grid from '@mui/material/Grid2';
import { Card, CardContent, List, ListItem, ListItemText, Typography } from '@mui/material';
import authService from '../../services/authService';
import PageHeader from '../components/PageHeader';

export default function SettingsPage() {
  const user = authService.getCurrentUser();

  return (
    <>
      <PageHeader title="Settings" subtitle="Access profile, role context, and operational preferences." />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Profile</Typography>
              <List dense>
                <ListItem><ListItemText primary="Name" secondary={user?.full_name} /></ListItem>
                <ListItem><ListItemText primary="Email" secondary={user?.email} /></ListItem>
                <ListItem><ListItemText primary="Role" secondary={user?.role_display_name || user?.role_name || '-'} /></ListItem>
                <ListItem><ListItemText primary="Username" secondary={user?.username || '-'} /></ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Operational Features</Typography>
              <List dense>
                {['Real-time dashboard refresh', 'Role-based access', 'Audit logging', 'RCA approval workflow'].map((item) => (
                  <ListItem key={item}><ListItemText primary={item} /></ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
