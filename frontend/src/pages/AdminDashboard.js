import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  const isSystemAdministrator = currentUser?.role_name === 'super_admin' || currentUser?.role_id === 1;

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await authService.getDashboardStats();
      if (response.success) {
        setStats(response.data);
      } else {
        setError(response.message || 'Failed to load dashboard statistics');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while fetching statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatPercent = (value) => `${Math.round(value)}%`;

  const employeeStats = stats?.employeeStats || {};
  const projectStats = Array.isArray(stats?.projectStats) ? stats.projectStats : [];
  const roleDistribution = Array.isArray(stats?.roleDistribution) ? stats.roleDistribution : [];
  const adminStats = stats?.adminStats || {};
  const recentActivities = Array.isArray(stats?.recentActivities) ? stats.recentActivities : [];

  const totalEmployees = Number(employeeStats.total_employees || 0);
  const activeEmployees = Number(employeeStats.active_employees || 0);
  const inactiveEmployees = Number(employeeStats.inactive_employees || 0);
  const onLeaveEmployees = Number(employeeStats.on_leave_employees || 0);
  const attritionCount = Number(employeeStats.attrition_count || 0);
  const criticalEmployees = Number(employeeStats.critical_employees || 0);
  const atRiskCount = Number(employeeStats.at_risk_count || 0);
  const terminatedEmployees = Number(employeeStats.terminated_employees || 0);
  const totalProjects = projectStats.length;
  const activeProjects = projectStats.filter((project) => String(project?.status || '').toLowerCase() === 'active').length;
  const maxProjectHeadcount = projectStats.reduce((max, project) => {
    const count = Number(project?.employee_count || 0);
    return Math.max(max, count);
  }, 0);
  const largestRoleCount = roleDistribution.reduce((max, role) => {
    const count = Number(role?.count || 0);
    return Math.max(max, count);
  }, 0);

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-error">
          <p>{error}</p>
          <button onClick={fetchDashboardStats} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="welcome-text">
            Welcome back, <strong>{currentUser?.full_name}</strong>
          </p>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/admin/employees')} className="btn btn-primary">
            Manage Employees
          </button>
          {isSystemAdministrator && (
            <button onClick={() => navigate('/admin/users')} className="btn btn-secondary">
              Manage Admin Users
            </button>
          )}
          <button onClick={handleLogout} className="btn btn-outline">
            Logout
          </button>
        </div>
      </div>

      {stats && (
        <>
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h2>Employee Statistics</h2>
                <p>Live workforce snapshot with availability, risk, and lifecycle signals.</p>
              </div>
              <div className="section-meta">
                <span className="section-meta-label">Total Workforce</span>
                <strong className="section-meta-value">{totalEmployees}</strong>
                <span className="section-meta-subtle">{activeEmployees} active right now</span>
              </div>
            </div>

            <div className="summary-strip">
              <div className="summary-chip summary-chip-primary">
                <span className="summary-chip-label">Active</span>
                <strong>{activeEmployees}</strong>
              </div>
              <div className="summary-chip summary-chip-warning">
                <span className="summary-chip-label">At Risk</span>
                <strong>{atRiskCount}</strong>
              </div>
              <div className="summary-chip summary-chip-danger">
                <span className="summary-chip-label">Critical</span>
                <strong>{criticalEmployees}</strong>
              </div>
              <div className="summary-chip">
                <span className="summary-chip-label">On Leave</span>
                <strong>{onLeaveEmployees}</strong>
              </div>
              <div className="summary-chip">
                <span className="summary-chip-label">Inactive</span>
                <strong>{inactiveEmployees}</strong>
              </div>
              <div className="summary-chip">
                <span className="summary-chip-label">Attrition</span>
                <strong>{attritionCount}</strong>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card stat-primary">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <h3>{totalEmployees}</h3>
                  <p>Total Employees</p>
                </div>
              </div>

              <div className="stat-card stat-success">
                <div className="stat-icon">✓</div>
                <div className="stat-content">
                  <h3>{activeEmployees}</h3>
                  <p>Active Employees</p>
                </div>
              </div>

              <div className="stat-card stat-warning">
                <div className="stat-icon">⚠</div>
                <div className="stat-content">
                  <h3>{atRiskCount}</h3>
                  <p>At Risk</p>
                </div>
              </div>

              <div className="stat-card stat-danger">
                <div className="stat-icon">⚡</div>
                <div className="stat-content">
                  <h3>{criticalEmployees}</h3>
                  <p>Critical Priority</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <h3>{inactiveEmployees}</h3>
                  <p>Inactive</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🏖</div>
                <div className="stat-content">
                  <h3>{onLeaveEmployees}</h3>
                  <p>On Leave</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📉</div>
                <div className="stat-content">
                  <h3>{attritionCount}</h3>
                  <p>Attrition</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🔴</div>
                <div className="stat-content">
                  <h3>{terminatedEmployees}</h3>
                  <p>Terminated</p>
                </div>
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h2>Projects Overview</h2>
                <p>Project allocation ranked by headcount with current delivery status.</p>
              </div>
              <div className="section-meta">
                <span className="section-meta-label">Projects</span>
                <strong className="section-meta-value">{totalProjects}</strong>
                <span className="section-meta-subtle">{activeProjects} active</span>
              </div>
            </div>

            {projectStats.length > 0 ? (
              <>
                <div className="project-visual-grid">
                  <div className="project-insight-card project-insight-large">
                    <span className="insight-label">Top Team Size</span>
                    <strong className="insight-value">{maxProjectHeadcount}</strong>
                    <span className="insight-caption">Employees in the largest project</span>
                  </div>
                  <div className="project-insight-card">
                    <span className="insight-label">Active Projects</span>
                    <strong className="insight-value">{activeProjects}</strong>
                    <span className="insight-caption">Currently in execution</span>
                  </div>
                  <div className="project-insight-card">
                    <span className="insight-label">Tracked Projects</span>
                    <strong className="insight-value">{projectStats.length}</strong>
                    <span className="insight-caption">Sorted by headcount</span>
                  </div>
                </div>

                <div className="project-list">
                  {projectStats.map((project, index) => {
                    const projectCount = Number(project?.employee_count || 0);
                    const fillWidth = maxProjectHeadcount > 0 ? (projectCount / maxProjectHeadcount) * 100 : 0;
                    const safeStatus = String(project?.status || 'unknown').toLowerCase().replace(/\s+/g, '-');
                    const rank = index + 1;

                    return (
                      <article key={project.id} className="project-card">
                        <div className="project-card-top">
                          <div className="project-card-title">
                            <div className="project-rank">{rank}</div>
                            <div>
                              <h3>{project.project_name || 'Unnamed project'}</h3>
                              <p>{projectCount} assigned employees</p>
                            </div>
                          </div>
                          <span className={`project-status status-${safeStatus}`}>
                            {project.status || 'Unknown'}
                          </span>
                        </div>
                        <div className="project-card-body">
                          <div className="project-count-row">
                            <span>Headcount</span>
                            <strong>{projectCount}</strong>
                          </div>
                          <div className="project-bar" aria-hidden="true">
                            <div className="project-bar-fill" style={{ width: `${fillWidth}%` }} />
                          </div>
                          <div className="project-card-footer">
                            <span>{formatPercent(fillWidth)} of top project</span>
                            <span>{project.status || 'Unknown'}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="empty-state">No projects available</p>
            )}
          </section>

          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h2>Role Distribution</h2>
                <p>Workforce split by role type with relative share and volume.</p>
              </div>
              <div className="section-meta">
                <span className="section-meta-label">Role Buckets</span>
                <strong className="section-meta-value">{roleDistribution.length}</strong>
                <span className="section-meta-subtle">largest group {largestRoleCount}</span>
              </div>
            </div>

            {roleDistribution.length > 0 ? (
              <div className="role-distribution">
                <div className="role-list">
                  {roleDistribution.map((role, index) => {
                    const count = Number(role?.count || 0);
                    const share = totalEmployees > 0 ? (count / totalEmployees) * 100 : 0;
                    const label = role?.role_type || 'Unassigned';

                    return (
                      <div key={`${label}-${index}`} className="role-item">
                        <div className="role-info">
                          <div className="role-label-group">
                            <span className="role-name">{label}</span>
                            <span className="role-count">{count} employees</span>
                          </div>
                          <div className="role-percentage">{formatPercent(share)}</div>
                        </div>
                        <div className="role-bar">
                          <div
                            className="role-bar-fill"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="empty-state">No role distribution data available</p>
            )}
          </section>

          {/* Admin Users */}
          <section className="dashboard-section">
            <h2>Admin Users</h2>
            <div className="admin-stats">
              <div className="admin-stat-item">
                <span className="admin-stat-label">Total Admin Users:</span>
                <span className="admin-stat-value">{adminStats.total_admins || 0}</span>
              </div>
              <div className="admin-stat-item">
                <span className="admin-stat-label">Active Admin Users:</span>
                <span className="admin-stat-value">{adminStats.active_admins || 0}</span>
              </div>
            </div>
          </section>

          {/* Recent Activities */}
          <section className="dashboard-section">
            <h2>Recent Activities</h2>
            <div className="recent-activities">
              {recentActivities.length > 0 ? (
                <div className="activities-list">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="activity-item">
                      <div className="activity-icon">
                        {activity.action === 'CREATED' ? '➕' : '✏️'}
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">
                          <strong>{activity.name}</strong> ({activity.sso})
                        </div>
                        <div className="activity-details">
                          <span className="activity-action">{activity.action}</span>
                          <span className="activity-role">{activity.role}</span>
                          <span className={`activity-status status-${String(activity.status || '').toLowerCase().replace(' ', '-')}`}>
                            {activity.status}
                          </span>
                        </div>
                        <div className="activity-date">{formatDate(activity.updated_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No recent activities</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
