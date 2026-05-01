import React, { useState } from 'react';
import FileMerger from '../components/merge/FileMerger';
import FolderMerger from '../components/merge/FolderMerger';
import MergeQueue from '../components/merge/MergeQueue';
import MergeHistory from '../components/merge/MergeHistory';
import Button from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';

const MergeFiles = () => {
  const { user } = useAuth();
  const [mergeType, setMergeType] = useState('files'); // files, folders
  const [showQueue, setShowQueue] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleMergeComplete = (result) => {
    console.log('Merge completed:', result);
    // Show success toast
  };

  const handleMergeError = (error) => {
    console.error('Merge error:', error);
    // Show error toast
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <div className="container-custom mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Merge Files
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Combine multiple files into one document. Support for PDF, images, and more.
            </p>
          </div>

          {/* Merge Type Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6">
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setMergeType('files')}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  mergeType === 'files'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Merge Files
              </button>
              <button
                onClick={() => setMergeType('folders')}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  mergeType === 'folders'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Merge Folders
              </button>
            </div>
          </div>

          {/* Queue & History Toggle */}
          <div className="flex justify-end space-x-2 mb-6">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowQueue(!showQueue)}
            >
              {showQueue ? 'Hide Queue' : 'Show Queue'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </Button>
          </div>

          {/* Merge Queue */}
          {showQueue && (
            <div className="mb-6">
              <MergeQueue
                userId={user?.id}
                onQueueUpdate={(queue) => console.log('Queue updated:', queue)}
              />
            </div>
          )}

          {/* Merge Component */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            {mergeType === 'files' ? (
              <FileMerger
                onMergeComplete={handleMergeComplete}
                onMergeError={handleMergeError}
              />
            ) : (
              <FolderMerger
                onMergeComplete={handleMergeComplete}
                onMergeError={handleMergeError}
              />
            )}
          </div>

          {/* Merge History */}
          {showHistory && (
            <div className="mt-6">
              <MergeHistory
                userId={user?.id}
                onDownload={(merge) => console.log('Download merge:', merge)}
              />
            </div>
          )}

          {/* Upgrade Prompt for Premium Features */}
          {user?.subscription?.plan === 'free' && (
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                    Upgrade to Pro for More Features
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Get unlimited merges, larger file sizes, and priority processing.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={() => window.location.href = '/pricing'}>
                  Upgrade Now
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MergeFiles;