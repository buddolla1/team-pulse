import React, { useEffect, useMemo } from 'react';
import Grid from '@mui/material/Grid2';
import { Box, Button, Card, CardContent, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';

const buildDefaults = (values = {}) => ({
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  noOfDays: 1,
  leavesApplied: 'Yes',
  status: 'Applied',
  comments: '',
  ...values
});

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isWeekendDate = (value) => {
  const date = parseDate(value);
  if (!date) return false;
  const day = date.getDay();
  return day === 0 || day === 6;
};

const computeDays = (startDate, endDate) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return '';

  if (end < start) {
    return '';
  }

  const current = new Date(start);
  let days = 0;

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      days += 1;
    }
    current.setDate(current.getDate() + 1);
  }

  return days > 0 ? days : '';
};

export default function LeaveTrackerForm({
  defaultValues,
  onSubmit,
  loading,
  submitLabel = 'Submit Leave',
  showStatusField = false,
  showLeavesAppliedField = true
}) {
  const mergedDefaults = useMemo(() => buildDefaults(defaultValues), [defaultValues]);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm({ defaultValues: mergedDefaults });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const leavesApplied = watch('leavesApplied');
  const status = watch('status');
  const noOfDays = useMemo(() => computeDays(startDate, endDate), [startDate, endDate]);

  useEffect(() => {
    reset(mergedDefaults);
  }, [mergedDefaults, reset]);

  useEffect(() => {
    setValue('noOfDays', noOfDays || '');
  }, [noOfDays, setValue]);

  useEffect(() => {
    if (!leavesApplied) {
      setValue('leavesApplied', 'Yes', { shouldValidate: true });
    }
  }, [leavesApplied, setValue]);

  useEffect(() => {
    if (showStatusField && !status) {
      setValue('status', 'Applied', { shouldValidate: true });
    }
  }, [showStatusField, status, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Apply Leave</Typography>
            <Typography variant="body2" color="text.secondary">
              Enter the leave range and details. Use working days only, Monday to Friday. No. of days is calculated from the selected dates.
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                InputLabelProps={{ shrink: true }}
                {...register('startDate', {
                  required: 'Start Date is required',
                  validate: (value) => (
                    !isWeekendDate(value) || 'Start Date must be a working day (Monday to Friday)'
                  )
                })}
                error={Boolean(errors.startDate)}
                helperText={errors.startDate?.message || ''}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                InputLabelProps={{ shrink: true }}
                {...register('endDate', {
                  required: 'End Date is required',
                  validate: (value) => (
                    !isWeekendDate(value) || 'End Date must be a working day (Monday to Friday)'
                  )
                })}
                error={Boolean(errors.endDate)}
                helperText={errors.endDate?.message || ''}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                fullWidth
                label="No. of Days"
                value={noOfDays || ''}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            {showLeavesAppliedField ? (
              <Grid size={{ xs: 12, md: 4 }}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                    Leave Applied
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={(leavesApplied || 'Yes') === 'Yes'}
                        onChange={(_, checked) => {
                          setValue('leavesApplied', checked ? 'Yes' : 'No', { shouldValidate: true });
                        }}
                      />
                    }
                    label={(leavesApplied || 'Yes') === 'Yes' ? 'Yes' : 'No'}
                  />
                  <input
                    type="hidden"
                    {...register('leavesApplied', { required: 'Leave Applied is required' })}
                  />
                  {errors.leavesApplied ? (
                    <Typography variant="caption" color="error">
                      Leave Applied is required
                    </Typography>
                  ) : null}
                </Box>
              </Grid>
            ) : (
              <input
                type="hidden"
                {...register('leavesApplied', { required: 'Leave Applied is required' })}
              />
            )}
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                minRows={4}
                label="Comments"
                {...register('comments')}
              />
            </Grid>

            {showStatusField ? (
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  select
                  label="Status"
                  value={status || 'Applied'}
                  onChange={(event) => setValue('status', event.target.value, { shouldValidate: true })}
                >
                  <MenuItem value="Planned">Planned</MenuItem>
                  <MenuItem value="Applied">Applied</MenuItem>
                  <MenuItem value="Not Taken">Not Taken</MenuItem>
                  <MenuItem value="Revoked">Revoked</MenuItem>
                </TextField>
                <input type="hidden" {...register('status')} />
              </Grid>
            ) : null}
          </Grid>

          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Saving...' : submitLabel}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </form>
  );
}
