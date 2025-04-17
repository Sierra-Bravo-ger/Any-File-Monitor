/**
 * Error Heatmap Chart
 * Shows error pattern frequency by weekday
 */
import { getChartColor } from '../../scripts/utils.js';

// Store chart instances to properly destroy them before recreating
let errorHeatmapChartInstance = null;

/**
 * Create an error heatmap chart
 * @param {string} canvasId - ID of the canvas element
 * @param {Array} patternData - Processed pattern data
 * @returns {Object} - Chart instance
 */
export function createErrorHeatmapChart(canvasId, patternData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  
  // Destroy existing chart instance if it exists
  if (errorHeatmapChartInstance) {
    errorHeatmapChartInstance.destroy();
    errorHeatmapChartInstance = null;
  }
  
  if (patternData.length === 0) {
    console.log('No pattern data available for heatmap');
    return null;
  }
  
  console.log('Creating heatmap with pattern data:', {
    count: patternData.length,
    sample: patternData.slice(0, 2).map(entry => ({
      timestamp: entry.timestamp,
      pattern: entry.pattern,
      matches: entry.matches
    }))
  });
  
  const ctx = canvas.getContext('2d');
  
  // Generate data for the heatmap
  const { data, labels, maxValue } = generateHeatmapData(patternData);
  
  // Get theme-aware colors
  const isDarkTheme = document.body.classList.contains('dark-theme');
  const textColor = isDarkTheme ? '#ffffff' : '#333333';
  const gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  
  // Create the chart
  errorHeatmapChartInstance = new Chart(ctx, {
    type: 'matrix',
    data: {
      datasets: [{
        label: 'Fehler-Muster nach Wochentag',
        data: data,
        backgroundColor(context) {
          const value = context.dataset.data[context.dataIndex].v;
          // No errors - use very light color
          if (value === 0) {
            return isDarkTheme ? 'rgba(50, 50, 50, 0.5)' : 'rgba(240, 240, 240, 0.5)';
          }
          
          // Use a better color scale - from light to dark
          const intensity = Math.max(0.1, Math.min(value / (maxValue * 0.7), 1));
          return isDarkTheme 
            ? `rgba(255, 99, 132, ${intensity})` 
            : `rgba(220, 57, 88, ${intensity})`;
        },
        borderColor: isDarkTheme ? 'rgba(70, 70, 70, 0.6)' : 'rgba(200, 200, 200, 0.6)',
        borderWidth: 1,
        borderRadius: 2,
        width: 40,
        height: 30
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: textColor
          }
        },
        tooltip: {
          callbacks: {
            title() {
              return 'Fehler-Muster Details';
            },
            label(context) {
              const v = context.dataset.data[context.dataIndex];
              return [
                `Wochentag: ${labels.x[v.x]}`,
                `Stunde: ${labels.y[v.y]}`,
                `Anzahl: ${v.v}`,
                `(${Math.round(v.v / maxValue * 100)}% vom Maximum)`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          type: 'category',
          labels: labels.x,
          grid: {
            display: true,
            color: gridColor
          },
          ticks: {
            color: textColor
          },
          title: {
            display: true,
            text: 'Stunde',
            color: textColor
          }
        },
        y: {
          type: 'category',
          labels: labels.y,
          grid: {
            display: true,
            color: gridColor
          },
          ticks: {
            color: textColor
          },
          title: {
            display: true,
            text: 'Stunde',
            color: textColor
          }
        }
      }
    }
  });
  
  return errorHeatmapChartInstance;
}

/**
 * Generate data for the heatmap
 * @param {Array} patternData - Processed pattern data
 * @returns {Object} - Data and labels for the heatmap
 */
function generateHeatmapData(patternData) {
  // Define weekday labels (x-axis)
  const dayLabels = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  
  // Create expanded labels for all positions
  const expandedDayLabels = [];
  dayLabels.forEach(day => {
    // For each day, add multiple labels (can be empty strings except for the first one)
    expandedDayLabels.push(day);
    for (let i = 1; i < 7; i++) {
      expandedDayLabels.push('');  // Empty labels for additional positions
    }
  });
  
  // Define hour labels (y-axis)
  const hourLabels = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  
  // Initialize counts matrix: days (x) × hours (y)
  const counts = {};
  for (let day = 0; day < 7; day++) {
    counts[day] = {};
    for (let hour = 0; hour < 24; hour++) {
      counts[day][hour] = 0;
    }
  }
  
  // Track valid and invalid dates for debugging
  let validEntries = 0;
  let invalidEntries = 0;
  
  // Count pattern occurrences by day and hour
  patternData.forEach(entry => {
    try {
      // Get hour of day
      const hour = date.getHours();
      
      // Add the matches count to this day/hour combination
      counts[day][hour] += matches;
      
      // Skip entries without timestamp
      if (!timestamp) {
        invalidEntries++;
        return;
      }
      
      // Parse the timestamp into a Date object
      const date = new Date(timestamp);
      
      if (!isNaN(date.getTime())) { // Check if date is valid
        // Get day index (0 = Monday in our display, but 0 = Sunday in JS Date)
        // So we need to convert: Sunday (0) becomes 6, Monday (1) becomes 0, etc.
        const jsDay = date.getDay(); // 0 = Sunday, 1 = Monday, etc. in JS
        const day = jsDay === 0 ? 6 : jsDay - 1; // Convert to 0 = Monday, 6 = Sunday
        
        // Get hour of day
        const hour = date.getHours();
        
        // Add the matches count to this day/hour combination
        counts[day][hour] += matches;
        validEntries++;
      } else {
        invalidEntries++;
        console.warn('Invalid date format:', timestamp);
      }
    } catch (e) {
      invalidEntries++;
      console.warn('Error processing entry:', e);
    }
  });
  
  console.log(`Processed ${validEntries} valid entries and ${invalidEntries} invalid entries`);
  
  // Find the maximum value for better color scaling
  let maxValue = 1; // Default to 1 to avoid division by zero
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      if (counts[day][hour] > maxValue) {
        maxValue = counts[day][hour];
      }
    }
  }
  
  console.log('Maximum count for any day/hour:', maxValue);
  
  // Format data for Chart.js matrix chart
  // Format data for Chart.js matrix chart
  const data = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Create multiple cells per weekday by adding a subposition
      for (let subPosition = 0; subPosition < 7; subPosition++) {
        data.push({
          x: (day * 7) + subPosition, // Weekday (x-axis) with multiple positions
          y: hour, // Hour (y-axis)
          v: counts[day][hour] // Count
        });
      }
    }
  }
  
  return {
    data,
    labels: {
      x: expandedDayLabels,
      y: hourLabels
    },
    maxValue
  };
}
