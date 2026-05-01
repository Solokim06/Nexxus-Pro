// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone number validation (Kenyan format)
export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^(254|\+254|0)?[7-9][0-9]{8}$/;
  return phoneRegex.test(phone);
};

// Password validation
export const isValidPassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isLongEnough = password.length >= minLength;
  
  return {
    isValid: isLongEnough && hasUpperCase && hasLowerCase && hasNumbers,
    errors: {
      minLength: !isLongEnough,
      upperCase: !hasUpperCase,
      lowerCase: !hasLowerCase,
      numbers: !hasNumbers,
      specialChar: !hasSpecialChar,
    },
  };
};

// Password strength checker
export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: 'Very Weak', color: 'red' };
  
  let score = 0;
  
  // Length
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  // Character types
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  // Cap at 4 for display
  score = Math.min(score, 4);
  
  const strengths = [
    { score: 0, label: 'Very Weak', color: 'red' },
    { score: 1, label: 'Weak', color: 'orange' },
    { score: 2, label: 'Fair', color: 'yellow' },
    { score: 3, label: 'Good', color: 'blue' },
    { score: 4, label: 'Strong', color: 'green' },
  ];
  
  return strengths[score];
};

// File validation
export const isValidFileType = (file, allowedTypes) => {
  if (!allowedTypes || allowedTypes.length === 0) return true;
  return allowedTypes.some(type => {
    if (type.includes('*')) {
      const prefix = type.split('/')[0];
      return file.type.startsWith(prefix);
    }
    return file.type === type;
  });
};

export const isValidFileSize = (file, maxSize) => {
  return file.size <= maxSize;
};

export const validateFile = (file, options = {}) => {
  const {
    allowedTypes = [],
    maxSize = 10 * 1024 * 1024, // 10MB
    minSize = 0,
    allowedExtensions = [],
  } = options;
  
  const errors = [];
  
  // Check file exists
  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }
  
  // Check file type
  if (allowedTypes.length > 0 && !isValidFileType(file, allowedTypes)) {
    errors.push(`File type ${file.type} is not allowed`);
  }
  
  // Check file extension
  if (allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      errors.push(`File extension .${extension} is not allowed`);
    }
  }
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${formatBytes(maxSize)} limit`);
  }
  
  if (file.size < minSize) {
    errors.push(`File size is less than ${formatBytes(minSize)}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// URL validation
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Credit card validation (Luhn algorithm)
export const isValidCreditCard = (cardNumber) => {
  const sanitized = cardNumber.replace(/\D/g, '');
  if (sanitized.length < 13 || sanitized.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

// Credit card type detection
export const getCreditCardType = (cardNumber) => {
  const sanitized = cardNumber.replace(/\D/g, '');
  const patterns = {
    visa: /^4/,
    mastercard: /^5[1-5]/,
    amex: /^3[47]/,
    discover: /^6(?:011|5)/,
    diners: /^3(?:0[0-5]|[68])/,
    jcb: /^(?:2131|1800|35)/,
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(sanitized)) return type;
  }
  return 'unknown';
};

// Date validation
export const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date);
};

export const isFutureDate = (date) => {
  return isValidDate(date) && date > new Date();
};

export const isPastDate = (date) => {
  return isValidDate(date) && date < new Date();
};

// Required field validator
export const isRequired = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

// Min length validator
export const minLength = (value, length) => {
  if (!value) return false;
  return String(value).length >= length;
};

// Max length validator
export const maxLength = (value, length) => {
  if (!value) return true;
  return String(value).length <= length;
};

// Number range validator
export const isInRange = (value, min, max) => {
  const num = Number(value);
  if (isNaN(num)) return false;
  return num >= min && num <= max;
};

// Object validator
export const validateObject = (obj, schema) => {
  const errors = {};
  let isValid = true;
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = obj[field];
    const fieldErrors = [];
    
    for (const rule of rules) {
      const { validator, message } = rule;
      if (!validator(value)) {
        fieldErrors.push(message);
      }
    }
    
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
      isValid = false;
    }
  }
  
  return { isValid, errors };
};

// Helper function for formatting bytes (needed for error messages)
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};