// Error types
export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  AUTH: 'AUTH_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER_ERROR',
  FILE: 'FILE_ERROR',
  PAYMENT: 'PAYMENT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

// Error messages mapping
const errorMessages = {
  [ErrorTypes.NETWORK]: 'Network error. Please check your internet connection.',
  [ErrorTypes.AUTH]: 'Authentication failed. Please log in again.',
  [ErrorTypes.VALIDATION]: 'Please check your input and try again.',
  [ErrorTypes.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorTypes.SERVER]: 'Server error. Please try again later.',
  [ErrorTypes.FILE]: 'File operation failed. Please try again.',
  [ErrorTypes.PAYMENT]: 'Payment processing failed. Please try again.',
  [ErrorTypes.UNKNOWN]: 'An unexpected error occurred.',
};

// Classify error
export const classifyError = (error) => {
  if (!error) return ErrorTypes.UNKNOWN;
  
  // Network errors
  if (error.message === 'Network Error' || !navigator.onLine) {
    return ErrorTypes.NETWORK;
  }
  
  // Auth errors
  if (error.response?.status === 401 || error.response?.status === 403) {
    return ErrorTypes.AUTH;
  }
  
  // Not found errors
  if (error.response?.status === 404) {
    return ErrorTypes.NOT_FOUND;
  }
  
  // Validation errors
  if (error.response?.status === 400 || error.response?.status === 422) {
    return ErrorTypes.VALIDATION;
  }
  
  // File errors
  if (error.message?.includes('file') || error.message?.includes('upload')) {
    return ErrorTypes.FILE;
  }
  
  // Payment errors
  if (error.message?.includes('payment') || error.message?.includes('mpesa')) {
    return ErrorTypes.PAYMENT;
  }
  
  // Server errors
  if (error.response?.status >= 500) {
    return ErrorTypes.SERVER;
  }
  
  return ErrorTypes.UNKNOWN;
};

// Get user-friendly error message
export const getUserFriendlyMessage = (error) => {
  const errorType = classifyError(error);
  
  // Check for specific error messages from API
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return errorMessages[errorType];
};

// Log error to monitoring service
export const logError = (error, context = {}) => {
  console.error('Error logged:', {
    error: error.message || error,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
  
  // Send to analytics/monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service (e.g., Sentry)
    // captureException(error, { extra: context });
  }
};

// Handle API error
export const handleApiError = (error, showToast = true) => {
  const errorType = classifyError(error);
  const message = getUserFriendlyMessage(error);
  
  logError(error, { errorType });
  
  if (showToast) {
    // This would integrate with a toast system
    console.log('Toast error:', message);
  }
  
  return {
    type: errorType,
    message,
    originalError: error,
  };
};

// Handle file error
export const handleFileError = (error) => {
  const message = getUserFriendlyMessage(error);
  logError(error, { context: 'FILE_ERROR' });
  return { message, type: ErrorTypes.FILE };
};

// Handle payment error
export const handlePaymentError = (error) => {
  const message = getUserFriendlyMessage(error);
  logError(error, { context: 'PAYMENT_ERROR' });
  return { message, type: ErrorTypes.PAYMENT };
};

// Create custom error
export const createError = (type, message, originalError = null) => {
  const error = new Error(message);
  error.type = type;
  error.originalError = originalError;
  return error;
};

// Retry function for failed operations
export const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  throw lastError;
};

// Safe JSON parse
export const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return defaultValue;
  }
};

// Import sleep from helpers
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));