/**
 * Error Type Pie Chart Component
 * Displays the distribution of errors by type in a pie chart
 */

/**
 * Create or update the error type pie chart
 * @param {Array} filteredErrorData - The filtered error data to display
 * @param {Function} getChartColor - Function to get chart colors
 * @returns {Object} - The created or updated Chart.js instance
 */
export function createErrorTypePieChart(filteredErrorData, getChartColor) {
  const ctx = document.getElementById('errorTypePieChart');
  if (!ctx) return null;
  
  // Count errors by type
  const typeCounts = {};
  
  filteredErrorData.forEach(error => {
    const type = error.type || 'Unbekannt';
    
    if (!typeCounts[type]) {
      typeCounts[type] = 0;
    }
    
    typeCounts[type]++;
  });
  
  // Prepare chart data
  const labels = Object.keys(typeCounts);
  const data = Object.values(typeCounts);
  const backgroundColor = labels.map((_, index) => getChartColor(index, 0.7));
  const borderColor = labels.map((_, index) => getChartColor(index, 1));
  
  // Create or update chart
  try {
    // Check if the chart instance exists and is valid
    if (window.errorTypePieChart && typeof window.errorTypePieChart.update === 'function') {
      // Update existing chart
      window.errorTypePieChart.data.labels = labels;
      window.errorTypePieChart.data.datasets[0].data = data;
      window.errorTypePieChart.data.datasets[0].backgroundColor = backgroundColor;
      window.errorTypePieChart.data.datasets[0].borderColor = borderColor;
      window.errorTypePieChart.update();
      return window.errorTypePieChart;
    } else {
      // If chart exists but is in an invalid state, clean up the canvas
      if (window.errorTypePieChart) {
        // Try to destroy if it has a destroy method
        if (typeof window.errorTypePieChart.destroy === 'function') {
          window.errorTypePieChart.destroy();
        }
        // Reset the chart instance
        window.errorTypePieChart = null;
        
        // Clear the canvas
        const canvas = ctx.getContext('2d');
        if (canvas) {
          canvas.clearRect(0, 0, ctx.width, ctx.height);
        }
      }
      
      // Create new chart
      window.errorTypePieChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 15,
                padding: 15
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
      return window.errorTypePieChart;
    }
  } catch (error) {
    console.warn('Error handling existing chart:', error);
    window.errorTypePieChart = null;
    
    // Create new chart as fallback
    window.errorTypePieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
    return window.errorTypePieChart;
  }
}
