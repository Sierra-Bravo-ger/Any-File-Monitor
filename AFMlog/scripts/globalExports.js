/**
 * Global Exports Module
 * 
 * This module is responsible for exposing functions from various modules
 * to the global scope (window object) for backward compatibility with
 * inline event handlers during the transition to a fully modular architecture.
 */

// Import functions that need to be exposed globally
import { toggleFilter, applyDateFilter, resetDateFilter, shiftDateRange, adjustDate, adjustTime, loadAllData } from './dashboard.js';
import { showTab } from './navigation.js';
import { toggleErrorTypeDropdown, updateErrorTypeFilterUI } from '../components/widgets/errorTypeFilter.js';
import { applyQuickFilter } from '../components/widgets/quickFilter.js';

/**
 * Initialize global exports
 * Exposes necessary functions to the window object for backward compatibility
 */
export function initGlobalExports() {
  console.log('Initializing global exports...');
  
  // Expose dashboard functions
  window.toggleFilter = toggleFilter;
  window.applyDateFilter = applyDateFilter;
  window.resetDateFilter = resetDateFilter;
  window.shiftDateRange = shiftDateRange;
  window.adjustDate = adjustDate;
  window.adjustTime = adjustTime;
  
  // Expose navigation functions
  window.showTab = showTab;
  
  // Expose data loading functions
  window.loadAllData = loadAllData;
  
  // Expose error type filter functions
  window.toggleErrorTypeDropdown = toggleErrorTypeDropdown;
  window.updateErrorTypeFilterUI = updateErrorTypeFilterUI;
  
  // Expose quick filter functions
  window.applyQuickFilter = applyQuickFilter;
  
  // Legacy function - should be removed once proper error search is implemented
  window.searchErrors = function() {
    const searchInput = document.getElementById('errorSearch');
    if (searchInput) {
      console.log('Searching for:', searchInput.value);
      // Implement search functionality here
    }
  };
  
  console.log('Global exports initialized');
}
