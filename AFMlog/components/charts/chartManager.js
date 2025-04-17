/**
 * Chart Manager
 * Handles chart updates and provides utility functions for chart components
 */

// Import all chart components
import { 
  createErrorsByHourChart,
  createErrorStackedLine,
  createInputChart,
  createThroughputChart,
  createErrorRateChart,
  createErrorTrendChart,
  createErrorsByWeekdayChart,
  createErrorTypePieChart,
  createErrorHeatmapChart
} from './index.js';

// Import utilities
import { getKnownErrorPatterns } from '../../scripts/dataProcessors.js';
import { formatDate, getChartColor } from '../../scripts/utils.js';

/**
 * Update all charts with current data
 * @param {Object} data - Object containing all data needed for charts
 */
export function updateCharts(data) {
  const {
    filteredErrorData,
    filteredStatusData,
    filteredPatternData,
    startDate,
    endDate
  } = data;

  // Create or update all charts with filtered data
  createErrorsByHourChart(filteredErrorData);
  createInputChart(filteredStatusData, getAggregationInterval);
  createThroughputChart(filteredStatusData, getAggregationInterval);
  createErrorRateChart(filteredStatusData, filteredErrorData, getAggregationInterval);
  createErrorTrendChart(filteredErrorData, getKnownErrorPatterns(), formatDate, getChartColor);
  createErrorsByWeekdayChart(filteredErrorData);
  createErrorTypePieChart(filteredErrorData, getChartColor);
  createErrorStackedLine(filteredPatternData, getAggregationInterval);
  
  // Only create the error heatmap chart if the canvas element exists
  // Uncomment if needed:
  // createErrorHeatmapChart('errorHeatmapChart', filteredPatternData);
}

/**
 * Get appropriate aggregation interval based on date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} - Aggregation settings
 */
export function getAggregationInterval(startDate, endDate) {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  console.log(`Calculating aggregation interval for date range:`, {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    diffDays: diffDays
  });
  
  // Determine appropriate interval based on the date range
  if (diffDays <= 1) {
    // For ranges up to 1 day, aggregate by hour
    return {
      interval: 'hour',
      roundFn: (date) => {
        const rounded = new Date(date);
        rounded.setMinutes(0, 0, 0);
        return rounded;
      },
      format: (date) => {
        return date.getHours() + ':00';
      }
    };
  } else if (diffDays <= 14) {
    // For ranges up to 2 weeks, aggregate by day
    return {
      interval: 'day',
      roundFn: (date) => {
        const rounded = new Date(date);
        rounded.setHours(0, 0, 0, 0);
        return rounded;
      },
      format: (date) => {
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      }
    };
  } else if (diffDays <= 90) {
    // For ranges up to 3 months, aggregate by week
    return {
      interval: 'week',
      roundFn: (date) => {
        const rounded = new Date(date);
        const day = rounded.getDay();
        const diff = rounded.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        rounded.setDate(diff);
        rounded.setHours(0, 0, 0, 0);
        return rounded;
      },
      format: (date) => {
        const weekStart = new Date(date);
        const weekEnd = new Date(date);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + 
               ' - ' + 
               weekEnd.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      }
    };
  } else {
    // For ranges over 3 months, aggregate by month
    return {
      interval: 'month',
      roundFn: (date) => {
        const rounded = new Date(date);
        rounded.setDate(1);
        rounded.setHours(0, 0, 0, 0);
        return rounded;
      },
      format: (date) => {
        return date.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
      }
    };
  }
}

/**
 * Create time intervals for chart data based on aggregation settings
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} aggregation - Aggregation settings from getAggregationInterval
 * @returns {Array} - Array of time intervals
 */
export function createTimeIntervals(startDate, endDate, aggregation) {
  const intervals = [];
  let currentDate = aggregation.roundFn(new Date(startDate));
  const endTime = endDate.getTime();
  
  // Create intervals based on aggregation type
  while (currentDate.getTime() <= endTime) {
    intervals.push({
      timestamp: new Date(currentDate),
      label: aggregation.format(currentDate)
    });
    
    // Advance to next interval
    if (aggregation.interval === 'hour') {
      currentDate = new Date(currentDate.setHours(currentDate.getHours() + 1));
    } else if (aggregation.interval === 'day') {
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    } else if (aggregation.interval === 'week') {
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
    } else if (aggregation.interval === 'month') {
      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
    }
  }
  
  return intervals;
}

/**
 * Group data by time interval for charts
 * @param {Array} data - Data array to group
 * @param {string} timestampField - Field name containing timestamp
 * @param {Object} aggregation - Aggregation settings from getAggregationInterval
 * @returns {Object} - Grouped data by interval
 */
export function groupDataByTimeInterval(data, timestampField, aggregation) {
  const grouped = {};
  
  // Group data by interval
  data.forEach(item => {
    if (!item[timestampField]) return;
    
    const date = new Date(item[timestampField]);
    const intervalKey = aggregation.roundFn(date).getTime();
    
    if (!grouped[intervalKey]) {
      grouped[intervalKey] = {
        timestamp: new Date(intervalKey),
        label: aggregation.format(new Date(intervalKey)),
        items: []
      };
    }
    
    grouped[intervalKey].items.push(item);
  });
  
  return grouped;
}

// Export all chart-related functions
export default {
  updateCharts,
  getAggregationInterval,
  createTimeIntervals,
  groupDataByTimeInterval
};
