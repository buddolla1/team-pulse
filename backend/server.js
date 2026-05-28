const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const employeeRoutes = require('./routes/employeeRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const roleRoutes = require('./routes/roleRoutes');
const projectRoutes = require('./routes/projectRoutes');
const visaRoutes = require('./routes/visaRoutes');
const assetRoutes = require('./routes/assetRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const lookupRoutes = require('./routes/lookupRoutes');
const poRoutes = require('./routes/poRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const incidentDashboardRoutes = require('./routes/incidentDashboardRoutes');
const incidentNotificationRoutes = require('./routes/incidentNotificationRoutes');
const incidentReportRoutes = require('./routes/incidentReportRoutes');
const leaveTrackerRoutes = require('./routes/leaveTrackerRoutes');
const releaseManagementRoutes = require('./routes/releaseManagementRoutes');
const sprintKpiRoutes = require('./routes/sprintKpiRoutes');
const requestLogger = require('./middleware/requestLogger');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5010;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(requestLogger);

// Routes
app.use('/api/employees', employeeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', roleRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/visa', visaRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/lookups', lookupRoutes);
app.use('/api/pos', poRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/dashboard', incidentDashboardRoutes);
app.use('/api/notifications', incidentNotificationRoutes);
app.use('/api/reports', incidentReportRoutes);
app.use('/api/leave-tracker', leaveTrackerRoutes);
app.use('/api/releases', releaseManagementRoutes);
app.use('/api/sprint-kpi', sprintKpiRoutes);

// API root route
app.get('/api', (req, res) => {
  res.json({
    message: 'TeamPulse API',
    version: '2.0.0',
    endpoints: {
      employees: '/api/employees',
      auth: '/api/auth',
      admin: '/api/admin',
      roles: '/api/roles',
      permissions: '/api/permissions',
      projects: '/api/projects',
      visa: '/api/visa',
      assets: '/api/assets',
      invoices: '/api/invoices',
      lookups: '/api/lookups',
      pos: '/api/pos',
      incidents: '/api/incidents',
      incidentDashboard: '/api/dashboard',
      incidentNotifications: '/api/notifications',
      incidentReports: '/api/reports',
      leaveTracker: '/api/leave-tracker',
      releases: '/api/releases',
      sprintKpi: '/api/sprint-kpi'
    }
  });
});

// Serve the React frontend build for direct browser hits to frontend routes.
const frontendBuildPath = path.join(__dirname, '../frontend/build');
const frontendIndexPath = path.join(frontendBuildPath, 'index.html');

if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendBuildPath));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(frontendIndexPath);
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled application error', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    message: err.message,
    stack: err.stack
  });
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: err.message
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl
  });
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.stack || reason.message : reason
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    message: error.message,
    stack: error.stack
  });
});
