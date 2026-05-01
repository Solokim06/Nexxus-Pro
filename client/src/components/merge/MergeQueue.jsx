import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import ProgressBar from '../common/ProgressBar';

const MergeQueue = ({
  onQueueUpdate,
  className = '',
}) => {
  const [queue, setQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    loadQueue();
  }, []);
  
  const loadQueue = async () => {
    try {
      const response = await fetch('/api/merge/queue');
      const data = await response.json();
      setQueue(data);
      onQueueUpdate?.(data);
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  };
  
  const addToQueue = async (mergeJob) => {
    try {
      const response = await fetch('/api/merge/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergeJob),
      });
      
      if (response.ok) {
        await loadQueue();
      }
    } catch (error) {
      console.error('Failed to add to queue:', error);
    }
  };
  
  const removeFromQueue = async (jobId) => {
    try {
      const response = await fetch(`/api/merge/queue/${jobId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadQueue();
      }
    } catch (error) {
      console.error('Failed to remove from queue:', error);
    }
  };
  
  const reorderQueue = async (startIndex, endIndex) => {
    const result = Array.from(queue);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    setQueue(result);
    
    // Update order on server
    try {
      await fetch('/api/merge/queue/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: result }),
      });
    } catch (error) {
      console.error('Failed to reorder queue:', error);
    }
  };
  
  const processQueue = async () => {
    setIsProcessing(true);
    try {
      for (let i = 0; i < queue.length; i++) {
        const job = queue[i];
        job.status = 'processing';
        setQueue([...queue]);
        
        // Process the job
        await processMergeJob(job);
        
        job.status = 'completed';
        setQueue([...queue]);
        
        // Remove completed job from queue
        await removeFromQueue(job.id);
      }
    } finally {
      setIsProcessing(false);
      await loadQueue();
    }
  };
  
  const processMergeJob = async (job) => {
    // Simulate processing
    return new Promise(resolve => setTimeout(resolve, 5000));
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'processing': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  
  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200',
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || colors.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Merge Queue ({queue.length})
        </h3>
        {queue.length > 0 && !isProcessing && (
          <Button onClick={processQueue} variant="primary">
            Process All
          </Button>
        )}
      </div>
      
      {queue.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            No jobs in queue
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((job, index) => (
            <div
              key={job.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => index > 0 && reorderQueue(index, index - 1)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      disabled={isProcessing}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => index < queue.length - 1 && reorderQueue(index, index + 1)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      disabled={isProcessing}
                    >
                      ↓
                    </button>
                  </div>
                  <span className="text-sm text-gray-500">#{index + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {job.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {job.fileCount} files • Added {formatDate(job.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(job.status)}
                  {job.status === 'pending' && !isProcessing && (
                    <button
                      onClick={() => removeFromQueue(job.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {job.status === 'processing' && (
                <ProgressBar progress={job.progress || 0} size="sm" />
              )}
              
              {job.error && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  Error: {job.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {isProcessing && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Processing queue...
        </div>
      )}
    </div>
  );
};

export default MergeQueue;