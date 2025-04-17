/**
 * Health Gauge Widget Component
 * Handles the health score calculation and status indicators for the dashboard
 */
import { calculateHealthScore, getErrorRateStatus, getThroughputStatus, calculateErrorRate, calculateThroughput } from '../../components/calculations/index.js';

/**
 * Update the health widget with KPI data
 * @param {Object} kpis - Key performance indicators
 * @param {Object} widgetA - The widget instance to update
 * @returns {void}
 */
export function updateHealthWidget(kpis, widgetA) {
  if (!widgetA) return;
  
  // Calculate health score based on KPIs
  const healthScore = calculateHealthScore(kpis);
  
  // Update health score
  widgetA.updateHealthScore(healthScore);
  
  // Get data processing status (based on archive column activity)
  const dataProcessingStatus = checkDataProcessingActivity(kpis.statusData);
  
  // Get data input status (based on input column threshold)
  const dataInputStatus = checkDataInputThreshold(kpis.statusData);
  
  // Update status indicators
  widgetA.updateStatus({
    fileProcessing: {
      value: dataProcessingStatus.active ? 'Aktiv' : 'Inaktiv',
      status: dataProcessingStatus.status
    },
    errorRate: {
      value: `${kpis.errorRateValue.toFixed(1)}%`,
      status: getErrorRateStatus(kpis.errorRateValue)
    },
    throughput: {
      value: `${Math.round(kpis.throughput)} Dateien/h`,
      status: getThroughputStatus(kpis.throughput)
    },
    connection: {
      value: dataInputStatus.overThreshold ? 'Überlastet' : 'Normal',
      status: dataInputStatus.status
    },
    errorIntensity: {
      value: `${kpis.errorIntensity || '0.0'}/h`,
      status: getErrorIntensityStatus(parseFloat(kpis.errorIntensity || 0))
    },
    errorTrend: {
      value: kpis.errorTrend || '0%',
      status: getErrorTrendStatus(kpis.errorTrend)
    }
    // archiveToErrorRatio removed as requested - already displayed in KPI card
  });
}

// calculateHealthScore has been moved to the kpiCalc.js module

// getErrorRateStatus has been moved to the kpiCalc.js module

// getThroughputStatus has been moved to the kpiCalc.js module

/**
 * Get status for error intensity
 * @param {number} intensity - Error intensity (errors per hour)
 * @returns {string} - Status (ok, warning, error)
 */
function getErrorIntensityStatus(intensity) {
  if (intensity > 20) {
    return 'error';
  } else if (intensity > 10) {
    return 'warning';
  } else {
    return 'ok';
  }
}

/**
 * Get status for error trend
 * @param {string} trend - Error trend as percentage string (e.g., "+10.5%")
 * @returns {string} - Status (ok, warning, error)
 */
function getErrorTrendStatus(trend) {
  if (!trend) return 'ok';
  
  // Extract numeric value from trend string
  const trendValue = parseFloat(trend.replace(/[+%]/g, ''));
  
  if (trendValue > 20) {
    return 'error';
  } else if (trendValue > 5) {
    return 'warning';
  } else if (trendValue < -10) {
    return 'ok'; // Significant improvement
  } else {
    return 'ok';
  }
}

// calculateErrorRate has been moved to the kpiCalc.js module

// calculateThroughput has been moved to the kpiCalc.js module

/**
 * Check if data processing is active based on archive column activity
 * @param {Array} statusData - Status data array
 * @returns {Object} - Object with active status and status code
 */
function checkDataProcessingActivity(statusData) {
  if (!statusData || statusData.length < 2) {
    return { active: false, status: 'warning' };
  }
  
  try {
    // Sort by timestamp to ensure we're comparing the right values
    const sortedData = [...statusData].sort((a, b) => {
      const dateA = parseTimestamp(a.timestamp);
      const dateB = parseTimestamp(b.timestamp);
      return dateA - dateB;
    });
    
    // Get the latest entry
    const latestEntry = sortedData[sortedData.length - 1];
    const latestTime = parseTimestamp(latestEntry.timestamp);
    const now = new Date();
    
    // Check if archive column (throughput) has increased in the last 60 minutes
    let archiveIncreased = false;
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 60 minutes ago
    
    // Find the entry closest to one hour ago
    let comparisonEntry = null;
    for (let i = sortedData.length - 1; i >= 0; i--) {
      const entryTime = parseTimestamp(sortedData[i].timestamp);
      if (entryTime <= oneHourAgo) {
        comparisonEntry = sortedData[i];
        break;
      }
    }
    
    // If we don't have an entry from an hour ago, use the oldest available
    if (!comparisonEntry && sortedData.length > 0) {
      comparisonEntry = sortedData[0];
    }
    
    if (comparisonEntry) {
      // Check if archive column (throughput) has increased
      archiveIncreased = latestEntry.throughput > comparisonEntry.throughput;
    }
    
    // Check if the latest entry is recent (within the last hour)
    const isRecent = (now - latestTime) < (60 * 60 * 1000);
    
    if (!isRecent) {
      // No recent data, considered inactive
      return { active: false, status: 'error' };
    }
    
    if (archiveIncreased) {
      // Archive has increased, processing is active
      return { active: true, status: 'ok' };
    } else {
      // Archive hasn't increased, processing is inactive
      return { active: false, status: 'error' };
    }
  } catch (error) {
    console.error('Error checking data processing activity:', error);
    return { active: false, status: 'error' };
  }
}

/**
 * Check if data input is over threshold
 * @param {Array} statusData - Status data array
 * @returns {Object} - Object with threshold status and status code
 */
function checkDataInputThreshold(statusData) {
  if (!statusData || statusData.length === 0) {
    return { overThreshold: false, status: 'ok' };
  }
  
  try {
    // Sort by timestamp to ensure we're getting the latest entry
    const sortedData = [...statusData].sort((a, b) => {
      const dateA = parseTimestamp(a.timestamp);
      const dateB = parseTimestamp(b.timestamp);
      return dateA - dateB;
    });
    
    // Get the latest entry
    const latestEntry = sortedData[sortedData.length - 1];
    
    // Check if input column (filesProcessed) is >= 50
    const inputCount = latestEntry.filesProcessed;
    const isOverThreshold = inputCount >= 50;
    
    return {
      overThreshold: isOverThreshold,
      status: isOverThreshold ? 'error' : 'ok'
    };
  } catch (error) {
    console.error('Error checking data input threshold:', error);
    return { overThreshold: false, status: 'warning' };
  }
}

/**
 * Parse timestamp string into Date object
 * @param {string} timestamp - Timestamp string
 * @returns {Date} - Date object
 */
function parseTimestamp(timestamp) {
  try {
    // Handle different timestamp formats
    if (timestamp.includes(' ')) {
      // Format: "2023-04-10 15:30:00"
      const [datePart, timePart] = timestamp.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds] = timePart.split(':').map(Number);
      return new Date(year, month - 1, day, hours, minutes, seconds);
    } else {
      // Try standard ISO format
      return new Date(timestamp);
    }
  } catch (error) {
    console.error('Error parsing timestamp:', error, timestamp);
    return new Date();
  }
}
