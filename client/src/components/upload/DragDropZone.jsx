import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

const DragDropZone = ({
  onFilesAccepted,
  onFilesRejected,
  acceptedFileTypes = {},
  maxFiles = 10,
  maxSize = 10485760, // 10MB
  disabled = false,
  multiple = true,
  className = '',
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (acceptedFiles.length > 0 && onFilesAccepted) {
      onFilesAccepted(acceptedFiles);
    }
    if (rejectedFiles.length > 0 && onFilesRejected) {
      onFilesRejected(rejectedFiles);
    }
  }, [onFilesAccepted, onFilesRejected]);
  
  const { getRootProps, getInputProps, isDragActive: isDropActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxFiles,
    maxSize,
    disabled,
    multiple,
    noClick: false,
    noKeyboard: false,
  });
  
  const getFileTypeDescription = () => {
    const types = Object.values(acceptedFileTypes).flat();
    if (types.length === 0) return 'any file type';
    if (types.length > 3) return `${types.length} file types`;
    return types.join(', ');
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  return (
    <div className={`w-full ${className}`}>
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDropActive || isDragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragEnter={() => setIsDragActive(true)}
        onDragLeave={() => setIsDragActive(false)}
      >
        <input {...getInputProps()} />
        
        {/* Upload Icon */}
        <div className="flex justify-center mb-4">
          <div className={`
            w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-200
            ${isDropActive || isDragActive
              ? 'bg-primary-100 dark:bg-primary-900/40 scale-110'
              : 'bg-gray-100 dark:bg-gray-800'
            }
          `}>
            <svg 
              className={`w-10 h-10 transition-all duration-200 ${
                isDropActive || isDragActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {isDropActive || isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          or click to browse files from your computer
        </p>
        
        {/* File Limits Info */}
        <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
          <p>Maximum files: {maxFiles === Infinity ? 'Unlimited' : maxFiles}</p>
          <p>Maximum size per file: {formatFileSize(maxSize)}</p>
          <p>Accepted formats: {getFileTypeDescription()}</p>
        </div>
      </div>
    </div>
  );
};

// With Preview Support
export const DragDropZoneWithPreview = ({
  onFilesAccepted,
  onFilesRejected,
  acceptedFileTypes = {},
  maxFiles = 10,
  maxSize = 10485760,
  disabled = false,
  multiple = true,
  className = '',
}) => {
  const [previews, setPreviews] = useState([]);
  
  const handleFilesAccepted = (files) => {
    // Create preview URLs for images
    const newPreviews = files.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      id: Math.random().toString(36),
    }));
    
    setPreviews(prev => [...prev, ...newPreviews]);
    
    if (onFilesAccepted) {
      onFilesAccepted(files);
    }
  };
  
  const removePreview = (id) => {
    const preview = previews.find(p => p.id === id);
    if (preview?.preview) {
      URL.revokeObjectURL(preview.preview);
    }
    setPreviews(prev => prev.filter(p => p.id !== id));
  };
  
  const clearAllPreviews = () => {
    previews.forEach(preview => {
      if (preview.preview) {
        URL.revokeObjectURL(preview.preview);
      }
    });
    setPreviews([]);
  };
  
  return (
    <div className={className}>
      <DragDropZone
        onFilesAccepted={handleFilesAccepted}
        onFilesRejected={onFilesRejected}
        acceptedFileTypes={acceptedFileTypes}
        maxFiles={maxFiles}
        maxSize={maxSize}
        disabled={disabled}
        multiple={multiple}
      />
      
      {/* Previews */}
      {previews.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Selected Files ({previews.length})
            </h4>
            <button
              onClick={clearAllPreviews}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Clear all
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {previews.map(({ file, preview, id }) => (
              <div key={id} className="relative group">
                {preview ? (
                  <img
                    src={preview}
                    alt={file.name}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                ) : (
                  <div className="w-full h-24 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-xs text-gray-500 mt-1 truncate px-1">
                      {file.name.split('.').pop()?.toUpperCase()}
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
                  {file.name}
                </p>
                <button
                  onClick={() => removePreview(id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DragDropZone;