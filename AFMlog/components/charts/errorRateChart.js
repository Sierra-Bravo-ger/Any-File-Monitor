/**
 * Error Rate Chart Component
 * Displays the error rate (percentage of files that resulted in errors) over time
 */

/**
 * Create or update the error rate chart
 * @param {Array} filteredStatusData - The filtered status data to display
 * @param {Array} filteredErrorData - The filtered error data to display
 * @param {Function} getAggregationInterval - Function to determine the appropriate time aggregation
 * @returns {Object} - The created or updated Chart.js instance
 */
export function createErrorRateChart(filteredStatusData, filteredErrorData, getAggregationInterval) {
  const ctx = document.getElementById('errorRateChart');
  if (!ctx) return null;
  
  if (filteredStatusData.length < 2) {
    console.warn('Not enough status data available for error rate chart');
    return null;
  }
  
  // Get the current timeframe dates
  const startDate = new Date(document.getElementById('startDate').value + 'T' + (document.getElementById('startTime').value || '00:00'));
  const endDate = new Date(document.getElementById('endDate').value + 'T' + (document.getElementById('endTime').value || '00:00'));
  
  // Get appropriate aggregation settings based on the timeframe
  const aggregation = getAggregationInterval(startDate, endDate);
  
  // Sort status data by timestamp
  const sortedStatusData = [...filteredStatusData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  // Group data by interval
  const intervalMap = {};
  
  // Process status data to calculate processed files for each interval
  for (let i = 1; i < sortedStatusData.length; i++) {
    const currentItem = sortedStatusData[i];
    const previousItem = sortedStatusData[i-1];
    
    if (!currentItem.timestamp || !previousItem.timestamp) continue;
    
    const currentTimestamp = new Date(currentItem.timestamp);
    const intervalKey = aggregation.roundFn(currentTimestamp).toISOString();
    const displayLabel = aggregation.format(currentTimestamp);
    
    // Calculate processed files for this interval using the same logic as calculateErrorRate
    let archiveChange, errorChange;
    
    if (currentItem.rawArchiv !== undefined && previousItem.rawArchiv !== undefined) {
      // Use raw values if available
      archiveChange = parseInt(currentItem.rawArchiv || '0') - parseInt(previousItem.rawArchiv || '0');
      errorChange = parseInt(currentItem.rawError || '0') - parseInt(previousItem.rawError || '0');
    } else {
      // Fall back to processed values
      archiveChange = (currentItem.throughput || 0) - (previousItem.throughput || 0);
      errorChange = (currentItem.errorCount || 0) - (previousItem.errorCount || 0);
    }
    
    // The number of error files is the positive change in the error directory
    const errorFiles = Math.max(0, errorChange);
    
    // The sum of positive changes represents the processed files
    const processedFiles = Math.max(0, archiveChange) + errorFiles;
    
    if (!intervalMap[intervalKey]) {
      intervalMap[intervalKey] = {
        displayLabel,
        timestamp: currentTimestamp,
        files: 0,
        errors: 0
      };
    }
    
    intervalMap[intervalKey].files += processedFiles;
  }
  
  // Count errors by interval
  filteredErrorData.forEach(error => {
    if (!error.timestamp) return;
    
    const timestamp = new Date(error.timestamp);
    const intervalKey = aggregation.roundFn(timestamp).toISOString();
    
    if (intervalMap[intervalKey]) {
      intervalMap[intervalKey].errors++;
    } else {
      // If we don't have status data for this interval, create an entry
      intervalMap[intervalKey] = {
        displayLabel: aggregation.format(timestamp),
        timestamp: timestamp,
        files: 0,
        errors: 1
      };
    }
  });
  
  // Calculate error rate for each interval
  Object.values(intervalMap).forEach(entry => {
    // If no files processed, use the error count to avoid division by zero
    if (entry.files === 0) {
      entry.files = entry.errors > 0 ? entry.errors : 1;
    }
    
    // If all processed files are errors, then we have a 100% error rate
    if (entry.files > 0 && entry.files === entry.errors) {
      entry.errorRate = 100;
    } else {
      // Calculate error rate as a percentage
      entry.errorRate = (entry.errors / entry.files) * 100;
    }
  });
  
  console.log('Error rate chart data:', Object.values(intervalMap));
  
  // Sort intervals and prepare chart data
  const sortedKeys = Object.keys(intervalMap).sort();
  const labels = sortedKeys.map(key => intervalMap[key].displayLabel);
  const data = sortedKeys.map(key => intervalMap[key].errorRate);
  
  // Create or update chart
  try {
    // Check if the chart instance exists and is valid
    if (window.errorRateChart && typeof window.errorRateChart.update === 'function') {
      // Update existing chart
      window.errorRateChart.data.labels = labels;
      window.errorRateChart.data.datasets[0].data = data;
      window.errorRateChart.update();
      return window.errorRateChart;
    } else {
      // If chart exists but is in an invalid state, clean up the canvas
      if (window.errorRateChart) {
        // Try to destroy if it has a destroy method
        if (typeof window.errorRateChart.destroy === 'function') {
          window.errorRateChart.destroy();
        }
        // Reset the chart instance
        window.errorRateChart = null;
        
        // Clear the canvas
        const canvas = ctx.getContext('2d');
        if (canvas) {
          canvas.clearRect(0, 0, ctx.width, ctx.height);
        }
      }
      
      // Create new chart
      window.errorRateChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Fehlerrate (%)',
            data: data,
            backgroundColor: 'rgba(255, 152, 0, 0.2)',
            borderColor: 'rgba(255, 152, 0, 1)',
            borderWidth: 2,
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              // Use adaptive scaling instead of fixed max
              suggestedMax: Math.min(100, Math.max(...data) * 1.1), // 10% headroom above max value
              // Add grace percentage for better visualization
              grace: '5%',
              // Use more appropriate ticks for the data range
              ticks: {
                // Use precision based on data range
                precision: Math.max(...data) < 1 ? 2 : Math.max(...data) < 10 ? 1 : 0,
                // Use callback to format ticks with % symbol
                callback: function(value) {
                  return value + '%';
                }
              },
              title: {
                display: true,
                text: 'Fehlerrate (%)'
              }
            }
          }
        }
      });
      return window.errorRateChart;
    }
  } catch (error) {
    console.warn('Error handling existing chart:', error);
    window.errorRateChart = null;
    
    // Create new chart as fallback
    window.errorRateChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Fehlerrate (%)',
          data: data,
          backgroundColor: 'rgba(255, 152, 0, 0.2)',
          borderColor: 'rgba(255, 152, 0, 1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            // Use adaptive scaling instead of fixed max
            suggestedMax: Math.min(100, Math.max(...data) * 1.1), // 10% headroom above max value
            // Add grace percentage for better visualization
            grace: '5%',
            // Use more appropriate ticks for the data range
            ticks: {
              // Use precision based on data range
              precision: Math.max(...data) < 1 ? 2 : Math.max(...data) < 10 ? 1 : 0,
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
    return window.errorRateChart;
  }
}
