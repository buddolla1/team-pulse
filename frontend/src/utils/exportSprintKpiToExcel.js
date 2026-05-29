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

const buildSummaryRows = (sprint, project, stories) => {
  const sprintLabel = sprint ? `${formatDate(sprint.sprint_start_date)} - ${formatDate(sprint.sprint_end_date)}` : 'N/A';
  const totalKpis = stories.reduce((count, story) => count + (story.kpis?.length || 0), 0);

  const rows = [
    ['Sprint Summary'],
    ['Project', project?.agile_board_name || project?.project_team_name || 'N/A'],
    ['Sprint', sprintLabel],
    ['Sprint Start Date', sprint ? formatDate(sprint.sprint_start_date) : 'N/A'],
    ['Sprint End Date', sprint ? formatDate(sprint.sprint_end_date) : 'N/A'],
    ['Stories', String(stories.length)],
    ['KPI Entries', String(totalKpis)],
    [],
    [],
    ['Stories and KPIs']
  ];

  stories.forEach((story, storyIndex) => {
    rows.push([
      `${storyIndex + 1}. Story`,
      story.story_id || 'N/A',
      story.story_name || 'N/A',
      story.project_team_name || project?.project_team_name || 'N/A',
      story.description || 'No description',
      Array.isArray(story.applicable_kpis) ? story.applicable_kpis.length : 0,
      story.kpis?.length || 0
    ]);

    (story.kpis || []).forEach((kpi, kpiIndex) => {
      rows.push([
        '',
        `  ${storyIndex + 1}.${kpiIndex + 1} KPI`,
        kpi.kpi_option || 'N/A',
        kpi.kpi_category || 'N/A',
        kpi.kpi_subcategory || 'N/A',
        formatPercentage(kpi.percentage),
        ''
      ]);
    });

    rows.push([]);
  });

  return rows;
};

export const exportSprintKpiToExcel = ({ sprint, project, stories = [] }) => {
  const sprintLabel = [
    sprint?.agile_board_name || project?.agile_board_name || project?.project_team_name || 'sprint',
    sprint?.sprint_start_date ? new Date(sprint.sprint_start_date).toISOString().slice(0, 10) : null
  ]
    .filter(Boolean)
    .join('_')
    .replace(/[^a-zA-Z0-9_-]+/g, '_');

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

  const summaryAoa = buildSummaryRows(sprint, project, stories);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryAoa);
  summarySheet['!cols'] = [
    { wch: 18 },
    { wch: 16 },
    { wch: 28 },
    { wch: 28 },
    { wch: 40 },
    { wch: 18 },
    { wch: 12 }
  ];
  summarySheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 9, c: 0 }, e: { r: 9, c: 6 } }
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Sprint Summary');

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
