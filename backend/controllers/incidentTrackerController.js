const db = require('../config/database');
const incidentTrackerService = require('../services/incidentTrackerService');

const createErrorResponse = (res, error) => {
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Incident ID already exists. Use a unique incident ID.'
    });
  }

  if (['ER_BAD_NULL_ERROR', 'ER_NO_REFERENCED_ROW_2', 'ER_TRUNCATED_WRONG_VALUE', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'].includes(error.code)) {
    return res.status(400).json({
      success: false,
      message: error.sqlMessage || error.message || 'Invalid incident data.'
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Incident tracker request failed.'
  });
};

const getAll = async (req, res) => {
  try {
    const result = await incidentTrackerService.listIncidents(req.query);
    res.json(result);
  } catch (error) {
    createErrorResponse(res, error);
  }
};

const getOne = async (req, res) => {
  try {
    const incident = await incidentTrackerService.getIncident(req.params.id);
    res.json(incident);
  } catch (error) {
    createErrorResponse(res, error);
  }
};

const create = async (req, res) => {
  try {
    const incident = await incidentTrackerService.createIncident(req.body, req.admin);
    res.status(201).json(incident);
  } catch (error) {
    createErrorResponse(res, error);
  }
};

const update = async (req, res) => {
  try {
    const incident = await incidentTrackerService.updateIncident(req.params.id, req.body, req.admin);
    res.json(incident);
  } catch (error) {
    createErrorResponse(res, error);
  }
};

const remove = async (req, res) => {
  try {
    await incidentTrackerService.deleteIncident(req.params.id, req.admin);
    res.status(204).send();
  } catch (error) {
    createErrorResponse(res, error);
  }
};

const addComment = async (req, res) => {
  try {
    const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
    if (!body) {
      return res.status(400).json({ success: false, message: 'Comment body is required.' });
    }
    const comment = await incidentTrackerService.addComment(req.params.id, body, req.admin);
    res.status(201).json(comment);
  } catch (error) {
    createErrorResponse(res, error);
  }
};

const addAttachment = async (req, res) => {
  try {
    const attachment = await incidentTrackerService.addAttachment(req.params.id, req.file, req.admin);
    res.status(201).json(attachment);
  } catch (error) {
    createErrorResponse(res, error);
  }
};

const getReferenceData = async (req, res) => {
  try {
    const [projects] = await db.query(
      `SELECT p.id,
              p.project_team_name,
              om.name AS development_manager_name,
              osm.name AS qa_manager_name
       FROM projects p
       LEFT JOIN employees om ON p.offshore_manager_id = om.id AND om.status = 'Active'
       LEFT JOIN employees osm ON p.onsite_manager_id = osm.id AND osm.status = 'Active'
       ORDER BY project_team_name ASC`
    );

    const [teams] = await db.query(
      `SELECT pt.id, pt.project_id, p.project_team_name, pt.agile_board_name
       FROM project_teams pt
       JOIN projects p ON p.id = pt.project_id
       ORDER BY p.project_team_name ASC, pt.agile_board_name ASC`
    );

    const [employees] = await db.query(
      `SELECT id, name, role, role_type, work_location, status
       FROM employees
       WHERE status = 'Active'
       ORDER BY name ASC`
    );

    const [projectMembers] = await db.query(
      `SELECT DISTINCT
         pe.project_id,
         pe.team_id,
         e.id AS employee_id,
         e.name,
         e.role,
         e.role_type,
         e.work_location,
         p.project_team_name,
         pt.agile_board_name
       FROM project_employees pe
       JOIN employees e ON e.id = pe.employee_id
       JOIN projects p ON p.id = pe.project_id
       LEFT JOIN project_teams pt ON pt.id = pe.team_id
       WHERE e.status = 'Active'
       ORDER BY p.project_team_name ASC, pt.agile_board_name ASC, e.name ASC`
    );

    const [teamLeads] = await db.query(
      `SELECT DISTINCT
         pt.project_id,
         pt.id AS team_id,
         e.id AS employee_id,
         e.name,
         e.role,
         e.role_type,
         e.work_location,
         p.project_team_name,
         pt.agile_board_name,
         'Offshore Team Lead' AS team_lead_type
       FROM project_teams pt
       JOIN projects p ON p.id = pt.project_id
       JOIN employees e ON e.id = pt.offshore_team_lead_id
       WHERE pt.offshore_team_lead_id IS NOT NULL
         AND e.status = 'Active'
       UNION
       SELECT DISTINCT
         pt.project_id,
         pt.id AS team_id,
         e.id AS employee_id,
         e.name,
         e.role,
         e.role_type,
         e.work_location,
         p.project_team_name,
         pt.agile_board_name,
         'Onsite Team Lead' AS team_lead_type
       FROM project_teams pt
       JOIN projects p ON p.id = pt.project_id
       JOIN employees e ON e.id = pt.onsite_team_lead_id
       WHERE pt.onsite_team_lead_id IS NOT NULL
         AND e.status = 'Active'
       ORDER BY project_team_name ASC, agile_board_name ASC, name ASC`
    );

    res.json({
      success: true,
      data: {
        projects,
        teams,
        employees,
        projectMembers,
        teamLeads
      }
    });
  } catch (error) {
    createErrorResponse(res, error);
  }
};

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
  addComment,
  addAttachment,
  getReferenceData
};
