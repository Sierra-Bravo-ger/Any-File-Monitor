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
  
  // Calculate the exact timeframe duration
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const diffHours = diffMs / (1000 * 60 * 60);
  
  // Only force hourly aggregation when the timeframe is close to exactly 1 day
  // This preserves sub-hour timeframes for shorter ranges
  if (diffDays > 0.95 && diffDays <= 1.1) {
    console.log('Forcing hourly aggregation for input chart (~1-day timeframe)');
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
    console.log('Using 5-minute-level aggregation for input chart (short timeframe)');
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
  
  // Calculate safe max value for axis scaling
  const maxValue = data.length > 0 ? Math.max(...data.filter(val => !isNaN(val))) : 0;
  const suggestedMax = maxValue > 0 ? maxValue * 1.1 : 10;
  
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
          precision: 0
        },
        title: {
          display: true,
          text: 'Verarbeitete Dateien'
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
    if (window.inputChart && typeof window.inputChart.update === 'function') {
      // Update existing chart
      window.inputChart.data.labels = labels;
      window.inputChart.data.datasets[0].data = data;
      
      // Force y-axis recalculation based on new data
      window.inputChart.options.scales.y.suggestedMax = suggestedMax;
      
      // Force a complete redraw with animation
      window.inputChart.update({
        duration: 300,
        easing: 'easeOutQuad',
        reset: false // Don't reset animations in progress
      });
      
      console.log('Updated input chart with new axis settings:', {
        labels: labels.length,
        dataPoints: data.length,
        maxValue,
        suggestedMax
      });
      
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
      
      // Create new chart with a slight delay to ensure DOM is ready
      setTimeout(() => {
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
          options: chartOptions
        });
        
        // Force an immediate update to ensure axes are properly initialized
        if (window.inputChart) {
          window.inputChart.update();
        }
        
        console.log('Created new input chart with axis settings:', {
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
    window.inputChart = null;
    
    // Create new chart as fallback with a slight delay
    setTimeout(() => {
      try {
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
          options: chartOptions
        });
        
        // Force an immediate update to ensure axes are properly initialized
        if (window.inputChart) {
          window.inputChart.update();
        }
      } catch (innerError) {
        console.error('Failed to create fallback chart:', innerError);
      }
    }, 50);
    
    return {};
  }
}
