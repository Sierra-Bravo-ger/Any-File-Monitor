/**
 * Error Stacked Line Chart Component
 * Displays the distribution of error types over time with stacked lines
 */

/**
 * Create or update the error stacked line chart
 * @param {Array} filteredPatternData - The filtered pattern data to display
 * @param {Function} getAggregationInterval - Function to determine the appropriate time aggregation
 * @returns {Object} - The created or updated Chart.js instance
 */
export function createErrorStackedLine(filteredPatternData, getAggregationInterval) {
  if (filteredPatternData.length === 0) return null;
  
  // Get the timeframe text directly for consistency
  const timeframeText = document.getElementById('timeframeDisplay').textContent;
  
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
    console.log('Forcing hourly aggregation for ~1-day timeframe');
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
    console.log('Using 5-minute-level aggregation for short timeframe');
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
  
  console.log(`Creating error stacked line chart with timeframe: ${timeframeText}`, {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    aggregationInterval: aggregation.interval,
    diffDays: diffDays,
    diffHours: diffHours,
    dataPoints: filteredPatternData.length
  });
  
  // Group errors by interval and pattern
  const errorTypesByInterval = {};
  const errorTypes = new Set();
  
  // First, create all possible intervals in the date range to ensure we have all data points
  let currentDate = new Date(startDate);
  let intervalCount = 0;
  const maxIntervals = 1000; // Safety limit to prevent infinite loops
  
  while (currentDate <= endDate && intervalCount < maxIntervals) {
    intervalCount++;
    const intervalKey = aggregation.roundFn(currentDate).toISOString();
    const displayLabel = aggregation.format(new Date(intervalKey));
    
    if (!errorTypesByInterval[intervalKey]) {
      errorTypesByInterval[intervalKey] = {
        displayLabel: displayLabel,
        patterns: {}
      };
    }
    
    // Move to next interval based on aggregation type
    switch (aggregation.interval) {
      case 'hour':
        currentDate.setHours(currentDate.getHours() + 1);
        break;
      case 'day':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'week':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'month':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case '5min':
        currentDate.setMinutes(currentDate.getMinutes() + 5);
        break;
      default:
        currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  // Now populate with actual data
  filteredPatternData.forEach(entry => {
    if (!entry.timestamp) return;
    
    // Extract timestamp and round to appropriate interval
    const timestamp = new Date(entry.timestamp);
    const intervalKey = aggregation.roundFn(timestamp).toISOString();
    const pattern = entry.pattern;
    
    // Skip if the interval is outside our range
    if (!errorTypesByInterval[intervalKey]) return;
    
    if (!errorTypesByInterval[intervalKey].patterns[pattern]) {
      errorTypesByInterval[intervalKey].patterns[pattern] = 0;
    }
    
    errorTypesByInterval[intervalKey].patterns[pattern]++;
    errorTypes.add(pattern);
  });
  
  // Prepare data for Chart.js
  const sortedKeys = Object.keys(errorTypesByInterval).sort();
  const labels = sortedKeys.map(key => errorTypesByInterval[key].displayLabel);
  
  // Log the number of intervals created
  console.log(`Error stacked line chart intervals:`, {
    totalIntervals: sortedKeys.length,
    firstInterval: sortedKeys[0],
    lastInterval: sortedKeys[sortedKeys.length - 1],
    labels: labels
  });
  
  // Colors for different error types
  const colors = [
    'rgba(255, 99, 132, 1)',
    'rgba(54, 162, 235, 1)',
    'rgba(255, 206, 86, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(153, 102, 255, 1)',
    'rgba(255, 159, 64, 1)'
  ];
  
  // Create datasets
  const datasets = [];
  
  // Create a dataset for each error type
  Array.from(errorTypes).forEach((type, index) => {
    const data = sortedKeys.map(key => errorTypesByInterval[key].patterns[type] || 0);
    
    datasets.push({
      type: 'line',
      label: type,
      data: data,
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length].replace('1)', '0.2)'),
      tension: 0.3,
      fill: true,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: colors[index % colors.length],
      pointBorderColor: '#fff',
      pointBorderWidth: 1
    });
  });
  
  // Determine appropriate axis label based on the aggregation interval
  let xAxisLabel = '';
  switch(aggregation.interval) {
    case 'hour': xAxisLabel = 'Stunde'; break;
    case 'day': xAxisLabel = 'Tag'; break;
    case 'week': xAxisLabel = 'Woche'; break;
    case '5min': xAxisLabel = '5 Minuten'; break;
    default: xAxisLabel = 'Zeitraum';
  }
  
  // Create chart
  const ctx = document.getElementById('errorStackedLine');
  if (!ctx) {
    console.warn('Error stacked line chart container not found');
    return null;
  }
  
  // Calculate safe max value for axis scaling
  let maxValue = 0;
  datasets.forEach(dataset => {
    const datasetMax = Math.max(...dataset.data.filter(val => !isNaN(val)));
    maxValue = Math.max(maxValue, datasetMax);
  });
  
  const suggestedMax = maxValue > 0 ? maxValue * 1.1 : 5;
  
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
        stacked: true,
        beginAtZero: true,
        suggestedMax: suggestedMax,
        grace: '5%',
        title: {
          display: true,
          text: 'Anzahl der Fehler'
        }
      },
      x: {
        stacked: true,
        title: {
          display: true,
          text: `${timeframeText}`,
          font: {
            weight: 'bold'
          }
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      }
    },
    plugins: {
      title: {
        display: false, // Hide the top title to save vertical space
      },
      tooltip: {
        mode: 'index',
        callbacks: {
          title: function(context) {
            return context[0].label;
          }
        }
      }
    }
  };
  
  try {
    // Check if the chart instance exists and is valid
    if (window.errorStackedLineChart && typeof window.errorStackedLineChart.update === 'function') {
      // Update existing chart
      window.errorStackedLineChart.data.labels = labels;
      window.errorStackedLineChart.data.datasets = datasets;
      window.errorStackedLineChart.options.scales.x.title.text = `${timeframeText}`;
      // Title is now hidden
      
      // Force y-axis recalculation based on new data
      window.errorStackedLineChart.options.scales.y.suggestedMax = suggestedMax;
      
      // Force a complete redraw with animation
      window.errorStackedLineChart.update({
        duration: 300,
        easing: 'easeOutQuad',
        reset: false // Don't reset animations in progress
      });
      
      console.log('Updated error stacked line chart with new axis settings:', {
        labels: labels.length,
        datasets: datasets.length,
        maxValue,
        suggestedMax
      });
      
      return window.errorStackedLineChart;
    } else {
      // If chart exists but is in an invalid state, clean up the canvas
      if (window.errorStackedLineChart) {
        // Try to destroy if it has a destroy method
        if (typeof window.errorStackedLineChart.destroy === 'function') {
          window.errorStackedLineChart.destroy();
        }
        // Reset the chart instance
        window.errorStackedLineChart = null;
        
        // Clear the canvas
        const canvas = ctx.getContext('2d');
        if (canvas) {
          canvas.clearRect(0, 0, ctx.width, ctx.height);
        }
      }
      
      // Create new chart with a slight delay to ensure DOM is ready
      setTimeout(() => {
        window.errorStackedLineChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: datasets
          },
          options: chartOptions
        });
        
        // Force an immediate update to ensure axes are properly initialized
        if (window.errorStackedLineChart) {
          window.errorStackedLineChart.update();
        }
        
        console.log('Created new error stacked line chart with axis settings:', {
          labels: labels.length,
          datasets: datasets.length,
          maxValue,
          suggestedMax
        });
      }, 50);
      
      // Return a placeholder until the real chart is created
      return {};
    }
  } catch (error) {
    console.warn('Error handling existing chart:', error);
    window.errorStackedLineChart = null;
    
    // Create new chart as fallback with a slight delay
    setTimeout(() => {
      try {
        window.errorStackedLineChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: datasets
          },
          options: chartOptions
        });
        
        // Force an immediate update to ensure axes are properly initialized
        if (window.errorStackedLineChart) {
          window.errorStackedLineChart.update();
        }
      } catch (innerError) {
        console.error('Failed to create fallback chart:', innerError);
      }
    }, 50);
    
    return {};
  }
}
