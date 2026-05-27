import React from 'react';
import {
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Paper,
  Typography
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import '../LeaveTrackerModule.css';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const getStatusChipProps = (status) => {
  switch (status) {
    case 'Planned':
      return { color: 'info', variant: 'outlined' };
    case 'Revoked':
      return { color: 'default', variant: 'outlined' };
    case 'Not Taken':
      return { color: 'warning', variant: 'filled' };
    case 'Applied':
    default:
      return { color: 'success', variant: 'filled' };
  }
};

const getLeaveAppliedChipProps = (value) => {
  return String(value || '').trim().toLowerCase() === 'yes'
    ? { color: 'success', variant: 'filled' }
    : { color: 'error', variant: 'filled' };
};

export default function LeaveTrackerTable({
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isAdmin,
  onEdit,
  onRevoke
}) {
  const showActions = Boolean(onEdit) || Boolean(onRevoke);
  const actionColSpan = 11;
  const actionHeader = isAdmin ? 'Actions' : 'Edit Options';
  return (
    <Paper elevation={0} variant="outlined" className="leave-tracker-table-shell">
      <TableContainer className="leave-tracker-table-container">
        <Table className="leave-tracker-table">
          <TableHead>
            <TableRow className="leave-tracker-table-head-row">
              <TableCell>Leave ID</TableCell>
              <TableCell>SSO</TableCell>
              <TableCell>User Name</TableCell>
              <TableCell>User Type</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>No. of Days</TableCell>
              <TableCell>Leave Applied</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Comments</TableCell>
              {showActions ? <TableCell align="right">{actionHeader}</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="leave-tracker-empty-row">
                <TableCell colSpan={showActions ? actionColSpan : 10}>
                  <Typography variant="body2" color="text.secondary">No leave records found.</Typography>
                </TableCell>
              </TableRow>
            ) : rows.map((row) => (
              <TableRow key={row.id} hover className="leave-tracker-table-row">
                <TableCell>{row.leaveRequestId}</TableCell>
                <TableCell>{row.sso || '-'}</TableCell>
                <TableCell>{row.userName}</TableCell>
                <TableCell>{row.userType}</TableCell>
                <TableCell>{formatDate(row.startDate)}</TableCell>
                <TableCell>{formatDate(row.endDate)}</TableCell>
                <TableCell>{row.noOfDays}</TableCell>
                <TableCell>
                  <Chip
                    label={row.leavesApplied || '-'}
                    size="small"
                    {...getLeaveAppliedChipProps(row.leavesApplied)}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={row.status || 'Applied'}
                    size="small"
                    {...getStatusChipProps(row.status)}
                  />
                </TableCell>
                <TableCell>{row.comments || '-'}</TableCell>
                {showActions ? (
                  <TableCell align="right">
                    <div className="leave-tracker-actions">
                      {isAdmin ? (
                        <>
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<EditOutlinedIcon />}
                            onClick={() => onEdit(row)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            color="error"
                            startIcon={<BlockOutlinedIcon />}
                            onClick={() => onRevoke(row)}
                            disabled={row.status === 'Revoked'}
                          >
                            Revoke
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<EditOutlinedIcon />}
                          onClick={() => onEdit(row)}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={pageSize}
        onPageChange={(_, nextPage) => onPageChange(nextPage)}
        onRowsPerPageChange={(event) => onPageSizeChange(Number(event.target.value))}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Paper>
  );
}
