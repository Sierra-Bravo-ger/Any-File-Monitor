/**
 * Error by Hour Chart Component
 * Displays the distribution of errors by hour of the day (0-23)
 */

/**
 * Create or update the errors by hour chart
 * @param {Array} filteredErrorData - The filtered error data to display
 * @returns {Object} - The created or updated Chart.js instance
 */
export function createErrorsByHourChart(filteredErrorData) {
  const ctx = document.getElementById('errorsByHourChart');
  if (!ctx) return null;
  
  // Prepare data - count errors by hour
  const hourCounts = Array(24).fill(0);
  
  filteredErrorData.forEach(error => {
    const date = new Date(error.timestamp);
    const hour = date.getHours();
    hourCounts[hour]++;
  });
  
  // Prepare labels (0-23 hours)
  const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  
  // Create or update chart
  try {
    // Check if the chart instance exists and is valid
    if (window.errorsByHourChart && typeof window.errorsByHourChart.update === 'function') {
      // Update existing chart
      window.errorsByHourChart.data.datasets[0].data = hourCounts;
      window.errorsByHourChart.update();
      return window.errorsByHourChart;
    } else {
      // If chart exists but is in an invalid state, clean up the canvas
      if (window.errorsByHourChart) {
        // Try to destroy if it has a destroy method
        if (typeof window.errorsByHourChart.destroy === 'function') {
          window.errorsByHourChart.destroy();
        }
        // Reset the chart instance
        window.errorsByHourChart = null;
        
        // Clear the canvas
        const canvas = ctx.getContext('2d');
        if (canvas) {
          canvas.clearRect(0, 0, ctx.width, ctx.height);
        }
      }
      
      // Create new chart
      window.errorsByHourChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Fehler pro Stunde',
            data: hourCounts,
            backgroundColor: 'rgba(244, 67, 54, 0.7)',
            borderColor: 'rgba(244, 67, 54, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                title: function(tooltipItems) {
                  return tooltipItems[0].label + ' Uhr';
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              },
              title: {
                display: true,
                text: 'Anzahl Fehler'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Stunde'
              }
            }
          }
        }
      });
      
      return window.errorsByHourChart;
    }
  } catch (error) {
    console.warn('Error handling existing chart:', error);
    
    // Create new chart as fallback
    window.errorsByHourChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Fehler pro Stunde',
          data: hourCounts,
          backgroundColor: 'rgba(244, 67, 54, 0.7)',
          borderColor: 'rgba(244, 67, 54, 1)',
          borderWidth: 1
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
    return window.errorsByHourChart;
  }
}
