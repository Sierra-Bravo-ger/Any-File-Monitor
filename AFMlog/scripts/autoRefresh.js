/**
 * Auto-Refresh Module for the AFM Dashboard
 * 
 * Handles the auto-refresh functionality, including starting and stopping
 * the refresh interval and updating the UI accordingly.
 */

// Reference to the auto-refresh interval
let autoRefreshInterval = null;

// Reference to the countdown interval
let countdownInterval = null;

// Function to call when refresh is triggered
let refreshCallback = null;

// Function to update the last update time
let updateTimeCallback = null;

// Function to update the countdown display
let updateCountdownCallback = null;

// Default refresh interval in milliseconds (5 minutes)
let refreshIntervalMs = 300000;

// Next refresh timestamp
let nextRefreshTime = 0;

// Predefined interval options in milliseconds
const REFRESH_INTERVALS = {
  '30sec': 30000,
  '1min': 60000,
  '5min': 300000,
  '15min': 900000,
  '30min': 1800000,
  '1hour': 3600000
};

/**
 * Initialize the auto-refresh module
 * @param {Function} onRefresh - Function to call when refresh is triggered
 * @param {Function} onUpdateTime - Function to update the last update time
 * @param {Function} onUpdateCountdown - Function to update the countdown display
 */
export function initAutoRefresh(onRefresh, onUpdateTime, onUpdateCountdown) {
  refreshCallback = onRefresh;
  updateTimeCallback = onUpdateTime;
  updateCountdownCallback = onUpdateCountdown;
  console.log('Auto-refresh module initialized');
}

/**
 * Toggle auto-refresh
 * @param {boolean} enabled - Whether auto-refresh should be enabled
 */
export function toggleAutoRefresh(enabled) {
  if (enabled) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

/**
 * Start auto-refresh interval
 * @param {number} [intervalMs] - Optional custom interval in milliseconds
 */
export function startAutoRefresh(intervalMs) {
  // Clear existing intervals if any
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  // Use provided interval or fall back to the current setting
  if (intervalMs !== undefined && !isNaN(intervalMs) && intervalMs > 0) {
    refreshIntervalMs = intervalMs;
  }
  
  // Set the next refresh time
  nextRefreshTime = Date.now() + refreshIntervalMs;
  
  // Start the countdown timer
  startCountdown();
  
  // Set new interval with current refresh interval
  autoRefreshInterval = setInterval(() => {
    console.log(`Auto-refresh triggered (interval: ${refreshIntervalMs}ms)`);
    
    // Call the refresh callback if defined
    if (typeof refreshCallback === 'function') {
      refreshCallback();
    }
    
    // Update the last update time immediately when auto-refresh occurs
    if (typeof updateTimeCallback === 'function') {
      updateTimeCallback();
    }
    
    // Reset the next refresh time
    nextRefreshTime = Date.now() + refreshIntervalMs;
  }, refreshIntervalMs);
  
  // Update header toggle
  const headerElement = document.querySelector('afm-header');
  if (headerElement) {
    headerElement.setAutoRefreshToggle(true);
  }
  
  console.log(`Auto-refresh started with ${refreshIntervalMs/1000} second interval`);
}

/**
 * Stop auto-refresh interval
 */
export function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    console.log('Auto-refresh stopped');
  }
  
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  
  // Update the countdown to show disabled state
  // Call updateLastUpdateCountdown directly instead of using a callback
  updateLastUpdateCountdown(null);
  
  // Update header toggle
  const headerElement = document.querySelector('afm-header');
  if (headerElement) {
    headerElement.setAutoRefreshToggle(false);
  }
}

/**
 * Get the current auto-refresh status
 * @returns {boolean} - Whether auto-refresh is currently enabled
 */
export function isAutoRefreshEnabled() {
  return autoRefreshInterval !== null;
}

/**
 * Set the refresh interval
 * @param {string|number} interval - Either a predefined interval key or a custom interval in milliseconds
 * @returns {boolean} - Whether the interval was successfully set
 */
export function setRefreshInterval(interval) {
  let newInterval;
  
  // Check if it's a predefined interval
  if (typeof interval === 'string' && REFRESH_INTERVALS[interval] !== undefined) {
    newInterval = REFRESH_INTERVALS[interval];
  } 
  // Check if it's a valid number
  else if (!isNaN(interval) && interval > 0) {
    // Enforce minimum interval of 10 seconds to prevent abuse
    newInterval = Math.max(10000, parseInt(interval, 10));
  } else {
    console.error('Invalid refresh interval:', interval);
    return false;
  }
  
  // Store the new interval
  refreshIntervalMs = newInterval;
  
  // If auto-refresh is currently active, restart it with the new interval
  if (isAutoRefreshEnabled()) {
    startAutoRefresh(refreshIntervalMs);
  }
  
  console.log(`Refresh interval set to ${refreshIntervalMs}ms`);
  return true;
}

/**
 * Get the current refresh interval in milliseconds
 * @returns {number} - Current refresh interval in milliseconds
 */
export function getRefreshInterval() {
  return refreshIntervalMs;
}

/**
 * Get all available predefined refresh intervals
 * @returns {Object} - Object with interval names as keys and milliseconds as values
 */
export function getPredefinedIntervals() {
  return { ...REFRESH_INTERVALS };
}

/**
 * Start the countdown timer
 * @private
 */
function startCountdown() {
  // Clear any existing countdown interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  // Update the countdown immediately
  updateCountdown();
  
  // Set up the countdown interval (updates every second)
  countdownInterval = setInterval(updateCountdown, 1000);
}

/**
 * Update the countdown display
 * @private
 */
function updateCountdown() {
  if (!isAutoRefreshEnabled()) {
    // If auto-refresh is disabled, clear the countdown
    if (typeof updateCountdownCallback === 'function') {
      updateCountdownCallback(null);
    }
    
    // Also update the last update element directly
    updateLastUpdateCountdown(null);
    return;
  }
  
  // Calculate remaining time
  const now = Date.now();
  const remainingMs = Math.max(0, nextRefreshTime - now);
  
  // If we have a callback, update the countdown display
  if (typeof updateCountdownCallback === 'function') {
    updateCountdownCallback(remainingMs);
  }
  
  // Also update the last update element directly
  updateLastUpdateCountdown(remainingMs);
}

/**
 * Get the time remaining until the next refresh
 * @returns {number} - Milliseconds until next refresh, or 0 if auto-refresh is disabled
 */
export function getTimeUntilNextRefresh() {
  if (!isAutoRefreshEnabled()) {
    return 0;
  }
  
  const now = Date.now();
  return Math.max(0, nextRefreshTime - now);
}

/**
 * Update the last update timestamp
 * @param {Object} options - Optional parameters
 * @param {Function} options.formatDateTime - Function to format date/time (if not provided, will use built-in formatter)
 * @param {Object} options.filteredData - Filtered data to check for empty state
 * @param {string} options.lastBackendRunTime - Last backend run time string
 */
export function updateLastUpdateTime(options = {}) {
  const now = new Date();
  let formattedTime;
  
  // Use provided formatter or default to built-in formatter
  if (typeof options.formatDateTime === 'function') {
    formattedTime = options.formatDateTime(now);
  } else {
    // Default formatter using German locale
    formattedTime = now.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  // Ensure the lastUpdate element exists
  const lastUpdateElement = document.getElementById('lastUpdate');
  if (!lastUpdateElement) {
    console.log('lastUpdate element not found, creating structure');
    return formattedTime;
  }
  
  // Ensure the container exists
  let containerElement = lastUpdateElement.querySelector('.update-info-container');
  if (!containerElement) {
    console.log('Creating update-info-container');
    containerElement = document.createElement('div');
    containerElement.className = 'update-info-container';
    lastUpdateElement.appendChild(containerElement);
  }
  
  // Ensure the icon exists
  if (!containerElement.querySelector('i.material-icons')) {
    console.log('Creating update icon');
    const iconElement = document.createElement('i');
    iconElement.className = 'material-icons';
    iconElement.textContent = 'update';
    containerElement.prepend(iconElement);
  }
  
  // Ensure the countdown element exists
  if (!containerElement.querySelector('#nextRefreshCountdown')) {
    console.log('Creating countdown element');
    const countdownElement = document.createElement('span');
    countdownElement.id = 'nextRefreshCountdown';
    countdownElement.className = 'next-refresh-countdown';
    const icon = containerElement.querySelector('i.material-icons');
    if (icon) {
      icon.after(countdownElement);
    } else {
      containerElement.appendChild(countdownElement);
    }
  }
  
  // Ensure the text element exists
  let textElement = containerElement.querySelector('.last-update-text');
  if (!textElement) {
    console.log('Creating last-update-text element');
    textElement = document.createElement('span');
    textElement.className = 'last-update-text';
    containerElement.appendChild(textElement);
  }
  
  // Update the text content
  let updateText = `Letzte Aktualisierung: ${formattedTime}`;
  
  // Add last backend run time if available
  if (options.lastBackendRunTime) {
    updateText += ` | Letzte Daten im Zeitraum: ${options.lastBackendRunTime}`;
  } else if (options.filteredData && options.filteredData.length === 0) {
    updateText += ` | Keine Daten im ausgewählten Zeitraum`;
  }
  
  textElement.textContent = updateText;
  
  // Add animation class
  lastUpdateElement.classList.add('timestamp-updated');
  
  // Remove animation class after animation completes
  setTimeout(() => {
    lastUpdateElement.classList.remove('timestamp-updated');
  }, 2000); // Match the animation duration in CSS
  
  // Store the last update time in localStorage for persistence
  localStorage.setItem('afmDashboardLastUpdate', now.toISOString());
  
  console.log('Last update time updated:', formattedTime);
  
  // If we have an update callback and skipCallback is not true, call it
  if (typeof updateTimeCallback === 'function' && !options.skipCallback) {
    updateTimeCallback(now);
  }
  
  return formattedTime;
}

/**
 * Update the countdown display in the last update element
 * @param {number|null} remainingMs - Milliseconds until next refresh, or null if disabled
 */
function updateLastUpdateCountdown(remainingMs) {
  // Find the lastUpdate element first
  const lastUpdateElement = document.getElementById('lastUpdate');
  if (!lastUpdateElement) {
    console.log('lastUpdate element not found, cannot update countdown');
    return;
  }
  
  // Find or create the container
  let containerElement = lastUpdateElement.querySelector('.update-info-container');
  if (!containerElement) {
    console.log('Creating update-info-container for countdown');
    containerElement = document.createElement('div');
    containerElement.className = 'update-info-container';
    lastUpdateElement.appendChild(containerElement);
  }
  
  // Find or create the countdown element
  let countdownElement = containerElement.querySelector('#nextRefreshCountdown');
  if (!countdownElement) {
    console.log('Creating countdown element');
    countdownElement = document.createElement('span');
    countdownElement.id = 'nextRefreshCountdown';
    countdownElement.className = 'next-refresh-countdown';
    
    // Find the icon to insert after, or just append to container
    const icon = containerElement.querySelector('i.material-icons');
    if (icon) {
      icon.after(countdownElement);
    } else {
      containerElement.appendChild(countdownElement);
    }
  }
  
  // Update the countdown text
  if (remainingMs === null || !isAutoRefreshEnabled()) {
    countdownElement.textContent = 'Auto-Refresh deaktiviert';
    countdownElement.classList.add('refresh-disabled');
  } else {
    // Format the remaining time
    const seconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    let countdownText = 'Nächste Aktualisierung in ';
    
    if (minutes > 0) {
      countdownText += `${minutes}m `;
    }
    
    countdownText += `${remainingSeconds}s`;
    
    countdownElement.textContent = countdownText;
    countdownElement.classList.remove('refresh-disabled');
    
    // Add pulse animation when getting close to refresh
    if (seconds <= 5) {
      countdownElement.classList.add('refresh-imminent');
    } else {
      countdownElement.classList.remove('refresh-imminent');
    }
  }
}
