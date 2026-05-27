import React from 'react';
import { Delete, Edit, Visibility } from '@mui/icons-material';
import {
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
} from '@mui/material';
import { Link } from 'react-router-dom';
import authService from '../../services/authService';
import { buildIncidentTrackerPath } from '../utils/routing';
import { formatDate } from '../utils/date';

export default function IncidentTable({ rows, page, pageSize, total, onPageChange, onPageSizeChange, onDelete }) {
  const canUpdateIncident = authService.hasPermission('incident_tracker.update');
  const canDeleteIncident = authService.hasPermission('incident_tracker.delete');

  const severityColor = (severity) => {
    if (severity === 'P1') return 'error';
    if (severity === 'P2') return 'warning';
    if (severity === 'P3') return 'info';
    return 'default';
  };

  return (
    <TableContainer component={Paper} elevation={0} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Incident ID</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Application</TableCell>
            <TableCell>Agile Team</TableCell>
            <TableCell>Stage</TableCell>
            <TableCell>Severity</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.incidentId}</TableCell>
              <TableCell>{formatDate(row.incidentDate)}</TableCell>
              <TableCell>{row.applicationName || '-'}</TableCell>
              <TableCell>{row.agileTeam || '-'}</TableCell>
              <TableCell>{row.issueStage || '-'}</TableCell>
              <TableCell><Chip label={row.severity || '-'} size="small" color={severityColor(row.severity)} /></TableCell>
              <TableCell><Chip label={row.status} size="small" color={row.status === 'Closed' ? 'success' : 'warning'} /></TableCell>
              <TableCell align="right">
                <Tooltip title="View incident">
                  <IconButton size="small" component={Link} to={buildIncidentTrackerPath(`/incidents/${row.id}`)}>
                    <Visibility fontSize="small" />
                  </IconButton>
                </Tooltip>
                {canUpdateIncident ? (
                  <Tooltip title="Edit incident">
                    <IconButton size="small" component={Link} to={buildIncidentTrackerPath(`/incidents/${row.id}/edit`)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null}
                {canDeleteIncident ? (
                  <Tooltip title="Delete incident">
                    <IconButton size="small" onClick={() => onDelete(row.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(event, nextPage) => onPageChange(nextPage)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(event) => onPageSizeChange(Number(event.target.value))}
      />
    </TableContainer>
  );
}
