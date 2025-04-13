/**
 * Date utility functions for the AFM Dashboard
 * Handles date parsing, formatting, and manipulation
 */

import { formatDate, formatTime } from './utils.js';

/**
 * Parse a date string in various formats
 * @param {string} dateStr - Date string to parse
 * @returns {Date|null} - Parsed date or null if invalid
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Try to detect the format
    let date = null;
    
    // Format: "2025-04-06 14:10:02" (ISO-like with space)
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(dateStr)) {
      const [datePart, timePart] = dateStr.split(' ');
      date = new Date(`${datePart}T${timePart}`);
    }
    // Format: "08.04.2025 17:52" (European format with dots)
    else if (/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}(:\d{2})?$/.test(dateStr)) {
      const [datePart, timePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('.');
      date = new Date(`${year}-${month}-${day}T${timePart}`);
    }
    // Format: "04/08/2025 17:52" (US format with slashes)
    else if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}(:\d{2})?$/.test(dateStr)) {
      const [datePart, timePart] = dateStr.split(' ');
      const [month, day, year] = datePart.split('/');
      date = new Date(`${year}-${month}-${day}T${timePart}`);
    }
    // Try standard JavaScript date parsing as fallback
    else {
      date = new Date(dateStr);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  } catch (error) {
    console.error('Error parsing date:', error, dateStr);
    return null;
  }
}

/**
 * Filter data by date range
 * @param {Array} data - Data to filter
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Array} - Filtered data
 */
export function filterDataByDate(data, start, end) {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  
  // Ensure start and end are valid dates
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('Invalid date range:', { start, end });
    return [];
  }
  
  console.log('Filtering data by date range:', {
    start: start.toISOString(),
    end: end.toISOString(),
    dataLength: data.length
  });
  
  const filtered = data.filter(item => {
    if (!item || !item.timestamp) {
      return false;
    }
    
    try {
      // Parse the date
      let itemDate;
      
      if (typeof item.timestamp === 'string') {
        itemDate = parseDate(item.timestamp);
      } else if (item.timestamp instanceof Date) {
        itemDate = item.timestamp;
      } else {
        return false;
      }
      
      // Check if date is valid
      if (!itemDate || isNaN(itemDate.getTime())) {
        // Only log a warning for the first few items to avoid console spam
        if (data.indexOf(item) < 3) {
          console.warn('Invalid date:', item.timestamp);
        }
        return false;
      }
      
      return itemDate >= start && itemDate <= end;
    } catch (error) {
      console.error('Error filtering by date:', error, item);
      return false;
    }
  });
  
  console.log('Filtered data:', filtered.length, 'items');
  return filtered;
}

/**
 * Adjust date by a specified amount
 * @param {string} inputId - ID of the date input
 * @param {number} amount - Amount to adjust
 * @param {string} unit - Unit to adjust (day, month, year)
 * @param {Function} onDateChange - Callback function to handle date changes
 */
export function adjustDate(inputId, amount, unit, onDateChange) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  // Get all date/time inputs
  const startDateInput = document.getElementById('startDate');
  const startTimeInput = document.getElementById('startTime');
  const endDateInput = document.getElementById('endDate');
  const endTimeInput = document.getElementById('endTime');
  
  if (!startDateInput || !startTimeInput || !endDateInput || !endTimeInput) return;
  
  // Parse current date
  const date = new Date(input.value + 'T00:00:00');
  if (isNaN(date.getTime())) return;
  
  // Adjust date
  switch (unit) {
    case 'day':
      date.setDate(date.getDate() + amount);
      break;
    case 'month':
      date.setMonth(date.getMonth() + amount);
      break;
    case 'year':
      date.setFullYear(date.getFullYear() + amount);
      break;
  }
  
  // Format date for input field (YYYY-MM-DD)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;
  
  // Update input
  input.value = formattedDate;
  
  // Trigger change event on the input
  const event = new Event('change');
  input.dispatchEvent(event);
  
  // Update global date variables based on which input was changed
  const startDateStr = startDateInput.value;
  const startTimeStr = startTimeInput.value;
  const endDateStr = endDateInput.value;
  const endTimeStr = endTimeInput.value;
  
  // Create Date objects
  const start = new Date(`${startDateStr}T${startTimeStr}:00`);
  const end = new Date(`${endDateStr}T${endTimeStr}:00`);
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('Invalid date or time format after adjustment');
    return;
  }
  
  // Call the callback function with the new dates
  if (typeof onDateChange === 'function') {
    onDateChange(start, end);
  }
}

/**
 * Adjust time by a specified amount
 * @param {string} inputId - ID of the time input
 * @param {number} amount - Amount to adjust
 * @param {string} unit - Unit to adjust (hour, minute)
 * @param {Function} onDateChange - Callback function to handle date changes
 */
export function adjustTime(inputId, amount, unit, onDateChange) {
  const input = document.getElementById(inputId);
  if (!input || !input.value) return;
  
  // Get all date/time inputs
  const startDateInput = document.getElementById('startDate');
  const startTimeInput = document.getElementById('startTime');
  const endDateInput = document.getElementById('endDate');
  const endTimeInput = document.getElementById('endTime');
  
  if (!startDateInput || !startTimeInput || !endDateInput || !endTimeInput) return;
  
  // Parse current time
  const [hours, minutes] = input.value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  
  // Adjust time
  switch (unit) {
    case 'hour':
      date.setHours(date.getHours() + amount);
      break;
    case 'minute':
      date.setMinutes(date.getMinutes() + amount);
      break;
  }
  
  // Format time for input field (HH:MM)
  const formattedHours = String(date.getHours()).padStart(2, '0');
  const formattedMinutes = String(date.getMinutes()).padStart(2, '0');
  const formattedTime = `${formattedHours}:${formattedMinutes}`;
  
  // Update input
  input.value = formattedTime;
  
  // Trigger change event on the input
  const event = new Event('change');
  input.dispatchEvent(event);
  
  // Update global date variables based on which input was changed
  const startDateStr = startDateInput.value;
  const startTimeStr = startTimeInput.value;
  const endDateStr = endDateInput.value;
  const endTimeStr = endTimeInput.value;
  
  // Create Date objects
  const start = new Date(`${startDateStr}T${startTimeStr}:00`);
  const end = new Date(`${endDateStr}T${endTimeStr}:00`);
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('Invalid date or time format after adjustment');
    return;
  }
  
  // Call the callback function with the new dates
  if (typeof onDateChange === 'function') {
    onDateChange(start, end);
  }
}
