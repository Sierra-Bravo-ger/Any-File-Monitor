/**
 * Health Gauge Widget Component
 * Handles the health score calculation and status indicators for the dashboard
 */

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
  
  // Update status indicators
  widgetA.updateStatus({
    fileProcessing: {
      value: kpis.processingActive ? 'Aktiv' : 'Inaktiv',
      status: kpis.processingActive ? 'ok' : 'warning'
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
      value: kpis.connected ? 'Verbunden' : 'Getrennt',
      status: kpis.connected ? 'ok' : 'error'
    }
  });
}

/**
 * Calculate health score based on KPIs
 * @param {Object} kpis - Key performance indicators
 * @returns {number} - Health score (0-100)
 */
function calculateHealthScore(kpis) {
  // Base score starts at 100
  let score = 100;
  
  // Deduct for high error rate (up to -40)
  score -= Math.min(40, kpis.errorRateValue * 8);
  
  // Deduct for low throughput (up to -30)
  const throughputFactor = Math.max(0, 1 - (kpis.throughput / 100));
  score -= throughputFactor * 30;
  
  // Deduct for connection issues (-20)
  if (!kpis.connected) {
    score -= 20;
  }
  
  // Deduct for processing inactive (-10)
  if (!kpis.processingActive) {
    score -= 10;
  }
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get status for error rate
 * @param {number} errorRate - Error rate percentage
 * @returns {string} - Status (ok, warning, error)
 */
function getErrorRateStatus(errorRate) {
  if (errorRate > 5) {
    return 'error';
  } else if (errorRate > 2) {
    return 'warning';
  } else {
    return 'ok';
  }
}

/**
 * Get status for throughput
 * @param {number} throughput - Throughput in files per hour
 * @returns {string} - Status (ok, warning, error)
 */
function getThroughputStatus(throughput) {
  if (throughput < 30) {
    return 'error';
  } else if (throughput < 60) {
    return 'warning';
  } else {
    return 'ok';
  }
}

/**
 * Calculate error rate based on status data
 * @param {Array} filteredStatusData - Filtered status data
 * @param {Array} filteredErrorData - Filtered error data
 * @returns {number} - Error rate as a percentage value
 */
export function calculateErrorRate(filteredStatusData, filteredErrorData) {
  // Check if enough data is available
  if (filteredStatusData.length < 1) return 0;
    
  // Calculate the actual processed files during the time period
  let processedFiles = 0;
  let errorFiles = 0;
  
  if (filteredStatusData.length > 1) {
    // Sort data by timestamp to ensure we're using the correct order
    const sortedData = [...filteredStatusData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Difference between beginning and end of the time period
    const firstEntry = sortedData[0];
    const lastEntry = sortedData[sortedData.length - 1];
    
    // Calculate the change in archive and error directories
    // Try to use raw values first, then fall back to processed values
    let archiveChange, errorChange;
    
    if (firstEntry.rawArchiv !== undefined && lastEntry.rawArchiv !== undefined) {
      // Use raw values if available
      archiveChange = parseInt(lastEntry.rawArchiv || '0') - parseInt(firstEntry.rawArchiv || '0');
      errorChange = parseInt(lastEntry.rawError || '0') - parseInt(firstEntry.rawError || '0');
    } else {
      // Fall back to processed values
      archiveChange = (lastEntry.throughput || 0) - (firstEntry.throughput || 0);
      errorChange = (lastEntry.errorCount || 0) - (firstEntry.errorCount || 0);
    }
    
    // The number of error files is the positive change in the error directory
    errorFiles = Math.max(0, errorChange);
    
    // The sum of positive changes represents the processed files
    processedFiles = Math.max(0, archiveChange) + errorFiles;
    
    console.log('Error rate calculation (multiple entries):', {
      firstEntry,
      lastEntry,
      archiveChange,
      errorChange,
      errorFiles,
      processedFiles
    });
  } else {
    // Fallback for single data point
    const singleEntry = filteredStatusData[0];
    
    if (singleEntry.rawArchiv !== undefined && singleEntry.rawError !== undefined) {
      // Use raw values if available
      processedFiles = parseInt(singleEntry.rawArchiv || '0') + parseInt(singleEntry.rawError || '0');
      errorFiles = parseInt(singleEntry.rawError || '0');
    } else {
      // Fall back to processed values
      processedFiles = (singleEntry.throughput || 0) + (singleEntry.errorCount || 0);
      errorFiles = singleEntry.errorCount || 0;
    }
    
    console.log('Error rate calculation (single entry):', {
      singleEntry,
      processedFiles,
      errorFiles
    });
  }
  
  // For periods where only error files were processed
  const errorCount = filteredErrorData.length;
  
  // If no change or negative change (e.g., due to file deletions), use the error count
  if (processedFiles === 0) {
    processedFiles = errorCount > 0 ? errorCount : 1; // Avoid division by zero
    errorFiles = errorCount;
    
    console.log('Error rate calculation (using error count):', {
      errorCount,
      processedFiles,
      errorFiles
    });
  }
  
  // If all processed files are errors and the number of errors matches errorFiles,
  // then we have a 100% error rate
  if (processedFiles > 0 && processedFiles === errorFiles) {
    console.log('Error rate calculation: 100% error rate detected');
    return 100;
  }
  
  // Calculate error rate as a percentage
  const errorRateValue = (errorCount / processedFiles) * 100;
  console.log('Final error rate calculation:', {
    errorCount,
    processedFiles,
    errorRateValue
  });
  
  return errorRateValue;
}

/**
 * Calculate throughput as difference between the last two measurements
 * @param {Array} statusData - Status data array
 * @returns {number} - Throughput per hour
 */
export function calculateThroughput(statusData) {
  if (statusData.length < 2) {
    return 0;
  }
  
  // Sort data by timestamp to ensure we're using the correct order
  const sortedData = [...statusData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  // Last and second-to-last entry
  const lastEntry = sortedData[sortedData.length - 1];
  const prevEntry = sortedData[sortedData.length - 2];
  
  // Sum of processed files (Archive + Error) for each measurement
  // Try to access both raw and processed values
  let lastProcessed, prevProcessed;
  
  if (lastEntry.rawArchiv !== undefined && lastEntry.rawError !== undefined) {
    // Use raw values if available
    lastProcessed = parseInt(lastEntry.rawArchiv || '0') + parseInt(lastEntry.rawError || '0');
    prevProcessed = parseInt(prevEntry.rawArchiv || '0') + parseInt(prevEntry.rawError || '0');
  } else {
    // Fall back to processed values
    lastProcessed = (lastEntry.throughput || 0) + (lastEntry.errorCount || 0);
    prevProcessed = (prevEntry.throughput || 0) + (prevEntry.errorCount || 0);
  }
  
  // Difference = Number of newly processed files
  const processedDifference = lastProcessed - prevProcessed;
  
  // Calculate time difference in hours
  const lastTime = new Date(lastEntry.timestamp);
  const prevTime = new Date(prevEntry.timestamp);
  const hoursDiff = (lastTime - prevTime) / (1000 * 60 * 60); // Convert milliseconds to hours
  
  // Throughput per hour (extrapolated if the interval is shorter than an hour)
  const throughputPerHour = hoursDiff > 0 ? Math.round(processedDifference / hoursDiff) : 0;
  
  console.log('Calculated throughput:', {
    lastProcessed,
    prevProcessed,
    processedDifference,
    hoursDiff,
    throughputPerHour
  });
  
  return throughputPerHour;
}
