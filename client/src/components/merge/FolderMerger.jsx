import React, { useState, useCallback } from 'react';
import Button from '../common/Button';
import ProgressBar from '../common/ProgressBar';

const FolderMerger = ({
  onMergeComplete,
  onMergeError,
  className = '',
}) => {
  const [folders, setFolders] = useState([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergeOptions, setMergeOptions] = useState({
    preserveStructure: true,
    overwriteDuplicates: false,
    mergeType: 'combine', // combine, replace, smart
    includeSubfolders: true,
  });
  
  const handleFolderSelect = useCallback(async () => {
    try {
      // Use file input with directory support
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      input.directory = true;
      
      input.onchange = (e) => {
        const files = Array.from(e.target.files);
        const folderStructure = buildFolderStructure(files);
        setFolders(prev => [...prev, folderStructure]);
      };
      
      input.click();
    } catch (error) {
      console.error('Folder selection error:', error);
    }
  }, []);
  
  const buildFolderStructure = (files) => {
    const structure = {
      name: 'Root',
      type: 'folder',
      children: {},
      files: [],
      size: 0,
    };
    
    files.forEach(file => {
      const path = file.webkitRelativePath.split('/');
      let current = structure;
      
      for (let i = 0; i < path.length - 1; i++) {
        const folderName = path[i];
        if (!current.children[folderName]) {
          current.children[folderName] = {
            name: folderName,
            type: 'folder',
            children: {},
            files: [],
            size: 0,
          };
        }
        current = current.children[folderName];
      }
      
      current.files.push(file);
      current.size += file.size;
    });
    
    return structure;
  };
  
  const removeFolder = (index) => {
    setFolders(prev => prev.filter((_, i) => i !== index));
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const getFolderSize = (folder) => {
    let size = folder.size;
    for (const child of Object.values(folder.children)) {
      size += getFolderSize(child);
    }
    return size;
  };
  
  const renderFolderTree = (folder, level = 0) => {
    const indent = level * 20;
    
    return (
      <div key={folder.name} style={{ marginLeft: indent }}>
        <div className="flex items-center space-x-2 py-1">
          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {folder.name}
          </span>
          <span className="text-xs text-gray-500">
            ({folder.files.length} files, {formatFileSize(folder.size)})
          </span>
        </div>
        
        {Object.values(folder.children).map(child => renderFolderTree(child, level + 1))}
        
        {folder.files.map((file, idx) => (
          <div key={idx} style={{ marginLeft: indent + 20 }} className="flex items-center space-x-2 py-1">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {file.name}
            </span>
          </div>
        ))}
      </div>
    );
  };
  
  const handleMerge = async () => {
    if (folders.length === 0) {
      onMergeError?.('Please add folders to merge');
      return;
    }
    
    setIsMerging(true);
    setMergeProgress(0);
    
    try {
      // Simulate merge progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setMergeProgress(i);
      }
      
      // Create zip file of merged folders
      const formData = new FormData();
      formData.append('folders', JSON.stringify(folders));
      formData.append('options', JSON.stringify(mergeOptions));
      
      const response = await fetch('/api/merge/folders', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Folder merge failed');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merged_folders_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      onMergeComplete?.({
        success: true,
        fileName: `merged_folders_${Date.now()}.zip`,
        folderCount: folders.length,
      });
    } catch (error) {
      console.error('Folder merge error:', error);
      onMergeError?.(error.message);
    } finally {
      setIsMerging(false);
    }
  };
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Folder Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Merge Folders
          </h3>
          <Button onClick={handleFolderSelect} variant="primary">
            Add Folder
          </Button>
        </div>
        
        {/* Folder List */}
        {folders.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              No folders selected. Click "Add Folder" to start.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {folders.map((folder, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Folder {index + 1}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Total size: {formatFileSize(getFolderSize(folder))}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFolder(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {renderFolderTree(folder)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Merge Options */}
      {folders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Merge Options
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={mergeOptions.preserveStructure}
                onChange={(e) => setMergeOptions(prev => ({ ...prev, preserveStructure: e.target.checked }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Preserve folder structure
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={mergeOptions.includeSubfolders}
                onChange={(e) => setMergeOptions(prev => ({ ...prev, includeSubfolders: e.target.checked }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Include subfolders
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={mergeOptions.overwriteDuplicates}
                onChange={(e) => setMergeOptions(prev => ({ ...prev, overwriteDuplicates: e.target.checked }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Overwrite duplicate files
              </span>
            </label>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Merge Strategy
              </label>
              <select
                value={mergeOptions.mergeType}
                onChange={(e) => setMergeOptions(prev => ({ ...prev, mergeType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="combine">Combine all files</option>
                <option value="replace">Replace existing files</option>
                <option value="smart">Smart merge (skip duplicates)</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {/* Merge Progress */}
      {isMerging && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Merging Folders
          </h3>
          <ProgressBar progress={mergeProgress} size="lg" showPercentage />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
            Processing folders...
          </p>
        </div>
      )}
      
      {/* Merge Button */}
      {folders.length > 0 && !isMerging && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={handleMerge}>
            Merge Folders
          </Button>
        </div>
      )}
    </div>
  );
};

export default FolderMerger;