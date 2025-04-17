/**
 * Chart Registry
 * Central registry for all chart components
 */

// Import all chart components
import { createErrorsByHourChart } from './errorsByHourChart.js';
import { createErrorStackedLine } from './errorStackedLine.js';
import { createInputChart } from './inputChart.js';
import { createThroughputChart } from './throughputChart.js';
import { createErrorRateChart } from './errorRateChart.js';
import { createErrorTrendChart } from './errorTrendChart.js';
import { createErrorsByWeekdayChart } from './errorsByWeekdayChart.js';
import { createErrorTypePieChart } from './errorTypePieChart.js';
import { createErrorHeatmapChart } from './errorHeatmapChart.js';
import WidgetA from '../WidgetA.js';

// Export a registry of all chart functions
const chartRegistry = {
  errorsByHourChart: createErrorsByHourChart,
  errorStackedLine: createErrorStackedLine,
  inputChart: createInputChart,
  throughputChart: createThroughputChart,
  errorRateChart: createErrorRateChart,
  errorTrendChart: createErrorTrendChart,
  errorsByWeekdayChart: createErrorsByWeekdayChart,
  errorTypePieChart: createErrorTypePieChart,
  errorHeatmapChart: createErrorHeatmapChart,
  healthGauge: initHealthGauge
};

/**
 * Initialize the health gauge widget
 * @param {Object} data - Optional data to initialize the gauge with
 * @returns {Object} - The WidgetA instance
 */
export function initHealthGauge(data) {
  const widgetA = new WidgetA('healthCard');
  
  // If data is provided, update the widget
  if (data && data.kpis) {
    // This will be handled by the updateHealthWidget function in healthGauge.js
  }
  
  return widgetA;
}

/**
 * Initialize or update a specific chart
 * @param {string} chartId - The ID of the chart to initialize or update
 * @param {Object} data - The data to use for the chart
 * @returns {Object|null} - The Chart.js instance or null if chart not found
 */
export function initChart(chartId, data) {
  if (chartRegistry[chartId]) {
    return chartRegistry[chartId](data);
  }
  console.warn(`Chart ${chartId} not found in registry`);
  return null;
}

/**
 * Initialize or update all registered charts
 * @param {Object} data - The data to use for all charts
 */
export function initAllCharts(data) {
  Object.keys(chartRegistry).forEach(chartId => {
    chartRegistry[chartId](data);
  });
}

// Import chart manager functions
import { updateCharts, getAggregationInterval, createTimeIntervals, groupDataByTimeInterval } from './chartManager.js';

// Export individual chart functions for direct access
export {
  createErrorsByHourChart,
  createErrorStackedLine,
  createInputChart,
  createThroughputChart,
  createErrorRateChart,
  createErrorTrendChart,
  createErrorsByWeekdayChart,
  createErrorTypePieChart,
  createErrorHeatmapChart,
  // Export chart manager functions
  updateCharts,
  getAggregationInterval,
  createTimeIntervals,
  groupDataByTimeInterval
};
