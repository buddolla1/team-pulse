import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, IconButton, Stack, Typography } from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloseIcon from '@mui/icons-material/Close';
import { createLeave, exportLeavesExcel, fetchLeaves, revokeLeave, updateLeave } from '../services/leaveTrackerService';
import LeaveTrackerForm from '../components/LeaveTrackerForm';
import LeaveTrackerFilters from '../components/LeaveTrackerFilters';
import LeaveTrackerTable from '../components/LeaveTrackerTable';
import authService from '../../services/authService';

const getWorkingDay = (date = new Date()) => {
  const next = new Date(date);
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next.toISOString().slice(0, 10);
};

export default function LeaveTrackerPage() {
  const isAdmin = authService.isAuthenticated();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedLeaveToRevoke, setSelectedLeaveToRevoke] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    month: currentMonth
  });
  const [activeFilters, setActiveFilters] = useState({
    month: currentMonth,
    page: 1,
    pageSize: 10
  });
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const searchPendingRef = useRef(false);

  const loadLeaves = useCallback(async () => {
    try {
      setError('');
      const result = await fetchLeaves(activeFilters);
      setRows(result.rows || []);
      setTotal(result.count || 0);
      if (searchPendingRef.current) {
        setSearchSubmitted(true);
        searchPendingRef.current = false;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load leave records.');
      if (searchPendingRef.current) {
        searchPendingRef.current = false;
      }
    }
  }, [activeFilters]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const headerSubtitle = useMemo(() => (
    isAdmin
      ? 'Search leave requests, export the report, and review the team\'s submitted dates.'
      : 'Submit your leave dates and keep track of your requests.'
  ), [isAdmin]);

  const handleEdit = (leave) => {
    setSelectedLeave(leave);
    setEditDialogOpen(true);
  };

  const handleRevoke = async (leave) => {
    setSelectedLeaveToRevoke(leave);
    setRevokeDialogOpen(true);
  };

  const confirmRevoke = async () => {
    if (!selectedLeaveToRevoke) {
      return;
    }

    try {
      setUpdating(true);
      setError('');
      await revokeLeave(selectedLeaveToRevoke.id);
      setRevokeDialogOpen(false);
      setSelectedLeaveToRevoke(null);
      await loadLeaves();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to revoke leave request.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Box className={`leave-tracker-module ${isAdmin ? 'leave-tracker-admin' : 'leave-tracker-employee'}`}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>Leave Tracker</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {headerSubtitle}
          </Typography>
        </Box>
        {isAdmin ? (
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={async () => {
              try {
                setExporting(true);
                setError('');
                await exportLeavesExcel(activeFilters);
              } catch (err) {
                setError(err.response?.data?.message || 'Unable to export leave report.');
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting || !searchSubmitted || rows.length === 0 || total === 0}
          >
            {exporting ? 'Exporting...' : 'Download Excel'}
          </Button>
        ) : null}
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {!isAdmin ? (
        <Box sx={{ mb: 3 }}>
          <LeaveTrackerForm
            key={formVersion}
            defaultValues={{
              startDate: getWorkingDay(),
              endDate: getWorkingDay(),
              noOfDays: 1,
              leavesApplied: 'Yes',
              comments: ''
            }}
            loading={saving}
            onSubmit={async (values) => {
              try {
                setSaving(true);
                setError('');
                await createLeave(values);
                setFormVersion((current) => current + 1);
                await loadLeaves();
              } catch (err) {
                setError(err.response?.data?.message || 'Unable to submit leave request.');
              } finally {
                setSaving(false);
              }
            }}
          />
        </Box>
      ) : null}

      {isAdmin ? (
        <LeaveTrackerFilters
          filters={draftFilters}
          isAdmin={isAdmin}
          onChange={(name, value) => setDraftFilters((current) => ({ ...current, [name]: value }))}
          onSearch={() => {
            searchPendingRef.current = true;
            setSearchSubmitted(false);
            setActiveFilters((current) => ({
              ...current,
              ...draftFilters,
              page: 1
            }));
          }}
        />
      ) : null}

      <LeaveTrackerTable
        rows={rows}
        total={total}
        page={activeFilters.page - 1}
        pageSize={activeFilters.pageSize}
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onRevoke={isAdmin ? handleRevoke : undefined}
        onPageChange={(page) => {
          setActiveFilters((current) => ({ ...current, page: page + 1 }));
        }}
        onPageSizeChange={(pageSize) => {
          setActiveFilters((current) => ({ ...current, pageSize, page: 1 }));
        }}
      />

      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ className: 'leave-tracker-dialog leave-tracker-edit-dialog' }}
      >
        <DialogTitle className="leave-tracker-dialog-title leave-tracker-edit-dialog-title" sx={{ pr: 6 }}>
          Edit Leave Request
          <IconButton
            aria-label="Close"
            onClick={() => setEditDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon fontSize="small" />
            </IconButton>
        </DialogTitle>
        <DialogContent className="leave-tracker-dialog-content leave-tracker-edit-dialog-content">
          {selectedLeave ? (
            <LeaveTrackerForm
              key={`${selectedLeave.id}-${formVersion}`}
              defaultValues={{
                startDate: selectedLeave.startDate,
                endDate: selectedLeave.endDate,
                noOfDays: selectedLeave.noOfDays,
                leavesApplied: selectedLeave.leavesApplied || 'Yes',
                status: selectedLeave.status || 'Applied',
                comments: selectedLeave.comments || ''
              }}
              loading={updating}
              submitLabel="Update Leave"
              showLeavesAppliedField={!isAdmin}
              showStatusField={true}
              onSubmit={async (values) => {
                try {
                  setUpdating(true);
                  setError('');
                  await updateLeave(selectedLeave.id, values);
                  setEditDialogOpen(false);
                  setSelectedLeave(null);
                  await loadLeaves();
                } catch (err) {
                  setError(err.response?.data?.message || 'Unable to update leave request.');
                } finally {
                  setUpdating(false);
                }
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={revokeDialogOpen}
        onClose={() => setRevokeDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: 'leave-tracker-dialog leave-tracker-confirm-dialog' }}
      >
        <DialogTitle className="leave-tracker-dialog-title leave-tracker-confirm-dialog-title" sx={{ pr: 6 }}>
          Withdraw Leave Request
          <IconButton
            aria-label="Close"
            onClick={() => setRevokeDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon fontSize="small" />
            </IconButton>
        </DialogTitle>
        <DialogContent className="leave-tracker-dialog-content leave-tracker-confirm-dialog-content">
          <Typography variant="body2" color="text.secondary">
            {selectedLeaveToRevoke
              ? `Withdraw leave request ${selectedLeaveToRevoke.leaveRequestId}?`
              : 'Withdraw this leave request?'}
          </Typography>
        </DialogContent>
        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setRevokeDialogOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={confirmRevoke} disabled={updating}>
            {updating ? 'Withdrawing...' : 'Withdraw'}
          </Button>
        </Stack>
      </Dialog>
    </Box>
  );
}
