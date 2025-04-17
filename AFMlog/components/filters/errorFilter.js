/**
 * Error Filter Module
 * Handles filtering of error data by type and other criteria
 */

// Store the currently selected error types
let selectedErrorTypes = new Set();
let allErrorTypes = new Set();

/**
 * Initialize the error filter with available error types
 * @param {Array} errorTypes - Array of available error types
 */
export function initErrorFilter(errorTypes) {
  if (!errorTypes || !Array.isArray(errorTypes)) {
    console.warn('Invalid error types provided to initErrorFilter');
    return;
  }
  
  // Store all available error types
  allErrorTypes = new Set(errorTypes);
  
  // Default to all types selected
  selectedErrorTypes = new Set(errorTypes);
}

/**
 * Get the currently selected error types
 * @returns {Array} - Array of selected error types
 */
export function getSelectedErrorTypes() {
  return [...selectedErrorTypes];
}

/**
 * Get all available error types
 * @returns {Array} - Array of all available error types
 */
export function getAllErrorTypes() {
  return [...allErrorTypes];
}

/**
 * Check if an error type is currently selected
 * @param {string} type - Error type to check
 * @returns {boolean} - True if the type is selected
 */
export function isErrorTypeSelected(type) {
  return selectedErrorTypes.has(type);
}

/**
 * Select an error type
 * @param {string} type - Error type to select
 */
export function selectErrorType(type) {
  selectedErrorTypes.add(type);
  dispatchErrorFilterChanged();
}

/**
 * Deselect an error type
 * @param {string} type - Error type to deselect
 */
export function deselectErrorType(type) {
  selectedErrorTypes.delete(type);
  dispatchErrorFilterChanged();
}

/**
 * Toggle selection of an error type
 * @param {string} type - Error type to toggle
 * @returns {boolean} - New selection state (true = selected)
 */
export function toggleErrorType(type) {
  if (selectedErrorTypes.has(type)) {
    selectedErrorTypes.delete(type);
  } else {
    selectedErrorTypes.add(type);
  }
  
  dispatchErrorFilterChanged();
  return selectedErrorTypes.has(type);
}

/**
 * Select all available error types
 */
export function selectAllErrorTypes() {
  selectedErrorTypes = new Set(allErrorTypes);
  dispatchErrorFilterChanged();
}

/**
 * Deselect all error types
 */
export function clearErrorTypeSelection() {
  selectedErrorTypes.clear();
  dispatchErrorFilterChanged();
}

/**
 * Filter data by multiple error types
 * @param {Array} errorData - The error data to filter
 * @returns {Array} - Filtered error data
 */
export function filterByErrorTypes(errorData) {
  if (!errorData || !Array.isArray(errorData)) {
    console.warn('Invalid error data provided to filterByErrorTypes');
    return [];
  }
  
  // If no types are selected or all types are selected, return all data
  if (selectedErrorTypes.size === 0 || selectedErrorTypes.size === allErrorTypes.size) {
    return errorData;
  }
  
  // Filter by the selected error types
  return errorData.filter(item => selectedErrorTypes.has(item.type || 'unknown'));
}

/**
 * Legacy function for backward compatibility
 * Filter data by a single error type
 * @param {Array} errorData - The error data to filter
 * @param {string} type - Error type to filter by
 * @returns {Array} - Filtered error data
 * @deprecated Use filterByErrorTypes instead
 */
export function filterByErrorType(errorData, type) {
  if (!errorData || !Array.isArray(errorData)) {
    console.warn('Invalid error data provided to filterByErrorType');
    return [];
  }
  
  // If type is 'all' or invalid, return all data
  if (!type || type === 'all') {
    return errorData;
  }
  
  // Filter by the specified error type
  return errorData.filter(item => item.type === type);
}

/**
 * Create and dispatch an error type filter event with a single type
 * @param {string} type - Error type to filter by
 * @deprecated Use dispatchErrorFilterChanged instead
 */
export function dispatchErrorTypeFilter(type) {
  const event = new CustomEvent('error-type-filter', {
    detail: { type }
  });
  document.dispatchEvent(event);
}

/**
 * Dispatch an event indicating that error filters have changed
 */
export function dispatchErrorFilterChanged() {
  const event = new CustomEvent('error-filter-changed', {
    detail: { types: [...selectedErrorTypes] }
  });
  document.dispatchEvent(event);
}

/**
 * Get unique error types from error data
 * @param {Array} errorData - The error data to analyze
 * @returns {Array} - Array of unique error types
 */
export function getUniqueErrorTypes(errorData) {
  if (!errorData || !Array.isArray(errorData)) {
    return [];
  }
  
  // Extract all types and remove duplicates
  const types = errorData.map(item => item.type || 'unknown');
  return [...new Set(types)].sort();
}

// Export all functions
export default {
  initErrorFilter,
  getSelectedErrorTypes,
  getAllErrorTypes,
  isErrorTypeSelected,
  selectErrorType,
  deselectErrorType,
  toggleErrorType,
  selectAllErrorTypes,
  clearErrorTypeSelection,
  filterByErrorTypes,
  filterByErrorType,
  dispatchErrorTypeFilter,
  dispatchErrorFilterChanged,
  getUniqueErrorTypes
};
