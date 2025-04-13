/**
 * Input Chart Component
 * Displays the number of processed files over time
 */

/**
 * Create or update the input chart
 * @param {Array} filteredStatusData - The filtered status data to display
 * @param {Function} getAggregationInterval - Function to determine the appropriate time aggregation
 * @returns {Object} - The created or updated Chart.js instance
 */
export function createInputChart(filteredStatusData, getAggregationInterval) {
  const ctx = document.getElementById('inputChart');
  if (!ctx) return null;
  
  if (filteredStatusData.length === 0) {
    console.warn('No status data available for input chart');
    return null;
  }
  
  // Get the current timeframe dates
  const startDate = new Date(document.getElementById('startDate').value + 'T' + (document.getElementById('startTime').value || '00:00'));
  const endDate = new Date(document.getElementById('endDate').value + 'T' + (document.getElementById('endTime').value || '00:00'));
  
  // Get appropriate aggregation settings based on the timeframe
  const aggregation = getAggregationInterval(startDate, endDate);
  
  // Group data by interval
  const intervalMap = {};
  
  filteredStatusData.forEach(item => {
    if (!item.timestamp) return;
    
    // Extract timestamp and round to appropriate interval
    const timestamp = new Date(item.timestamp);
    const intervalKey = aggregation.roundFn(timestamp).toISOString();
    const displayLabel = aggregation.format(timestamp);
    
    if (!intervalMap[intervalKey]) {
      intervalMap[intervalKey] = {
        displayLabel,
        timestamp,
        count: 0
      };
    }
    
    // Use raw input values if available, otherwise use processed values
    if (item.rawInput !== undefined) {
      intervalMap[intervalKey].count = parseInt(item.rawInput || '0');
    } else {
      intervalMap[intervalKey].count = item.filesProcessed || 0;
    }
  });
  
  console.log('Input chart data:', Object.values(intervalMap));
  
  // Sort intervals and prepare chart data
  const sortedKeys = Object.keys(intervalMap).sort();
  const labels = sortedKeys.map(key => intervalMap[key].displayLabel);
  const data = sortedKeys.map(key => intervalMap[key].count);
  
  // Create or update chart
  try {
    // Check if the chart instance exists and is valid
    if (window.inputChart && typeof window.inputChart.update === 'function') {
      // Update existing chart
      window.inputChart.data.labels = labels;
      window.inputChart.data.datasets[0].data = data;
      window.inputChart.update();
      return window.inputChart;
    } else {
      // If chart exists but is in an invalid state, clean up the canvas
      if (window.inputChart) {
        // Try to destroy if it has a destroy method
        if (typeof window.inputChart.destroy === 'function') {
          window.inputChart.destroy();
        }
        // Reset the chart instance
        window.inputChart = null;
        
        // Clear the canvas
        const canvas = ctx.getContext('2d');
        if (canvas) {
          canvas.clearRect(0, 0, ctx.width, ctx.height);
        }
      }
      
      // Create new chart
      window.inputChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Verarbeitete Dateien',
            data: data,
            backgroundColor: 'rgba(33, 150, 243, 0.2)',
            borderColor: 'rgba(33, 150, 243, 1)',
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
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
      
      return window.inputChart;
    }
  } catch (error) {
    console.warn('Error handling existing chart:', error);
    
    // Create new chart as fallback
    window.inputChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Verarbeitete Dateien',
          data: data,
          backgroundColor: 'rgba(33, 150, 243, 0.2)',
          borderColor: 'rgba(33, 150, 243, 1)',
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
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
    return window.inputChart;
  }
}
