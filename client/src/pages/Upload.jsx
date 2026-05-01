import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import DragDropZone from '../components/upload/DragDropZone';
import FileList from '../components/upload/FileList';
import UploadProgress from '../components/upload/UploadProgress';
import UploadLimits from '../components/upload/UploadLimits';
import ChunkUploader from '../components/upload/ChunkUploader';
import ResumeUpload from '../components/upload/ResumeUpload';
import Button from '../components/common/Button';
import { useFileUpload } from '../hooks/useFileUpload';

const Upload = () => {
  const { user } = useAuth();
  const { uploadFiles, uploadProgress, isUploading, cancelUpload } = useFileUpload();
  const [files, setFiles] = useState([]);
  const [uploadId, setUploadId] = useState(null);
  const [uploadMode, setUploadMode] = useState('standard'); // standard, chunked

  const handleFilesAccepted = (acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  };

  const handleFilesRejected = (rejectedFiles) => {
    console.error('Files rejected:', rejectedFiles);
    // Show error toast
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setFiles([]);
  };

  const handleStartUpload = async () => {
    if (files.length === 0) return;

    if (uploadMode === 'chunked') {
      // Use chunked upload for large files
      setUploadId(Date.now().toString());
    } else {
      await uploadFiles(files);
      setFiles([]);
    }
  };

  const handleUploadComplete = () => {
    setFiles([]);
    setUploadId(null);
    // Show success toast
  };

  const handleUploadError = (error) => {
    console.error('Upload error:', error);
    // Show error toast
  };

  const limits = {
    maxFileSize: 104857600, // 100MB for free plan
    maxTotalSize: 1073741824, // 1GB
    maxFiles: 50,
    allowedTypes: ['image/*', 'application/pdf', 'text/*', 'video/*', 'audio/*'],
  };

  const currentUsage = {
    currentTotalSize: 536870912, // 500MB used
    currentFileCount: 25,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <div className="container-custom mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Upload Files
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Drag and drop your files or click to browse
            </p>
          </div>

          {/* Upload Mode Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6">
            <div className="flex justify-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="standard"
                  checked={uploadMode === 'standard'}
                  onChange={(e) => setUploadMode(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Standard Upload</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="chunked"
                  checked={uploadMode === 'chunked'}
                  onChange={(e) => setUploadMode(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Chunked Upload (Large Files)</span>
              </label>
            </div>
          </div>

          {/* Upload Limits */}
          <div className="mb-6">
            <UploadLimits limits={limits} currentUsage={currentUsage} />
          </div>

          {/* Resume Upload Section */}
          <ResumeUpload
            userId={user?.id}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />

          {/* Drag & Drop Zone */}
          <div className="mb-6">
            <DragDropZone
              onFilesAccepted={handleFilesAccepted}
              onFilesRejected={handleFilesRejected}
              acceptedFileTypes={limits.allowedTypes}
              maxFiles={limits.maxFiles}
              maxSize={limits.maxFileSize}
              multiple={true}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mb-6">
              <FileList
                files={files}
                onRemoveFile={handleRemoveFile}
                onClearAll={handleClearAll}
                showRemoveButtons={!isUploading}
              />
            </div>
          )}

          {/* Chunked Upload */}
          {uploadMode === 'chunked' && uploadId && files.length > 0 && (
            <div className="mb-6 space-y-4">
              {files.map((file, index) => (
                <ChunkUploader
                  key={index}
                  file={file}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                />
              ))}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="mb-6">
              <UploadProgress uploads={uploadProgress} />
            </div>
          )}

          {/* Upload Button */}
          {files.length > 0 && !isUploading && uploadMode !== 'chunked' && (
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={handleClearAll}>
                Clear All
              </Button>
              <Button variant="primary" onClick={handleStartUpload}>
                Upload {files.length} File{files.length > 1 ? 's' : ''}
              </Button>
            </div>
          )}

          {/* Tips Section */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              Upload Tips:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Maximum file size: 100MB per file (upgrade for larger files)</li>
              <li>• Supported formats: Images, PDF, Documents, Videos, Audio</li>
              <li>• Use chunked upload for files larger than 50MB</li>
              <li>• Your files are encrypted during upload and storage</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;