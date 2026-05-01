const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth, optionalAuth, authorize } = require('../middleware/auth');
const { validate, userValidation, idParamValidation } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimit');
const { uploadAvatar } = require('../middleware/upload');

// Public routes
router.post('/register', 
  authLimiter,
  userValidation.register, 
  validate, 
  authController.register
);

router.post('/login', 
  authLimiter,
  userValidation.login, 
  validate, 
  authController.login
);

router.post('/refresh', 
  authLimiter,
  authController.refreshToken
);

router.post('/forgot-password', 
  authLimiter,
  authController.forgotPassword
);

router.post('/reset-password', 
  authLimiter,
  authController.resetPassword
);

router.post('/verify-email', 
  authLimiter,
  authController.verifyEmail
);

router.post('/resend-verification', 
  authLimiter,
  authController.resendVerification
);

// Social login routes
router.get('/google', authController.googleLogin);
router.get('/google/callback', authController.googleCallback);
router.get('/github', authController.githubLogin);
router.get('/github/callback', authController.githubCallback);

// Protected routes
router.use(auth);

router.post('/logout', authController.logout);
router.get('/me', authController.getMe);

router.put('/profile', 
  userValidation.updateProfile, 
  validate, 
  authController.updateProfile
);

router.post('/avatar', 
  uploadAvatar, 
  authController.updateAvatar
);

router.delete('/avatar', authController.deleteAvatar);

router.put('/change-password', 
  userValidation.changePassword, 
  validate, 
  authController.changePassword
);

// 2FA routes
router.post('/2fa/enable', authController.enable2FA);
router.post('/2fa/verify', authController.verify2FA);
router.post('/2fa/disable', authController.disable2FA);

// Session management
router.get('/sessions', authController.getSessions);
router.delete('/sessions/:id', idParamValidation, validate, authController.revokeSession);
router.delete('/sessions', authController.revokeAllSessions);

module.exports = router;