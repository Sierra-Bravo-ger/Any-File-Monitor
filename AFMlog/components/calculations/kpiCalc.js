/**
 * KPI Calculation Module
 * Contains all business logic for calculating KPIs
 */

/**
 * Calculate all KPIs based on filtered data
 * @param {Object} data - Data needed for calculations
 * @param {Array} data.filteredStatusData - Filtered status data
 * @param {Array} data.filteredErrorData - Filtered error data
 * @param {Array} data.filteredPatternData - Filtered pattern data
 * @param {Array} data.errorData - Complete error data
 * @param {Date} data.startDate - Start date for filtering
 * @param {Date} data.endDate - End date for filtering
 * @returns {Object} - Calculated KPIs
 */
export function calculateKPIs(data) {
  const {
    filteredStatusData = [],
    filteredErrorData = [],
    filteredPatternData = [],
    errorData = [],
    startDate,
    endDate
  } = data;

  // Get the last row of status data to get the current totals
  let totalFiles = 0;
  let totalInput = 0;
  let totalArchive = 0;
  let errorCount = 0;
  
  if (filteredStatusData && filteredStatusData.length > 0) {
    // Sort by timestamp to get the most recent entry
    const sortedData = [...filteredStatusData].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Get the last entry which has the current totals
    const lastEntry = sortedData[0];
    console.log('Last status entry for KPI calculation:', lastEntry);
    
    // Try accessing values both from our mapped fields and directly from raw fields
    if (lastEntry.rawInput !== undefined && lastEntry.rawArchiv !== undefined && lastEntry.rawError !== undefined) {
      // Use the raw values we stored during processing
      totalInput = parseInt(lastEntry.rawInput || '0');
      totalArchive = parseInt(lastEntry.rawArchiv || '0');
      errorCount = parseInt(lastEntry.rawError || '0');
      console.log('Using raw values for KPI calculation:', { totalInput, totalArchive, errorCount });
    } else {
      // Fall back to using the processed values
      totalInput = lastEntry.filesProcessed || 0;
      totalArchive = lastEntry.throughput || 0;
      errorCount = lastEntry.errorCount || 0;
      console.log('Using processed values for KPI calculation:', { totalInput, totalArchive, errorCount });
    }
    
    // Total files is the sum of these values
    totalFiles = totalInput + totalArchive + errorCount;
    console.log('Calculated totalFiles:', totalFiles);
  }
  
  // Store individual file counts for display
  const inputFiles = totalInput;
  const archiveFiles = totalArchive;
  const errorFiles = errorCount;
  // Calculate error rate
  const errorRateValue = calculateErrorRate(filteredStatusData, filteredErrorData);
  const errorRate = errorRateValue.toFixed(1) + '%';
  const totalErrors = filteredErrorData.length;
  
  // Calculate throughput
  let avgThroughput = calculateThroughput(filteredStatusData);
  
  // Calculate pattern matches
  const patternMatches = filteredPatternData ? filteredPatternData.length : 0;
  
  // Determine if processing is active based on recent status entries
  let processingActive = false;
  if (filteredStatusData.length > 0) {
    // Check if the most recent status entry is within the last hour
    const latestStatus = filteredStatusData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    processingActive = new Date(latestStatus.timestamp) > oneHourAgo;
  }
  
  // Determine connection status
  const connected = processingActive; // Simplified - assume connected if processing is active
  
  // Calculate error intensity (errors per hour)
  let errorIntensity = '0';
  if (filteredErrorData.length > 0 && startDate && endDate) {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const hours = Math.max(0.01, (endTime - startTime) / (1000 * 60 * 60));
    errorIntensity = (filteredErrorData.length / hours).toFixed(1);
  }
  
  // Calculate error trend (percentage change from previous period)
  let errorTrend = '0%';
  if (filteredErrorData.length >= 0 && startDate && endDate) {
    const currentPeriodLength = endDate.getTime() - startDate.getTime();
    const prevPeriodStart = new Date(startDate.getTime() - currentPeriodLength);
    const prevPeriodEnd = new Date(startDate.getTime());
    
    const currentErrors = filteredErrorData.length;
    const prevErrors = errorData.filter(entry => {
      if (!entry.timestamp) return false;
      const timestamp = new Date(entry.timestamp).getTime();
      return timestamp >= prevPeriodStart.getTime() && timestamp <= prevPeriodEnd.getTime();
    }).length;
    
    if (prevErrors === 0 && currentErrors === 0) {
      errorTrend = '0%';
    } else if (prevErrors === 0) {
      errorTrend = currentErrors > 0 ? '+∞%' : '0%';
    } else {
      const change = ((currentErrors - prevErrors) / prevErrors) * 100;
      const sign = change > 0 ? '+' : '';
      errorTrend = `${sign}${change.toFixed(1)}%`;
    }
  }
  
  // Calculate archive to error ratio
  let archiveToErrorRatio = 'N/A';
  if (filteredStatusData.length > 0) {
    const lastEntry = filteredStatusData[filteredStatusData.length - 1];
    const archiveCount = parseInt(lastEntry.throughput || 0);
    const errorCount = parseInt(lastEntry.errorCount || 0);
    
    if (errorCount === 0 && archiveCount === 0) {
      archiveToErrorRatio = 'N/A';
    } else if (errorCount === 0) {
      archiveToErrorRatio = '∞';
    } else if (archiveCount === 0) {
      archiveToErrorRatio = '0:1';
    } else {
      // Use full numbers instead of simplified ratios
      archiveToErrorRatio = `${archiveCount}:${errorCount}`;
    }
  }
  
  return {
    totalFiles,
    inputFiles,
    archiveFiles,
    errorFiles,
    errorRate,
    errorRateValue,
    totalErrors,
    throughput: avgThroughput,
    avgThroughput,
    patternMatches,
    processingActive,
    connected,
    errorIntensity,
    errorTrend,
    statusData: filteredStatusData,
    healthScore: calculateHealthScore({
      errorRateValue,
      errorIntensity: parseFloat(errorIntensity),
      throughput: avgThroughput,
      processingActive,
      connected
    }),
    archiveToErrorRatio
  };
}

/**
 * Calculate error rate based on filtered data
 * @param {Array} statusData - Filtered status data
 * @param {Array} errorData - Filtered error data
 * @returns {number} - Error rate percentage
 */
export function calculateErrorRate(statusData, errorData) {
  // Check if enough data is available
  if (!statusData || statusData.length < 1) return 0;
    
  // Calculate the actual processed files during the time period
  let processedFiles = 0;
  let errorFiles = 0;
  
  if (statusData.length > 1) {
    // Sort data by timestamp to ensure we're using the correct order
    const sortedData = [...statusData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
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
    const singleEntry = statusData[0];
    
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
  const errorCount = errorData ? errorData.length : 0;
  
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
  
  // Return with one decimal place for consistency
  return parseFloat(errorRateValue.toFixed(1));
}

/**
 * Calculate throughput based on filtered data
 * @param {Array} statusData - Filtered status data
 * @returns {number} - Throughput (files per hour)
 */
export function calculateThroughput(statusData) {
  if (!statusData || statusData.length < 2) {
    return 0;
  }

  // Sort data by timestamp
  const sortedData = [...statusData].sort((a, b) => {
    return new Date(a.timestamp) - new Date(b.timestamp);
  });
  
  // Get first and last entries
  const firstEntry = sortedData[0];
  const lastEntry = sortedData[sortedData.length - 1];
  
  // Get timestamps
  const startTime = new Date(firstEntry.timestamp).getTime();
  const endTime = new Date(lastEntry.timestamp).getTime();
  
  // Calculate time difference in hours
  const hours = (endTime - startTime) / (1000 * 60 * 60);
  
  // If the time difference is too small, return 0
  if (hours < 0.01) {
    return 0;
  }
  
  // Get the difference in processed files
  let startFiles = 0;
  let endFiles = 0;
  
  // Try to get the values from various possible fields
  if (firstEntry.throughput !== undefined) {
    startFiles = parseInt(firstEntry.throughput || 0);
  } else if (firstEntry.rawArchiv !== undefined) {
    startFiles = parseInt(firstEntry.rawArchiv || 0);
  }
  
  if (lastEntry.throughput !== undefined) {
    endFiles = parseInt(lastEntry.throughput || 0);
  } else if (lastEntry.rawArchiv !== undefined) {
    endFiles = parseInt(lastEntry.rawArchiv || 0);
  }
  
  // Calculate throughput
  const filesDifference = endFiles - startFiles;
  const throughput = filesDifference / hours;
  
  // Return with one decimal place
  return parseFloat(throughput.toFixed(1));
}

/**
 * Calculate health score based on KPIs
 * @param {Object} kpis - Key performance indicators
 * @returns {number} - Health score (0-100)
 */
export function calculateHealthScore(kpis) {
  // Base score starts at 100
  let score = 100;
  
  // Safely handle potentially undefined values
  const errorRateValue = kpis.errorRateValue || 0;
  const throughput = kpis.throughput || kpis.avgThroughput || 0;
  const errorIntensity = parseFloat(kpis.errorIntensity || 0);
  const errorTrend = kpis.errorTrend ? parseFloat(kpis.errorTrend.replace(/[+%]/g, '')) : 0;
  const archiveToErrorRatio = kpis.archiveToErrorRatio || 'N/A';
  
  // Deduct for high error rate (up to -30)
  score -= Math.min(30, errorRateValue);
  
  // Deduct for high error intensity (up to -20)
  score -= Math.min(20, errorIntensity);
  
  // Deduct for negative error trend (up to -15)
  if (errorTrend > 0) {
    score -= Math.min(15, errorTrend / 10);
  }
  
  // Deduct for low throughput (up to -20)
  const throughputFactor = Math.max(0, 1 - (throughput / 100));
  score -= throughputFactor * 20;
  
  // Deduct for poor archive to error ratio (up to -15)
  if (archiveToErrorRatio !== 'N/A' && archiveToErrorRatio !== '∞') {
    try {
      const [archiveCount, errorCount] = archiveToErrorRatio.split(':').map(Number);
      if (!isNaN(archiveCount) && !isNaN(errorCount) && errorCount > 0) {
        const ratio = archiveCount / errorCount;
        if (ratio < 10) {
          score -= Math.min(15, (10 - ratio) * 1.5);
        }
      }
    } catch (e) {
      console.warn('Error parsing archive to error ratio:', e);
    }
  }
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get status for error rate
 * @param {number} errorRate - Error rate percentage
 * @returns {string} - Status (ok, warning, error)
 */
export function getErrorRateStatus(errorRate) {
  if (errorRate > 20) {
    return 'error';
  } else if (errorRate > 10) {
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
export function getThroughputStatus(throughput) {
  if (throughput < 30) {
    return 'error';
  } else if (throughput < 60) {
    return 'warning';
  } else {
    return 'ok';
  }
}

/**
 * Get status for health score
 * @param {number} score - Health score (0-100)
 * @returns {string} - Status (ok, warning, error)
 */
export function getHealthScoreStatus(score) {
  if (score < 60) {
    return 'error';
  } else if (score < 80) {
    return 'warning';
  } else {
    return 'ok';
  }
}
