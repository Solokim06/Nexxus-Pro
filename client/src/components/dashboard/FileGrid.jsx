import React from 'react';
import FileCard from './FileCard';

const FileGrid = ({
  files,
  selectedFiles,
  onFileSelect,
  onFilePreview,
  onFileDownload,
  onFileDelete,
  onFileShare,
  onFileRename,
  onFileMove,
  className = '',
}) => {
  // Separate folders and files
  const folders = files.filter(f => f.isFolder);
  const fileItems = files.filter(f => !f.isFolder);
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Folders Section */}
      {folders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Folders
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {folders.map((folder) => (
              <FileCard
                key={folder.id}
                file={folder}
                isSelected={selectedFiles.includes(folder.id)}
                onSelect={onFileSelect}
                onPreview={onFilePreview}
                onDownload={onFileDownload}
                onDelete={onFileDelete}
                onShare={onFileShare}
                onRename={onFileRename}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Files Section */}
      {fileItems.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Files
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {fileItems.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                isSelected={selectedFiles.includes(file.id)}
                onSelect={onFileSelect}
                onPreview={onFilePreview}
                onDownload={onFileDownload}
                onDelete={onFileDelete}
                onShare={onFileShare}
                onRename={onFileRename}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileGrid;