import React, { useState, useEffect, useCallback } from 'react';
import FileGrid from './FileGrid';
import FileTable from './FileTable';
import FileFilters from './FileFilters';
import SearchBar from './SearchBar';
import FolderTree from './FolderTree';
import Button from '../common/Button';
import Modal from '../common/Modal';
import FilePreview from '../upload/FilePreview';

const FileManager = ({
  userId,
  onFileSelect,
  onFileDelete,
  onFileShare,
  className = '',
}) => {
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list'
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [previewFile, setPreviewFile] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  
  useEffect(() => {
    loadFiles();
  }, [currentFolder, searchQuery, filters, sortBy, sortOrder]);
  
  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        folderId: currentFolder?.id || '',
        search: searchQuery,
        sortBy,
        sortOrder,
        ...filters,
      });
      
      const response = await fetch(`/api/files?${params}`);
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFileSelect = (file) => {
    if (selectedFiles.includes(file.id)) {
      setSelectedFiles(prev => prev.filter(id => id !== file.id));
    } else {
      setSelectedFiles(prev => [...prev, file.id]);
    }
    onFileSelect?.(file);
  };
  
  const handleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map(f => f.id));
    }
  };
  
  const handleDelete = async () => {
    try {
      const filesToDelete = fileToDelete ? [fileToDelete] : selectedFiles;
      await fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: filesToDelete }),
      });
      
      await loadFiles();
      setSelectedFiles([]);
      setShowDeleteModal(false);
      onFileDelete?.(filesToDelete);
    } catch (error) {
      console.error('Failed to delete files:', error);
    }
  };
  
  const handleDownload = async (file) => {
    try {
      const response = await fetch(`/api/files/download/${file.id}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };
  
  const handleShare = (file) => {
    onFileShare?.(file);
  };
  
  const handleMove = async (file, targetFolder) => {
    try {
      await fetch(`/api/files/move/${file.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetFolder.id }),
      });
      await loadFiles();
    } catch (error) {
      console.error('Move failed:', error);
    }
  };
  
  const handleRename = async (file, newName) => {
    try {
      await fetch(`/api/files/rename/${file.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      await loadFiles();
    } catch (error) {
      console.error('Rename failed:', error);
    }
  };
  
  const handleCreateFolder = async (folderName) => {
    try {
      await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName,
          parentId: currentFolder?.id,
        }),
      });
      await loadFiles();
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const breadcrumbs = () => {
    const crumbs = [];
    let current = currentFolder;
    while (current) {
      crumbs.unshift(current);
      current = current.parent;
    }
    return crumbs;
  };
  
  return (
    <div className={`flex h-full ${className}`}>
      {/* Sidebar - Folder Tree */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <FolderTree
          userId={userId}
          onFolderSelect={setCurrentFolder}
          selectedFolder={currentFolder}
          onCreateFolder={handleCreateFolder}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Breadcrumbs */}
            <div className="flex items-center space-x-2 text-sm">
              <button
                onClick={() => setCurrentFolder(null)}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400"
              >
                Root
              </button>
              {breadcrumbs().map((folder, index) => (
                <React.Fragment key={folder.id}>
                  <span className="text-gray-400">/</span>
                  <button
                    onClick={() => setCurrentFolder(folder)}
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400"
                  >
                    {folder.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search files..."
              />
            </div>
            
            {/* View Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/20'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/20'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="mt-4">
            <FileFilters filters={filters} onChange={setFilters} />
          </div>
          
          {/* Bulk Actions */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 flex items-center justify-between p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <span className="text-sm text-primary-600 dark:text-primary-400">
                {selectedFiles.length} file(s) selected
              </span>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDelete()}
                >
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownload({ id: selectedFiles })}
                >
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedFiles([])}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* File Display */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                No files found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchQuery ? 'Try adjusting your search' : 'Upload your first file to get started'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <FileGrid
              files={files}
              selectedFiles={selectedFiles}
              onFileSelect={handleFileSelect}
              onFilePreview={setPreviewFile}
              onFileDownload={handleDownload}
              onFileDelete={(file) => {
                setFileToDelete(file);
                setShowDeleteModal(true);
              }}
              onFileShare={handleShare}
              onFileRename={handleRename}
              onFileMove={handleMove}
            />
          ) : (
            <FileTable
              files={files}
              selectedFiles={selectedFiles}
              onSelectAll={handleSelectAll}
              onFileSelect={handleFileSelect}
              onFilePreview={setPreviewFile}
              onFileDownload={handleDownload}
              onFileDelete={(file) => {
                setFileToDelete(file);
                setShowDeleteModal(true);
              }}
              onFileShare={handleShare}
              onFileRename={handleRename}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={(field) => {
                if (sortBy === field) {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy(field);
                  setSortOrder('asc');
                }
              }}
            />
          )}
        </div>
      </div>
      
      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Files"
        onConfirm={handleDelete}
        confirmText="Delete"
        cancelText="Cancel"
      >
        <p className="text-gray-700 dark:text-gray-300">
          Are you sure you want to delete {fileToDelete ? 'this file' : `${selectedFiles.length} files`}?
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default FileManager;