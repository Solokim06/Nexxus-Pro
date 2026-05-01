const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const { auth } = require('../middleware/auth');
const { validate, folderValidation, idParamValidation } = require('../middleware/validation');

// All routes require authentication
router.use(auth);

// Folder CRUD
router.get('/', 
  folderController.getFolders
);

router.get('/tree',
  folderController.getFolderTree
);

router.get('/starred',
  folderController.getStarredFolders
);

router.get('/:id',
  idParamValidation,
  validate,
  folderController.getFolder
);

router.get('/:id/contents',
  idParamValidation,
  validate,
  folderController.getFolderContents
);

router.post('/',
  folderValidation.create,
  validate,
  folderController.createFolder
);

router.put('/:id',
  idParamValidation,
  folderValidation.update,
  validate,
  folderController.updateFolder
);

router.delete('/:id',
  idParamValidation,
  validate,
  folderController.deleteFolder
);

// Folder operations
router.put('/:id/move',
  idParamValidation,
  folderController.moveFolder
);

router.put('/:id/star',
  idParamValidation,
  validate,
  folderController.toggleStar
);

// Sharing routes
router.post('/:id/share',
  idParamValidation,
  folderController.shareFolder
);

router.get('/:id/shares',
  idParamValidation,
  validate,
  folderController.getFolderShares
);

router.delete('/shares/:shareId',
  folderController.revokeFolderShare
);

module.exports = router;