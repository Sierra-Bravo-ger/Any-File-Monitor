/**
 * Top Errors List Widget Component
 * Displays a list of the most frequent errors with visual bars
 */

/**
 * Update the top errors list with filtered data
 * @param {Array} filteredErrorData - The filtered error data to display
 * @param {Array} knownErrorPatterns - Known error patterns for categorization
 * @param {Function} getChartColor - Function to get chart colors
 * @returns {void}
 */
export function updateTopErrorsList(filteredErrorData, knownErrorPatterns, getChartColor) {
  const topErrorsContainer = document.getElementById('topErrorsList');
  if (!topErrorsContainer) return;
  
  // Clear existing content
  topErrorsContainer.innerHTML = '';
  
  // Count error occurrences by type
  const errorCounts = {};
  filteredErrorData.forEach(error => {
    // Get error type, use message-based categorization if type is unknown
    let type = error.type;
    if (!type || type === 'unknown') {
      const message = error.message || '';
      // Try to match against known patterns
      const matchedPattern = knownErrorPatterns.find(pattern => 
        message.toLowerCase().includes(pattern.toLowerCase())
      );
      type = matchedPattern || 'Unbekannt';
    }
    
    // Count occurrences
    errorCounts[type] = (errorCounts[type] || 0) + 1;
  });
  
  // Convert to array and sort by count (descending)
  const sortedErrors = Object.entries(errorCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  
  // Display top 10 errors
  const topErrors = sortedErrors.slice(0, 10);
  
  if (topErrors.length === 0) {
    topErrorsContainer.innerHTML = '<div class="no-data">Keine Fehlerdaten verfügbar</div>';
    return;
  }
  
  // Find the maximum error count for better scaling
  const maxErrorCount = topErrors.length > 0 ? topErrors[0].count : 0;
  
  // Create error type list with counts and better scaled bars
  topErrors.forEach((error, index) => {
    // Calculate percentage of total errors (for display)
    const percentage = Math.round((error.count / filteredErrorData.length) * 100);
    
    // Calculate bar width using a relative scale to the max value
    // Use a logarithmic or square root scale for better visualization when counts vary widely
    // This ensures smaller values are still visible while maintaining proper relative scaling
    const relativeScale = Math.sqrt(error.count / maxErrorCount) * 100;
    
    const errorItem = document.createElement('div');
    errorItem.className = 'error-item';
    
    const errorBar = document.createElement('div');
    errorBar.className = 'error-bar';
    errorBar.style.width = `${relativeScale}%`;
    errorBar.style.backgroundColor = getChartColor(index, 0.7);
    
    const errorLabel = document.createElement('div');
    errorLabel.className = 'error-label';
    errorLabel.textContent = `${error.type}: ${error.count} (${percentage}%)`;
    
    errorItem.appendChild(errorBar);
    errorItem.appendChild(errorLabel);
    topErrorsContainer.appendChild(errorItem);
  });
  
  console.log('Top errors updated:', topErrors);
}
