/**
 * Error Table Widget Component
 * Displays a table of error data with pagination
 */

/**
 * Update the error table with filtered data
 * @param {Array} filteredErrorData - The filtered error data to display
 * @param {Function} formatDateTime - Function to format date and time
 * @returns {void}
 */
export function updateErrorTable(filteredErrorData, formatDateTime) {
  const tableContainer = document.getElementById('errorTable');
  if (!tableContainer) return;
  
  // Clear existing table
  tableContainer.innerHTML = '';
  
  // Create table element
  const table = document.createElement('table');
  table.className = 'mdl-data-table mdl-js-data-table mdl-shadow--2dp';
  table.style.width = '100%';
  
  // Create table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  ['Zeitstempel', 'Typ', 'Nachricht', 'Datei'].forEach(text => {
    const th = document.createElement('th');
    th.className = 'mdl-data-table__cell--non-numeric';
    th.textContent = text;
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement('tbody');
  
  // Add rows for filtered error data (limited to 50 entries)
  const displayData = filteredErrorData.slice(0, 50);
  
  displayData.forEach(error => {
    const row = document.createElement('tr');
    
    // Timestamp column
    const timestampCell = document.createElement('td');
    timestampCell.className = 'mdl-data-table__cell--non-numeric';
    timestampCell.textContent = formatDateTime(new Date(error.timestamp));
    row.appendChild(timestampCell);
    
    // Type column
    const typeCell = document.createElement('td');
    typeCell.className = 'mdl-data-table__cell--non-numeric';
    typeCell.textContent = error.type || 'Unbekannt';
    row.appendChild(typeCell);
    
    // Message column
    const messageCell = document.createElement('td');
    messageCell.className = 'mdl-data-table__cell--non-numeric';
    messageCell.textContent = error.message || '';
    row.appendChild(messageCell);
    
    // File column
    const fileCell = document.createElement('td');
    fileCell.className = 'mdl-data-table__cell--non-numeric';
    fileCell.textContent = error.file || '';
    row.appendChild(fileCell);
    
    tbody.appendChild(row);
  });
  
  table.appendChild(tbody);
  tableContainer.appendChild(table);
  
  // Initialize MDL components
  if (window.componentHandler) {
    window.componentHandler.upgradeElement(table);
  }
}
