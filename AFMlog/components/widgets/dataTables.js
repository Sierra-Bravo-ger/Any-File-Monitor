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

// Store sorting state for each table
const tableSortState = {
  statusTable: { column: null, direction: null },
  errorLogTable: { column: 'timestamp', direction: 'desc' }, // Default sort by timestamp desc
  patternTable: { column: null, direction: null },
  inputTable: { column: null, direction: null }
};

// Import necessary functions
import { filterDataByDate } from '../../scripts/dateUtils.js';
import { filterByErrorTypes, getSelectedErrorTypes } from '../filters/errorFilter.js';

/**
 * Initialize all data tables
 * @param {Object} data - The loaded data from all CSV files
 */
export function initDataTables(data) {
  console.log('Initializing data tables');
  
  // Store the original unfiltered data
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
  
  // Override the updateTables function in dashboard.js to include our table updates
  const originalUpdateTables = window.updateTables || function() {};
  window.updateTables = function(params) {
    // Call the original function if it exists
    if (typeof originalUpdateTables === 'function') {
      originalUpdateTables(params);
    }
    
    // Update our tables with the filtered data
    updateTablesWithFilters();
  };
  
  // Initialize each table with the raw data
  renderTable(statusTableData, 'statusTable', 1);
  renderTable(errorLogTableData, 'errorLogTable', 1);
  renderTable(patternTableData, 'patternTable', 1);
  renderTable(inputTableData, 'inputTable', 1);
  
  // Force an initial update to apply any existing filters
  setTimeout(updateTablesWithFilters, 500);
  
  console.log('Tables initialized with data counts:', {
    statusTable: statusTableData.length,
    errorLogTable: errorLogTableData.length,
    patternTable: patternTableData.length,
    inputTable: inputTableData.length
  });
}

/**
 * Apply sorting to data
 * @param {Array} data - The data to sort
 * @param {string} column - The column to sort by
 * @param {string} direction - The sort direction ('asc' or 'desc')
 * @returns {Array} - The sorted data
 */
function sortData(data, column, direction) {
  if (!column || !direction || !data || data.length === 0) {
    return data;
  }
  
  // Check if we're dealing with data that has rawData property
  const hasRawData = data.length > 0 && data[0].rawData;
  
  console.log(`Sorting by column: ${column}, direction: ${direction}, using rawData: ${hasRawData}`);
  
  return [...data].sort((a, b) => {
    // Get values, checking rawData first if it exists
    let valueA, valueB;
    
    if (hasRawData && a.rawData && a.rawData[column] !== undefined) {
      valueA = a.rawData[column];
      valueB = b.rawData[column];
    } else {
      valueA = a[column];
      valueB = b[column];
    }
    
    // Special handling for timestamp columns
    if (column === 'timestamp' || column === 'date' || column === 'time' || 
        column === 'Zeitpunkt' || column.toLowerCase().includes('zeit')) {
      // Handle German date format (2025-04-06 08:54:50)
      valueA = new Date(valueA);
      valueB = new Date(valueB);
      
      // Handle invalid dates
      if (isNaN(valueA.getTime())) valueA = new Date(0);
      if (isNaN(valueB.getTime())) valueB = new Date(0);
    }
    
    // Handle numeric values
    else if (typeof valueA === 'string' && !isNaN(parseFloat(valueA))) {
      valueA = parseFloat(valueA);
      valueB = parseFloat(valueB);
    }
    
    // Compare values based on direction
    if (direction === 'asc') {
      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
    } else {
      return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
    }
  });
}

/**
 * Toggle sorting for a table column
 * @param {string} tableId - The ID of the table
 * @param {string} column - The column to sort by
 */
export function toggleSort(tableId, column) {
  const currentState = tableSortState[tableId];
  
  // Cycle through sort states: null -> asc -> desc -> null
  if (currentState.column !== column) {
    // New column, start with ascending
    currentState.column = column;
    currentState.direction = 'asc';
  } else {
    // Same column, cycle through directions
    if (currentState.direction === 'asc') {
      currentState.direction = 'desc';
    } else if (currentState.direction === 'desc') {
      currentState.column = null;
      currentState.direction = null;
    } else {
      currentState.direction = 'asc';
    }
  }
  
  // Re-render the table with the current page
  let data;
  
  // First try to use filtered data if available
  const hasFilteredData = {
    statusTable: Array.isArray(window.filteredStatusData),
    errorLogTable: Array.isArray(window.filteredErrorData),
    patternTable: Array.isArray(window.filteredPatternData),
    inputTable: Array.isArray(window.filteredInputData)
  };
  
  // Use filtered data if available, otherwise fall back to original data
  switch (tableId) {
    case 'statusTable': 
      data = hasFilteredData.statusTable ? window.filteredStatusData : statusTableData; 
      break;
    case 'errorLogTable': 
      data = hasFilteredData.errorLogTable ? window.filteredErrorData : errorLogTableData; 
      break;
    case 'patternTable': 
      data = hasFilteredData.patternTable ? window.filteredPatternData : patternTableData; 
      break;
    case 'inputTable': 
      data = hasFilteredData.inputTable ? window.filteredInputData : inputTableData; 
      break;
    default: 
      data = [];
  }
  
  console.log(`Sorting ${tableId} with ${data.length} rows (using filtered data: ${hasFilteredData[tableId]})`); 
  renderTable(data, tableId, 1); // Reset to first page when sorting
}

// Make toggleSort available globally
window.toggleSort = toggleSort;

/**
 * Update tables with current filters
 */
export function updateTablesWithFilters() {
  console.log('Updating tables with filtered data');
  
  try {
    // Check if the global variables exist and are arrays
    const hasFilteredStatusData = Array.isArray(window.filteredStatusData);
    const hasFilteredErrorData = Array.isArray(window.filteredErrorData);
    const hasFilteredPatternData = Array.isArray(window.filteredPatternData);
    const hasFilteredInputData = Array.isArray(window.filteredInputData);
    
    // Log the availability of filtered data
    console.log('Filtered data availability:', {
      filteredStatusData: hasFilteredStatusData,
      filteredErrorData: hasFilteredErrorData,
      filteredPatternData: hasFilteredPatternData,
      filteredInputData: hasFilteredInputData
    });
    
    // Use the filtered data from the dashboard if available
    if (hasFilteredStatusData && hasFilteredErrorData && 
        hasFilteredPatternData && hasFilteredInputData) {
      
      console.log('Using dashboard filtered data:', {
        statusRows: window.filteredStatusData.length,
        errorRows: window.filteredErrorData.length,
        patternRows: window.filteredPatternData.length,
        inputRows: window.filteredInputData.length
      });
      
      // Render tables with the filtered data
      renderTable(window.filteredStatusData, 'statusTable', 1);
      renderTable(window.filteredErrorData, 'errorLogTable', 1);
      renderTable(window.filteredPatternData, 'patternTable', 1);
      renderTable(window.filteredInputData, 'inputTable', 1);
      return;
    }
    
    console.warn('Dashboard filtered data not available, falling back to local filtering');
    
    // Check if we have the original data to filter
    if (!Array.isArray(statusTableData) || !Array.isArray(errorLogTableData) || 
        !Array.isArray(patternTableData) || !Array.isArray(inputTableData)) {
      console.error('Original table data is not available for local filtering');
      return;
    }
    
    // Check if we have date range to filter by
    if (!window.startDate || !window.endDate) {
      console.warn('Date range not available for filtering');
      return;
    }
    
    const startDate = window.startDate;
    const endDate = window.endDate;
    
    console.log('Applying local filters with date range:', {
      startDate: startDate instanceof Date ? startDate.toISOString() : startDate,
      endDate: endDate instanceof Date ? endDate.toISOString() : endDate
    });
    
    // Apply date filter to all tables
    let filteredStatusData = filterDataByDate(statusTableData, startDate, endDate);
    let filteredErrorData = filterDataByDate(errorLogTableData, startDate, endDate);
    let filteredPatternData = filterDataByDate(patternTableData, startDate, endDate);
    let filteredInputData = filterDataByDate(inputTableData, startDate, endDate);
    
    // Apply error type filter to error log table
    filteredErrorData = filterByErrorTypes(filteredErrorData);
    
    // Re-render tables with filtered data
    renderTable(filteredStatusData, 'statusTable', 1);
    renderTable(filteredErrorData, 'errorLogTable', 1);
    renderTable(filteredPatternData, 'patternTable', 1);
    renderTable(filteredInputData, 'inputTable', 1);
  } catch (error) {
    console.error('Error updating tables with filters:', error.message, error.stack);
  }
}

// Make updateTablesWithFilters available globally
window.updateTablesWithFilters = updateTablesWithFilters;

/**
 * Helper function to create a column header with sort indicator
 * @param {string} tableId - The ID of the table
 * @param {string} column - The column name
 * @param {Object} sortState - The current sort state
 * @returns {HTMLElement} - The created th element
 */
function createColumnHeader(tableId, column, sortState) {
  const th = document.createElement('th');
  th.className = 'mdl-data-table__cell--non-numeric';
  th.style.cursor = 'pointer';
  
  // Add event listener instead of onclick attribute
  th.addEventListener('click', () => toggleSort(tableId, column));
  
  const span = document.createElement('span');
  span.style.display = 'inline-flex';
  span.style.alignItems = 'center';
  span.textContent = column;
  
  // Add sort indicator if applicable
  if (sortState.column === column) {
    const icon = document.createElement('i');
    icon.className = 'material-icons';
    icon.style.fontSize = '16px';
    icon.style.verticalAlign = 'middle';
    icon.style.marginLeft = '4px';
    icon.textContent = sortState.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
    span.appendChild(icon);
  }
  
  th.appendChild(span);
  return th;
}

/**
 * Helper function to create pattern badges
 * @param {Array} patterns - Array of pattern strings
 * @returns {HTMLElement} - The container with pattern badges
 */
function createPatternBadges(patterns) {
  const container = document.createElement('div');
  container.className = 'pattern-container';
  
  patterns.forEach(pattern => {
    const badge = document.createElement('span');
    const patternLower = pattern.toLowerCase();
    
    // Determine badge type based on content
    let badgeType = 'error'; // default
    
    if (patternLower.includes('warnung') || 
        patternLower.includes('warning') ||
        patternLower.includes('warn') ||
        patternLower.includes('achtung') ||
        patternLower.includes('caution')) {
      badgeType = 'warning';
    } else if (patternLower.includes('info') || 
              patternLower.includes('hinweis') ||
              patternLower.includes('notice') ||
              patternLower.includes('information') ||
              patternLower.includes('note')) {
      badgeType = 'info';
    } else if (patternLower.includes('erfolg') || 
              patternLower.includes('success') ||
              patternLower.includes('ok') ||
              patternLower.includes('complete') ||
              patternLower.includes('done')) {
      badgeType = 'success';
    }
    
    badge.className = `pattern-badge ${badgeType}`;
    badge.textContent = pattern;
    container.appendChild(badge);
  });
  
  return container;
}

/**
 * Helper function to create pagination controls
 * @param {string} tableId - The ID of the table
 * @param {number} page - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {number} totalEntries - Total number of entries
 * @returns {HTMLElement} - The pagination element
 */
function createPaginationControls(tableId, page, totalPages, totalEntries) {
  // Clone the pagination template
  const paginationTemplate = document.getElementById('pagination-template');
  const paginationElement = document.importNode(paginationTemplate.content, true).firstElementChild;
  
  // Set pagination info
  paginationElement.querySelector('.current-page').textContent = page;
  paginationElement.querySelector('.total-pages').textContent = totalPages;
  paginationElement.querySelector('.total-entries').textContent = totalEntries;
  
  // Configure prev button
  const prevButton = paginationElement.querySelector('.prev-page');
  if (page === 1) {
    prevButton.setAttribute('disabled', '');
  } else {
    prevButton.removeAttribute('disabled');
    prevButton.addEventListener('click', () => changePage(tableId, page - 1));
  }
  
  // Generate page buttons
  const pageButtonsContainer = paginationElement.querySelector('.page-buttons');
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement('button');
    pageButton.className = `mdl-button mdl-js-button pagination-button ${i === page ? 'mdl-button--accent' : ''}`;
    pageButton.textContent = i;
    pageButton.dataset.page = i;
    pageButton.addEventListener('click', () => changePage(tableId, parseInt(pageButton.dataset.page)));
    pageButtonsContainer.appendChild(pageButton);
  }
  
  // Configure next button
  const nextButton = paginationElement.querySelector('.next-page');
  if (page === totalPages) {
    nextButton.setAttribute('disabled', '');
  } else {
    nextButton.removeAttribute('disabled');
    nextButton.addEventListener('click', () => changePage(tableId, page + 1));
  }
  
  return paginationElement;
}

/**
 * Helper function to parse pattern cell value
 * @param {string} cellValue - The cell value to parse
 * @returns {Array} - Array of pattern strings
 */
function parsePatterns(cellValue) {
  if (!cellValue) return [];
  
  if (cellValue.includes(',')) {
    return cellValue.split(',').map(p => p.trim()).filter(p => p);
  } else if (cellValue.includes(';')) {
    return cellValue.split(';').map(p => p.trim()).filter(p => p);
  } else if (cellValue.includes('|')) {
    return cellValue.split('|').map(p => p.trim()).filter(p => p);
  } else {
    // If no separator found, treat as a single pattern
    return [cellValue.trim()];
  }
}

/**
 * Helper function to format cell value
 * @param {*} value - The cell value to format
 * @returns {string} - Formatted cell value
 */
function formatCellValue(value) {
  if (value === null || value === undefined) {
    return '';
  } else if (typeof value === 'object') {
    // Convert objects to JSON string to avoid [object Object]
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  } else {
    return String(value);
  }
}

/**
 * Render a table with pagination
 * @param {Array} data - The data to display
 * @param {string} tableId - The ID of the table container
 * @param {number} page - The page number to display
 */
export function renderTable(data, tableId, page) {
  const container = document.getElementById(tableId);
  if (!container) {
    console.error(`Table container not found: ${tableId}`);
    return;
  }
  
  // Clear the container
  container.innerHTML = '';
  
  if (!data || data.length === 0) {
    const noDataMsg = document.createElement('p');
    noDataMsg.textContent = 'Keine Daten verfügbar';
    container.appendChild(noDataMsg);
    return;
  }
  
  // Apply current sort if any
  const sortState = tableSortState[tableId];
  if (sortState.column && sortState.direction) {
    data = sortData(data, sortState.column, sortState.direction);
  }
  
  // Calculate pagination values
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, data.length);
  const pageData = data.slice(startIndex, endIndex);
  
  // Check if the data has rawData property which contains the original CSV columns
  const hasRawData = data.length > 0 && data[0].rawData;
  
  // Get columns - prefer original column names from rawData if available
  let columns;
  if (hasRawData) {
    columns = Object.keys(data[0].rawData);
    console.log(`Table ${tableId} using original column names from rawData:`, columns);
  } else {
    columns = Object.keys(data[0]);
    console.log(`Table ${tableId} using processed column names:`, columns);
  }
  
  // Create table container
  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-container';
  
  // Create table
  const table = document.createElement('table');
  table.className = 'mdl-data-table mdl-js-data-table mdl-shadow--2dp';
  table.style.width = '100%';
  
  // Create header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  // Add column headers
  columns.forEach(column => {
    const th = createColumnHeader(tableId, column, sortState);
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Create tbody and add data rows
  const tbody = document.createElement('tbody');
  
  // Pattern-related column names for special formatting
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
  
  // Keywords that might indicate a pattern column
  const patternKeywords = ['fehler', 'error', 'pattern', 'muster', 'type', 'typ', 'kategorie', 'category', 'status'];
  
  pageData.forEach(row => {
    const tr = document.createElement('tr');
    
    columns.forEach(column => {
      const td = document.createElement('td');
      td.className = 'mdl-data-table__cell--non-numeric';
      
      // Get cell value - prefer original data from rawData if available
      let cellValue;
      if (hasRawData && row.rawData && row.rawData[column] !== undefined) {
        cellValue = formatCellValue(row.rawData[column]);
      } else {
        cellValue = formatCellValue(row[column]);
      }
      
      // Check if this is a pattern column
      const isPatternColumn = patternColumns.includes(column) || 
                              patternKeywords.some(keyword => column.toLowerCase().includes(keyword));
      
      if (isPatternColumn && cellValue) {
        const patterns = parsePatterns(cellValue);
        
        if (patterns.length > 0) {
          const badgesContainer = createPatternBadges(patterns);
          td.appendChild(badgesContainer);
        } else {
          td.textContent = cellValue;
        }
      } else {
        td.textContent = cellValue;
      }
      
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  tableContainer.appendChild(table);
  container.appendChild(tableContainer);
  
  // Add pagination if needed
  if (totalPages > 1) {
    // Create pagination container
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container';
    paginationContainer.dataset.tableId = tableId;
    
    // Create pagination controls
    const paginationControls = createPaginationControls(tableId, page, totalPages, data.length);
    paginationContainer.appendChild(paginationControls);
    
    // Add pagination to container
    container.appendChild(paginationContainer);
  }
  
  // Upgrade MDL components (for dynamically created elements)
  if (window.componentHandler) {
    window.componentHandler.upgradeAllRegistered();
  }
}

/**
 * Change the page of a table
 * This is exposed globally for the onclick handlers
 * @param {string} tableId - The ID of the table container
 * @param {number} page - The page number to display
 */
export function changePage(tableId, page) {
  console.log(`Changing ${tableId} to page ${page}`);
  
  // Check if filtered data is available from the dashboard
  const useFilteredData = Array.isArray(window.filteredStatusData) && 
                          Array.isArray(window.filteredErrorData) && 
                          Array.isArray(window.filteredPatternData) && 
                          Array.isArray(window.filteredInputData);
  
  let data;
  if (useFilteredData) {
    // Use the filtered data from the dashboard
    switch (tableId) {
      case 'statusTable':
        data = window.filteredStatusData;
        break;
      case 'errorLogTable':
        data = window.filteredErrorData;
        break;
      case 'patternTable':
        data = window.filteredPatternData;
        break;
      case 'inputTable':
        data = window.filteredInputData;
        break;
      default:
        console.error(`Unknown table ID: ${tableId}`);
        return;
    }
  } else {
    // Fall back to original data if filtered data is not available
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
  }
  
  // Preserve the current sort state when changing pages
  const sortState = tableSortState[tableId];
  if (sortState.column && sortState.direction) {
    data = sortData(data, sortState.column, sortState.direction);
  }
  
  renderTable(data, tableId, page);
}

/**
 * Filter table data based on search input
 * @param {Array} data - The original data array
 * @param {string} searchText - The text to search for
 * @returns {Array} - The filtered data array
 */
export function filterTableData(data, searchText) {
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

/**
 * Set up event listeners for all search buttons
 * This should be called during initialization
 */
export function setupSearchButtonListeners() {
  console.log('Setting up search button listeners');
  
  // Status search
  const statusSearchButton = document.querySelector('#statusTableCard .search-button');
  const statusSearchInput = document.querySelector('#statusSearch');
  if (statusSearchButton && statusSearchInput) {
    statusSearchButton.addEventListener('click', () => {
      searchStatus();
    });
    statusSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchStatus();
      }
    });
  }
  
  // Error log search
  const errorLogSearchButton = document.querySelector('#errorLogTableCard .search-button');
  const errorLogSearchInput = document.querySelector('#errorLogSearch');
  if (errorLogSearchButton && errorLogSearchInput) {
    errorLogSearchButton.addEventListener('click', () => {
      searchErrorLog();
    });
    errorLogSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchErrorLog();
      }
    });
  }
  
  // Pattern search
  const patternSearchButton = document.querySelector('#patternTableCard .search-button');
  const patternSearchInput = document.querySelector('#patternSearch');
  if (patternSearchButton && patternSearchInput) {
    patternSearchButton.addEventListener('click', () => {
      searchPatterns();
    });
    patternSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchPatterns();
      }
    });
  }
  
  // Input search
  const inputSearchButton = document.querySelector('#inputTableCard .search-button');
  const inputSearchInput = document.querySelector('#inputSearch');
  if (inputSearchButton && inputSearchInput) {
    inputSearchButton.addEventListener('click', () => {
      searchInputs();
    });
    inputSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchInputs();
      }
    });
  }
}
