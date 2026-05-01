import React, { useState, useEffect, useRef } from 'react';

const SearchBar = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Search files...',
  debounceDelay = 300,
  className = '',
}) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef(null);
  const searchRef = useRef(null);
  
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      if (onChange) {
        onChange(localValue);
      }
      if (onSearch && localValue.length >= 2) {
        fetchSuggestions(localValue);
      }
    }, debounceDelay);
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [localValue, onChange, onSearch, debounceDelay]);
  
  const fetchSuggestions = async (query) => {
    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };
  
  const handleClear = () => {
    setLocalValue('');
    onChange?.('');
    setShowSuggestions(false);
  };
  
  const handleSuggestionClick = (suggestion) => {
    setLocalValue(suggestion);
    onChange?.(suggestion);
    setShowSuggestions(false);
    onSearch?.(suggestion);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch?.(localValue);
      setShowSuggestions(false);
    }
  };
  
  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        {/* Input */}
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`
            w-full pl-10 pr-10 py-2 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            ${isFocused 
              ? 'border-primary-500 dark:border-primary-500' 
              : 'border-gray-300 dark:border-gray-600'
            }
            bg-white dark:bg-gray-800 text-gray-900 dark:text-white
            transition-all duration-200
          `}
        />
        
        {/* Clear Button */}
        {localValue && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion.text)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm text-gray-900 dark:text-white">
                {suggestion.text}
              </span>
              {suggestion.count && (
                <span className="text-xs text-gray-500">
                  ({suggestion.count})
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      
      {/* Search Tips */}
      {isFocused && !localValue && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Search tips:
          </p>
          <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <li>• Type to search by file name</li>
            <li>• Use "type:image" to filter by file type</li>
            <li>• Use "size: gt; 1MB" to find large files</li>
            <li>• Use "date:today" for recent files</li>
          </ul>
        </div>
      )}
    </div>
  );
};

// Advanced search with filters
export const AdvancedSearchBar = ({ onSearch, className = '' }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    fileType: '',
    minSize: '',
    maxSize: '',
    dateRange: '',
  });
  
  const handleSearch = () => {
    const searchParams = {
      q: query,
      ...filters,
    };
    onSearch?.(searchParams);
  };
  
  return (
    <div className={`${className}`}>
      <div className="flex space-x-2">
        <div className="flex-1">
          <SearchBar
            value={query}
            onChange={setQuery}
            onSearch={() => handleSearch()}
            placeholder="Search files..."
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Search
        </button>
      </div>
      
      {showAdvanced && (
        <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={filters.fileType}
              onChange={(e) => setFilters(prev => ({ ...prev, fileType: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="">All file types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
              <option value="pdf">PDF</option>
              <option value="document">Documents</option>
            </select>
            
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min size (MB)"
                value={filters.minSize}
                onChange={(e) => setFilters(prev => ({ ...prev, minSize: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
              <input
                type="number"
                placeholder="Max size (MB)"
                value={filters.maxSize}
                onChange={(e) => setFilters(prev => ({ ...prev, maxSize: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
            
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="">Any time</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
            </select>
            
            <button
              onClick={() => {
                setFilters({ fileType: '', minSize: '', maxSize: '', dateRange: '' });
                setQuery('');
              }}
              className="px-3 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;