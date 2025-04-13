/**
 * Widgets Registry
 * Central registry for all widget components
 */

// Import all widget components
import { updateTopErrorsList } from './topErrorsList.js';
import { updateErrorTable } from './errorTable.js';
import { updateHealthWidget, calculateErrorRate, calculateThroughput } from './healthGauge.js';
import { updateKpiGrid, createKpiGrid } from './kpiGrid.js';
import { initDateFilter, applyDateFilter, resetDateFilter, applyQuickFilter, toggleQuickFilterDropdown, shiftDateRange } from './dateFilter.js';

// Export a registry of all widget functions
const widgetRegistry = {
  topErrorsList: updateTopErrorsList,
  errorTable: updateErrorTable,
  healthWidget: updateHealthWidget,
  calculateErrorRate,
  calculateThroughput,
  updateKpiGrid,
  createKpiGrid,
  initDateFilter,
  applyDateFilter,
  resetDateFilter,
  applyQuickFilter,
  toggleQuickFilterDropdown,
  shiftDateRange
};

/**
 * Get a widget function by name
 * @param {string} name - Name of the widget function
 * @returns {Function} - The widget function
 */
export function getWidget(name) {
  if (!widgetRegistry[name]) {
    console.error(`Widget function '${name}' not found in registry`);
    return null;
  }
  return widgetRegistry[name];
}

// Export individual widget functions for direct access
export {
  updateTopErrorsList,
  updateErrorTable,
  updateHealthWidget,
  calculateErrorRate,
  calculateThroughput,
  updateKpiGrid,
  createKpiGrid,
  initDateFilter,
  applyDateFilter,
  resetDateFilter,
  applyQuickFilter,
  toggleQuickFilterDropdown,
  shiftDateRange
};
