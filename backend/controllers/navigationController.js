const {
  createNavigationItem,
  deleteNavigationItem,
  listNavigationItems,
  updateNavigationItem
} = require('../services/navigationService');

const sendError = (res, error, fallback) => {
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallback
  });
};

const list = async (req, res) => {
  try {
    const surface = req.query.surface || null;
    const items = await listNavigationItems(surface);
    res.json({ success: true, data: items });
  } catch (error) {
    sendError(res, error, 'Failed to fetch navigation items');
  }
};

const create = async (req, res) => {
  try {
    const result = await createNavigationItem(req.body, req.admin?.id || req.employee?.id || null);
    res.status(201).json({ success: true, message: 'Navigation item created successfully', data: result });
  } catch (error) {
    sendError(res, error, 'Failed to create navigation item');
  }
};

const update = async (req, res) => {
  try {
    const result = await updateNavigationItem(req.params.id, req.body, req.admin?.id || req.employee?.id || null);
    res.json({ success: true, message: 'Navigation item updated successfully', data: result });
  } catch (error) {
    sendError(res, error, 'Failed to update navigation item');
  }
};

const remove = async (req, res) => {
  try {
    const deleted = await deleteNavigationItem(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Navigation item not found' });
    }
    res.json({ success: true, message: 'Navigation item deleted successfully' });
  } catch (error) {
    sendError(res, error, 'Failed to delete navigation item');
  }
};

module.exports = {
  create,
  list,
  remove,
  update
};
