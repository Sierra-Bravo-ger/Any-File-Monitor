/**
 * Data Tables component for the AFM Dashboard
 * Handles displaying and searching CSV data in table format with performance optimizations
 */

// Constants for pagination
const PAGE_SIZE = 25;

// Store the current data for each table
let statusTableData = [];
let errorLogTableData = [];
let patternTableData = [];
let inputTableData = [];

/**
 * Initialize all data tables
 * @param {Object} data - The loaded data from all CSV files
 */
export function initDataTables(data) {
  console.log('Initializing data tables');
  
  // Use the data passed to this function, which should be the raw CSV data
  statusTableData = data.statusData || [];
  errorLogTableData = data.errorData || [];
  patternTableData = data.patternData || [];
  inputTableData = data.inputData || [];
  
  // Log the actual column names from each table
  console.log('Actual column names in tables:', {
    statusColumns: statusTableData.length > 0 ? Object.keys(statusTableData[0]) : [],
    errorLogColumns: errorLogTableData.length > 0 ? Object.keys(errorLogTableData[0]) : [],
    patternColumns: patternTableData.length > 0 ? Object.keys(patternTableData[0]) : [],
    inputColumns: inputTableData.length > 0 ? Object.keys(inputTableData[0]) : []
  });
  
  // Initialize each table with the raw data
  renderTable(statusTableData, 'statusTable', 1);
  renderTable(errorLogTableData, 'errorLogTable', 1);
  renderTable(patternTableData, 'patternTable', 1);
  renderTable(inputTableData, 'inputTable', 1);
  
  console.log('Tables initialized with data counts:', {
    statusTable: statusTableData.length,
    errorLogTable: errorLogTableData.length,
    patternTable: patternTableData.length,
    inputTable: inputTableData.length
  });
}

/**
 * Render a table with pagination
 * @param {Array} data - The data to display
 * @param {string} tableId - The ID of the table container
 * @param {number} page - The page number to display
 */
function renderTable(data, tableId, page) {
  const container = document.getElementById(tableId);
  if (!container) {
    console.error(`Table container not found: ${tableId}`);
    return;
  }
  
  if (!data || data.length === 0) {
    container.innerHTML = '<p>Keine Daten verfügbar</p>';
    return;
  }
  
  // Calculate pagination values
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, data.length);
  const pageData = data.slice(startIndex, endIndex);
  
  // Get columns from the first data item
  const columns = Object.keys(data[0]);
  
  // Log all column names for debugging
  console.log(`Table ${tableId} columns:`, {
    original: columns
  });
  
  // Build the table HTML
  let html = `
    <div class="table-container">
      <table class="mdl-data-table mdl-js-data-table mdl-shadow--2dp" style="width: 100%;">
        <thead>
          <tr>
  `;
  
  // Add column headers
  columns.forEach(column => {
    html += `<th class="mdl-data-table__cell--non-numeric">${column}</th>`;
  });
  
  html += `
          </tr>
        </thead>
        <tbody>
  `;
  
  // Add data rows
  pageData.forEach(row => {
    html += '<tr>';
    columns.forEach(column => {
      // Properly format the cell value to avoid [object Object]
      let cellValue = row[column];
      if (cellValue === null || cellValue === undefined) {
        cellValue = '';
      } else if (typeof cellValue === 'object') {
        // Convert objects to JSON string to avoid [object Object]
        try {
          cellValue = JSON.stringify(cellValue);
        } catch (e) {
          cellValue = String(cellValue);
        }
      } else {
        cellValue = String(cellValue);
      }
      
      // Check if this is a pattern-related column that should use badges
      // First, check exact column name matches
      const patternColumns = [
        // German column names
        'Fehlertyp', 'Fehlermuster', 'Muster', 'Fehler', 'Fehlerart', 'Kategorie', 'Typ',
        // English column names
        'Pattern', 'ErrorType', 'ErrorPattern', 'Error', 'Category', 'Type',
        // Exact column names from CSV files (case-sensitive)
        'pattern', 'error_type', 'error_pattern', 'category', 'type', 'description',
        // Additional possible column names
        'Beschreibung', 'Ursache', 'Reason', 'Status', 'Zustand'
      ];
      
      // Also check if column name contains any of these pattern-related keywords
      const patternKeywords = ['fehler', 'error', 'pattern', 'muster', 'type', 'typ', 'kategorie', 'category', 'status'];
      
      // Check if this is a pattern column either by exact match or by containing a pattern keyword
      const isPatternColumn = patternColumns.includes(column) || 
                              patternKeywords.some(keyword => column.toLowerCase().includes(keyword));
      
      if (isPatternColumn && cellValue) {
        // Handle different pattern formats - could be comma-separated, space-separated, or single value
        // Try different separators to catch all possible formats
        let patterns = [];
        
        if (cellValue.includes(',')) {
          patterns = cellValue.split(',').map(p => p.trim()).filter(p => p);
        } else if (cellValue.includes(';')) {
          patterns = cellValue.split(';').map(p => p.trim()).filter(p => p);
        } else if (cellValue.includes('|')) {
          patterns = cellValue.split('|').map(p => p.trim()).filter(p => p);
        } else {
          // If no separator found, treat as a single pattern
          patterns = [cellValue.trim()];
        }
        
        if (patterns.length > 0) {
          let badgeHtml = '<div class="pattern-container">';
          patterns.forEach(pattern => {
            // Determine badge type based on content
            let badgeType = 'error'; // default
            
            const patternLower = pattern.toLowerCase();
            
            // Check for warning patterns
            if (patternLower.includes('warnung') || 
                patternLower.includes('warning') ||
                patternLower.includes('warn') ||
                patternLower.includes('achtung') ||
                patternLower.includes('caution')) {
              badgeType = 'warning';
            } 
            // Check for info patterns
            else if (patternLower.includes('info') || 
                    patternLower.includes('hinweis') ||
                    patternLower.includes('notice') ||
                    patternLower.includes('information') ||
                    patternLower.includes('note')) {
              badgeType = 'info';
            } 
            // Check for success patterns
            else if (patternLower.includes('erfolg') || 
                    patternLower.includes('success') ||
                    patternLower.includes('ok') ||
                    patternLower.includes('complete') ||
                    patternLower.includes('done')) {
              badgeType = 'success';
            }
            
            badgeHtml += `<span class="pattern-badge ${badgeType}">${pattern}</span>`;
          });
          badgeHtml += '</div>';
          html += `<td class="mdl-data-table__cell--non-numeric">${badgeHtml}</td>`;
        } else {
          html += `<td class="mdl-data-table__cell--non-numeric">${cellValue}</td>`;
        }
      } else {
        html += `<td class="mdl-data-table__cell--non-numeric">${cellValue}</td>`;
      }
    });
    html += '</tr>';
  });
  
  html += `
        </tbody>
      </table>
  `;
  
  // Add pagination if needed
  if (totalPages > 1) {
    html += `
      <div class="pagination" style="margin-top: 16px; text-align: center;">
        <div style="margin-bottom: 8px; color: var(--text-color, #333);">Seite ${page} von ${totalPages} (${data.length} Einträge)</div>
        <div>
    `;
    
    // Previous button
    const prevDisabled = page === 1 ? 'disabled' : '';
    html += `<button class="mdl-button mdl-js-button mdl-button--icon pagination-button" ${prevDisabled} onclick="changePage('${tableId}', ${page-1})">
              <i class="material-icons">chevron_left</i>
            </button>`;
    
    // Page buttons (show max 5 pages)
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === page ? 'mdl-button--accent' : '';
      html += `<button class="mdl-button mdl-js-button pagination-button ${activeClass}" onclick="changePage('${tableId}', ${i})">${i}</button>`;
    }
    
    // Next button
    const nextDisabled = page === totalPages ? 'disabled' : '';
    html += `<button class="mdl-button mdl-js-button mdl-button--icon pagination-button" ${nextDisabled} onclick="changePage('${tableId}', ${page+1})">
              <i class="material-icons">chevron_right</i>
            </button>`;
    
    html += `
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  container.innerHTML = html;
}

/**
 * Change the page of a table
 * This is exposed globally for the onclick handlers
 * @param {string} tableId - The ID of the table container
 * @param {number} page - The page number to display
 */
export function changePage(tableId, page) {
  console.log(`Changing ${tableId} to page ${page}`);
  
  let data;
  switch (tableId) {
    case 'statusTable':
      data = statusTableData;
      break;
    case 'errorLogTable':
      data = errorLogTableData;
      break;
    case 'patternTable':
      data = patternTableData;
      break;
    case 'inputTable':
      data = inputTableData;
      break;
    default:
      console.error(`Unknown table ID: ${tableId}`);
      return;
  }
  
  renderTable(data, tableId, page);
}

/**
 * Filter table data based on search input
 * @param {Array} data - The original data array
 * @param {string} searchText - The text to search for
 * @returns {Array} - The filtered data array
 */
function filterTableData(data, searchText) {
  if (!searchText) return data;
  
  const searchLower = searchText.toLowerCase();
  
  return data.filter(row => {
    // Check if any field contains the search text
    for (const key in row) {
      const value = row[key];
      if (value && typeof value === 'string' && value.toLowerCase().includes(searchLower)) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Search the status table
 */
export function searchStatus() {
  const searchInput = document.getElementById('statusSearch');
  if (!searchInput) return;
  
  const searchText = searchInput.value;
  const filteredData = filterTableData(statusTableData, searchText);
  
  // Update the table data and render
  statusTableData = filteredData;
  renderTable(filteredData, 'statusTable', 1);
}

/**
 * Search the error log table
 */
export function searchErrorLog() {
  const searchInput = document.getElementById('errorLogSearch');
  if (!searchInput) return;
  
  const searchText = searchInput.value;
  const filteredData = filterTableData(errorLogTableData, searchText);
  
  // Update the table data and render
  errorLogTableData = filteredData;
  renderTable(filteredData, 'errorLogTable', 1);
}

/**
 * Search the pattern matches table
 */
export function searchPatterns() {
  const searchInput = document.getElementById('patternSearch');
  if (!searchInput) return;
  
  const searchText = searchInput.value;
  const filteredData = filterTableData(patternTableData, searchText);
  
  // Update the table data and render
  patternTableData = filteredData;
  renderTable(filteredData, 'patternTable', 1);
}

/**
 * Search the input details table
 */
export function searchInputs() {
  const searchInput = document.getElementById('inputSearch');
  if (!searchInput) return;
  
  const searchText = searchInput.value;
  const filteredData = filterTableData(inputTableData, searchText);
  
  // Update the table data and render
  inputTableData = filteredData;
  renderTable(filteredData, 'inputTable', 1);
}
