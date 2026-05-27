const leaveTrackerService = require('../services/leaveTrackerService');

const createErrorResponse = (res, error) => {
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate leave request already exists for the selected dates and leave type.'
    });
  }

  if (['ER_BAD_NULL_ERROR', 'ER_NO_REFERENCED_ROW_2', 'ER_TRUNCATED_WRONG_VALUE', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'].includes(error.code)) {
    return res.status(400).json({
      success: false,
      message: error.sqlMessage || error.message || 'Invalid leave data.'
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Leave tracker request failed.'
  });
};

const getAll = async (req, res) => {
  try {
    const result = await leaveTrackerService.listLeaves(req.query, req.admin);
    res.json(result);
  } catch (error) {
    createErrorResponse(res, error);
  }
};

const getOne = async (req, res) => {
  try {
    const leave = await leaveTrackerService.getLeave(req.params.id, req.admin);
    res.json(leave);
  } catch (error) {
    createErrorResponse(res, error);
  }
};

const update = async (req, res) => {
  try {
    const leave = await leaveTrackerService.updateLeave(req.params.id, req.body, req.admin);
    res.json(leave);
  } catch (error) {
    createErrorResponse(res, error);
  }
};

const revoke = async (req, res) => {
  try {
    const leave = await leaveTrackerService.revokeLeave(req.params.id, req.admin);
    res.json(leave);
  } catch (error) {
    createErrorResponse(res, error);
  }
};

const create = async (req, res) => {
  try {
    if (req.admin?.user_type !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Only employees can apply for leave.'
      });
    }

    const leave = await leaveTrackerService.createLeave(req.body, req.admin);
    res.status(201).json(leave);
  } catch (error) {
    createErrorResponse(res, error);
  }
};

const exportExcel = async (req, res) => {
  try {
    const workbookBuffer = await leaveTrackerService.buildExcelReport(req.query, req.admin);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=leave-tracker-report-${timestamp}.xlsx`);
    res.send(workbookBuffer);
  } catch (error) {
    createErrorResponse(res, error);
  }
};

module.exports = {
  getAll,
  getOne,
  create,
  update,
  revoke,
  exportExcel
};
