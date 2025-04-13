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
  
  // Group errors by interval and pattern
  const errorTypesByInterval = {};
  const errorTypes = new Set();
  
  filteredPatternData.forEach(entry => {
    if (!entry.timestamp) return;
    
    // Extract timestamp and round to appropriate interval
    const timestamp = new Date(entry.timestamp);
    const intervalKey = aggregation.roundFn(timestamp).toISOString();
    const displayLabel = aggregation.format(timestamp);
    const pattern = entry.pattern;
    
    if (!errorTypesByInterval[intervalKey]) {
      errorTypesByInterval[intervalKey] = {
        displayLabel: displayLabel,
        patterns: {}
      };
    }
    
    if (!errorTypesByInterval[intervalKey].patterns[pattern]) {
      errorTypesByInterval[intervalKey].patterns[pattern] = 0;
    }
    
    errorTypesByInterval[intervalKey].patterns[pattern]++;
    errorTypes.add(pattern);
  });
  
  // Prepare data for Chart.js
  const sortedKeys = Object.keys(errorTypesByInterval).sort();
  const labels = sortedKeys.map(key => errorTypesByInterval[key].displayLabel);
  
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
    default: xAxisLabel = 'Zeitraum';
  }
  
  // Create chart
  const ctx = document.getElementById('errorStackedLine');
  if (!ctx) {
    console.warn('Error stacked line chart container not found');
    return null;
  }
  
  try {
    // Check if the chart instance exists and is valid
    if (window.errorStackedLineChart && typeof window.errorStackedLineChart.update === 'function') {
      // Update existing chart
      window.errorStackedLineChart.data.labels = labels;
      window.errorStackedLineChart.data.datasets = datasets;
      window.errorStackedLineChart.options.scales.x.title.text = `${xAxisLabel} (${timeframeText})`;
      window.errorStackedLineChart.options.plugins.title.text = `Fehlertypen-Verlauf (${timeframeText})`;
      window.errorStackedLineChart.update();
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
    }
  } catch (error) {
    console.warn('Error handling existing chart:', error);
    window.errorStackedLineChart = null;
  }
  
  window.errorStackedLineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          stacked: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Anzahl der Fehler'
          }
        },
        x: {
          stacked: true,
          title: {
            display: true,
            text: `${xAxisLabel} (${timeframeText})`
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: `Fehlertypen-Verlauf (${timeframeText})`,
          font: {
            size: 16
          }
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
    }
  });
  
  return window.errorStackedLineChart;
}
