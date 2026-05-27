const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, checkAdminStatus, verifyEmployeeToken, checkEmployeeStatus } = require('../middleware/authMiddleware');
const { attachPermissions } = require('../middleware/permissionsMiddleware');

// Public routes
router.post('/login', authController.loginAdmin);
router.post('/employee-login', authController.loginEmployee);

// Protected routes (require authentication)
router.get('/profile', verifyToken, checkAdminStatus, attachPermissions, authController.getProfile);
router.post('/change-password', verifyToken, checkAdminStatus, authController.changePassword);
router.post('/logout', verifyToken, authController.logoutAdmin);
router.get('/employee-profile-lite', verifyEmployeeToken, checkEmployeeStatus, authController.getEmployeeProfileLite);
router.get('/employee-profile', verifyEmployeeToken, checkEmployeeStatus, authController.getEmployeeProfile);
router.post('/employee-change-password', verifyEmployeeToken, checkEmployeeStatus, authController.changeEmployeePassword);

module.exports = router;
