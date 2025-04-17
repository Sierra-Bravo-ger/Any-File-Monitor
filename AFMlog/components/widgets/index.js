/**
 * Widgets Registry
 * Central registry for all widget components
 */

// Import all widget components
import { updateTopErrorsList } from './topErrorsList.js';
import { updateErrorTable } from './errorTable.js';
import { updateHealthWidget } from './healthGauge.js';
import { calculateErrorRate, calculateThroughput, calculateHealthScore, getErrorRateStatus } from '../calculations/index.js';
import { updateKpiGrid, createKpiGrid } from './kpiGrid.js';
import { initDateFilter, applyDateFilter, resetDateFilter, shiftDateRange } from './dateFilter.js';
import { initErrorTypeFilter, toggleErrorTypeDropdown, updateErrorTypeFilterUI, closeErrorTypeDropdown } from './errorTypeFilter.js';
import { initQuickFilter, toggleQuickFilterDropdown, closeQuickFilterDropdown } from './quickFilter.js';
import { initDataTables, toggleSort, updateTablesWithFilters, renderTable, filterTableData, searchStatus, searchErrorLog, searchPatterns, searchInputs, changePage, setupSearchButtonListeners } from './dataTables.js';

// We'll get applyQuickFilter from the initQuickFilter return value
let applyQuickFilter = null;

// Modify initQuickFilter to capture the applyQuickFilter function
const originalInitQuickFilter = initQuickFilter;
const wrappedInitQuickFilter = function(options) {
  console.log('[WidgetRegistry] Initializing quick filter with wrapped function');
  const api = originalInitQuickFilter(options);
  if (api && typeof api.applyQuickFilter === 'function') {
    console.log('[WidgetRegistry] Successfully captured applyQuickFilter function');
    applyQuickFilter = api.applyQuickFilter;
  } else {
    console.error('[WidgetRegistry] Failed to capture applyQuickFilter function');
  }
  return api;
};

// Export a registry of all widget functions
const widgetRegistry = {
  topErrorsList: updateTopErrorsList,
  errorTable: updateErrorTable,
  healthWidget: updateHealthWidget,
  calculateErrorRate,
  calculateThroughput,
  calculateHealthScore,
  getErrorRateStatus,
  closeErrorTypeDropdown,
  updateKpiGrid,
  createKpiGrid,
  initDateFilter,
  applyDateFilter,
  resetDateFilter,
  // We'll set applyQuickFilter dynamically after initialization
  get applyQuickFilter() { return applyQuickFilter; },
  toggleQuickFilterDropdown,
  closeQuickFilterDropdown,
  shiftDateRange,
  initErrorTypeFilter,
  toggleErrorTypeDropdown,
  closeErrorTypeDropdown,
  updateErrorTypeFilterUI,
  initQuickFilter: wrappedInitQuickFilter,
  // Data tables functions
  initDataTables,
  toggleSort,
  updateTablesWithFilters,
  renderTable,
  filterTableData,
  searchStatus,
  searchErrorLog,
  searchPatterns,
  searchInputs,
  changePage,
  setupSearchButtonListeners
};

export {
  updateTopErrorsList,
  updateErrorTable,
  updateHealthWidget,
  calculateErrorRate,
  calculateThroughput,
  calculateHealthScore,
  getErrorRateStatus,
  updateKpiGrid,
  createKpiGrid,
  initDateFilter,
  applyDateFilter,
  resetDateFilter,
  applyQuickFilter,
  toggleQuickFilterDropdown,
  closeQuickFilterDropdown,
  shiftDateRange,
  initErrorTypeFilter,
  toggleErrorTypeDropdown,
  closeErrorTypeDropdown,
  updateErrorTypeFilterUI,
  wrappedInitQuickFilter as initQuickFilter,
  // Data tables functions
  initDataTables,
  toggleSort,
  updateTablesWithFilters,
  renderTable,
  filterTableData,
  searchStatus,
  searchErrorLog,
  searchPatterns,
  searchInputs,
  changePage,
  setupSearchButtonListeners
};

export default widgetRegistry;
