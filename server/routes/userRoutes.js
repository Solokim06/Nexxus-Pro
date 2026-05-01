const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');
const { validate, userValidation, paginationValidation } = require('../middleware/validation');
const { uploadAvatar } = require('../middleware/upload');

// All routes require authentication
router.use(auth);

// Profile
router.get('/profile', userController.getProfile);
router.put('/profile', userValidation.updateProfile, validate, userController.updateProfile);
router.post('/avatar', uploadAvatar, userController.updateAvatar);
router.delete('/avatar', userController.deleteAvatar);

// Account management
router.delete('/account', userController.deleteAccount);
router.post('/reactivate', userController.reactivateAccount);

// Statistics
router.get('/stats', userController.getUserStats);
router.get('/activity', paginationValidation, validate, userController.getActivityLog);

// Preferences
router.get('/preferences', userController.getPreferences);
router.put('/preferences', userController.updatePreferences);

// API Keys
router.get('/api-keys', userController.getApiKeys);
router.post('/api-keys', userController.createApiKey);
router.delete('/api-keys/:keyId', userController.revokeApiKey);

// Team management
router.get('/team', userController.getTeam);
router.post('/team/invite', userController.inviteTeamMember);
router.delete('/team/:memberId', userController.removeTeamMember);
router.put('/team/:memberId/role', userController.updateTeamMemberRole);

// Data export
router.post('/export-data', userController.requestDataExport);
router.get('/exports/:exportId/status', userController.getExportStatus);
router.get('/exports/:exportId/download', userController.downloadExport);

module.exports = router;