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

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
  addComment,
  addAttachment
};
