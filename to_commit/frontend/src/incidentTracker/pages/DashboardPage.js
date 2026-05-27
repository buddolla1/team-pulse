import React, { useCallback, useState } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import ChartCard from '../components/ChartCard';
import { fetchDashboard } from '../services/incidentService';
import usePolling from '../hooks/usePolling';
import { getCurrentMonth } from '../utils/date';

export default function DashboardPage() {
  const [data, setData] = useState({
    total: 0,
    open: 0,
    closed: 0,
    byRca: [],
    byTeam: [],
    bySeverity: [],
    byIssueStage: [],
    monthlyTrend: [],
    slaMetrics: {},
  });

  const loadDashboard = useCallback(async () => {
    const result = await fetchDashboard(getCurrentMonth());
    setData(result);
  }, []);

  usePolling(loadDashboard, Number(process.env.REACT_APP_REFRESH_INTERVAL_SECONDS || 60));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Monthly incident health, trends, RCA distribution, and team performance." />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 3 }}><MetricCard label="Total Incidents" value={data.total} /></Grid>
        <Grid size={{ xs: 12, md: 3 }}><MetricCard label="Open Incidents" value={data.open} color="warning.main" /></Grid>
        <Grid size={{ xs: 12, md: 3 }}><MetricCard label="Closed Incidents" value={data.closed} color="success.main" /></Grid>
        <Grid size={{ xs: 12, md: 3 }}><MetricCard label="SLA Breached" value={data.slaMetrics?.dataValues?.breached || 0} color="error.main" /></Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Incidents Per Month">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="incidentMonth" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#2563eb" name="Incidents" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="RCA Category">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={data.byRca} dataKey="count" nameKey="rcaCategory" outerRadius={110} fill="#0f766e" label />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Agile Team Incidents">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.byTeam}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="agileTeam" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Severity Distribution">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.bySeverity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="severity" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Issue Stage Distribution">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.byIssueStage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="issueStage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </>
  );
}
