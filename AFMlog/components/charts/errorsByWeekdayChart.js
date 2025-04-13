/**
 * Errors By Weekday Chart Component
 * Displays the distribution of errors across weekdays
 */

/**
 * Create or update the errors by weekday chart
 * @param {Array} filteredErrorData - The filtered error data to display
 * @returns {Object} - The created or updated Chart.js instance
 */
export function createErrorsByWeekdayChart(filteredErrorData) {
  const ctx = document.getElementById('errorsByWeekdayChart');
  if (!ctx) return null;
  
  // Prepare data - count errors by weekday
  const weekdayCounts = Array(7).fill(0);
  // Rearrange weekday names to start with Monday (German standard)
  const weekdayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  
  filteredErrorData.forEach(error => {
    const date = new Date(error.timestamp);
    let weekday = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    // Convert to Monday-first format (0 = Monday, 6 = Sunday)
    weekday = weekday === 0 ? 6 : weekday - 1;
    weekdayCounts[weekday]++;
  });
  
  // Create or update chart
  try {
    // Check if the chart instance exists and is valid
    if (window.errorsByWeekdayChart && typeof window.errorsByWeekdayChart.update === 'function') {
      // Update existing chart
      window.errorsByWeekdayChart.data.datasets[0].data = weekdayCounts;
      window.errorsByWeekdayChart.update();
      return window.errorsByWeekdayChart;
    } else {
      // If chart exists but is in an invalid state, clean up the canvas
      if (window.errorsByWeekdayChart) {
        // Try to destroy if it has a destroy method
        if (typeof window.errorsByWeekdayChart.destroy === 'function') {
          window.errorsByWeekdayChart.destroy();
        }
        // Reset the chart instance
        window.errorsByWeekdayChart = null;
        
        // Clear the canvas
        const canvas = ctx.getContext('2d');
        if (canvas) {
          canvas.clearRect(0, 0, ctx.width, ctx.height);
        }
      }
      
      // Create new chart
      window.errorsByWeekdayChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: weekdayNames,
          datasets: [{
            label: 'Fehler pro Wochentag',
            data: weekdayCounts,
            backgroundColor: 'rgba(156, 39, 176, 0.7)',
            borderColor: 'rgba(156, 39, 176, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
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
            }
          }
        }
      });
      return window.errorsByWeekdayChart;
    }
  } catch (error) {
    console.warn('Error handling existing chart:', error);
    window.errorsByWeekdayChart = null;
    
    // Create new chart as fallback
    window.errorsByWeekdayChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weekdayNames,
        datasets: [{
          label: 'Fehler pro Wochentag',
          data: weekdayCounts,
          backgroundColor: 'rgba(156, 39, 176, 0.7)',
          borderColor: 'rgba(156, 39, 176, 1)',
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
    return window.errorsByWeekdayChart;
  }
}
