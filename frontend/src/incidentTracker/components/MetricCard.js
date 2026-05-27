import React from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';

export default function MetricCard({ label, value, color }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography variant="h4" fontWeight={700} color={color || 'text.primary'}>
            {value}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
