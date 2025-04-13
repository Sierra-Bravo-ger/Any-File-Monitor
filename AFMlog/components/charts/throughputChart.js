/**
 * Throughput Chart Component
 * Displays the processing throughput (files per hour) over time
 */

/**
 * Create or update the throughput chart
 * @param {Array} filteredStatusData - The filtered status data to display
 * @param {Function} getAggregationInterval - Function to determine the appropriate time aggregation
 * @returns {Object} - The created or updated Chart.js instance
 */
export function createThroughputChart(filteredStatusData, getAggregationInterval) {
  const ctx = document.getElementById('throughputChart');
  if (!ctx) return null;
  
  if (filteredStatusData.length < 2) {
    console.warn('Not enough status data available for throughput chart');
    return null;
  }
  
  // Get the current timeframe dates
  const startDate = new Date(document.getElementById('startDate').value + 'T' + (document.getElementById('startTime').value || '00:00'));
  const endDate = new Date(document.getElementById('endDate').value + 'T' + (document.getElementById('endTime').value || '00:00'));
  
  // Get appropriate aggregation settings based on the timeframe
  const aggregation = getAggregationInterval(startDate, endDate);
  
  // Sort the status data by timestamp
  const sortedData = [...filteredStatusData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  // Group data by interval
  const intervalMap = {};
  
  // Calculate throughput for each interval
  for (let i = 1; i < sortedData.length; i++) {
    const currentItem = sortedData[i];
    const previousItem = sortedData[i-1];
    
    if (!currentItem.timestamp || !previousItem.timestamp) continue;
    
    const currentTimestamp = new Date(currentItem.timestamp);
    const intervalKey = aggregation.roundFn(currentTimestamp).toISOString();
    const displayLabel = aggregation.format(currentTimestamp);
    
    // Calculate throughput between these two points
    let currentProcessed, previousProcessed;
    
    if (currentItem.rawArchiv !== undefined && previousItem.rawArchiv !== undefined) {
      // Use raw values if available
      currentProcessed = parseInt(currentItem.rawArchiv || '0') + parseInt(currentItem.rawError || '0');
      previousProcessed = parseInt(previousItem.rawArchiv || '0') + parseInt(previousItem.rawError || '0');
    } else {
      // Fall back to processed values
      currentProcessed = (currentItem.throughput || 0) + (currentItem.errorCount || 0);
      previousProcessed = (previousItem.throughput || 0) + (previousItem.errorCount || 0);
    }
    
    // Difference = Number of newly processed files
    const processedDifference = currentProcessed - previousProcessed;
    
    // Calculate time difference in hours
    const currentTime = new Date(currentItem.timestamp);
    const previousTime = new Date(previousItem.timestamp);
    const hoursDiff = (currentTime - previousTime) / (1000 * 60 * 60); // Convert milliseconds to hours
    
    // Throughput per hour (extrapolated if the interval is shorter than an hour)
    const throughputPerHour = hoursDiff > 0 ? Math.round(processedDifference / hoursDiff) : 0;
    
    if (!intervalMap[intervalKey]) {
      intervalMap[intervalKey] = {
        displayLabel,
        timestamp: currentTimestamp,
        totalThroughput: 0,
        count: 0
      };
    }
    
    intervalMap[intervalKey].totalThroughput += throughputPerHour;
    intervalMap[intervalKey].count++;
  }
  
  // Calculate average throughput per interval
  Object.values(intervalMap).forEach(entry => {
    if (entry.count > 0) {
      entry.throughput = Math.round(entry.totalThroughput / entry.count);
    } else {
      entry.throughput = 0;
    }
  });
  
  console.log('Throughput chart data:', Object.values(intervalMap));
  
  // Sort intervals and prepare chart data
  const sortedKeys = Object.keys(intervalMap).sort();
  const labels = sortedKeys.map(key => intervalMap[key].displayLabel);
  const data = sortedKeys.map(key => intervalMap[key].throughput);
  
  // Create or update chart
  try {
    // Check if the chart instance exists and is valid
    if (window.throughputChart && typeof window.throughputChart.update === 'function') {
      // Update existing chart
      window.throughputChart.data.labels = labels;
      window.throughputChart.data.datasets[0].data = data;
      window.throughputChart.update();
      return window.throughputChart;
    } else {
      // If chart exists but is in an invalid state, clean up the canvas
      if (window.throughputChart) {
        // Try to destroy if it has a destroy method
        if (typeof window.throughputChart.destroy === 'function') {
          window.throughputChart.destroy();
        }
        // Reset the chart instance
        window.throughputChart = null;
        
        // Clear the canvas
        const canvas = ctx.getContext('2d');
        if (canvas) {
          canvas.clearRect(0, 0, ctx.width, ctx.height);
        }
      }
      
      // Create new chart
      window.throughputChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Durchsatz (Dateien/Stunde)',
            data: data,
            backgroundColor: 'rgba(76, 175, 80, 0.2)',
            borderColor: 'rgba(76, 175, 80, 1)',
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
              beginAtZero: true
            }
          }
        }
      });
      return window.throughputChart;
    }
  } catch (error) {
    console.warn('Error handling existing chart:', error);
    window.throughputChart = null;
    
    // Create new chart as fallback
    window.throughputChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Durchsatz (Dateien/Stunde)',
          data: data,
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          borderColor: 'rgba(76, 175, 80, 1)',
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
            beginAtZero: true
          }
        }
      }
    });
    return window.throughputChart;
  }
}
