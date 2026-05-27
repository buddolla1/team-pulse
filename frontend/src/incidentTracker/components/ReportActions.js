import React from 'react';
import { FileDownload } from '@mui/icons-material';
import { Button, Stack } from '@mui/material';

export default function ReportActions({ onCsv, onPdf, loading }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <Button variant="contained" startIcon={<FileDownload />} onClick={onCsv} disabled={loading}>
        Export CSV
      </Button>
      <Button variant="outlined" startIcon={<FileDownload />} onClick={onPdf} disabled={loading}>
        Export PDF
      </Button>
    </Stack>
  );
}
