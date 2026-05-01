import React, { useState, useCallback } from 'react';
import Button from '../common/Button';
import ProgressBar from '../common/ProgressBar';
import DragDropZone from '../upload/DragDropZone';
import FileList from '../upload/FileList';

const FileMerger = ({
  onMergeComplete,
  onMergeError,
  allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'],
  maxFiles = 50,
  maxSize = 104857600, // 100MB
  className = '',
}) => {
  const [files, setFiles] = useState([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergeStatus, setMergeStatus] = useState('');
  const [outputFormat, setOutputFormat] = useState('pdf');
  const [mergeOptions, setMergeOptions] = useState({
    order: 'original', // original, alphabetical, bySize, byDate
    pageSize: 'A4',
    orientation: 'portrait',
    compression: 'medium',
    metadata: true,
  });
  
  const handleFilesAccepted = useCallback((acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);
  
  const handleFilesRejected = useCallback((rejectedFiles) => {
    console.error('Files rejected:', rejectedFiles);
    // Show error toast for rejected files
  }, []);
  
  const handleRemoveFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  const handleClearAll = useCallback(() => {
    setFiles([]);
  }, []);
  
  const handleReorder = useCallback((startIndex, endIndex) => {
    const result = Array.from(files);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setFiles(result);
  }, [files]);
  
  const handleMerge = async () => {
    if (files.length === 0) {
      onMergeError?.('Please add files to merge');
      return;
    }
    
    setIsMerging(true);
    setMergeProgress(0);
    setMergeStatus('Preparing files...');
    
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('files', file);
      formData.append(`fileOrder[${index}]`, index);
    });
    formData.append('outputFormat', outputFormat);
    formData.append('options', JSON.stringify(mergeOptions));
    
    try {
      const response = await fetch('/api/merge/files', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Merge failed');
      }
      
      // Get progress updates via WebSocket or polling
      const reader = response.body.getReader();
      const contentLength = response.headers.get('Content-Length');
      let receivedLength = 0;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        receivedLength += value.length;
        if (contentLength) {
          const progress = (receivedLength / parseInt(contentLength)) * 100;
          setMergeProgress(progress);
          setMergeStatus(`Merging... ${Math.round(progress)}%`);
        }
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merged_${Date.now()}.${outputFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      onMergeComplete?.({
        success: true,
        fileName: `merged_${Date.now()}.${outputFormat}`,
        fileSize: blob.size,
        fileCount: files.length,
      });
    } catch (error) {
      console.error('Merge error:', error);
      onMergeError?.(error.message);
    } finally {
      setIsMerging(false);
      setMergeProgress(0);
      setMergeStatus('');
    }
  };
  
  const getFileOrderOptions = () => {
    const orders = {
      original: 'Original Order',
      alphabetical: 'Alphabetical (A-Z)',
      reverseAlpha: 'Alphabetical (Z-A)',
      bySize: 'File Size (Smallest First)',
      bySizeDesc: 'File Size (Largest First)',
      byDate: 'Date Modified (Oldest First)',
      byDateDesc: 'Date Modified (Newest First)',
    };
    return orders;
  };
  
  const sortFiles = (order) => {
    const sortedFiles = [...files];
    switch (order) {
      case 'alphabetical':
        sortedFiles.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'reverseAlpha':
        sortedFiles.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'bySize':
        sortedFiles.sort((a, b) => a.size - b.size);
        break;
      case 'bySizeDesc':
        sortedFiles.sort((a, b) => b.size - a.size);
        break;
      case 'byDate':
        sortedFiles.sort((a, b) => a.lastModified - b.lastModified);
        break;
      case 'byDateDesc':
        sortedFiles.sort((a, b) => b.lastModified - a.lastModified);
        break;
      default:
        return;
    }
    setFiles(sortedFiles);
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* File Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Add Files to Merge
        </h3>
        <DragDropZone
          onFilesAccepted={handleFilesAccepted}
          onFilesRejected={handleFilesRejected}
          acceptedFileTypes={allowedTypes}
          maxFiles={maxFiles}
          maxSize={maxSize}
          multiple={true}
        />
      </div>
      
      {/* File List Section */}
      {files.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Files to Merge ({files.length})
            </h3>
            <div className="flex space-x-2">
              <select
                onChange={(e) => sortFiles(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                defaultValue=""
              >
                <option value="" disabled>Sort by...</option>
                {Object.entries(getFileOrderOptions()).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                Clear All
              </Button>
            </div>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => index > 0 && handleReorder(index, index - 1)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => index < files.length - 1 && handleReorder(index, index + 1)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      disabled={index === files.length - 1}
                    >
                      ↓
                    </button>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 w-8">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total Files:</span>
              <span className="font-medium text-gray-900 dark:text-white">{files.length}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600 dark:text-gray-400">Total Size:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatFileSize(totalSize)}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Merge Options */}
      {files.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Merge Options
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Output Format
              </label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="pdf">PDF</option>
                <option value="zip">ZIP Archive</option>
                <option value="txt">Text File</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Page Size
              </label>
              <select
                value={mergeOptions.pageSize}
                onChange={(e) => setMergeOptions(prev => ({ ...prev, pageSize: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
                <option value="A3">A3</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Orientation
              </label>
              <select
                value={mergeOptions.orientation}
                onChange={(e) => setMergeOptions(prev => ({ ...prev, orientation: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Compression
              </label>
              <select
                value={mergeOptions.compression}
                onChange={(e) => setMergeOptions(prev => ({ ...prev, compression: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="none">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={mergeOptions.metadata}
                onChange={(e) => setMergeOptions(prev => ({ ...prev, metadata: e.target.checked }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Include metadata (author, date, etc.)
              </span>
            </label>
          </div>
        </div>
      )}
      
      {/* Merge Progress */}
      {isMerging && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Merging Files
          </h3>
          <ProgressBar progress={mergeProgress} size="lg" showPercentage />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
            {mergeStatus}
          </p>
        </div>
      )}
      
      {/* Merge Button */}
      {files.length > 0 && !isMerging && (
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={handleClearAll}>
            Clear All
          </Button>
          <Button variant="primary" onClick={handleMerge}>
            Merge Files
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileMerger;