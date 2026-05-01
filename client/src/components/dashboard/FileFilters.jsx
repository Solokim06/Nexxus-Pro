import React, { useState } from 'react';
import Button from '../common/Button';

const FileFilters = ({
  filters,
  onChange,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const fileTypes = [
    { value: '', label: 'All Files' },
    { value: 'image', label: 'Images', icon: '🖼️' },
    { value: 'video', label: 'Videos', icon: '🎥' },
    { value: 'audio', label: 'Audio', icon: '🎵' },
    { value: 'pdf', label: 'PDF', icon: '📄' },
    { value: 'document', label: 'Documents', icon: '📝' },
    { value: 'archive', label: 'Archives', icon: '📦' },
    { value: 'folder', label: 'Folders', icon: '📁' },
  ];
  
  const sortOptions = [
    { value: 'name_asc', label: 'Name (A-Z)' },
    { value: 'name_desc', label: 'Name (Z-A)' },
    { value: 'date_desc', label: 'Newest first' },
    { value: 'date_asc', label: 'Oldest first' },
    { value: 'size_desc', label: 'Largest first' },
    { value: 'size_asc', label: 'Smallest first' },
  ];
  
  const handleFilterChange = (key, value) => {
    onChange?.({ ...filters, [key]: value });
  };
  
  const handleClearFilters = () => {
    onChange?.({});
  };
  
  const hasActiveFilters = () => {
    return Object.values(filters).some(v => v && v !== '');
  };
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg ${className}`}>
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* File Type Filter */}
        <div className="flex items-center space-x-2">
          {fileTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => handleFilterChange('fileType', type.value)}
              className={`
                px-3 py-1 text-sm rounded-full transition-colors
                ${filters.fileType === type.value
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }
              `}
            >
              {type.icon && <span className="mr-1">{type.icon}</span>}
              {type.label}
            </button>
          ))}
        </div>
        
        {/* Sort By */}
        <select
          value={`${filters.sortBy || 'date'}_${filters.sortOrder || 'desc'}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('_');
            handleFilterChange('sortBy', sortBy);
            handleFilterChange('sortOrder', sortOrder);
          }}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Date Filter */}
        <select
          value={filters.dateRange || ''}
          onChange={(e) => handleFilterChange('dateRange', e.target.value)}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
        >
          <option value="">Any time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="year">This year</option>
        </select>
        
        {/* Size Filter */}
        <select
          value={filters.sizeRange || ''}
          onChange={(e) => handleFilterChange('sizeRange', e.target.value)}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
        >
          <option value="">Any size</option>
          <option value="small">&lt; 1 MB</option>
          <option value="medium">1-10 MB</option>
          <option value="large">10-100 MB</option>
          <option value="xlarge">&gt; 100 MB</option>
        </select>
        
        {/* Clear Filters Button */}
        {hasActiveFilters() && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Clear filters
          </button>
        )}
        
        {/* Expand/Collapse Advanced Filters */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          {isExpanded ? 'Less filters ↑' : 'More filters ↓'}
        </button>
      </div>
      
      {/* Advanced Filters */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Owner Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Owner
              </label>
              <select
                value={filters.owner || ''}
                onChange={(e) => handleFilterChange('owner', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">All files</option>
                <option value="me">My files</option>
                <option value="shared">Shared with me</option>
              </select>
            </div>
            
            {/* Starred Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.starred || ''}
                onChange={(e) => handleFilterChange('starred', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">All files</option>
                <option value="starred">Starred only</option>
                <option value="unstarred">Unstarred only</option>
              </select>
            </div>
            
            {/* Name Contains */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name contains
              </label>
              <input
                type="text"
                value={filters.nameContains || ''}
                onChange={(e) => handleFilterChange('nameContains', e.target.value)}
                placeholder="Filter by name..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Active Filters Display */}
      {hasActiveFilters() && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.fileType && (
            <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
              Type: {filters.fileType}
              <button
                onClick={() => handleFilterChange('fileType', '')}
                className="ml-1 hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.dateRange && (
            <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
              Date: {filters.dateRange}
              <button
                onClick={() => handleFilterChange('dateRange', '')}
                className="ml-1 hover:text-green-900"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.sizeRange && (
            <span className="inline-flex items-center px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
              Size: {filters.sizeRange}
              <button
                onClick={() => handleFilterChange('sizeRange', '')}
                className="ml-1 hover:text-yellow-900"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FileFilters;