import React, { useState, useEffect } from 'react';
import Button from '../common/Button';

const MergeHistory = ({
  userId,
  onDownload,
  className = '',
}) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, success, failed
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    loadHistory();
  }, [userId]);
  
  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/merge/history/${userId}`);
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownload = async (mergeJob) => {
    try {
      const response = await fetch(`/api/merge/download/${mergeJob.id}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = mergeJob.outputName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      onDownload?.(mergeJob);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };
  
  const handleDelete = async (jobId) => {
    if (!confirm('Are you sure you want to delete this merge record?')) return;
    
    try {
      await fetch(`/api/merge/history/${jobId}`, { method: 'DELETE' });
      await loadHistory();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const filteredHistory = history.filter(job => {
    if (filter !== 'all' && job.status !== filter) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return job.name.toLowerCase().includes(searchLower) ||
             job.outputName.toLowerCase().includes(searchLower);
    }
    return true;
  });
  
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading history...</p>
      </div>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Merge History ({filteredHistory.length})
        </h3>
        
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search merges..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>
      
      {filteredHistory.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            No merge history found
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((job) => (
            <div
              key={job.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {job.name}
                    </h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      job.status === 'success'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                    }`}>
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Output:</span>
                      <span className="ml-1 text-gray-900 dark:text-white">
                        {job.outputName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Files:</span>
                      <span className="ml-1 text-gray-900 dark:text-white">
                        {job.fileCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Size:</span>
                      <span className="ml-1 text-gray-900 dark:text-white">
                        {formatFileSize(job.outputSize)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Date:</span>
                      <span className="ml-1 text-gray-900 dark:text-white">
                        {formatDate(job.completedAt)}
                      </span>
                    </div>
                  </div>
                  
                  {job.error && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      Error: {job.error}
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  {job.status === 'success' && (
                    <button
                      onClick={() => handleDownload(job)}
                      className="p-2 text-blue-600 hover:text-blue-700 transition-colors"
                      title="Download"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="p-2 text-red-600 hover:text-red-700 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MergeHistory;