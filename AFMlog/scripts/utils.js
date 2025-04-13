/**
 * Utility functions for the AFM Dashboard
 */

/**
 * Format a date to YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatDate(date) {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

/**
 * Format a time to HH:MM
 * @param {Date} date - Date to format
 * @returns {string} - Formatted time string
 */
export function formatTime(date) {
  if (!date) return '';
  return date.toTimeString().substring(0, 5);
}

/**
 * Format a date and time for display
 * @param {Date|string} date - Date or ISO string to format
 * @returns {string} - Formatted date and time string
 */
export function formatDateTime(date) {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Format a duration between two dates
 * @param {Date} startTime - Start date
 * @param {Date} endTime - End date
 * @returns {string} - Formatted duration string
 */
export function formatDuration(startTime, endTime) {
  const duration = endTime - startTime;
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} ${getUnitText(days, 'day')}, ${hours % 24} ${getUnitText(hours % 24, 'hour')}`;
  } else if (hours > 0) {
    return `${hours} ${getUnitText(hours, 'hour')}, ${minutes % 60} ${getUnitText(minutes % 60, 'minute')}`;
  } else {
    return `${minutes} ${getUnitText(minutes, 'minute')}`;
  }
}

/**
 * Get the correct unit text based on amount (singular/plural)
 * @param {number} amount - Amount
 * @param {string} unit - Unit type (day, hour, minute)
 * @returns {string} - Correct unit text
 */
export function getUnitText(amount, unit) {
  switch (unit) {
    case 'day':
      return amount === 1 ? 'Tag' : 'Tage';
    case 'hour':
      return amount === 1 ? 'Stunde' : 'Stunden';
    case 'minute':
      return amount === 1 ? 'Minute' : 'Minuten';
    case 'second':
      return amount === 1 ? 'Sekunde' : 'Sekunden';
    default:
      return unit;
  }
}

/**
 * Debounce a function to limit how often it can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function to limit how often it can be called
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Get a color based on a status
 * @param {string} status - Status (ok, warning, error)
 * @returns {string} - CSS variable for the color
 */
export function getStatusColor(status) {
  switch (status.toLowerCase()) {
    case 'ok':
    case 'success':
      return 'var(--success-color)';
    case 'warning':
      return 'var(--warning-color)';
    case 'error':
    case 'failure':
      return 'var(--error-color)';
    default:
      return 'var(--text-color)';
  }
}

/**
 * Get a color for a chart based on index
 * @param {number} index - Index in the chart
 * @returns {string} - Color for the chart element
 */
/**
 * Get a color for a chart based on index and opacity
 * @param {number} index - Index in the chart
 * @param {number} opacity - Opacity value (0-1)
 * @returns {string} - Color for the chart element
 */
export function getChartColor(index, opacity = 1) {
  const colors = [
    `rgba(63, 81, 181, ${opacity})`, // Primary (Indigo)
    `rgba(244, 67, 54, ${opacity})`, // Error (Red)
    `rgba(76, 175, 80, ${opacity})`, // Success (Green)
    `rgba(255, 152, 0, ${opacity})`, // Warning (Orange)
    `rgba(156, 39, 176, ${opacity})`, // Purple
    `rgba(33, 150, 243, ${opacity})`, // Blue
    `rgba(255, 87, 34, ${opacity})`, // Deep Orange
    `rgba(96, 125, 139, ${opacity})`, // Blue Grey
    `rgba(0, 150, 136, ${opacity})`, // Teal
    `rgba(103, 58, 183, ${opacity})`  // Deep Purple
  ];
  
  return colors[index % colors.length];
}

/**
 * Parse a CSV string into an array of objects
 * @param {string} csv - CSV string
 * @param {Object} options - Parse options
 * @returns {Array} - Array of objects
 */
export function parseCSV(csv, options = {}) {
  // Simple CSV parser
  const lines = csv.split('\n');
  const result = [];
  const headers = lines[0].split(',').map(header => header.trim());
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const obj = {};
    const values = line.split(',');
    
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[j] ? values[j].trim() : '';
    }
    
    result.push(obj);
  }
  
  return result;
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} - Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Group an array of objects by a key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {Object} - Grouped object
 */
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
}

/**
 * Sum values in an array of objects by a key
 * @param {Array} array - Array of objects
 * @param {string} key - Key to sum by
 * @returns {number} - Sum of values
 */
export function sumBy(array, key) {
  return array.reduce((sum, item) => sum + (parseFloat(item[key]) || 0), 0);
}

/**
 * Calculate average of values in an array of objects by a key
 * @param {Array} array - Array of objects
 * @param {string} key - Key to average by
 * @returns {number} - Average value
 */
export function averageBy(array, key) {
  if (array.length === 0) return 0;
  return sumBy(array, key) / array.length;
}

/**
 * Format a number with thousands separators
 * @param {number} num - Number to format
 * @returns {string} - Formatted number
 */
export function formatNumber(num) {
  return num.toLocaleString('de-DE');
}

/**
 * Format a percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted percentage
 */
export function formatPercentage(value, decimals = 2) {
  return value.toFixed(decimals) + '%';
}

/**
 * Get the appropriate time unit and format for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} - Unit and format information
 */
export function getTimeUnitForRange(startDate, endDate) {
  const diffMs = endDate - startDate;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  if (diffDays <= 1) {
    return {
      unit: 'hour',
      format: 'HH:mm',
      tooltipFormat: 'DD.MM.YYYY HH:mm'
    };
  } else if (diffDays <= 7) {
    return {
      unit: 'day',
      format: 'DD.MM.',
      tooltipFormat: 'DD.MM.YYYY'
    };
  } else if (diffDays <= 31) {
    return {
      unit: 'day',
      format: 'DD.MM.',
      tooltipFormat: 'DD.MM.YYYY'
    };
  } else if (diffDays <= 365) {
    return {
      unit: 'month',
      format: 'MMM YYYY',
      tooltipFormat: 'MMM YYYY'
    };
  } else {
    return {
      unit: 'year',
      format: 'YYYY',
      tooltipFormat: 'YYYY'
    };
  }
}
