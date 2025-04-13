/**
 * Error Trend Chart Component
 * Displays the trend of different error types over time
 */

/**
 * Create or update the error trend chart
 * @param {Array} filteredErrorData - The filtered error data to display
 * @param {Array} knownErrorPatterns - Known error patterns for categorization
 * @param {Function} formatDate - Function to format dates consistently
 * @param {Function} getChartColor - Function to get chart colors
 * @returns {Object} - The created or updated Chart.js instance
 */
export function createErrorTrendChart(filteredErrorData, knownErrorPatterns, formatDate, getChartColor) {
  const ctx = document.getElementById('errorTrendChart');
  if (!ctx) return null;
  
  console.log('Creating error trend chart with', filteredErrorData.length, 'errors');
  
  // Use hardcoded patterns if we don't have any error types
  let errorPatterns = knownErrorPatterns;
  if (!errorPatterns || errorPatterns.length === 0) {
    errorPatterns = [
      "Timeout", 
      "Zeitüberschreitung", 
      "Verbindung vom peer", 
      "multiple Rows in singleton select", 
      "deadlock", 
      "lock conflict on no wait transaction",
      "nicht definiert"
    ];
    console.log('Using hardcoded error patterns for chart:', errorPatterns);
  }
  
  // Group errors by type and date
  const errorTypes = new Set();
  const dateMap = new Map();
  
  // Categorize errors by message content if type is unknown
  filteredErrorData.forEach(error => {
    const date = new Date(error.timestamp);
    const dateStr = formatDate(date);
    
    // Get the error message
    const message = error.message || '';
    
    // Determine error type - use existing type or categorize by message
    let type = error.type;
    if (!type || type === 'unknown') {
      // Try to match against known patterns
      const matchedPattern = errorPatterns.find(pattern => 
        message.toLowerCase().includes(pattern.toLowerCase())
      );
      
      type = matchedPattern || 'Unbekannt';
    }
    
    // Add to set of error types
    errorTypes.add(type);
    
    // Add to date map
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date, types: {} });
    }
    
    const entry = dateMap.get(dateStr);
    if (!entry.types[type]) {
      entry.types[type] = 0;
    }
    
    entry.types[type]++;
  });
  
  console.log('Error types for chart:', Array.from(errorTypes));
  
  // Sort dates
  const sortedDates = Array.from(dateMap.values()).sort((a, b) => a.date - b.date);
  const labels = sortedDates.map(item => formatDate(item.date));
  
  // Create datasets for each error type
  const datasets = Array.from(errorTypes).map((type, index) => {
    const data = sortedDates.map(item => item.types[type] || 0);
    
    return {
      label: type,
      data: data,
      backgroundColor: getChartColor(index, 0.7),
      borderColor: getChartColor(index, 1),
      borderWidth: 2
    };
  });
  
  // Create or update chart
  try {
    // Check if the chart instance exists and is valid
    if (window.errorTrendChart && typeof window.errorTrendChart.update === 'function') {
      // Update existing chart
      window.errorTrendChart.data.labels = labels;
      window.errorTrendChart.data.datasets = datasets;
      window.errorTrendChart.update();
      return window.errorTrendChart;
    } else {
      // If chart exists but is in an invalid state, clean up the canvas
      if (window.errorTrendChart) {
        // Try to destroy if it has a destroy method
        if (typeof window.errorTrendChart.destroy === 'function') {
          window.errorTrendChart.destroy();
        }
        // Reset the chart instance
        window.errorTrendChart = null;
        
        // Clear the canvas
        const canvas = ctx.getContext('2d');
        if (canvas) {
          canvas.clearRect(0, 0, ctx.width, ctx.height);
        }
      }
      
      // Create new chart
      window.errorTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true
            },
            y: {
              stacked: true,
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
      return window.errorTrendChart;
    }
  } catch (error) {
    console.warn('Error handling existing chart:', error);
    window.errorTrendChart = null;
    
    // Create new chart as fallback
    window.errorTrendChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
    return window.errorTrendChart;
  }
}
