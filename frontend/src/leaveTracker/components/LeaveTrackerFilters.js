import React from 'react';
import Grid from '@mui/material/Grid2';
import { Button, Paper, Stack, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export default function LeaveTrackerFilters({ filters, onChange, onSearch, isAdmin }) {
  return (
    <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }} elevation={0} variant="outlined">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            fullWidth
            type="month"
            label="Reporting Month"
            InputLabelProps={{ shrink: true }}
            value={filters.month}
            onChange={(e) => onChange('month', e.target.value)}
          />
        </Grid>
        {isAdmin ? (
          <Grid size={{ xs: 12, md: 9 }} />
        ) : null}
      </Grid>
      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
        <Button variant="contained" startIcon={<SearchIcon />} onClick={onSearch}>
          Search
        </Button>
      </Stack>
    </Paper>
  );
}
