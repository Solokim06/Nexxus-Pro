import React, { useState } from 'react';

const MergeOptions = ({
  options,
  onChange,
  fileType = 'pdf',
  className = '',
}) => {
  const [localOptions, setLocalOptions] = useState(options || getDefaultOptions(fileType));
  
  const getDefaultOptions = (type) => {
    const defaults = {
      pdf: {
        pageSize: 'A4',
        orientation: 'portrait',
        margin: 'normal',
        compression: 'medium',
        metadata: true,
        pageNumbers: true,
        bookmarks: true,
      },
      image: {
        format: 'png',
        quality: 90,
        resize: false,
        width: 1920,
        height: 1080,
        maintainAspect: true,
        arrange: 'horizontal', // horizontal, vertical, grid
      },
      document: {
        format: 'docx',
        mergeMode: 'append', // append, insert, replace
        pageBreak: true,
        preserveFormatting: true,
      },
      zip: {
        compression: 'normal', // store, fast, normal, maximum
        encryption: false,
        password: '',
        split: false,
        splitSize: '100MB',
      },
    };
    
    return defaults[type] || defaults.pdf;
  };
  
  const handleChange = (key, value) => {
    const newOptions = { ...localOptions, [key]: value };
    setLocalOptions(newOptions);
    onChange?.(newOptions);
  };
  
  const renderPDFOptions = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Page Size
          </label>
          <select
            value={localOptions.pageSize}
            onChange={(e) => handleChange('pageSize', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
            <option value="A3">A3</option>
            <option value="A5">A5</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Orientation
          </label>
          <select
            value={localOptions.orientation}
            onChange={(e) => handleChange('orientation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Margins
        </label>
        <select
          value={localOptions.margin}
          onChange={(e) => handleChange('margin', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
        >
          <option value="none">None</option>
          <option value="narrow">Narrow</option>
          <option value="normal">Normal</option>
          <option value="wide">Wide</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Compression
        </label>
        <select
          value={localOptions.compression}
          onChange={(e) => handleChange('compression', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
        >
          <option value="none">None</option>
          <option value="low">Low (Faster)</option>
          <option value="medium">Medium</option>
          <option value="high">High (Smaller file)</option>
        </select>
      </div>
      
      <div className="space-y-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={localOptions.metadata}
            onChange={(e) => handleChange('metadata', e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Include metadata (author, creation date, etc.)
          </span>
        </label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={localOptions.pageNumbers}
            onChange={(e) => handleChange('pageNumbers', e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Add page numbers
          </span>
        </label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={localOptions.bookmarks}
            onChange={(e) => handleChange('bookmarks', e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Create bookmarks from file names
          </span>
        </label>
      </div>
    </div>
  );
  
  const renderImageOptions = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Output Format
        </label>
        <select
          value={localOptions.format}
          onChange={(e) => handleChange('format', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
        >
          <option value="png">PNG</option>
          <option value="jpg">JPEG</option>
          <option value="webp">WebP</option>
          <option value="pdf">PDF</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quality ({localOptions.quality}%)
        </label>
        <input
          type="range"
          min="1"
          max="100"
          value={localOptions.quality}
          onChange={(e) => handleChange('quality', parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={localOptions.resize}
            onChange={(e) => handleChange('resize', e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Resize images
          </span>
        </label>
      </div>
      
      {localOptions.resize && (
        <div className="grid grid-cols-2 gap-4 pl-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Width (px)
            </label>
            <input
              type="number"
              value={localOptions.width}
              onChange={(e) => handleChange('width', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Height (px)
            </label>
            <input
              type="number"
              value={localOptions.height}
              onChange={(e) => handleChange('height', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Arrangement
        </label>
        <select
          value={localOptions.arrange}
          onChange={(e) => handleChange('arrange', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
        >
          <option value="horizontal">Horizontal (Side by side)</option>
          <option value="vertical">Vertical (Stacked)</option>
          <option value="grid">Grid</option>
        </select>
      </div>
    </div>
  );
  
  const renderZipOptions = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Compression Level
        </label>
        <select
          value={localOptions.compression}
          onChange={(e) => handleChange('compression', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
        >
          <option value="store">Store (No compression, fastest)</option>
          <option value="fast">Fast Compression</option>
          <option value="normal">Normal Compression</option>
          <option value="maximum">Maximum Compression (Slowest)</option>
        </select>
      </div>
      
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={localOptions.encryption}
          onChange={(e) => handleChange('encryption', e.target.checked)}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          Encrypt with password
        </span>
      </label>
      
      {localOptions.encryption && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password
          </label>
          <input
            type="password"
            value={localOptions.password}
            onChange={(e) => handleChange('password', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            placeholder="Enter password"
          />
        </div>
      )}
      
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={localOptions.split}
          onChange={(e) => handleChange('split', e.target.checked)}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          Split archive into multiple parts
        </span>
      </label>
      
      {localOptions.split && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Split Size
          </label>
          <select
            value={localOptions.splitSize}
            onChange={(e) => handleChange('splitSize', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="10MB">10 MB</option>
            <option value="50MB">50 MB</option>
            <option value="100MB">100 MB</option>
            <option value="250MB">250 MB</option>
            <option value="500MB">500 MB</option>
            <option value="1GB">1 GB</option>
          </select>
        </div>
      )}
    </div>
  );
  
  const renderOptions = () => {
    switch (fileType) {
      case 'pdf':
        return renderPDFOptions();
      case 'image':
        return renderImageOptions();
      case 'zip':
        return renderZipOptions();
      default:
        return renderPDFOptions();
    }
  };
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Merge Options
      </h3>
      {renderOptions()}
    </div>
  );
};

export default MergeOptions;