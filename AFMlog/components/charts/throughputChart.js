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
  
  // Calculate the exact timeframe duration
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const diffHours = diffMs / (1000 * 60 * 60);
  
  // Only force hourly aggregation when the timeframe is close to exactly 1 day
  // This preserves sub-hour timeframes for shorter ranges
  if (diffDays > 0.95 && diffDays <= 1.1) {
    console.log('Forcing hourly aggregation for throughput chart (~1-day timeframe)');
    aggregation.interval = 'hour';
    aggregation.roundFn = (date) => {
      const rounded = new Date(date);
      rounded.setMinutes(0, 0, 0);
      return rounded;
    };
    aggregation.format = (date) => {
      return date.getHours() + ':00';
    };
  }
  // Add a 5-minute-level aggregation for short timeframes (less than 6 hours)
  else if (diffHours < 6 && diffMs > 0) {
    console.log('Using 5-minute-level aggregation for throughput chart (short timeframe)');
    aggregation.interval = '5min';
    aggregation.roundFn = (date) => {
      const rounded = new Date(date);
      const minutes = rounded.getMinutes();
      // Round to the nearest 5 minutes
      rounded.setMinutes(Math.floor(minutes / 5) * 5, 0, 0);
      return rounded;
    };
    aggregation.format = (date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    };
  }
  
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
  
  // Calculate safe max value for axis scaling
  const maxValue = data.length > 0 ? Math.max(...data.filter(val => !isNaN(val))) : 0;
  const suggestedMax = maxValue > 0 ? maxValue * 1.1 : 100;
  
  // Define common chart options to ensure consistency
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
      easing: 'easeOutQuad'
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: suggestedMax,
        grace: '5%',
        ticks: {
          callback: function(value) {
            return value + ' Dateien/h';
          }
        },
        title: {
          display: true,
          text: 'Durchsatz (Dateien/Stunde)'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    }
  };
  
  // Create or update chart
  try {
    // Check if the chart instance exists and is valid
    if (window.throughputChart && typeof window.throughputChart.update === 'function') {
      // Update existing chart
      window.throughputChart.data.labels = labels;
      window.throughputChart.data.datasets[0].data = data;
      
      // Force y-axis recalculation based on new data
      window.throughputChart.options.scales.y.suggestedMax = suggestedMax;
      
      // Force a complete redraw with animation
      window.throughputChart.update({
        duration: 300,
        easing: 'easeOutQuad',
        reset: false // Don't reset animations in progress
      });
      
      console.log('Updated throughput chart with new axis settings:', {
        labels: labels.length,
        dataPoints: data.length,
        maxValue,
        suggestedMax
      });
      
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
      
      // Create new chart with a slight delay to ensure DOM is ready
      setTimeout(() => {
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
          options: chartOptions
        });
        
        // Force an immediate update to ensure axes are properly initialized
        if (window.throughputChart) {
          window.throughputChart.update();
        }
        
        console.log('Created new throughput chart with axis settings:', {
          labels: labels.length,
          dataPoints: data.length,
          maxValue,
          suggestedMax
        });
      }, 50);
      
      // Return a placeholder until the real chart is created
      return {};
    }
  } catch (error) {
    console.warn('Error handling existing chart:', error);
    window.throughputChart = null;
    
    // Create new chart as fallback with a slight delay
    setTimeout(() => {
      try {
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
          options: chartOptions
        });
        
        // Force an immediate update to ensure axes are properly initialized
        if (window.throughputChart) {
          window.throughputChart.update();
        }
      } catch (innerError) {
        console.error('Failed to create fallback chart:', innerError);
      }
    }, 50);
    
    return {};
  }
}
