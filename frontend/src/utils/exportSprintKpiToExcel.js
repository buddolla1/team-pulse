import * as XLSX from 'xlsx';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
};

const formatPercentage = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric}%` : '0%';
};

const buildSummaryRows = (sprint, project, stories) => [
  {
    Field: 'Project',
    Value: project?.agile_board_name || project?.project_team_name || 'N/A'
  },
  {
    Field: 'Sprint',
    Value: sprint ? `${formatDate(sprint.sprint_start_date)} - ${formatDate(sprint.sprint_end_date)}` : 'N/A'
  },
  {
    Field: 'Sprint Start Date',
    Value: sprint ? formatDate(sprint.sprint_start_date) : 'N/A'
  },
  {
    Field: 'Sprint End Date',
    Value: sprint ? formatDate(sprint.sprint_end_date) : 'N/A'
  },
  {
    Field: 'Stories',
    Value: stories.length
  },
  {
    Field: 'KPI Entries',
    Value: stories.reduce((count, story) => count + (story.kpis?.length || 0), 0)
  }
];

export const exportSprintKpiToExcel = ({ sprint, project, stories = [] }) => {
  const sprintLabel = [
    sprint?.agile_board_name || project?.agile_board_name || project?.project_team_name || 'sprint',
    sprint?.sprint_start_date ? new Date(sprint.sprint_start_date).toISOString().slice(0, 10) : null
  ]
    .filter(Boolean)
    .join('_')
    .replace(/[^a-zA-Z0-9_-]+/g, '_');

  const summaryRows = buildSummaryRows(sprint, project, stories);
  const storyRows = stories.map((story, index) => ({
    'No.': index + 1,
    'Story ID': story.story_id || 'N/A',
    'Story Name': story.story_name || 'N/A',
    Project: story.project_team_name || project?.project_team_name || 'N/A',
    Sprint: sprint ? `${formatDate(sprint.sprint_start_date)} - ${formatDate(sprint.sprint_end_date)}` : 'N/A',
    Description: story.description || 'N/A',
    'Applicable KPI Category': story.applicable_kpi_category || 'All',
    'Applicable KPI Count': Array.isArray(story.applicable_kpis) ? story.applicable_kpis.length : 0,
    'KPI Count': story.kpis?.length || 0
  }));

  const kpiRows = stories.flatMap((story) => (story.kpis || []).map((kpi, index) => ({
    'No.': index + 1,
    Sprint: sprint ? `${formatDate(sprint.sprint_start_date)} - ${formatDate(sprint.sprint_end_date)}` : 'N/A',
    Project: story.project_team_name || project?.project_team_name || 'N/A',
    'Story ID': story.story_id || 'N/A',
    'Story Name': story.story_name || 'N/A',
    Category: kpi.kpi_category || 'N/A',
    Subcategory: kpi.kpi_subcategory || 'N/A',
    Option: kpi.kpi_option || 'N/A',
    Percentage: formatPercentage(kpi.percentage)
  })));

  const wb = XLSX.utils.book_new();

  const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
  summaryWs['!cols'] = [{ wch: 24 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Sprint Summary');

  const storiesWs = XLSX.utils.json_to_sheet(storyRows);
  storiesWs['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 32 },
    { wch: 26 },
    { wch: 26 },
    { wch: 42 },
    { wch: 22 },
    { wch: 18 },
    { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, storiesWs, 'Stories');

  const kpisWs = XLSX.utils.json_to_sheet(kpiRows);
  kpisWs['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 26 },
    { wch: 14 },
    { wch: 32 },
    { wch: 18 },
    { wch: 20 },
    { wch: 42 },
    { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, kpisWs, 'KPIs');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `sprint_kpi_${sprintLabel || 'export'}_${timestamp}.xlsx`;
  XLSX.writeFile(wb, filename);

  return filename;
};
