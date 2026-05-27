import React, { useEffect, useMemo } from 'react';
import Grid from '@mui/material/Grid2';
import { Box, Button, Card, CardContent, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';

const issueStageOptions = ['Pre-Deployment', 'Post-Deployment'];
const severityOptions = ['P1', 'P2', 'P3', 'P4'];
const statusOptions = ['Open', 'In Progress', 'Closed'];

const fieldGroups = [
  { name: 'incidentId', label: 'Incident ID', required: true },
  { name: 'changeRequestId', label: 'Change Request ID', required: true },
  { name: 'incidentDate', label: 'Incident Date', type: 'date', required: true },
  { name: 'incidentMonth', label: 'Incident Month', type: 'month', required: true },
  { name: 'programManager', label: 'Program Manager', required: true },
  { name: 'applicationName', label: 'Application Name', required: true },
  { name: 'agileTeam', label: 'Agile Team', required: true },
  { name: 'issueStage', label: 'Issue Stage', select: issueStageOptions, required: true },
  { name: 'severity', label: 'Severity', select: severityOptions, required: true },
  { name: 'developer', label: 'Developer', required: true },
  { name: 'techLead', label: 'Tech Lead', required: true },
  { name: 'tester', label: 'Tester', required: true },
  { name: 'testLead', label: 'Test Lead', required: true },
  { name: 'rcaCategory', label: 'RCA Category', required: true },
  { name: 'status', label: 'Status', select: statusOptions, required: true },
  { name: 'createdBy', label: 'Created By', disabled: true }
];

const yesNoFields = [
  ['requirementGathering', 'Requirement Gathering'],
  ['impactAnalysis', 'Impact Analysis'],
  ['designReview', 'Design Review'],
  ['developmentCompleted', 'Development Completed'],
  ['unitTestingCompleted', 'Unit Testing Completed'],
  ['codeReviewCompleted', 'Code Review Completed'],
  ['testCasePreparation', 'Test Case Preparation'],
  ['testCaseReview', 'Test Case Review'],
  ['testingCompleted', 'Testing Completed'],
  ['preDeploymentVerification', 'Pre-Deployment Verification'],
  ['postDeploymentVerification', 'Post-Deployment Verification']
];

const textAreas = [
  ['incidentDescription', 'Incident Description'],
  ['explanation', 'Explanation'],
  ['rcaDetails', 'RCA Details'],
  ['correctiveAction', 'Corrective Action'],
  ['preventiveAction', 'Preventive Action']
];

const normalizeToggle = (value) => value === true || value === 'Yes';

const buildDefaults = (defaultValues = {}) => ({
  incidentId: '',
  changeRequestId: '',
  incidentDate: new Date().toISOString().slice(0, 10),
  incidentMonth: new Date().toISOString().slice(0, 7),
  incidentDescription: '',
  programManager: '',
  applicationName: '',
  agileTeam: '',
  issueStage: issueStageOptions[0],
  severity: severityOptions[2],
  explanation: '',
  developer: '',
  techLead: '',
  tester: '',
  testLead: '',
  requirementGathering: 'No',
  impactAnalysis: 'No',
  designReview: 'No',
  developmentCompleted: 'No',
  unitTestingCompleted: 'No',
  codeReviewCompleted: 'No',
  testCasePreparation: 'No',
  testCaseReview: 'No',
  testingCompleted: 'No',
  preDeploymentVerification: 'No',
  postDeploymentVerification: 'No',
  rcaCategory: '',
  rcaDetails: '',
  correctiveAction: '',
  preventiveAction: '',
  status: statusOptions[0],
  createdBy: '',
  ...defaultValues
});

export default function IncidentForm({ defaultValues, onSubmit, loading }) {
  const mergedDefaults = useMemo(() => {
    const values = buildDefaults({
      ...defaultValues,
      applicationName: defaultValues?.applicationName || defaultValues?.applicationAgileTeam || '',
      agileTeam: defaultValues?.agileTeam || defaultValues?.applicationAgileTeam || '',
      issueStage: defaultValues?.issueStage || defaultValues?.deploymentType || issueStageOptions[0],
      severity: defaultValues?.severity || defaultValues?.priority || severityOptions[2],
      explanation: defaultValues?.explanation || defaultValues?.explanationDeveloper || '',
      correctiveAction: defaultValues?.correctiveAction || defaultValues?.action || '',
      incidentDescription: defaultValues?.incidentDescription || '',
      requirementGathering: defaultValues?.requirementGathering || 'No',
      impactAnalysis: defaultValues?.impactAnalysis || defaultValues?.impactAnalysisDesign || 'No',
      designReview: defaultValues?.designReview || 'No',
      developmentCompleted: defaultValues?.developmentCompleted || defaultValues?.developmentUnitTesting || 'No',
      unitTestingCompleted: defaultValues?.unitTestingCompleted || 'No',
      codeReviewCompleted: defaultValues?.codeReviewCompleted || defaultValues?.codeReviewTestCasePreparation || 'No',
      testCasePreparation: defaultValues?.testCasePreparation || 'No',
      testCaseReview: defaultValues?.testCaseReview || 'No',
      testingCompleted: defaultValues?.testingCompleted || defaultValues?.testing || 'No',
      preDeploymentVerification: defaultValues?.preDeploymentVerification || 'No',
      postDeploymentVerification: defaultValues?.postDeploymentVerification || 'No',
      createdBy: defaultValues?.createdBy || defaultValues?.created_by || ''
    });

    yesNoFields.forEach(([name]) => {
      values[name] = normalizeToggle(defaultValues?.[name] ?? values[name]);
    });

    return values;
  }, [defaultValues]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: mergedDefaults });

  useEffect(() => {
    reset(mergedDefaults);
  }, [mergedDefaults, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Grid container spacing={2}>
            {fieldGroups.map((field) => (
              <Grid size={{ xs: 12, md: field.type === 'date' || field.type === 'month' ? 3 : 4 }} key={field.name}>
                <TextField
                  fullWidth
                  label={field.label}
                  type={field.type || 'text'}
                  select={Boolean(field.select)}
                  disabled={field.disabled}
                  InputLabelProps={field.type ? { shrink: true } : undefined}
                  defaultValue={mergedDefaults[field.name]}
                  {...register(field.name, {
                    required: field.required ? `${field.label} is required` : false
                  })}
                  error={Boolean(errors[field.name])}
                  helperText={errors[field.name] ? `${field.label} is required` : ''}
                >
                  {field.select?.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            ))}

            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                minRows={4}
                label="Incident Description"
                defaultValue={mergedDefaults.incidentDescription}
                {...register('incidentDescription', { required: 'Incident Description is required' })}
                error={Boolean(errors.incidentDescription)}
                helperText={errors.incidentDescription ? 'Incident Description is required' : ''}
              />
            </Grid>

            {textAreas.slice(1).map(([name, label]) => (
              <Grid size={{ xs: 12, md: 6 }} key={name}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label={label}
                  defaultValue={mergedDefaults[name]}
                  {...register(name)}
                />
              </Grid>
            ))}

            <Grid size={12}>
              <Box className="incident-validation-panel">
                <Box className="incident-validation-header">
                  <Typography variant="h6" fontWeight={700}>Validation Steps</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Toggle each checkpoint to capture the delivery state.
                  </Typography>
                </Box>
                <Grid container spacing={1.5} className="incident-validation-grid">
                  {yesNoFields.map(([name, label]) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={name}>
                      <Controller
                        name={name}
                        control={control}
                        defaultValue={mergedDefaults[name] === true || mergedDefaults[name] === 'Yes'}
                        render={({ field }) => (
                          <Box className="incident-validation-item">
                            <FormControlLabel
                              className="incident-validation-toggle"
                              control={
                                <Switch
                                  checked={Boolean(field.value)}
                                  onChange={(_, checked) => field.onChange(checked)}
                                />
                              }
                              label={
                                <Box className="incident-validation-label">
                                  <Typography variant="body2" fontWeight={600}>{label}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {field.value ? 'Yes' : 'No'}
                                  </Typography>
                                </Box>
                              }
                            />
                          </Box>
                        )}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Grid>
          </Grid>

          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Saving...' : 'Save Incident'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </form>
  );
}
