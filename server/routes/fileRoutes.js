const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { auth } = require('../middleware/auth');
const { validate, fileValidation, paginationValidation, idParamValidation } = require('../middleware/validation');
const { uploadSingle, uploadMultiple, uploadChunk } = require('../middleware/upload');
const { checkStorageLimit, checkFileSizeLimit } = require('../middleware/planLimits');
const { generalLimiter, uploadLimiter, downloadLimiter } = require('../middleware/rateLimit');

// All routes require authentication
router.use(auth);

// File CRUD operations
router.get('/', 
  paginationValidation,
  validate,
  fileController.getFiles
);

router.get('/recent', 
  fileController.getRecentFiles
);

router.get('/starred', 
  fileController.getStarredFiles
);

router.get('/search', 
  fileController.searchFiles
);

router.get('/trash', 
  fileController.getTrashedFiles
);

router.get('/:id', 
  idParamValidation,
  validate,
  fileController.getFile
);

router.get('/:id/info',
  idParamValidation,
  validate,
  fileController.getFileInfo
);

// Upload routes
router.post('/upload',
  uploadLimiter,
  checkStorageLimit,
  checkFileSizeLimit,
  uploadSingle('file'),
  fileController.uploadFile
);

router.post('/upload-multiple',
  uploadLimiter,
  checkStorageLimit,
  uploadMultiple('files', 10),
  fileController.uploadMultiple
);

router.post('/upload-chunk',
  uploadLimiter,
  uploadChunk,
  fileController.uploadChunk
);

router.post('/complete-upload',
  fileController.completeUpload
);

router.get('/upload-status/:fileId',
  fileController.getUploadStatus
);

// File operations
router.put('/:id',
  fileValidation.update,
  validate,
  fileController.updateFile
);

router.delete('/:id',
  idParamValidation,
  validate,
  fileController.deleteFile
);

router.delete('/:id/permanent',
  idParamValidation,
  validate,
  fileController.permanentDelete
);

router.post('/:id/restore',
  idParamValidation,
  validate,
  fileController.restoreFile
);

router.put('/:id/star',
  idParamValidation,
  validate,
  fileController.toggleStar
);

router.get('/download/:id',
  downloadLimiter,
  idParamValidation,
  validate,
  fileController.downloadFile
);

router.post('/download-multiple',
  downloadLimiter,
  fileController.downloadMultiple
);

// Sharing routes
router.post('/:id/share',
  fileValidation.share,
  validate,
  fileController.shareFile
);

router.get('/:id/shares',
  idParamValidation,
  validate,
  fileController.getSharedLinks
);

router.delete('/shares/:shareId',
  fileController.revokeShare
);

router.get('/shared-with-me',
  fileController.getSharedWithMe
);

// Versioning routes
router.get('/:id/versions',
  idParamValidation,
  validate,
  fileController.getFileVersions
);

router.post('/:id/versions/:versionId/restore',
  fileController.restoreVersion
);

router.delete('/:id/versions/:versionId',
  fileController.deleteVersion
);

module.exports = router;