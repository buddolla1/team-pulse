import React, { useEffect, useMemo, useState } from 'react';
import Grid from '@mui/material/Grid2';
import { Autocomplete, Box, Button, Card, CardContent, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { fetchIncidentReferenceData } from '../services/referenceDataService';
import { getTeamEmployees } from '../../services/api';
import authService from '../../services/authService';

const issueStageOptions = ['Pre-Deployment', 'Post-Deployment'];
const severityOptions = ['P1', 'P2', 'P3', 'P4'];
const rcaCategoryOptions = ['Code-Issue', 'Requirement-Gap', 'Process-Gap'];
const statusOptions = ['Open', 'In Progress', 'Closed'];

const fieldGroups = [
  { name: 'incidentId', label: 'Incident ID', required: true },
  { name: 'changeRequestId', label: 'Change Request ID', required: true },
  { name: 'incidentDate', label: 'Incident Date', type: 'date', required: true },
  { name: 'incidentMonth', label: 'Incident Month', type: 'month', required: true },
  { name: 'applicationName', label: 'Application / Project Team Name', required: true },
  { name: 'agileTeam', label: 'Agile Team / Agile Board Name', required: true },
  { name: 'programManager', label: 'Program Manager', required: true },
  { name: 'issueStage', label: 'Issue Stage', select: issueStageOptions, required: true },
  { name: 'severity', label: 'Severity', select: severityOptions, required: true },
  { name: 'developer', label: 'Developer', required: true },
  { name: 'techLead', label: 'Tech Lead', required: true },
  { name: 'tester', label: 'Tester', required: true },
  { name: 'testLead', label: 'Test Lead', required: true },
  { name: 'rcaCategory', label: 'RCA Category', select: rcaCategoryOptions, required: true },
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

const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

const isEmployeeIncidentRoute = () => typeof window !== 'undefined' && window.location.pathname.startsWith('/employee');

const normalizeAssignments = (employee) => {
  const assignments = Array.isArray(employee?.assigned_projects) && employee.assigned_projects.length > 0
    ? employee.assigned_projects
    : Array.isArray(employee?.project_assignments) && employee.project_assignments.length > 0
      ? employee.project_assignments
      : [];

  return assignments.filter((assignment) => assignment && assignment.project_id);
};

const matchesDeveloper = (employee) => {
  const role = normalizeText(employee.role);
  const roleType = normalizeText(employee.role_type);
  return roleType.includes('dev')
    || role.includes('dev')
    || role.includes('developer')
    || role.includes('development');
};

const matchesTechLead = (employee) => {
  const role = normalizeText(employee.role);
  const roleType = normalizeText(employee.role_type);
  return roleType.includes('lead')
    || role.includes('tech lead')
    || role.includes('lead');
};

const matchesTester = (employee) => {
  const role = normalizeText(employee.role);
  const roleType = normalizeText(employee.role_type);
  return roleType.includes('qa')
    || role.includes('tester')
    || role.includes('qa')
    || role.includes('test');
};

const matchesTestLead = (employee) => {
  const role = normalizeText(employee.role);
  const roleType = normalizeText(employee.role_type);
  return roleType.includes('lead')
    || role.includes('test lead')
    || role.includes('lead');
};

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
  const [referenceData, setReferenceData] = useState({
    projects: [],
    teams: [],
    projectMembers: [],
    teamLeads: []
  });
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [teamRoster, setTeamRoster] = useState([]);
  const [teamRosterLoading, setTeamRosterLoading] = useState(false);
  const currentEmployee = useMemo(() => authService.getCurrentEmployee(), []);
  const employeeAssignments = useMemo(() => normalizeAssignments(currentEmployee), [currentEmployee]);

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
    watch,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: mergedDefaults });

  const applicationName = watch('applicationName');
  const agileTeam = watch('agileTeam');
  const programManager = watch('programManager');

  useEffect(() => {
    reset(mergedDefaults);
  }, [mergedDefaults, reset]);

  useEffect(() => {
    let mounted = true;

    const loadReferenceData = async () => {
      try {
        setReferenceLoading(true);
        const response = await fetchIncidentReferenceData();
        if (!mounted) {
          return;
        }

        if (response?.success) {
          const projects = response.data?.projects || [];
          const teams = response.data?.teams || [];
          const projectMembers = response.data?.projectMembers || [];
          const teamLeads = response.data?.teamLeads || [];

          if (isEmployeeIncidentRoute()) {
            setReferenceData({
              projects: projects.filter((project) => employeeAssignments.some((assignment) => Number(assignment.project_id) === Number(project.id))),
              teams: teams.filter((team) => employeeAssignments.some((assignment) => (
                Number(assignment.project_id) === Number(team.project_id)
                && (!assignment.team_id || Number(assignment.team_id) === Number(team.id))
              ))),
              projectMembers,
              teamLeads
            });
          } else {
            setReferenceData({
              projects,
              teams,
              projectMembers,
              teamLeads
            });
          }
        }
      } catch (error) {
        console.error('Error loading incident reference data:', error);
      } finally {
        if (mounted) {
          setReferenceLoading(false);
        }
      }
    };

    loadReferenceData();

    return () => {
      mounted = false;
    };
  }, [employeeAssignments]);

  const projectOptions = useMemo(
    () => referenceData.projects.map((project) => ({
      label: project.project_team_name,
      value: project.project_team_name
    })),
    [referenceData.projects]
  );

  const selectedProject = useMemo(
    () => referenceData.projects.find((project) => project.project_team_name === applicationName),
    [applicationName, referenceData.projects]
  );

  const selectedTeam = useMemo(
    () => referenceData.teams.find(
      (team) => team.project_team_name === applicationName && team.agile_board_name === agileTeam
    ),
    [agileTeam, applicationName, referenceData.teams]
  );

  const selectedTeamRoster = useMemo(() => {
    if (!selectedTeam?.id) {
      return [];
    }

    const projectMemberRoster = referenceData.projectMembers
      .filter((member) => Number(member.project_id) === Number(selectedTeam.project_id) && Number(member.team_id) === Number(selectedTeam.id))
      .map((member) => ({
        id: member.employee_id,
        name: member.name,
        sso: member.sso,
        role: member.role,
        role_type: member.role_type,
        location: member.work_location,
        is_team_lead: false
      }));

    const teamLeadRoster = referenceData.teamLeads
      .filter((lead) => Number(lead.project_id) === Number(selectedTeam.project_id) && Number(lead.team_id) === Number(selectedTeam.id))
      .map((lead) => ({
        id: lead.employee_id,
        name: lead.name,
        sso: lead.sso,
        role: lead.role,
        role_type: lead.role_type,
        location: lead.work_location,
        is_team_lead: true,
        team_lead_type: lead.team_lead_type
      }));

    const rosterMap = new Map();
    [...teamLeadRoster, ...projectMemberRoster].forEach((employee) => {
      if (!employee?.id) {
        return;
      }
      rosterMap.set(employee.id, employee);
    });

    return Array.from(rosterMap.values()).sort((a, b) => {
      if (a.is_team_lead && !b.is_team_lead) return -1;
      if (!a.is_team_lead && b.is_team_lead) return 1;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [referenceData.projectMembers, referenceData.teamLeads, selectedTeam]);

  const programManagerOptions = useMemo(() => {
    if (!selectedProject?.id) {
      return [];
    }

    const combinedManagerName = selectedProject.combined_manager_name
      || [selectedProject.development_manager_name, selectedProject.qa_manager_name].filter(Boolean).join('/');

    return combinedManagerName ? [combinedManagerName] : [];
  }, [selectedProject]);

  useEffect(() => {
    let mounted = true;

    const loadTeamRoster = async () => {
      if (!selectedTeam?.id) {
        setTeamRoster([]);
        return;
      }

      if (isEmployeeIncidentRoute()) {
        setTeamRoster(selectedTeamRoster);
        return;
      }

      try {
        setTeamRosterLoading(true);
        const response = await getTeamEmployees(selectedTeam.id);
        if (!mounted) {
          return;
        }

        if (response?.data?.success) {
          setTeamRoster(response.data.data?.employees || []);
        } else {
          setTeamRoster([]);
        }
      } catch (error) {
        console.error('Error loading team roster:', error);
        if (mounted) {
          setTeamRoster([]);
        }
      } finally {
        if (mounted) {
          setTeamRosterLoading(false);
        }
      }
    };

    loadTeamRoster();

    return () => {
      mounted = false;
    };
  }, [selectedTeam, selectedTeamRoster]);

  const agileTeamOptions = useMemo(() => {
    const filteredTeams = selectedProject
      ? referenceData.teams.filter((team) => team.project_id === selectedProject.id)
      : referenceData.teams;

    return filteredTeams.map((team) => ({
      label: `${team.agile_board_name} (${team.project_team_name})`,
      value: team.agile_board_name
    }));
  }, [referenceData.teams, selectedProject]);

  const developerOptions = useMemo(
    () => teamRoster
      .filter(matchesDeveloper)
      .map((employee) => ({
        label: `${employee.name}${employee.role ? ` - ${employee.role}` : ''}${employee.role_type ? ` (${employee.role_type})` : ''}`,
        value: employee.name
      })),
    [teamRoster]
  );

  const techLeadOptions = useMemo(
    () => teamRoster
      .filter(matchesTechLead)
      .map((employee) => ({
        label: `${employee.name}${employee.role ? ` - ${employee.role}` : ''}${employee.role_type ? ` (${employee.role_type})` : ''}`,
        value: employee.name
      })),
    [teamRoster]
  );

  const testerOptions = useMemo(
    () => teamRoster
      .filter(matchesTester)
      .map((employee) => ({
        label: `${employee.name}${employee.role ? ` - ${employee.role}` : ''}${employee.role_type ? ` (${employee.role_type})` : ''}`,
        value: employee.name
      })),
    [teamRoster]
  );

  const testLeadOptions = useMemo(
    () => teamRoster
      .filter(matchesTestLead)
      .map((employee) => ({
        label: `${employee.name}${employee.role ? ` - ${employee.role}` : ''}${employee.role_type ? ` (${employee.role_type})` : ''}`,
        value: employee.name
      })),
    [teamRoster]
  );

  useEffect(() => {
    if (!applicationName) {
      return;
    }

    const isValidAgileTeam = agileTeamOptions.some((option) => option.value === agileTeam);
    if (!isValidAgileTeam && agileTeam) {
      setValue('agileTeam', '');
    }
  }, [agileTeam, agileTeamOptions, applicationName, setValue]);

  const dynamicOptionsByField = {
    applicationName: projectOptions,
    agileTeam: agileTeamOptions,
    programManager: programManagerOptions,
    developer: developerOptions,
    techLead: techLeadOptions,
    tester: testerOptions,
    testLead: testLeadOptions
  };

  useEffect(() => {
    if (!programManager) {
      return;
    }

    if (programManagerOptions.includes(programManager)) {
      return;
    }

    const combinedManagerName = selectedProject?.combined_manager_name
      || [selectedProject?.development_manager_name, selectedProject?.qa_manager_name].filter(Boolean).join('/');

    if (combinedManagerName) {
      setValue('programManager', combinedManagerName);
      return;
    }

    if (selectedProject?.id && programManagerOptions.length > 0) {
      setValue('programManager', '');
    }
  }, [programManager, programManagerOptions, selectedProject, setValue]);

  const renderAutocompleteField = (field) => {
    const options = dynamicOptionsByField[field.name] || [];
    const selectOptions = field.select || [];
    const normalizedOptions = options.length > 0 ? options : selectOptions;
    const allowFreeText = ['developer', 'techLead', 'tester', 'testLead'].includes(field.name);

    return (
      <Grid size={{ xs: 12, md: field.type === 'date' || field.type === 'month' ? 3 : 4 }} key={field.name}>
        <Controller
          name={field.name}
          control={control}
          defaultValue={mergedDefaults[field.name] || ''}
          rules={{ required: field.required ? `${field.label} is required` : false }}
          render={({ field: rhfField }) => (
            <Autocomplete
              options={normalizedOptions.map((option) => (typeof option === 'string' ? option : option.value))}
              value={rhfField.value || ''}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(_, newValue) => {
                rhfField.onChange(newValue || '');
              }}
              onInputChange={(_, newInputValue, reason) => {
                if (allowFreeText && (reason === 'input' || reason === 'clear')) {
                  rhfField.onChange(newInputValue || '');
                }
              }}
              disabled={field.disabled || referenceLoading || teamRosterLoading}
              loading={referenceLoading}
              autoHighlight
              freeSolo={allowFreeText}
              selectOnFocus={allowFreeText}
              clearOnBlur={allowFreeText}
              handleHomeEndKeys={allowFreeText}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  label={field.label}
                  required={field.required}
                  error={Boolean(errors[field.name])}
              helperText={
                errors[field.name]
                  ? `${field.label} is required`
                  : (field.name === 'programManager' && !selectedProject?.id)
                    ? 'Select an application first'
                    : (referenceLoading || teamRosterLoading)
                    ? 'Loading options...'
                    : ''
              }
                />
              )}
            />
          )}
        />
      </Grid>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Grid container spacing={2}>
            {fieldGroups.map((field) => {
              if (dynamicOptionsByField[field.name] || field.select) {
                return renderAutocompleteField(field);
              }

              return (
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
                  </TextField>
                </Grid>
              );
            })}

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
                  {...register(name, {
                    required: name === 'explanation' ? 'Explanation is required' : false
                  })}
                  error={Boolean(errors[name])}
                  helperText={errors[name] ? `${label} is required` : ''}
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
