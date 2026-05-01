const Folder = require('../models/Folder');
const File = require('../models/File');
const { createAuditLog } = require('../services/auditService');

// @desc    Get all folders
// @route   GET /api/folders
// @access  Private
exports.getFolders = async (req, res) => {
  try {
    const { parentId = null } = req.query;
    
    const query = {
      userId: req.user.id,
      isDeleted: false,
    };
    
    if (parentId === 'null' || !parentId) {
      query.parentId = null;
    } else {
      query.parentId = parentId;
    }
    
    const folders = await Folder.find(query).sort({ name: 1 });
    
    res.json({
      success: true,
      data: folders,
    });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get folders',
    });
  }
};

// @desc    Get single folder
// @route   GET /api/folders/:id
// @access  Private
exports.getFolder = async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
    }
    
    res.json({
      success: true,
      data: folder,
    });
  } catch (error) {
    console.error('Get folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get folder',
    });
  }
};

// @desc    Create folder
// @route   POST /api/folders
// @access  Private
exports.createFolder = async (req, res) => {
  try {
    const { name, parentId = null } = req.body;
    
    // Check if folder already exists in same location
    const existingFolder = await Folder.findOne({
      name,
      userId: req.user.id,
      parentId: parentId || null,
      isDeleted: false,
    });
    
    if (existingFolder) {
      return res.status(400).json({
        success: false,
        message: 'A folder with this name already exists',
      });
    }
    
    const folder = await Folder.create({
      name,
      userId: req.user.id,
      parentId: parentId || null,
    });
    
    await createAuditLog({
      userId: req.user.id,
      action: 'CREATE_FOLDER',
      details: { folderName: name, parentId },
      ip: req.ip,
    });
    
    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      data: folder,
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create folder',
    });
  }
};

// @desc    Update folder
// @route   PUT /api/folders/:id
// @access  Private
exports.updateFolder = async (req, res) => {
  try {
    const { name } = req.body;
    const folder = await Folder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
    }
    
    folder.name = name || folder.name;
    await folder.save();
    
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE_FOLDER',
      details: { folderId: folder._id, newName: name },
      ip: req.ip,
    });
    
    res.json({
      success: true,
      message: 'Folder updated successfully',
      data: folder,
    });
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update folder',
    });
  }
};

// @desc    Delete folder
// @route   DELETE /api/folders/:id
// @access  Private
exports.deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
    }
    
    // Move all files in folder to trash
    await File.updateMany(
      { folderId: folder._id, userId: req.user.id },
      { isDeleted: true, deletedAt: Date.now() }
    );
    
    // Delete all subfolders recursively
    await deleteSubfolders(folder._id, req.user.id);
    
    folder.isDeleted = true;
    folder.deletedAt = Date.now();
    await folder.save();
    
    await createAuditLog({
      userId: req.user.id,
      action: 'DELETE_FOLDER',
      details: { folderName: folder.name },
      ip: req.ip,
    });
    
    res.json({
      success: true,
      message: 'Folder deleted successfully',
    });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete folder',
    });
  }
};

// Helper function to delete subfolders recursively
async function deleteSubfolders(parentId, userId) {
  const subfolders = await Folder.find({ parentId, userId, isDeleted: false });
  
  for (const subfolder of subfolders) {
    await File.updateMany(
      { folderId: subfolder._id, userId },
      { isDeleted: true, deletedAt: Date.now() }
    );
    await deleteSubfolders(subfolder._id, userId);
    
    subfolder.isDeleted = true;
    subfolder.deletedAt = Date.now();
    await subfolder.save();
  }
}

// @desc    Get folder tree
// @route   GET /api/folders/tree
// @access  Private
exports.getFolderTree = async (req, res) => {
  try {
    const folders = await Folder.find({
      userId: req.user.id,
      isDeleted: false,
    }).sort({ name: 1 });
    
    const folderTree = buildTree(folders);
    
    res.json({
      success: true,
      data: folderTree,
    });
  } catch (error) {
    console.error('Get folder tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get folder tree',
    });
  }
};

// Helper function to build folder tree
function buildTree(folders, parentId = null) {
  return folders
    .filter(folder => String(folder.parentId) === String(parentId))
    .map(folder => ({
      ...folder.toObject(),
      children: buildTree(folders, folder._id),
    }));
}

// @desc    Get folder contents
// @route   GET /api/folders/:id/contents
// @access  Private
exports.getFolderContents = async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
    }
    
    const subfolders = await Folder.find({
      parentId: folder._id,
      userId: req.user.id,
      isDeleted: false,
    }).sort({ name: 1 });
    
    const files = await File.find({
      folderId: folder._id,
      userId: req.user.id,
      isDeleted: false,
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: {
        currentFolder: folder,
        folders: subfolders,
        files: files,
      },
    });
  } catch (error) {
    console.error('Get folder contents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get folder contents',
    });
  }
};

// @desc    Move folder
// @route   PUT /api/folders/:id/move
// @access  Private
exports.moveFolder = async (req, res) => {
  try {
    const { destinationFolderId } = req.body;
    const folder = await Folder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
    }
    
    // Check if destination is valid (not a subfolder of itself)
    if (destinationFolderId) {
      const isDescendant = await isFolderDescendant(destinationFolderId, folder._id, req.user.id);
      if (isDescendant) {
        return res.status(400).json({
          success: false,
          message: 'Cannot move a folder into its own subfolder',
        });
      }
    }
    
    folder.parentId = destinationFolderId || null;
    await folder.save();
    
    res.json({
      success: true,
      message: 'Folder moved successfully',
      data: folder,
    });
  } catch (error) {
    console.error('Move folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move folder',
    });
  }
};

// Helper to check if folder is descendant
async function isFolderDescendant(parentId, targetId, userId) {
  if (!parentId) return false;
  
  const parent = await Folder.findOne({ _id: parentId, userId });
  if (!parent) return false;
  if (String(parent.parentId) === String(targetId)) return true;
  
  return isFolderDescendant(parent.parentId, targetId, userId);
}

// @desc    Star/unstar folder
// @route   PUT /api/folders/:id/star
// @access  Private
exports.toggleStar = async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
    }
    
    folder.isStarred = !folder.isStarred;
    await folder.save();
    
    res.json({
      success: true,
      message: folder.isStarred ? 'Folder starred' : 'Folder unstarred',
    });
  } catch (error) {
    console.error('Toggle star error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update star status',
    });
  }
};