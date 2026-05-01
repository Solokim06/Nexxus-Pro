import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Breadcrumb = ({ items, separator = '/', className = '' }) => {
  const location = useLocation();
  
  // Auto-generate breadcrumbs from current path if no items provided
  const generateBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = paths.map((path, index) => {
      const url = `/${paths.slice(0, index + 1).join('/')}`;
      const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
      return { label, url };
    });
    
    return [{ label: 'Home', url: '/' }, ...breadcrumbs];
  };
  
  const breadcrumbItems = items || generateBreadcrumbs();
  
  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        
        return (
          <React.Fragment key={item.url}>
            {index > 0 && (
              <span className="text-gray-400 dark:text-gray-500">{separator}</span>
            )}
            
            {isLast ? (
              <span className="text-gray-600 dark:text-gray-400 font-medium" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.url}
                className="text-primary-600 dark:text-primary-400 hover:underline transition-colors"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

// Alternative: Icon-based breadcrumb
export const IconBreadcrumb = ({ items, className = '' }) => {
  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <React.Fragment key={item.url}>
            {index > 0 && (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            
            {isLast ? (
              <span className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                {item.icon && <span className="text-gray-400">{item.icon}</span>}
                <span className="font-medium">{item.label}</span>
              </span>
            ) : (
              <Link
                to={item.url}
                className="flex items-center space-x-1 text-primary-600 dark:text-primary-400 hover:underline"
              >
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;