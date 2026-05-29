import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { MultiSelect } from 'primereact/multiselect';
import { Slider } from 'primereact/slider';
import { ProgressBar } from 'primereact/progressbar';
import { Toolbar } from 'primereact/toolbar';
import { Tag } from 'primereact/tag';
import {
  getAllProjects,
  getSprintKpiSprints,
  createSprintKpiSprint,
  getSprintKpiStories,
  createSprintKpiStory,
  updateSprintKpiStory,
  deleteSprintKpiStory,
  createSprintKpiEntry,
  updateSprintKpiEntry,
  deleteSprintKpiEntry
} from '../services/api';
import authService from '../services/authService';
import { exportSprintKpiToExcel } from '../utils/exportSprintKpiToExcel';
import './SprintKpiPage.css';

const KPI_HIERARCHY = {
  Build: {
    Requirement: [
      'Definition of Ready (DoR) Signed-Off',
      'Non-Functional Requirements Covered',
      'Requirement Traceability Documented'
    ],
    Design: [
      'Architecture Document Sign-Off',
      'Flow Diagram Sign-Off',
      'User Interface (UI) Sign-Off',
      'Logical Flow (Algorithm) Sign-Off',
      'Enterprise Level Design Sign-Off'
    ],
    Development: [
      'Code Review with Comment Coverage',
      'Average Code Review Duration',
      'Code Review Defect Removal Efficiency',
      'Dependency Matrix Coverage',
      'Label Configuration Items Coverage',
      'Code Coverage',
      'Code Analysis (Smell & Vulnerability Removal)',
      'Defect Density',
      'True Positive Exception Detection',
      'PI Commitment',
      'Backlog Burndown Rate',
      'Team Velocity',
      'Delivered Defect Density'
    ]
  },
  QE: {
    Testing: [
      'Test Case Group Review Coverage',
      'Definition of Done (DoD) Signed-Off',
      'In-Sprint Automation for Regression',
      'Regression Test Suite Utilization',
      'Production Defect Leak %',
      'Regression Test Case Coverage',
      'Regression Automation Coverage',
      'Test Case Peer Review Efficiency'
    ]
  },
  Release: {
    Release: [
      'QCPR Sign-Off',
      'Release Planning Meeting Coverage',
      'Pre-Deployment Checklist Coverage',
      'Deployment Checklist Coverage',
      'Post-Deployment Checklist Coverage',
      'RTS Handover Coverage',
      'Incident Retrospective Coverage',
      'Deployment Postponement Count',
      'Release Defect Density',
      'Deployment Success Rate'
    ]
  },
  'Post Release': {
    KPIs: [
      'Mean Time to Detect (MTTD)',
      'Mean Time to Resolve (MTTR)'
    ]
  }
};

const CATEGORY_ALIASES = {
  Dev: 'Build',
  QA: 'QE'
};

const normalizeCategory = (category) => CATEGORY_ALIASES[category] || category || '';

const getCategoryOrder = () => Object.keys(KPI_HIERARCHY);

const getSubcategoryOrder = (category) => Object.keys(KPI_HIERARCHY[normalizeCategory(category)] || {});

const getOptionOrder = (category, subcategory) => KPI_HIERARCHY[normalizeCategory(category)]?.[subcategory] || [];

const getDefaultCategory = () => getCategoryOrder()[0] || '';

const getDefaultSubcategory = (category) => getSubcategoryOrder(category)[0] || '';

const getDefaultOption = (category, subcategory) => getOptionOrder(category, subcategory)[0] || '';

const getDefaultStoryApplicableCategory = () => getDefaultCategory();

const getKpiKey = (category, subcategory, option) => `${normalizeCategory(category)}::${subcategory}::${option}`;

const normalizeApplicableKpiCategory = (value) => normalizeCategory(value) || getDefaultStoryApplicableCategory();

const parseLocalDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = new Date(`${text}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(text)) {
    const [month, day, yearPart] = text.split('/');
    const year = yearPart.length === 2 ? Number(`20${yearPart}`) : Number(yearPart);
    const parsed = new Date(year, Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatLocalDate = (value) => {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDaysToLocalDate = (value, days) => {
  const date = parseLocalDate(value);
  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }

  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
};

const formatDisplayDate = (value) => {
  const date = parseLocalDate(value);
  if (!date || Number.isNaN(date.getTime())) {
    return '-';
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

const isSprintActive = (sprint, referenceDate = new Date()) => {
  if (!sprint) {
    return false;
  }

  const startDate = parseLocalDate(sprint.sprint_start_date);
  const endDate = parseLocalDate(sprint.sprint_end_date);
  if (!startDate || !endDate) {
    return false;
  }

  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  return startDate <= today && endDate >= today;
};

const normalizeApplicableKpis = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }
      if (item && typeof item === 'object') {
        return String(item.value || item.key || item.id || '').trim();
      }
      return '';
    }).filter(Boolean))];
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      return normalizeApplicableKpis(JSON.parse(value));
    } catch (error) {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
};

const buildApplicableKpiOptions = (category) => {
  const normalizedCategory = normalizeApplicableKpiCategory(category);
  return Object.entries(KPI_HIERARCHY[normalizedCategory] || {}).map(([subcategory, options]) => ({
    label: subcategory,
    items: options.map((option) => ({
      label: option,
      value: getKpiKey(normalizedCategory, subcategory, option)
    }))
  }));
};

const countApplicableKpiOptions = (options = []) => options.reduce((count, group) => {
  if (Array.isArray(group?.items)) {
    return count + group.items.length;
  }
  return count;
}, 0);

const getStoryApplicableCategory = (story) => normalizeApplicableKpiCategory(
  story?.applicable_kpi_category || story?.applicable_kpis?.[0]?.split('::')?.[0]
);

const getStoryApplicableKpiKeys = (story) => normalizeApplicableKpis(story?.applicable_kpis);

const getStoryCategoryOptions = (story) => {
  const storyCategory = getStoryApplicableCategory(story);
  return storyCategory ? [storyCategory] : getCategoryOrder();
};

const getStorySubcategoryOptions = (category, story) => {
  const normalizedCategory = normalizeCategory(category);
  const storyCategory = getStoryApplicableCategory(story);
  if (story && normalizedCategory !== storyCategory) {
    return [];
  }

  const storyKeys = getStoryApplicableKpiKeys(story);
  if (!storyKeys.length) {
    return getSubcategoryOrder(normalizedCategory);
  }

  const allowed = new Set(
    storyKeys
      .map((key) => String(key).split('::'))
      .filter(([keyCategory, keySubcategory]) => normalizeCategory(keyCategory) === normalizedCategory && keySubcategory)
      .map(([, keySubcategory]) => keySubcategory)
  );

  return getSubcategoryOrder(normalizedCategory).filter((subcategory) => allowed.has(subcategory));
};

const getStoryDefaultSubcategory = (category, story) => {
  const normalizedCategory = normalizeCategory(category);
  const storyKeys = getStoryApplicableKpiKeys(story);
  const preferredKey = storyKeys
    .map((key) => String(key).split('::'))
    .find(([keyCategory, keySubcategory]) => normalizeCategory(keyCategory) === normalizedCategory && keySubcategory);

  if (preferredKey?.[1]) {
    return preferredKey[1];
  }

  return getStorySubcategoryOptions(normalizedCategory, story)[0] || getDefaultSubcategory(normalizedCategory);
};

const getStoryOptionOrder = (category, subcategory, story) => {
  const normalizedCategory = normalizeCategory(category);
  const storyCategory = getStoryApplicableCategory(story);
  if (story && normalizedCategory !== storyCategory) {
    return [];
  }

  const storyKeys = getStoryApplicableKpiKeys(story);
  if (!storyKeys.length) {
    return getOptionOrder(normalizedCategory, subcategory);
  }

  const allowed = new Set(
    storyKeys
      .map((key) => String(key).split('::'))
      .filter(([keyCategory, keySubcategory, keyOption]) => normalizeCategory(keyCategory) === normalizedCategory && keySubcategory === subcategory && keyOption)
      .map(([, , keyOption]) => keyOption)
  );

  return getOptionOrder(normalizedCategory, subcategory).filter((option) => allowed.has(option));
};

const getStoryDefaultOption = (category, subcategory, story) => {
  const normalizedCategory = normalizeCategory(category);
  const storyKeys = getStoryApplicableKpiKeys(story);
  const preferredKey = storyKeys
    .map((key) => String(key).split('::'))
    .find(([keyCategory, keySubcategory, keyOption]) => (
      normalizeCategory(keyCategory) === normalizedCategory
      && keySubcategory === subcategory
      && keyOption
    ));

  if (preferredKey?.[2]) {
    return preferredKey[2];
  }

  return getStoryOptionOrder(normalizedCategory, subcategory, story)[0] || getDefaultOption(normalizedCategory, subcategory);
};

const formatApplicableKpiLabel = (key) => {
  const [category, subcategory, option] = String(key || '').split('::');
  if (!category || !subcategory || !option) {
    return String(key || '');
  }
  return `${category} / ${subcategory} / ${option}`;
};

const findOptionLocation = (category, option) => {
  const normalizedCategory = normalizeCategory(category);
  const hierarchy = KPI_HIERARCHY[normalizedCategory] || {};

  for (const [subcategory, options] of Object.entries(hierarchy)) {
    if (options.includes(option)) {
      return { category: normalizedCategory, subcategory };
    }
  }

  return {
    category: normalizedCategory,
    subcategory: getDefaultSubcategory(normalizedCategory)
  };
};

const buildKpiState = (category = getDefaultCategory(), subcategory = getDefaultSubcategory(category), option = getDefaultOption(category, subcategory)) => ({
  kpi_category: category,
  kpi_subcategory: subcategory,
  kpi_option: option,
  percentage: 0
});

const STORY_INITIAL_STATE = {
  sprint_id: '',
  story_id: '',
  story_name: '',
  description: '',
  applicable_kpi_category: getDefaultStoryApplicableCategory(),
  applicable_kpis: []
};

const SPRINT_INITIAL_STATE = {
  project_id: '',
  agile_board_name: '',
  sprint_start_date: '',
  sprint_end_date: ''
};

const buildAssignedProjectOptions = (assignments = []) => {
  const grouped = new Map();

  assignments.forEach((assignment) => {
    const projectId = assignment?.project_id;
    if (!projectId) {
      return;
    }

    if (!grouped.has(String(projectId))) {
      grouped.set(String(projectId), {
        value: projectId,
        project_team_name: assignment.agile_board_name || assignment.project_label || assignment.project_team_name || `Project ${projectId}`,
        agile_board_names: []
      });
    }

    const current = grouped.get(String(projectId));
    if (assignment.agile_board_name) {
      current.agile_board_names.push(assignment.agile_board_name);
    }
  });

  return Array.from(grouped.values()).map((item) => {
    const uniqueBoards = [...new Set(item.agile_board_names)].filter(Boolean);
    const label = uniqueBoards.length > 0 ? uniqueBoards.join(', ') : item.project_team_name;

    return {
      label,
      value: item.value
    };
  });
};

const SprintKpiPage = () => {
  const [projects, setProjects] = useState([]);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [stories, setStories] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [sprintSearchMonth, setSprintSearchMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [sprintDialogVisible, setSprintDialogVisible] = useState(false);
  const [storyDialogVisible, setStoryDialogVisible] = useState(false);
  const [kpiDialogVisible, setKpiDialogVisible] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [sprintForm, setSprintForm] = useState(SPRINT_INITIAL_STATE);
  const [sprintErrors, setSprintErrors] = useState({});
  const [storyForm, setStoryForm] = useState(STORY_INITIAL_STATE);
  const [kpiForm, setKpiForm] = useState(() => buildKpiState());
  const [kpiDrafts, setKpiDrafts] = useState([]);
  const [storyErrors, setStoryErrors] = useState({});
  const [kpiErrors, setKpiErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState(null);
  const [kpiSelectionDirty, setKpiSelectionDirty] = useState(false);
  const selectedSprintIdRef = useRef('');
  const isEmployeeMode = authService.isEmployeeAuthenticated();

  const canCreate = authService.hasPermission('sprint_kpi.create');
  const canUpdate = authService.hasPermission('sprint_kpi.update');
  const canDelete = authService.hasPermission('sprint_kpi.delete');

  const getPercentageTone = (value) => {
    const percentage = Number(value) || 0;
    if (percentage < 25) return 'low';
    if (percentage < 50) return 'mid';
    if (percentage < 75) return 'good';
    return 'high';
  };

  const projectOptions = useMemo(() => {
    if (isEmployeeMode) {
      return assignedProjects;
    }

    return projects.map((project) => ({
      label: project.agile_board_name || project.project_team_name,
      value: project.id
    }));
  }, [assignedProjects, isEmployeeMode, projects]);

  const sprintOptions = useMemo(() => sprints.map((sprint) => ({
    label: `${formatDisplayDate(sprint.sprint_start_date)} - ${formatDisplayDate(sprint.sprint_end_date)} • ${sprint.agile_board_name || sprint.project_team_name || 'Board'}`,
    value: sprint.id
  })), [sprints]);
  const activeSprints = useMemo(() => sprints.filter((sprint) => isSprintActive(sprint)), [sprints]);
  const activeSprintOptions = useMemo(() => activeSprints.map((sprint) => ({
    label: `${formatDisplayDate(sprint.sprint_start_date)} - ${formatDisplayDate(sprint.sprint_end_date)} • ${sprint.agile_board_name || sprint.project_team_name || 'Board'}`,
    value: sprint.id
  })), [activeSprints]);

  const applicableKpiCategory = normalizeApplicableKpiCategory(storyForm.applicable_kpi_category);
  const applicableKpiOptions = useMemo(() => buildApplicableKpiOptions(applicableKpiCategory), [applicableKpiCategory]);
  const applicableKpiTotalCount = useMemo(() => countApplicableKpiOptions(applicableKpiOptions), [applicableKpiOptions]);
  const applicableKpiSelectedCount = Array.isArray(storyForm.applicable_kpis) ? storyForm.applicable_kpis.length : 0;

  const loadProjects = useCallback(async () => {
    try {
      if (isEmployeeMode) {
        const cachedEmployee = authService.getCurrentEmployee() || {};
        const cachedAssignments = Array.isArray(cachedEmployee.assigned_projects) && cachedEmployee.assigned_projects.length > 0
          ? cachedEmployee.assigned_projects
          : Array.isArray(cachedEmployee.project_assignments) && cachedEmployee.project_assignments.length > 0
            ? cachedEmployee.project_assignments
            : [];
        const cachedOptions = buildAssignedProjectOptions(cachedAssignments);

        if (cachedOptions.length > 0) {
          setAssignedProjects(cachedOptions);
          setProjects(cachedOptions.map((item) => ({
            id: item.value,
            project_team_name: item.label
          })));
          setSelectedProjectId((current) => current || cachedOptions[0].value);
        }

        const response = await authService.getEmployeeProfile();
        if (response.success) {
          const profile = response.data || {};
          const employee = authService.getCurrentEmployee() || {};
          const mergedEmployee = {
            ...employee,
            ...profile
          };
          sessionStorage.setItem('employeeUser', JSON.stringify(mergedEmployee));

          const assignments = Array.isArray(profile.assigned_projects) && profile.assigned_projects.length > 0
            ? profile.assigned_projects
            : Array.isArray(profile.project_assignments) && profile.project_assignments.length > 0
              ? profile.project_assignments
              : Array.isArray(employee.assigned_projects) && employee.assigned_projects.length > 0
                ? employee.assigned_projects
                : Array.isArray(employee.project_assignments) && employee.project_assignments.length > 0
                  ? employee.project_assignments
                  : [];
          const nextAssignedProjects = buildAssignedProjectOptions(assignments);
          if (nextAssignedProjects.length > 0) {
            setAssignedProjects(nextAssignedProjects);
            setProjects(nextAssignedProjects.map((item) => ({
              id: item.value,
              project_team_name: item.label
            })));
            setSelectedProjectId((current) => current || nextAssignedProjects[0].value);
          }
          return;
        }
      }

      const response = await getAllProjects(1, 1000, null, 'project_team_name', 'ASC');
      setProjects(response.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load projects');
    }
  }, [isEmployeeMode]);

  const loadSprints = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getSprintKpiSprints({
        project_id: selectedProjectId || undefined,
        month: sprintSearchMonth || undefined
      });
      const nextSprints = response.data.data || [];
      setSprints(nextSprints);

      if (nextSprints.length > 0) {
        const currentSprintId = selectedSprintIdRef.current;
        const sprintStillExists = nextSprints.some((item) => String(item.id) === String(currentSprintId));
        const nextSelectedSprintId = sprintStillExists ? currentSprintId : nextSprints[0].id;
        const nextSelectedSprint = nextSprints.find((item) => String(item.id) === String(nextSelectedSprintId)) || nextSprints[0];
        setSelectedSprintId(nextSelectedSprintId);
        setSelectedSprint(nextSelectedSprint);
      } else {
        setSelectedSprintId('');
        setSelectedSprint(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load sprints');
      setSprints([]);
      setSelectedSprintId('');
      setSelectedSprint(null);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, sprintSearchMonth]);

  const loadStories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getSprintKpiStories(selectedSprintId || null);
      const nextStories = (response.data.data || []).map((story) => ({
        ...story,
        applicable_kpi_category: normalizeApplicableKpiCategory(story.applicable_kpi_category || story.applicable_kpis?.[0]?.split?.('::')?.[0]),
        kpis: (story.kpis || []).map((kpi) => {
          const resolvedLocation = findOptionLocation(kpi.kpi_category, kpi.kpi_option);
          return {
            ...kpi,
            kpi_category: normalizeCategory(kpi.kpi_category),
            kpi_subcategory: kpi.kpi_subcategory || resolvedLocation.subcategory
          };
        }),
        applicable_kpis: normalizeApplicableKpis(story.applicable_kpis)
      }));
      setStories(nextStories);
    } catch (error) {
      console.warn('Unable to load sprint KPI stories', error);
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSprintId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!selectedProjectId && projectOptions.length > 0) {
      setSelectedProjectId(projectOptions[0].value);
    }
  }, [projectOptions, selectedProjectId]);

  useEffect(() => {
    selectedSprintIdRef.current = selectedSprintId;
  }, [selectedSprintId]);

  useEffect(() => {
    if (isEmployeeMode && projectOptions.length === 0) {
      return;
    }

    loadSprints();
  }, [isEmployeeMode, loadSprints, projectOptions.length]);

  useEffect(() => {
    if (!selectedSprintId) {
      setStories([]);
      return;
    }

    loadStories();
  }, [loadStories, selectedSprintId]);

  useEffect(() => {
    if (!selectedSprintId || sprints.length === 0) {
      return;
    }

    const nextSelectedSprint = sprints.find((item) => String(item.id) === String(selectedSprintId)) || null;
    if (nextSelectedSprint && String(selectedSprint?.id || '') !== String(nextSelectedSprint.id)) {
      setSelectedSprint(nextSelectedSprint);
    }
  }, [sprints, selectedSprint, selectedSprintId]);

  const openStoryDialog = (story = null) => {
    if (story) {
      setSelectedStory(story);
      setStoryForm({
        sprint_id: story.sprint_id || '',
        story_id: story.story_id || '',
        story_name: story.story_name || '',
        description: story.description || '',
        applicable_kpi_category: normalizeApplicableKpiCategory(story.applicable_kpi_category || story.applicable_kpis?.[0]?.split?.('::')?.[0]),
        applicable_kpis: normalizeApplicableKpis(story.applicable_kpis)
      });
    } else {
      setSelectedStory(null);
      const nextSprintId = (selectedSprint && isSprintActive(selectedSprint))
        ? selectedSprint.id
        : activeSprints[0]?.id || '';
      if (nextSprintId && String(selectedSprintId || '') !== String(nextSprintId)) {
        setSelectedSprintId(nextSprintId);
        const nextSprint = sprints.find((item) => String(item.id) === String(nextSprintId)) || selectedSprint || null;
        setSelectedSprint(nextSprint);
      }
      setStoryForm({
        ...STORY_INITIAL_STATE,
        sprint_id: nextSprintId
      });
    }
    setStoryErrors({});
    setStoryDialogVisible(true);
  };

  const closeStoryDialog = () => {
    setStoryDialogVisible(false);
    setSelectedStory(null);
    setStoryForm(STORY_INITIAL_STATE);
    setStoryErrors({});
  };

  const openKpiDialog = (story, kpi = null) => {
    setSelectedStory(story);
    setSelectedKpi(kpi);
    const storyCategory = getStoryApplicableCategory(story);
    const nextCategory = normalizeCategory(kpi?.kpi_category || storyCategory || getDefaultCategory());
    const resolvedLocation = kpi ? findOptionLocation(nextCategory, kpi.kpi_option) : null;
    const nextSubcategory = kpi?.kpi_subcategory || resolvedLocation?.subcategory || getStoryDefaultSubcategory(nextCategory, story);
    const nextOption = kpi?.kpi_option || getStoryDefaultOption(nextCategory, nextSubcategory, story);
    setKpiForm({
      kpi_category: nextCategory,
      kpi_subcategory: nextSubcategory,
      kpi_option: nextOption,
      percentage: kpi?.percentage ?? 0
    });
    setKpiDrafts(kpi ? [{ category: nextCategory, subcategory: nextSubcategory, option: nextOption }].filter((item) => item.option) : []);
    setKpiSelectionDirty(!!kpi);
    setKpiErrors({});
    setKpiDialogVisible(true);
  };

  const closeKpiDialog = () => {
    setKpiDialogVisible(false);
    setSelectedStory(null);
    setSelectedKpi(null);
    setKpiForm(buildKpiState());
    setKpiDrafts([]);
    setKpiSelectionDirty(false);
    setKpiErrors({});
  };

  const openSprintDialog = () => {
    setSprintForm({
      project_id: selectedProjectId || projectOptions[0]?.value || '',
      agile_board_name: selectedSprint?.agile_board_name || '',
      sprint_start_date: '',
      sprint_end_date: ''
    });
    setSprintErrors({});
    setSprintDialogVisible(true);
  };

  const closeSprintDialog = () => {
    setSprintDialogVisible(false);
    setSprintForm(SPRINT_INITIAL_STATE);
    setSprintErrors({});
  };

  const handleSprintChange = (name, value) => {
    setSprintForm((current) => {
      if (name === 'sprint_start_date') {
        return {
          ...current,
          sprint_start_date: value,
          sprint_end_date: value ? addDaysToLocalDate(value, 14) : ''
        };
      }
      return { ...current, [name]: value };
    });
    if (sprintErrors[name]) {
      setSprintErrors((current) => ({ ...current, [name]: '' }));
    }
  };

  const validateSprint = () => {
    const nextErrors = {};
    if (!sprintForm.project_id) nextErrors.project_id = 'Project is required';
    if (!sprintForm.agile_board_name.trim()) nextErrors.agile_board_name = 'Agile board is required';
    if (!sprintForm.sprint_start_date) nextErrors.sprint_start_date = 'Sprint start date is required';
    if (!sprintForm.sprint_end_date) nextErrors.sprint_end_date = 'Sprint end date is required';
    if (sprintForm.sprint_start_date && sprintForm.sprint_end_date && new Date(sprintForm.sprint_end_date) < new Date(sprintForm.sprint_start_date)) {
      nextErrors.sprint_end_date = 'Sprint end date must be after start date';
    }
    setSprintErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitSprint = async () => {
    if (!validateSprint()) return;

    try {
      setSubmitting(true);
      await createSprintKpiSprint(sprintForm);
      toast.success('Sprint created successfully');
      closeSprintDialog();
      await loadSprints();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save sprint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStoryChange = (name, value) => {
    setStoryForm((current) => {
      if (name === 'applicable_kpi_category') {
        return {
          ...current,
          applicable_kpi_category: normalizeApplicableKpiCategory(value)
        };
      }
      return { ...current, [name]: value };
    });
    if (storyErrors[name]) {
      setStoryErrors((current) => ({ ...current, [name]: '' }));
    }
  };

  const handleKpiChange = (name, value) => {
    setKpiForm((current) => {
      if (name === 'kpi_category') {
        const shouldWarn = !selectedKpi && kpiSelectionDirty && value !== current.kpi_category;
        if (shouldWarn) {
          toast.warning('Data not saved. Changing the category clears the current KPI selection.');
        }
        if (!selectedKpi) {
          setKpiDrafts([]);
        }
        setKpiSelectionDirty(false);
        const nextCategory = normalizeCategory(value);
        const nextSubcategory = selectedStory
          ? getStoryDefaultSubcategory(nextCategory, selectedStory)
          : getDefaultSubcategory(nextCategory);
        return {
          ...current,
          kpi_category: nextCategory,
          kpi_subcategory: nextSubcategory,
          kpi_option: selectedStory
            ? getStoryDefaultOption(nextCategory, nextSubcategory, selectedStory)
            : getDefaultOption(nextCategory, nextSubcategory)
        };
      }
      if (name === 'kpi_subcategory') {
        const shouldWarn = !selectedKpi && kpiSelectionDirty && value !== current.kpi_subcategory;
        if (shouldWarn) {
          toast.warning('Data not saved. Changing the subcategory clears the current KPI selection.');
        }
        setKpiSelectionDirty(false);
        const nextSubcategory = value;
        return {
          ...current,
          kpi_subcategory: nextSubcategory,
          kpi_option: selectedStory
            ? getStoryDefaultOption(current.kpi_category, nextSubcategory, selectedStory)
            : getDefaultOption(current.kpi_category, nextSubcategory)
        };
      }
      if (name === 'kpi_option' && !selectedKpi) {
        setKpiSelectionDirty(true);
      }
      return { ...current, [name]: value };
    });

    if (kpiErrors[name]) {
      setKpiErrors((current) => ({ ...current, [name]: '' }));
    }
  };

  const addDraftKpiOption = () => {
    if (selectedKpi) {
      return;
    }

    const option = kpiForm.kpi_option;
    if (!option) {
      return;
    }

    const draftKey = `${kpiForm.kpi_category}::${kpiForm.kpi_subcategory}::${option}`.toLowerCase();
    if (!isKpiOptionSelectable(kpiForm.kpi_category, kpiForm.kpi_subcategory, option, null, selectedStory)) {
      toast.error('Selected KPI option is disabled for this story.');
      setKpiErrors((current) => ({ ...current, kpi_option: 'Selected KPI option is disabled for this story.' }));
      return;
    }

    const alreadyDrafted = kpiDrafts.some((item) => `${item.category}::${item.subcategory}::${item.option}`.toLowerCase() === draftKey);
    const alreadySaved = stories.flatMap((story) => story.kpis || []).some((item) => {
      const resolvedSubcategory = item.kpi_subcategory || findOptionLocation(item.kpi_category, item.kpi_option).subcategory;
      return `${normalizeCategory(item.kpi_category)}::${resolvedSubcategory}::${item.kpi_option}`.toLowerCase() === draftKey;
    });

    if (alreadyDrafted || alreadySaved) {
      toast.info(`"${option}" is already added for ${kpiForm.kpi_category} / ${kpiForm.kpi_subcategory}.`);
      return;
    }

    setKpiDrafts((current) => [...current, {
      category: kpiForm.kpi_category,
      subcategory: kpiForm.kpi_subcategory,
      option
    }]);
    setKpiSelectionDirty(true);
    setKpiErrors((current) => ({ ...current, kpi_option: '' }));
    setKpiForm((current) => ({
      ...current,
      kpi_option: selectedStory
        ? getStoryDefaultOption(current.kpi_category, current.kpi_subcategory, selectedStory)
        : getDefaultOption(current.kpi_category, current.kpi_subcategory)
    }));
  };

  const removeDraftKpiOption = (option) => {
    setKpiDrafts((current) => current.filter((item) => item.option !== option.option || item.subcategory !== option.subcategory));
  };

  const getCategoryOptions = (category) => getStorySubcategoryOptions(category, selectedStory);

  const getUsedKpiOptions = (category, subcategory, currentKpiId = null) => {
    const kpis = stories.flatMap((story) => story.kpis || []);
    const draftOptions = currentKpiId ? [] : kpiDrafts;
    return new Set(
      kpis
        .filter((item) => normalizeCategory(item.kpi_category) === category && String(item.id) !== String(currentKpiId))
        .filter((item) => (item.kpi_subcategory || findOptionLocation(item.kpi_category, item.kpi_option).subcategory) === subcategory)
        .map((item) => item.kpi_option)
        .concat(draftOptions.filter((item) => item.category === category && item.subcategory === subcategory).map((item) => item.option))
    );
  };

  const buildDropdownOptions = (category, subcategory, currentKpiId = null, story = selectedStory) => {
    const usedOptions = getUsedKpiOptions(category, subcategory, currentKpiId);
    return getStoryOptionOrder(category, subcategory, story).map((option) => ({
      label: option,
      value: option,
      disabled: usedOptions.has(option)
    }));
  };

  const isKpiOptionSelectable = (category, subcategory, option, currentKpiId = null, story = selectedStory) => {
    if (!category || !subcategory || !option) {
      return false;
    }

    return buildDropdownOptions(category, subcategory, currentKpiId, story).some((item) => item.value === option && !item.disabled);
  };

  const optionItemTemplate = (option) => (
    <span className={option.disabled ? 'kpi-option-item kpi-option-item-disabled' : 'kpi-option-item'}>
      {option.label}
    </span>
  );

  const validateStory = () => {
    const nextErrors = {};
    if (!storyForm.sprint_id) nextErrors.sprint_id = 'Sprint is required';
    if (!selectedStory) {
      const sprint = sprints.find((item) => String(item.id) === String(storyForm.sprint_id)) || null;
      if (storyForm.sprint_id && !isSprintActive(sprint)) {
        nextErrors.sprint_id = 'Stories can only be created for an active sprint.';
      }
    }
    if (!storyForm.story_id.trim()) nextErrors.story_id = 'Story ID is required';
    if (!storyForm.story_name.trim()) nextErrors.story_name = 'Story name is required';
    setStoryErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateKpi = () => {
    const nextErrors = {};
    if (!kpiForm.kpi_category) nextErrors.kpi_category = 'Category is required';
    if (!kpiForm.kpi_subcategory) nextErrors.kpi_subcategory = 'Subcategory is required';
    if (!selectedKpi && !kpiForm.kpi_option && kpiDrafts.length === 0) nextErrors.kpi_option = 'Option is required';
    if (selectedKpi && !kpiForm.kpi_option) nextErrors.kpi_option = 'Option is required';
    if (kpiForm.percentage === null || kpiForm.percentage === undefined || kpiForm.percentage <= 1 || kpiForm.percentage > 100) {
      nextErrors.percentage = 'Percentage must be greater than 1 and at most 100';
    }

    if (selectedKpi && !isKpiOptionSelectable(kpiForm.kpi_category, kpiForm.kpi_subcategory, kpiForm.kpi_option, selectedKpi.id, selectedStory)) {
      nextErrors.kpi_option = 'Selected KPI option is disabled for this story.';
    }

    setKpiErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const refreshStories = async () => {
    await loadStories();
    setExpandedRows(null);
  };

  const submitStory = async () => {
    if (!validateStory()) return;

    try {
      setSubmitting(true);
      const payload = {
        ...storyForm,
        applicable_kpi_category: normalizeApplicableKpiCategory(storyForm.applicable_kpi_category),
        applicable_kpis: normalizeApplicableKpis(storyForm.applicable_kpis)
      };
      if (selectedStory) {
        await updateSprintKpiStory(selectedStory.id, payload);
        toast.success('Story updated successfully');
      } else {
        await createSprintKpiStory(payload);
        toast.success('Story created successfully');
      }
      closeStoryDialog();
      await refreshStories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save story');
    } finally {
      setSubmitting(false);
    }
  };

  const submitKpi = async () => {
    if (!validateKpi()) return;

    try {
      setSubmitting(true);
      const payload = {
        ...kpiForm,
        kpi_category: normalizeCategory(kpiForm.kpi_category),
        percentage: Number(kpiForm.percentage) || 0
      };

      if (selectedKpi) {
        await updateSprintKpiEntry(selectedKpi.id, payload);
        toast.success('KPI updated successfully');
      } else {
        const optionsToCreate = kpiDrafts.length > 0
          ? kpiDrafts
          : [{
              category: normalizeCategory(kpiForm.kpi_category),
              subcategory: kpiForm.kpi_subcategory,
              option: kpiForm.kpi_option
            }].filter((item) => item.option);

        const results = await Promise.allSettled(
          optionsToCreate.map((item) => createSprintKpiEntry(selectedStory.id, {
            ...payload,
            kpi_category: item.category,
            kpi_subcategory: item.subcategory,
            kpi_option: item.option
          }))
        );
        const createdCount = results.filter((result) => result.status === 'fulfilled').length;
        const failed = results.filter((result) => result.status === 'rejected');

        if (createdCount > 0) {
          toast.success(createdCount === 1 ? 'KPI added successfully' : `${createdCount} KPIs added successfully`);
        }

        if (failed.length > 0) {
          toast.error(failed[0].reason?.response?.data?.message || 'Some KPI entries could not be saved');
        }
      }
      closeKpiDialog();
      await refreshStories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save KPI');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteStory = (story) => {
    confirmDialog({
      message: `Delete story ${story.story_id}?`,
      header: 'Delete Story',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await deleteSprintKpiStory(story.id);
          toast.success('Story deleted successfully');
          await refreshStories();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete story');
        }
      }
    });
  };

  const selectedProject = projects.find((project) => String(project.id) === String(selectedProjectId));
  const categoryOrder = getCategoryOrder();

  const handleDownloadSprintReport = () => {
    if (!selectedSprint) {
      toast.warn('Select a sprint before downloading the report.');
      return;
    }

    exportSprintKpiToExcel({
      sprint: selectedSprint,
      project: selectedProject,
      stories
    });

    toast.success('Sprint report downloaded successfully');
  };

  const confirmDeleteKpi = (kpi) => {
    confirmDialog({
      message: `Delete KPI ${kpi.kpi_option}?`,
      header: 'Delete KPI',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await deleteSprintKpiEntry(kpi.id);
          toast.success('KPI deleted successfully');
          await refreshStories();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete KPI');
        }
      }
    });
  };

  const storyActionsTemplate = (story) => (
    <div className="kpi-actions">
      {canCreate && (
        <Button
          icon="pi pi-plus"
          rounded
          text
          severity="success"
          tooltip="Add KPI"
          tooltipOptions={{ position: 'top' }}
          onClick={() => openKpiDialog(story)}
        />
      )}
      {canUpdate && (
        <Button
          icon="pi pi-pencil"
          rounded
          text
          severity="warning"
          tooltip="Edit story"
          tooltipOptions={{ position: 'top' }}
          onClick={() => openStoryDialog(story)}
        />
      )}
      {canDelete && (
        <Button
          icon="pi pi-trash"
          rounded
          text
          severity="danger"
          tooltip="Delete story"
          tooltipOptions={{ position: 'top' }}
          onClick={() => confirmDeleteStory(story)}
        />
      )}
    </div>
  );

  const rowExpansionTemplate = (story) => (
    <div className="kpi-expansion">
      <div className="kpi-expansion-header">
        <div>
          <h4>{story.story_name}</h4>
          <p>
            {story.project_team_name || 'Project not found'}
            {story.sprint_start_date && story.sprint_end_date
              ? ` • ${formatDisplayDate(story.sprint_start_date)} to ${formatDisplayDate(story.sprint_end_date)}`
              : ''}
          </p>
          <Tag value={normalizeApplicableKpiCategory(story.applicable_kpi_category)} severity="success" />
        </div>
        {canCreate && (
          <Button
            label="Add KPI"
            icon="pi pi-plus"
            severity="success"
            onClick={() => openKpiDialog(story)}
          />
        )}
      </div>

      <DataTable value={story.kpis || []} emptyMessage="No KPI entries yet" className="kpi-table">
        <Column field="kpi_category" header="Category" style={{ width: '140px' }} body={(row) => <Tag value={row.kpi_category} />} />
        <Column field="kpi_subcategory" header="Subcategory" style={{ width: '180px' }} body={(row) => <Tag value={row.kpi_subcategory || '-'} severity="info" />} />
        <Column field="kpi_option" header="Option" style={{ minWidth: '260px' }} />
        <Column field="percentage" header="Progress" body={(row) => (
          <div className="kpi-progress-cell">
            <ProgressBar
              value={Number(row.percentage) || 0}
              className={`kpi-progress kpi-progress-${getPercentageTone(row.percentage)}`}
              style={{ height: '0.75rem' }}
            />
            <span>{Number(row.percentage) || 0}%</span>
          </div>
        )} style={{ minWidth: '260px' }} />
        <Column
          header="Actions"
          body={(row) => (
            <div className="kpi-actions">
              {canUpdate && (
                <Button
                  icon="pi pi-pencil"
                  rounded
                  text
                  severity="warning"
                  tooltip="Edit KPI"
                  tooltipOptions={{ position: 'top' }}
                  onClick={() => openKpiDialog(story, row)}
                />
              )}
              {canDelete && (
                <Button
                  icon="pi pi-trash"
                  rounded
                  text
                  severity="danger"
                  tooltip="Delete KPI"
                  tooltipOptions={{ position: 'top' }}
                  onClick={() => confirmDeleteKpi(row)}
                />
              )}
            </div>
          )}
          style={{ width: '120px' }}
        />
      </DataTable>
    </div>
  );

  const storyToolbarLeft = () => (
    <div className="toolbar-title">
      <h1>Sprint KPI</h1>
      <p>Track user stories and their sprint KPIs by project.</p>
    </div>
  );

  const storyToolbarRight = () => (
    <div className="toolbar-controls">
      <div className="toolbar-filters">
        <Dropdown
          value={selectedProjectId}
          options={projectOptions}
          optionLabel="label"
          optionValue="value"
          onChange={(e) => setSelectedProjectId(e.value)}
          placeholder={isEmployeeMode ? 'Select assigned project' : 'Select board'}
          className="project-filter"
          showClear
          filter
          filterBy="label"
          filterPlaceholder={isEmployeeMode ? 'Search project' : 'Search board'}
        />
        <Dropdown
          value={selectedSprintId}
          options={sprintOptions}
          optionLabel="label"
          optionValue="value"
          onChange={(e) => {
            setSelectedSprintId(e.value);
            setSelectedSprint(sprints.find((item) => String(item.id) === String(e.value)) || null);
          }}
          placeholder="Select sprint"
          className="project-filter"
          showClear
          filter
        />
        <InputText
          type="month"
          value={sprintSearchMonth}
          onChange={(e) => setSprintSearchMonth(e.target.value)}
          className="date-filter"
          placeholder="Month"
        />
      </div>
      <div className="toolbar-actions">
        {canCreate && <Button icon="pi pi-plus" label="Add Sprint" severity="help" onClick={openSprintDialog} />}
        {canCreate && (
          <Button icon="pi pi-plus" label="Add Story" severity="success" onClick={() => openStoryDialog()} disabled={activeSprintOptions.length === 0} />
        )}
        <Button
          icon="pi pi-download"
          label="Download"
          severity="secondary"
          onClick={handleDownloadSprintReport}
          disabled={!selectedSprint}
        />
        <Button icon="pi pi-search" label="Search" severity="secondary" onClick={loadSprints} />
      </div>
    </div>
  );

  return (
    <div className="sprint-kpi-page">
      <ConfirmDialog />
      <Toolbar left={storyToolbarLeft} right={storyToolbarRight} className="sprint-kpi-toolbar" />

      <div className="sprint-kpi-summary">
        <div className="summary-card">
          <span className="summary-label">{isEmployeeMode ? 'Assigned project' : 'Project'}</span>
          <strong>{selectedProject?.agile_board_name || selectedProject?.project_team_name || (isEmployeeMode ? 'All assigned projects' : 'All boards')}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Sprint</span>
          <strong>{selectedSprint ? `${formatDisplayDate(selectedSprint.sprint_start_date)} to ${formatDisplayDate(selectedSprint.sprint_end_date)}` : 'No sprint selected'}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Stories</span>
          <strong>{stories.length}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">KPI categories</span>
          <strong>{categoryOrder.length}</strong>
        </div>
      </div>

      <DataTable
        value={stories}
        loading={loading}
        dataKey="id"
        expandedRows={expandedRows}
        onRowToggle={(e) => setExpandedRows(e.data)}
        rowExpansionTemplate={rowExpansionTemplate}
        emptyMessage="No sprint stories found"
        className="sprint-kpi-table"
      >
        <Column expander style={{ width: '3rem' }} />
        <Column field="sprint_start_date" header="Sprint Start" body={(row) => formatDisplayDate(row.sprint_start_date)} style={{ width: '130px' }} />
        <Column field="sprint_end_date" header="Sprint End" body={(row) => formatDisplayDate(row.sprint_end_date)} style={{ width: '130px' }} />
        <Column field="story_id" header="Story ID" style={{ width: '140px' }} />
        <Column field="story_name" header="Story Name" style={{ minWidth: '220px' }} />
        <Column field="project_team_name" header="Project" body={(row) => row.project_team_name || '-'} style={{ minWidth: '220px' }} />
        <Column field="description" header="Description" body={(row) => row.description || '-'} style={{ minWidth: '260px' }} />
        <Column header="Actions" body={storyActionsTemplate} style={{ width: '180px' }} />
      </DataTable>

      <Dialog
        visible={storyDialogVisible}
        onHide={closeStoryDialog}
        header={selectedStory ? 'Edit Story' : 'Add Story'}
        className="sprint-kpi-dialog"
        modal
      >
        <div className="dialog-grid">
          <div className="field full-width">
            <label>Sprint</label>
            <Dropdown
              value={storyForm.sprint_id}
              options={activeSprintOptions}
              onChange={(e) => handleStoryChange('sprint_id', e.value)}
              className={storyErrors.sprint_id ? 'p-invalid' : ''}
              placeholder="Select sprint"
              filter
              disabled={!!selectedStory}
            />
            {storyErrors.sprint_id && <small className="p-error">{storyErrors.sprint_id}</small>}
          </div>

          <div className="field">
            <label>Story ID</label>
            <InputText
              value={storyForm.story_id}
              onChange={(e) => handleStoryChange('story_id', e.target.value)}
              className={storyErrors.story_id ? 'p-invalid' : ''}
              placeholder="Example: ST-1024"
            />
            {storyErrors.story_id && <small className="p-error">{storyErrors.story_id}</small>}
          </div>

          <div className="field full-width">
            <label>Story Name</label>
            <InputText
              value={storyForm.story_name}
              onChange={(e) => handleStoryChange('story_name', e.target.value)}
              className={storyErrors.story_name ? 'p-invalid' : ''}
              placeholder="Short story title"
            />
            {storyErrors.story_name && <small className="p-error">{storyErrors.story_name}</small>}
          </div>

          <div className="field full-width">
            <label>Description</label>
            <InputTextarea
              rows={4}
              value={storyForm.description}
              onChange={(e) => handleStoryChange('description', e.target.value)}
              placeholder="Story details"
            />
          </div>

          <div className="field">
            <label>Category</label>
            <Dropdown
              value={storyForm.applicable_kpi_category}
              options={categoryOrder.map((value) => ({ label: value, value }))}
              onChange={(e) => handleStoryChange('applicable_kpi_category', e.value)}
            />
          </div>

          <div className="field">
            <label>Applicable KPIs</label>
            <small className="story-applicable-kpi-summary">
              {applicableKpiCategory} {applicableKpiSelectedCount}/{applicableKpiTotalCount}
            </small>
            <MultiSelect
              value={storyForm.applicable_kpis}
              options={applicableKpiOptions}
              optionGroupLabel="label"
              optionGroupChildren="items"
              onChange={(e) => handleStoryChange('applicable_kpis', e.value || [])}
              display="chip"
              filter
              placeholder="Select KPI options that apply to this story"
              className="story-applicable-kpi-select"
            />
            <small className="story-applicable-kpi-hint">
              Leave empty to allow all KPI options in the selected category.
            </small>
            <div className="story-applicable-kpi-tags">
              {(storyForm.applicable_kpis || []).length > 0 ? (
                storyForm.applicable_kpis.map((key) => (
                  <Tag key={key} value={formatApplicableKpiLabel(key)} severity="info" />
                ))
              ) : (
                <small className="story-applicable-kpi-empty">No KPI selections yet.</small>
              )}
            </div>
          </div>
        </div>

        <div className="dialog-actions">
          <Button label="Cancel" text onClick={closeStoryDialog} />
          <Button label={selectedStory ? 'Update Story' : 'Create Story'} icon="pi pi-check" onClick={submitStory} loading={submitting} />
        </div>
      </Dialog>

      <Dialog
        visible={sprintDialogVisible}
        onHide={closeSprintDialog}
        header="Create Sprint"
        className="sprint-kpi-dialog"
        modal
      >
        <div className="dialog-grid">
          <div className="field">
            <label>Project</label>
            <Dropdown
              value={sprintForm.project_id}
              options={projectOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => handleSprintChange('project_id', e.value)}
              className={sprintErrors.project_id ? 'p-invalid' : ''}
              placeholder="Select project"
              filter
            />
            {sprintErrors.project_id && <small className="p-error">{sprintErrors.project_id}</small>}
          </div>

          <div className="field">
            <label>Agile Board</label>
            <InputText
              value={sprintForm.agile_board_name}
              onChange={(e) => handleSprintChange('agile_board_name', e.target.value)}
              className={sprintErrors.agile_board_name ? 'p-invalid' : ''}
              placeholder="Exact agile board name"
            />
            {sprintErrors.agile_board_name && <small className="p-error">{sprintErrors.agile_board_name}</small>}
          </div>

          <div className="field">
            <label>Sprint Start Date</label>
            <Calendar
              value={parseLocalDate(sprintForm.sprint_start_date)}
              onChange={(e) => handleSprintChange('sprint_start_date', e.value ? formatLocalDate(e.value) : '')}
              dateFormat="mm/dd/yy"
              showIcon
              className={sprintErrors.sprint_start_date ? 'p-invalid' : ''}
              placeholder="MM/DD/YYYY"
            />
            {sprintErrors.sprint_start_date && <small className="p-error">{sprintErrors.sprint_start_date}</small>}
          </div>

          <div className="field">
            <label>Sprint End Date</label>
            <Calendar
              value={parseLocalDate(sprintForm.sprint_end_date)}
              onChange={(e) => handleSprintChange('sprint_end_date', e.value ? formatLocalDate(e.value) : '')}
              dateFormat="mm/dd/yy"
              showIcon
              className={sprintErrors.sprint_end_date ? 'p-invalid' : ''}
              placeholder="MM/DD/YYYY"
            />
            {sprintErrors.sprint_end_date && <small className="p-error">{sprintErrors.sprint_end_date}</small>}
          </div>
        </div>

        <div className="dialog-actions">
          <Button label="Cancel" text onClick={closeSprintDialog} />
          <Button label="Create Sprint" icon="pi pi-check" onClick={submitSprint} loading={submitting} />
        </div>
      </Dialog>

      <Dialog
        visible={kpiDialogVisible}
        onHide={closeKpiDialog}
        header={selectedKpi ? 'Edit KPI' : 'Add KPI'}
        className="sprint-kpi-dialog"
        modal
      >
        <div className="kpi-context">
          <strong>{selectedStory?.story_id}</strong>
          <span>{selectedStory?.story_name}</span>
        </div>

        <div className="dialog-grid">
          <div className="field">
            <label>Category</label>
            <Dropdown
              value={kpiForm.kpi_category}
              options={getStoryCategoryOptions(selectedStory).map((value) => ({ label: value, value }))}
              onChange={(e) => handleKpiChange('kpi_category', e.value)}
              className={kpiErrors.kpi_category ? 'p-invalid' : ''}
            />
            {kpiErrors.kpi_category && <small className="p-error">{kpiErrors.kpi_category}</small>}
          </div>

          <div className="field">
            <label>Subcategory</label>
            <Dropdown
              value={kpiForm.kpi_subcategory}
              options={getCategoryOptions(kpiForm.kpi_category).map((value) => ({ label: value, value }))}
              onChange={(e) => handleKpiChange('kpi_subcategory', e.value)}
              className={kpiErrors.kpi_subcategory ? 'p-invalid' : ''}
            />
            {kpiErrors.kpi_subcategory && <small className="p-error">{kpiErrors.kpi_subcategory}</small>}
          </div>

          <div className="field">
            <label>Option</label>
            <Dropdown
              value={kpiForm.kpi_option}
              options={buildDropdownOptions(kpiForm.kpi_category, kpiForm.kpi_subcategory, selectedKpi?.id, selectedStory)}
              onChange={(e) => handleKpiChange('kpi_option', e.value)}
              itemTemplate={optionItemTemplate}
              className={kpiErrors.kpi_option ? 'p-invalid' : ''}
            />
            {kpiErrors.kpi_option && <small className="p-error">{kpiErrors.kpi_option}</small>}
          </div>

          <div className="field full-width">
            <label>Percentage</label>
            <div className="percentage-editor">
              <div className="percentage-slider-row">
              <Slider
                  value={Number(kpiForm.percentage) || 0}
                  onChange={(e) => handleKpiChange('percentage', Array.isArray(e.value) ? e.value[0] : e.value ?? 0)}
                  min={2}
                  max={100}
                  className={`percentage-slider tone-${getPercentageTone(kpiForm.percentage)}`}
                />
                <span className={`percentage-value tone-${getPercentageTone(kpiForm.percentage)}`}>
                  {Number(kpiForm.percentage) || 0}%
                </span>
              </div>
                <ProgressBar
                  value={Number(kpiForm.percentage) || 0}
                  className={`kpi-progress kpi-progress-${getPercentageTone(kpiForm.percentage)}`}
                  style={{ height: '0.75rem' }}
                />
            </div>
            {kpiErrors.percentage && <small className="p-error">{kpiErrors.percentage}</small>}
          </div>

        </div>

        <div className="kpi-option-hint">
          {getStoryOptionOrder(kpiForm.kpi_category, kpiForm.kpi_subcategory, selectedStory).map((option) => (
            <Tag key={option} value={option} severity="info" />
          ))}
        </div>

        {!selectedKpi && (
          <div className="kpi-draft-panel">
            <div className="kpi-draft-panel-header">
              <label>KPI options to create</label>
                <Button
                  icon="pi pi-plus"
                  label="Add KPI"
                  severity="primary"
                  onClick={addDraftKpiOption}
                  disabled={!kpiForm.kpi_option || !isKpiOptionSelectable(kpiForm.kpi_category, kpiForm.kpi_subcategory, kpiForm.kpi_option, null, selectedStory)}
                  className="kpi-draft-add-btn"
                />
            </div>
            <div className="kpi-draft-list">
              {kpiDrafts.length > 0 ? (
                kpiDrafts.map((item) => (
                  <div key={`${item.category}-${item.subcategory}-${item.option}`} className="kpi-draft-item">
                    <span>{item.subcategory}: {item.option}</span>
                    <Button
                      icon="pi pi-times"
                      text
                      rounded
                      severity="secondary"
                      onClick={() => removeDraftKpiOption(item)}
                      className="kpi-draft-remove-btn"
                    />
                  </div>
                ))
              ) : (
                <small className="kpi-draft-empty">Add multiple KPI options such as NFR and DOR for the same category.</small>
              )}
            </div>
          </div>
        )}

        <div className="dialog-actions">
          <Button label="Cancel" text onClick={closeKpiDialog} />
          <Button label={selectedKpi ? 'Update KPI' : 'Create KPIs'} icon="pi pi-check" onClick={submitKpi} loading={submitting} />
        </div>
      </Dialog>
    </div>
  );
};

export default SprintKpiPage;
