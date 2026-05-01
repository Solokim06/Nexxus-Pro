const {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  getPasswordStrength,
  formatFileSize,
  formatCurrency,
  formatDate,
  getRelativeTime,
  deepClone,
  debounce,
  throttle,
} = require('../../utils/helpers');

describe('Utility Functions Tests', () => {
  describe('Email Validation', () => {
    it('should validate correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.ke')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('Phone Validation', () => {
    it('should validate Kenyan phone numbers', () => {
      expect(isValidPhone('0712345678')).toBe(true);
      expect(isValidPhone('254712345678')).toBe(true);
      expect(isValidPhone('+254712345678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('071234567')).toBe(false);
      expect(isValidPhone('0812345678')).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('should validate strong password', () => {
      const result = isValidPassword('StrongP@ss123');
      expect(result.isValid).toBe(true);
    });

    it('should reject weak password', () => {
      const result = isValidPassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.minLength).toBe(true);
    });

    it('should require uppercase letter', () => {
      const result = isValidPassword('lowercase123!');
      expect(result.errors.upperCase).toBe(true);
    });
  });

  describe('Password Strength', () => {
    it('should return very weak for short password', () => {
      const strength = getPasswordStrength('123');
      expect(strength.label).toBe('Very Weak');
    });

    it('should return strong for complex password', () => {
      const strength = getPasswordStrength('Str0ngP@ssw0rd!');
      expect(strength.label).toBe('Strong');
    });
  });

  describe('File Size Formatting', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('Currency Formatting', () => {
    it('should format USD currency', () => {
      expect(formatCurrency(9.99)).toBe('$9.99');
      expect(formatCurrency(1000)).toBe('$1,000.00');
    });

    it('should format KES currency', () => {
      expect(formatCurrency(100, 'KES')).toBe('KES100.00');
    });
  });

  describe('Date Formatting', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00');
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-01-15');
      expect(formatDate(date, 'MM/DD/YYYY')).toBe('01/15/2024');
    });
  });

  describe('Relative Time', () => {
    it('should return "just now" for recent time', () => {
      const date = new Date();
      expect(getRelativeTime(date)).toBe('just now');
    });

    it('should return minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      expect(getRelativeTime(date)).toBe('5 minutes ago');
    });

    it('should return hours ago', () => {
      const date = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(getRelativeTime(date)).toBe('2 hours ago');
    });
  });

  describe('Deep Clone', () => {
    it('should create deep copy of object', () => {
      const original = { a: 1, b: { c: 2, d: [3, 4] } };
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });
  });

  describe('Debounce', () => {
    jest.useFakeTimers();
    
    it('should debounce function calls', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 1000);
      
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      expect(fn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Throttle', () => {
    jest.useFakeTimers();
    
    it('should throttle function calls', () => {
      const fn = jest.fn();
      const throttledFn = throttle(fn, 1000);
      
      throttledFn();
      throttledFn();
      throttledFn();
      
      expect(fn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(1000);
      throttledFn();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});