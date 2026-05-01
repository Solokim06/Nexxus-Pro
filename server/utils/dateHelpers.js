class DateHelpers {
  // Format date to ISO string
  toISO(date) {
    return new Date(date).toISOString();
  }

  // Format date to local string
  toLocalString(date, locale = 'en-US') {
    return new Date(date).toLocaleString(locale);
  }

  // Format date to date only
  toDateString(date, locale = 'en-US') {
    return new Date(date).toLocaleDateString(locale);
  }

  // Format date to time only
  toTimeString(date, locale = 'en-US') {
    return new Date(date).toLocaleTimeString(locale);
  }

  // Get start of day
  startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Get end of day
  endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  // Get start of week (Monday)
  startOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? 6 : day - 1);
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Get end of week (Sunday)
  endOfWeek(date) {
    const d = this.startOfWeek(date);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  // Get start of month
  startOfMonth(date) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Get end of month
  endOfMonth(date) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  // Get start of year
  startOfYear(date) {
    const d = new Date(date);
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Get end of year
  endOfYear(date) {
    const d = new Date(date);
    d.setMonth(11, 31);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  // Add days
  addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  // Subtract days
  subtractDays(date, days) {
    return this.addDays(date, -days);
  }

  // Add months
  addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  // Subtract months
  subtractMonths(date, months) {
    return this.addMonths(date, -months);
  }

  // Add years
  addYears(date, years) {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + years);
    return d;
  }

  // Subtract years
  subtractYears(date, years) {
    return this.addYears(date, -years);
  }

  // Add hours
  addHours(date, hours) {
    const d = new Date(date);
    d.setHours(d.getHours() + hours);
    return d;
  }

  // Add minutes
  addMinutes(date, minutes) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + minutes);
    return d;
  }

  // Add seconds
  addSeconds(date, seconds) {
    const d = new Date(date);
    d.setSeconds(d.getSeconds() + seconds);
    return d;
  }

  // Calculate age from birthdate
  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  // Calculate days between dates
  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Calculate hours between dates
  hoursBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60));
  }

  // Calculate minutes between dates
  minutesBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60));
  }

  // Check if date is today
  isToday(date) {
    const today = new Date();
    const d = new Date(date);
    return d.toDateString() === today.toDateString();
  }

  // Check if date is in the past
  isPast(date) {
    return new Date(date) < new Date();
  }

  // Check if date is in the future
  isFuture(date) {
    return new Date(date) > new Date();
  }

  // Check if date is between two dates
  isBetween(date, startDate, endDate) {
    const d = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return d >= start && d <= end;
  }

  // Get relative time string (e.g., "2 days ago", "in 3 hours")
  getRelativeTimeString(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(Math.abs(diff) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    const isFuture = diff < 0;
    const suffix = isFuture ? 'from now' : 'ago';
    const value = Math.abs(isFuture ? diff : diff);
    
    if (seconds < 60) return `just now`;
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ${suffix}`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ${suffix}`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ${suffix}`;
    if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ${suffix}`;
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ${suffix}`;
    return `${years} year${years !== 1 ? 's' : ''} ${suffix}`;
  }

  // Get day name
  getDayName(date, locale = 'en-US') {
    return new Date(date).toLocaleDateString(locale, { weekday: 'long' });
  }

  // Get month name
  getMonthName(date, locale = 'en-US') {
    return new Date(date).toLocaleDateString(locale, { month: 'long' });
  }

  // Get quarter of the year
  getQuarter(date) {
    const month = new Date(date).getMonth();
    return Math.floor(month / 3) + 1;
  }

  // Get week number of the year
  getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  // Get Unix timestamp (seconds)
  getUnixTimestamp(date = new Date()) {
    return Math.floor(new Date(date).getTime() / 1000);
  }

  // Convert Unix timestamp to Date
  fromUnixTimestamp(timestamp) {
    return new Date(timestamp * 1000);
  }

  // Parse date string with multiple formats
  parseDate(dateString) {
    const formats = [
      'YYYY-MM-DD',
      'MM/DD/YYYY',
      'DD/MM/YYYY',
      'YYYY-MM-DD HH:mm:ss',
      'MM/DD/YYYY HH:mm:ss',
      'DD/MM/YYYY HH:mm:ss',
    ];
    
    for (const format of formats) {
      const date = this.tryParse(dateString, format);
      if (date) return date;
    }
    
    return new Date(dateString);
  }

  tryParse(dateString, format) {
    // Simple parsing - in production use a library like moment.js or date-fns
    const parts = dateString.match(/\d+/g);
    if (!parts) return null;
    
    const formatParts = format.match(/[YMDHms]+/g);
    if (!formatParts) return null;
    
    const date = new Date();
    formatParts.forEach((part, index) => {
      const value = parseInt(parts[index]);
      switch (part) {
        case 'YYYY': date.setFullYear(value); break;
        case 'MM': date.setMonth(value - 1); break;
        case 'DD': date.setDate(value); break;
        case 'HH': date.setHours(value); break;
        case 'mm': date.setMinutes(value); break;
        case 'ss': date.setSeconds(value); break;
      }
    });
    
    return isNaN(date.getTime()) ? null : date;
  }

  // Get business days between dates (excluding weekends)
  getBusinessDays(startDate, endDate) {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  // Add business days
  addBusinessDays(date, days) {
    let result = new Date(date);
    let added = 0;
    
    while (added < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        added++;
      }
    }
    
    return result;
  }
}

module.exports = new DateHelpers();