import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';

const MergePreview = ({
  files,
  isOpen,
  onClose,
  onConfirm,
  className = '',
}) => {
  const [previewData, setPreviewData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPage, setSelectedPage] = useState(0);
  
  useEffect(() => {
    if (isOpen && files.length > 0) {
      generatePreview();
    }
  }, [isOpen, files]);
  
  const generatePreview = async () => {
    setIsLoading(true);
    try {
      // Generate preview for first few pages
      const previews = await Promise.all(
        files.slice(0, 5).map(async (file) => {
          if (file.type === 'application/pdf') {
            return generatePDFPreview(file);
          } else if (file.type.startsWith('image/')) {
            return generateImagePreview(file);
          } else {
            return generateGenericPreview(file);
          }
        })
      );
      setPreviewData(previews);
    } catch (error) {
      console.error('Preview generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const generatePDFPreview = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          type: 'pdf',
          name: file.name,
          size: file.size,
          data: e.target.result,
          pages: 3, // Placeholder
        });
      };
      reader.readAsDataURL(file);
    });
  };
  
  const generateImagePreview = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          type: 'image',
          name: file.name,
          size: file.size,
          data: e.target.result,
          dimensions: { width: 0, height: 0 }, // Would be calculated
        });
      };
      reader.readAsDataURL(file);
    });
  };
  
  const generateGenericPreview = (file) => {
    return Promise.resolve({
      type: 'generic',
      name: file.name,
      size: file.size,
      data: null,
    });
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const renderPreview = (preview, index) => {
    switch (preview.type) {
      case 'pdf':
        return (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-800 p-2 flex justify-between items-center">
              <span className="text-sm font-medium">{preview.name}</span>
              <span className="text-xs text-gray-500">{formatFileSize(preview.size)}</span>
            </div>
            <div className="p-4 flex justify-center">
              <embed
                src={preview.data}
                type="application/pdf"
                className="w-full h-64"
              />
            </div>
          </div>
        );
      
      case 'image':
        return (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-800 p-2 flex justify-between items-center">
              <span className="text-sm font-medium">{preview.name}</span>
              <span className="text-xs text-gray-500">{formatFileSize(preview.size)}</span>
            </div>
            <div className="p-4 flex justify-center">
              <img
                src={preview.data}
                alt={preview.name}
                className="max-h-48 object-contain"
              />
            </div>
          </div>
        );
      
      default:
        return (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-800 p-2 flex justify-between items-center">
              <span className="text-sm font-medium">{preview.name}</span>
              <span className="text-xs text-gray-500">{formatFileSize(preview.size)}</span>
            </div>
            <div className="p-8 flex flex-col items-center justify-center text-gray-500">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm">Preview not available</p>
              <p className="text-xs">This file type cannot be previewed</p>
            </div>
          </div>
        );
    }
  };
  
  const totalPages = previewData.reduce((acc, preview) => {
    return acc + (preview.pages || 1);
  }, 0);
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Merge Preview"
      size="xl"
      showFooter={false}
    >
      <div className={`space-y-6 ${className}`}>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Generating preview...
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{files.length}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Files</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatFileSize(files.reduce((acc, f) => acc + f.size, 0))}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Size</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{totalPages}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Pages (est.)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {files[0]?.type?.split('/')[0] || 'Mixed'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">File Type</p>
                </div>
              </div>
            </div>
            
            {/* File Order Preview */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                File Order (Top to Bottom)
              </h4>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {previewData.map((preview, index) => (
                  <div key={index}>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Will appear first in merged document
                      </span>
                    </div>
                    {renderPreview(preview, index)}
                  </div>
                ))}
                
                {files.length > 5 && (
                  <div className="text-center py-4 text-gray-500">
                    + {files.length - 5} more files (preview limited to first 5)
                  </div>
                )}
              </div>
            </div>
            
            {/* Page Navigation (if PDF) */}
            {previewData.some(p => p.type === 'pdf') && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedPage(Math.max(0, selectedPage - 1))}
                    disabled={selectedPage === 0}
                    className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  >
                    ← Previous
                  </button>
                  <span className="text-sm">
                    Page {selectedPage + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setSelectedPage(Math.min(totalPages - 1, selectedPage + 1))}
                    disabled={selectedPage === totalPages - 1}
                    className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={onConfirm}>
                Confirm Merge
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

// Page-by-page preview component
export const PagePreview = ({ pages, currentPage, onPageChange }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 mb-4">
        <div className="w-full max-w-2xl">
          {/* Page content would go here */}
          <div className="aspect-[1/1.414] bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
            <p className="text-gray-500">Page {currentPage + 1} Preview</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm">
          Page {currentPage + 1} of {pages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === pages - 1}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default MergePreview;