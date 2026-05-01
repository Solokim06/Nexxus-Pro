import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';

const FilePreview = ({ file, isOpen, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (file && isOpen) {
      generatePreview();
    }
    
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file, isOpen]);
  
  const generatePreview = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } catch (err) {
      setError('Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getFileType = () => {
    return file?.type?.split('/')[0] || 'unknown';
  };
  
  const renderPreview = () => {
    const fileType = getFileType();
    
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading preview...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96">
          <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-4 text-red-600">{error}</p>
        </div>
      );
    }
    
    switch (fileType) {
      case 'image':
        return (
          <img
            src={previewUrl}
            alt={file.name}
            className="max-w-full max-h-96 object-contain mx-auto"
          />
        );
      
      case 'video':
        return (
          <video
            src={previewUrl}
            controls
            className="max-w-full max-h-96 mx-auto"
          >
            Your browser does not support video playback.
          </video>
        );
      
      case 'audio':
        return (
          <div className="flex flex-col items-center space-y-4">
            <svg className="w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <audio src={previewUrl} controls className="w-full max-w-md" />
          </div>
        );
      
      case 'text':
        return (
          <iframe
            src={previewUrl}
            title={file.name}
            className="w-full h-96 border-0"
          />
        );
      
      case 'application':
        if (file.type === 'application/pdf') {
          return (
            <iframe
              src={previewUrl}
              title={file.name}
              className="w-full h-96 border-0"
            />
          );
        }
        return renderUnsupportedPreview();
      
      default:
        return renderUnsupportedPreview();
    }
  };
  
  const renderUnsupportedPreview = () => {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
          Preview not available
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          This file type cannot be previewed in the browser.
        </p>
        <Button
          variant="primary"
          className="mt-4"
          onClick={() => window.open(previewUrl)}
        >
          Download File
        </Button>
      </div>
    );
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  if (!file) return null;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Preview: ${file.name}`}
      size="lg"
      showFooter={false}
    >
      <div className="space-y-4">
        {/* File Info */}
        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <span className="font-medium">Type:</span> {file.type || 'Unknown'}
          </div>
          <div>
            <span className="font-medium">Size:</span> {formatFileSize(file.size)}
          </div>
          <div>
            <span className="font-medium">Modified:</span> {new Date(file.lastModified).toLocaleDateString()}
          </div>
        </div>
        
        {/* Preview Content */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
          {renderPreview()}
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => window.open(previewUrl)}
          >
            Download
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Multiple files preview component
export const MultipleFilePreview = ({ files, isOpen, onClose, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };
  
  const handleNext = () => {
    setCurrentIndex(prev => Math.min(files.length - 1, prev + 1));
  };
  
  if (!files.length) return null;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Preview ${currentIndex + 1} of ${files.length}`}
      size="lg"
      showFooter={false}
    >
      <div className="space-y-4">
        <FilePreview
          file={files[currentIndex]}
          isOpen={isOpen}
          onClose={onClose}
        />
        
        {files.length > 1 && (
          <div className="flex justify-between items-center">
            <Button
              variant="secondary"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentIndex + 1} / {files.length}
            </span>
            <Button
              variant="secondary"
              onClick={handleNext}
              disabled={currentIndex === files.length - 1}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FilePreview;