/**
 * Main dashboard script for the AFM Dashboard
 * Handles component initialization, data loading, and event handling
 */
import { formatDate, formatTime, formatDateTime, debounce, getUnitText, getChartColor } from './utils.js';
import { filterDataByDate, adjustDate, adjustTime } from './dateUtils.js';
import { processStatusData, processErrorData, processPatternData, processInputData, setKnownErrorPatterns, getKnownErrorPatterns, setPatternMatchesData } from './dataProcessors.js';
import { loadCSV, loadAllDataFiles, loadPatternMatchesData, getDateRangeFromStatusData } from './dataLoader.js';
import { initTheme, toggleTheme, setupThemeEventListeners } from './themeManager.js';
import { createErrorsByHourChart, createErrorStackedLine, createInputChart, createThroughputChart, createErrorRateChart, createErrorTrendChart, createErrorsByWeekdayChart, createErrorTypePieChart } from '../components/charts/index.js';
import { updateTopErrorsList, updateErrorTable, updateHealthWidget, calculateErrorRate, calculateThroughput, updateKpiGrid, createKpiGrid, initDateFilter, applyDateFilter, resetDateFilter, applyQuickFilter, toggleQuickFilterDropdown, shiftDateRange } from '../components/widgets/index.js';
import { initDataTables, searchStatus, searchErrorLog, searchPatterns, searchInputs, changePage } from '../components/widgets/dataTables.js';
import Header from '../components/Header.js';
import Footer from '../components/Footer.js';
import Sidebar from '../components/Sidebar.js';
import WidgetA from '../components/WidgetA.js';

// Global variables
let autoRefreshInterval = null;
let statusData = [];
let errorData = [];
let patternData = [];
let inputData = [];
let filteredStatusData = [];
let filteredErrorData = [];
let filteredPatternData = []; // Initialize filteredPatternData
let filteredInputData = []; // Initialize filteredInputData

// Store all data globally for table searching
window.allData = {
  statusData: [],
  errorData: [],
  patternData: [],
  inputData: []
};
let startDate = null;
let endDate = null;
let header = null;
let footer = null;
let sidebar = null;
let widgetA = null;

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
  
  // Expose key functions globally for the wrapper functions
  window.applyFilters = applyFilters;
  window.updateUI = updateUI;
  
  // Expose search functions globally
  window.searchStatus = searchStatus;
  window.searchErrorLog = searchErrorLog;
  window.searchPatterns = searchPatterns;
  window.searchInputs = searchInputs;
  window.changePage = changePage;
});

/**
 * Initialize the dashboard
 */
export function initDashboard() {
  console.log('Initializing AFM Dashboard...');
  
  // Initialize components
  initComponents();
  
  // Initialize theme
  initTheme();
  
  // Setup event listeners
  setupEventListeners();
  
  // Load configuration and initial data
  loadConfig()
    .then(() => {
      // Load all data
      loadAllData();
      
      // Note: Default date range is now set during loadAllData
      // Date range slider is initialized within initDateFilter
      
      // Start auto-refresh by default
      startAutoRefresh();
      
      // Update last update time initially
      updateLastUpdateTime();
      
      console.log('Dashboard initialization complete');
    })
    .catch(error => {
      console.error('Error initializing dashboard:', error);
    });
}

/**
 * Initialize all components
 */
function initComponents() {
  // Initialize header
  header = new Header('header-container');
  
  // Initialize footer
  footer = new Footer('footer-container');
  
  // Initialize sidebar
  sidebar = new Sidebar('sidebar-container');
  
  // Initialize widget A
  widgetA = new WidgetA('healthCard');
  
  // Initialize KPI grid
  const kpiGridContainer = document.getElementById('kpi-grid-container');
  if (kpiGridContainer) {
    createKpiGrid(kpiGridContainer);
  }
  
  // Note: Default date range is now set during loadAllData based on actual data
  // Initialize global date range variables to null (will be set during data loading)
  if (!startDate || !endDate) {
    startDate = null;
    endDate = null;
    console.log('Date range will be set from actual data during loading');
  }
  
  // Initialize date filter
  initDateFilter({
    container: document.getElementById('filterContent'),
    onFilterChange: (start, end) => {
      startDate = start;
      endDate = end;
      applyFilters();
      updateUI();
    }
  });
}

// Theme initialization moved to themeManager.js

/**
 * Setup global event listeners
 */
function setupEventListeners() {
  // Setup theme-related event listeners
  setupThemeEventListeners();
  
  // Auto-refresh toggle event
  document.addEventListener('auto-refresh-toggle', (e) => {
    toggleAutoRefresh(e.detail.enabled);
  });
  
  // Tab change event
  document.addEventListener('tab-change', (e) => {
    showTab(e.detail.tabId);
  });
  
  // Refresh data event
  document.addEventListener('refresh-data', () => {
    loadAllData();
  });
  
  // Quick filter event
  document.addEventListener('quick-filter', (e) => {
    applyQuickFilter(e.detail.amount, e.detail.unit);
  });
  
  // Error type filter event
  document.addEventListener('error-type-filter', (e) => {
    filterByErrorType(e.detail.type);
  });
  
  // Window resize event for responsive adjustments
  window.addEventListener('resize', debounce(() => {
    // Redraw charts if needed
    updateCharts();
  }, 250));
}

// Theme toggling moved to themeManager.js

/**
 * Toggle auto-refresh
 * @param {boolean} enabled - Whether auto-refresh should be enabled
 */
export function toggleAutoRefresh(enabled) {
  if (enabled) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

/**
 * Start auto-refresh interval
 */
function startAutoRefresh() {
  // Clear existing interval if any
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
  
  // Set new interval (5 minutes)
  autoRefreshInterval = setInterval(() => {
    console.log('Auto-refresh triggered');
    loadAllData();
    // Update the last update time immediately when auto-refresh occurs
    updateLastUpdateTime();
  }, 300000); // 5 minutes in milliseconds
  
  // Update header toggle
  const headerElement = document.querySelector('afm-header');
  if (headerElement) {
    headerElement.setAutoRefreshToggle(true);
  }
  
  console.log('Auto-refresh started with 5-minute interval');
}

/**
 * Stop auto-refresh interval
 */
function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    console.log('Auto-refresh stopped');
  }
  
  // Update header toggle
  const headerElement = document.querySelector('afm-header');
  if (headerElement) {
    headerElement.setAutoRefreshToggle(false);
  }
}

/**
 * Show the specified tab
 * @param {string} tabId - ID of the tab to show
 */
export function showTab(tabId) {
  // Hide all tabs
  const tabContainers = document.querySelectorAll('.tab-container');
  tabContainers.forEach(container => {
    container.classList.remove('active');
  });
  
  // Show the selected tab
  const selectedTab = document.getElementById(tabId);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // Update header and sidebar
  const headerElement = document.querySelector('afm-header');
  if (headerElement) {
    headerElement.setActiveTab(tabId);
  }
  
  const sidebarElement = document.querySelector('afm-sidebar');
  if (sidebarElement) {
    sidebarElement.setActiveTab(tabId);
  }
  
  // Update charts if needed
  updateCharts();
}

// Global variable for pattern matches data reference
let patternMatchesData = [];

/**
 * Load configuration from config.ini
 * @returns {Promise} - Resolves when config is loaded
 */
function loadConfig() {
  return new Promise((resolve, reject) => {
    // Load pattern matches data first, as it contains our error patterns
    console.log('Loading pattern matches data for error categorization...');
    
    loadPatternMatchesData()
      .then(({ patternMatchesData: data, knownErrorPatterns }) => {
        // Store the pattern matches data for later use
        patternMatchesData = data;
        setPatternMatchesData(data);
        
        // Set the known error patterns
        setKnownErrorPatterns(knownErrorPatterns);
        
        console.log('Loaded error patterns from pattern matches:', getKnownErrorPatterns());
        resolve();
      })
      .catch(error => {
        console.error('Error loading pattern matches:', error);
        // This should never happen as loadPatternMatchesData already handles errors
        // but we'll keep this as an extra safety measure
        const fallbackPatterns = [
          "Timeout", 
          "Zeitüberschreitung", 
          "Verbindung vom peer", 
          "multiple Rows in singleton select", 
          "deadlock", 
          "lock conflict on no wait transaction",
          "nicht definiert"
        ];
        setKnownErrorPatterns(fallbackPatterns);
        console.warn('Using fallback error patterns:', getKnownErrorPatterns());
        resolve();
      });
  });
}

/**
 * Load all data from CSV files
 */
function loadAllData() {
  // Show loading indicators
  showLoading(true);
  
  console.log('Loading all data files...');
  
  // First load configuration (which loads pattern matches)
  // Then load the rest of the data
  loadConfig()
    .then(() => {
      console.log('Configuration loaded, now loading other CSV files...');
      
      // Load remaining data sources using our new utility
      return loadAllDataFiles();
    })
    .then(({ statusData: statusResults, errorData: errorResults, patternData: patternResults, inputData: inputResults }) => {
      console.log('Data loaded:', {
        statusResults: statusResults.length,
        errorResults: errorResults.length,
        patternResults: patternResults.length,
        inputResults: inputResults.length
      });
      
      // Process the data
      statusData = processStatusData(statusResults);
      errorData = processErrorData(errorResults);
      // We already have pattern matches data from loadConfig
      // Use that instead of the newly loaded data to avoid duplicates
      patternData = processPatternData(patternMatchesData);
      inputData = processInputData(inputResults);
      
      // Store data globally for table searching
      window.allData = {
        statusData: statusResults,
        errorData: errorResults,
        patternData: patternResults,
        inputData: inputResults
      };
      
      console.log('Data processed:', {
        statusData: statusData.length,
        errorData: errorData.length,
        patternData: patternData.length,
        inputData: inputData.length
      });
      
      // Get date range from status data
      const { minDate, maxDate } = getDateRangeFromStatusData(statusData);
      
      // Store the data range in a global variable for the date filter
      // Convert to plain Date objects to avoid any reference issues
      window.dataDateRange = { 
        minDate: new Date(minDate.getTime()), 
        maxDate: new Date(maxDate.getTime()) 
      };
      
      // Set default range to last day of data
      const lastDay = new Date(maxDate.getTime());
      const oneDayBefore = new Date(maxDate.getTime());
      oneDayBefore.setDate(lastDay.getDate() - 1);
      
      // Update global date range variables to use data-driven defaults
      startDate = oneDayBefore;
      endDate = lastDay;
      
      console.log('Date range set from status data:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dataMinDate: minDate.toISOString(),
        dataMaxDate: maxDate.toISOString()
      });
      
      // Apply any active filters
      applyFilters();
      
      console.log('Filters applied:', {
        filteredStatusData: filteredStatusData.length,
        filteredErrorData: filteredErrorData.length,
        filteredPatternData: filteredPatternData.length,
        filteredInputData: filteredInputData.length
      });
      
      // Re-initialize the date filter with the new date range
      try {
        const dateFilterContainer = document.getElementById('filterContent');
        if (dateFilterContainer) {
          // Remove existing date filter UI
          dateFilterContainer.innerHTML = '';
          
          // Re-initialize date filter with current date range
          initDateFilter({
            container: dateFilterContainer,
            onFilterChange: (start, end) => {
              startDate = start;
              endDate = end;
              applyFilters();
              updateUI();
            }
          });
        }
      } catch (error) {
        console.error('Error reinitializing date filter:', error);
      }
      
      // Update the UI with the processed data
      updateUI();
      
      // Update last update time
      updateLastUpdateTime();
      
      // Initialize data tables - make sure this happens after UI is updated
      console.log('Initializing data tables with:', {
        statusData: window.allData.statusData?.length || 0,
        errorData: window.allData.errorData?.length || 0,
        patternData: window.allData.patternData?.length || 0,
        inputData: window.allData.inputData?.length || 0
      });
      
      // Use a small delay to ensure DOM is ready
      setTimeout(() => {
        initDataTables(window.allData);
      }, 100);
      
      // Hide loading indicators
      showLoading(false);
    })
    .catch(error => {
      console.error('Error loading data:', error);
      showLoading(false);
    });
}

// loadCSV function moved to dataLoader.js

// processStatusData function moved to dataProcessors.js

// processErrorData function moved to dataProcessors.js

// processPatternData function moved to dataProcessors.js

// processInputData function moved to dataProcessors.js

/**
 * Apply all active filters to the data
 */
export function applyFilters() {
  // Apply date filter
  filteredStatusData = filterDataByDate(statusData, startDate, endDate);
  filteredErrorData = filterDataByDate(errorData, startDate, endDate);
  filteredPatternData = filterDataByDate(patternData, startDate, endDate);
  filteredInputData = filterDataByDate(inputData, startDate, endDate);
  
  console.log('Filtered data:', {
    filteredStatusData: filteredStatusData.length,
    filteredErrorData: filteredErrorData.length,
    filteredPatternData: filteredPatternData.length,
    filteredInputData: filteredInputData.length
  });
  
  // Extract last run time within the selected timeframe
  if (filteredStatusData.length > 0) {
    // Sort by timestamp to get the most recent entry in the filtered timeframe
    const sortedData = [...filteredStatusData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const lastRunInTimeframe = sortedData[0];
    
    if (lastRunInTimeframe && lastRunInTimeframe.timestamp) {
      // Extract time part from the timestamp
      const timestampParts = lastRunInTimeframe.timestamp.split(' ');
      const timePart = timestampParts[1] || '-';
      const datePart = timestampParts[0] || '';
      
      // Format as date and time if we have both parts
      let lastRunDisplay;
      if (datePart && timePart !== '-') {
        // Try to format the date nicely
        try {
          const dateObj = new Date(lastRunInTimeframe.timestamp);
          lastRunDisplay = formatDateTime(dateObj);
        } catch (e) {
          // Fallback to original format
          lastRunDisplay = `${datePart} ${timePart}`;
        }
      } else {
        lastRunDisplay = timePart;
      }
      
      // Store in global variable for use in updateLastUpdateTime
      window.lastBackendRunTime = lastRunDisplay;
      console.log('Last backend run time in timeframe:', lastRunDisplay);
    } else {
      window.lastBackendRunTime = null;
    }
  } else {
    window.lastBackendRunTime = null;
  }
  
  // Apply other filters as needed
}

// filterDataByDate function is now imported from dateUtils.js



/**
 * Update time markers below the slider
 * @deprecated Use the modular updateTimeMarkers from dateFilter.js instead
 */
// Function moved to components/widgets/dateFilter.js

/**
 * Set default date range (last 7 days)
 * @deprecated Use the modular setDefaultDateRange from dateFilter.js instead
 */
// Function moved to components/widgets/dateFilter.js

/**
 * Apply date filter based on inputs
 * @deprecated Use the modular applyDateFilter from dateFilter.js instead
 */
// Function moved to components/widgets/dateFilter.js

/**
 * Reset date filter to default (last 7 days)
 * @deprecated Use the modular resetDateFilter from dateFilter.js instead
 */
// Function moved to components/widgets/dateFilter.js

/**
 * Shift date range by a specified amount
 * @param {number} direction - Direction to shift (-1 for backward, 1 for forward)
 * @deprecated Use the modular shiftDateRange from dateFilter.js instead
 */
// Function moved to components/widgets/dateFilter.js

// adjustDate function moved to dateUtils.js

// adjustTime function moved to dateUtils.js

/**
 * Toggle filter visibility
 */
function toggleFilter() {
  const filterContent = document.getElementById('filterContent');
  const toggleBtn = document.getElementById('toggleFilterBtn');
  
  if (!filterContent || !toggleBtn) return;
  
  if (filterContent.style.display === 'none') {
    filterContent.style.display = 'flex';
    toggleBtn.querySelector('i').textContent = 'expand_less';
  } else {
    filterContent.style.display = 'none';
    toggleBtn.querySelector('i').textContent = 'expand_more';
  }
}

/**
 * NOTE: The initDateRangeSlider function has been removed because it duplicates functionality in dateFilter.js
 * The date range slider is now initialized in the dateFilter.js module
 */

/**
 * Format duration between two timestamps
 * @param {number} start - Start timestamp in milliseconds
 * @param {number} end - End timestamp in milliseconds
 * @returns {string} - Formatted duration string
 */
function formatDuration(start, end) {
  const durationMs = end - start;
  const minutes = Math.floor(durationMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} ${getUnitText(days, 'Tag', 'Tage')}`;
  } else if (hours > 0) {
    return `${hours} ${getUnitText(hours, 'Stunde', 'Stunden')}`;
  } else {
    return `${minutes} ${getUnitText(minutes, 'Minute', 'Minuten')}`;
  }
}

/**
 * Create time markers for the date range slider
 * @param {Date} minDate - Minimum date for the slider
 * @param {Date} maxDate - Maximum date for the slider
 */
function createTimeMarkers(minDate, maxDate) {
  const markersContainer = document.getElementById('timeMarkers');
  if (!markersContainer) return;
  
  // Clear existing markers
  markersContainer.innerHTML = '';
  
  // Calculate the range and create 5 evenly spaced markers
  const range = maxDate.getTime() - minDate.getTime();
  const markerCount = 5;
  
  for (let i = 0; i < markerCount; i++) {
    const percent = (i / (markerCount - 1)) * 100;
    const markerTime = new Date(minDate.getTime() + (range * (i / (markerCount - 1))));
    
    const marker = document.createElement('div');
    marker.className = 'time-marker';
    marker.style.left = `${percent}%`;
    marker.textContent = formatDate(markerTime);
    
    markersContainer.appendChild(marker);
  }
}

/**
 * Make the duration tooltip draggable to move both slider handles together
 * @param {HTMLElement} tooltip - The tooltip element
 * @param {HTMLElement} sliderElement - The slider element
 */
function makeTooltipDraggable(tooltip, sliderElement) {
  if (!tooltip || !sliderElement || !sliderElement.noUiSlider) return;
  
  // Find the noUi-connect element (the draggable bar between handles)
  const connectBar = sliderElement.querySelector('.noUi-connect');
  if (!connectBar) return;
  
  // Set the initial grab cursor to indicate draggability
  tooltip.style.cursor = 'grab';
  
  // Helper to get mouse position relative to the slider
  function getRelativeMousePosition(e, slider) {
    const rect = slider.getBoundingClientRect();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    return {
      x: clientX - rect.left,
      y: 0
    };
  }
  
  // Mobile touch support
  tooltip.addEventListener('touchstart', function(e) {
    if (!e.touches || !e.touches[0]) return;
    e.preventDefault();
    
    // Change cursor and add shadow effect for dragging appearance
    tooltip.style.cursor = 'grabbing';
    tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
    
    // Get the touch coordinates
    const touch = e.touches[0];
    
    // Get current slider values
    const values = sliderElement.noUiSlider.get().map(Number);
    const startTime = values[0];
    const endTime = values[1];
    const duration = endTime - startTime;
    
    // Save starting touch position for calculating drag distance
    const startTouchX = touch.clientX;
    const sliderRect = sliderElement.getBoundingClientRect();
    const sliderRange = sliderElement.noUiSlider.options.range;
    const timeRange = sliderRange.max - sliderRange.min;
    
    // Setup touch move handler
    function onTouchMove(moveEvent) {
      if (!moveEvent.touches[0]) return;
      moveEvent.preventDefault();
      
      // Calculate horizontal distance moved
      const currentX = moveEvent.touches[0].clientX;
      const deltaX = currentX - startTouchX;
      
      // Convert pixel movement to time value movement
      const pixelRatio = sliderRect.width / timeRange;
      const timeShift = deltaX / pixelRatio;
      
      // Calculate new start and end times
      let newStart = startTime + timeShift;
      let newEnd = endTime + timeShift;
      
      // Enforce slider boundaries
      if (newStart < sliderRange.min) {
        const diff = sliderRange.min - newStart;
        newStart = sliderRange.min;
        newEnd = newEnd + diff;
      } else if (newEnd > sliderRange.max) {
        const diff = newEnd - sliderRange.max;
        newEnd = sliderRange.max;
        newStart = newStart - diff;
      }
      
      // Set new values through noUiSlider API
      window.dateSlider.set([newStart, newEnd]);
    }
    
    // Setup touch end handler
    function onTouchEnd() {
      tooltip.style.cursor = 'grab';
      tooltip.style.boxShadow = '';
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      
      // Apply changes via the filter system
      const finalValues = window.dateSlider.get().map(Number);
      startDate = new Date(finalValues[0]);
      endDate = new Date(finalValues[1]);
      applyFilters();
      updateUI();
    }
    
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
  });
  
  // Mouse support
  tooltip.addEventListener('mousedown', function(e) {
    e.preventDefault();
    
    // Change cursor and add shadow effect for dragging appearance
    tooltip.style.cursor = 'grabbing';
    tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
    
    // Get current slider values
    const values = window.dateSlider.get().map(Number);
    const startTime = values[0];
    const endTime = values[1];
    const duration = endTime - startTime;
    
    // Save starting mouse position for calculating drag distance
    const startMouseX = e.clientX;
    const sliderRect = sliderElement.getBoundingClientRect();
    const sliderRange = window.dateSlider.options.range;
    const timeRange = sliderRange.max - sliderRange.min;
    
    // Setup mouse move handler
    function onMouseMove(moveEvent) {
      moveEvent.preventDefault();
      
      // Calculate horizontal distance moved
      const currentX = moveEvent.clientX;
      const deltaX = currentX - startMouseX;
      
      // Convert pixel movement to time value movement
      const pixelRatio = sliderRect.width / timeRange;
      const timeShift = deltaX / pixelRatio;
      
      // Calculate new start and end times
      let newStart = startTime + timeShift;
      let newEnd = endTime + timeShift;
      
      // Enforce slider boundaries
      if (newStart < sliderRange.min) {
        const diff = sliderRange.min - newStart;
        newStart = sliderRange.min;
        newEnd = newEnd + diff;
      } else if (newEnd > sliderRange.max) {
        const diff = newEnd - sliderRange.max;
        newEnd = sliderRange.max;
        newStart = newStart - diff;
      }
      
      // Set new values through noUiSlider API
      window.dateSlider.set([newStart, newEnd]);
    }
    
    // Setup mouse up handler
    function onMouseUp() {
      tooltip.style.cursor = 'grab';
      tooltip.style.boxShadow = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      // Apply changes via the filter system
      const finalValues = window.dateSlider.get().map(Number);
      startDate = new Date(finalValues[0]);
      endDate = new Date(finalValues[1]);
      applyFilters();
      updateUI();
    }
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

/**
 * Toggle the quick filter dropdown menu
 * @param {Event} event - The click event
 * @deprecated Use the modular toggleQuickFilterDropdown from dateFilter.js instead
 */
// Function moved to components/widgets/dateFilter.js

/**
 * Close the quick filter dropdown when clicking outside
 * @deprecated Use the modular implementation from dateFilter.js instead
 */
// Function moved to components/widgets/dateFilter.js

/**
 * Apply a quick filter for a specific time period
 * @param {number} amount - Amount of time
 * @param {string} unit - Time unit (day, week, month)
 * @deprecated Use the modular applyQuickFilter from dateFilter.js instead
 */
// Function moved to components/widgets/dateFilter.js

/**
 * Filter data by error type
 * @param {string} type - Error type to filter by
 */
export function filterByErrorType(type) {
  // Apply error type filter
  if (type === 'all') {
    // No additional filtering needed
  } else {
    filteredErrorData = filteredErrorData.filter(item => {
      return item.type === type;
    });
  }
  
  // Update UI
  updateUI();
}

/**
 * Debug function to analyze error categorization
 */
function debugErrorCategorization() {
  console.log('=== DEBUG: Error Categorization ===');
  console.log('Pattern matches data:', patternMatchesData.length, 'entries');
  console.log('Known error patterns:', getKnownErrorPatterns());
  console.log('Error data:', errorData.length, 'entries');
  
  // Count error types
  const errorTypes = {};
  errorData.forEach(error => {
    const type = error.type || 'unknown';
    errorTypes[type] = (errorTypes[type] || 0) + 1;
  });
  
  console.log('Error types distribution:', errorTypes);
  console.log('=== END DEBUG ===');
}

/**
 * Update the UI with current data
 */
export function updateUI() {
  // Calculate KPIs
  const kpis = calculateKPIs();
  
  // Update summary component
  updateSummary(kpis);
  
  // Update health widget
  updateHealthWidget(kpis, widgetA);
  
  // Debug error categorization
  debugErrorCategorization();
  
  // Update charts
  updateCharts();
  
  // Update tables
  updateTables();
}

/**
 * Calculate key performance indicators
 * @returns {Object} - Object containing KPIs
 */
function calculateKPIs() {
  // Get the last row of status data to get the current totals
  let totalFiles = 0;
  let totalInput = 0;
  let totalArchive = 0;
  let errorCount = 0;
  
  if (filteredStatusData && filteredStatusData.length > 0) {
    // Sort by timestamp to get the most recent entry
    const sortedData = [...filteredStatusData].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Get the last entry which has the current totals
    const lastEntry = sortedData[0];
    console.log('Last status entry for KPI calculation:', lastEntry);
    
    // Try accessing values both from our mapped fields and directly from raw fields
    if (lastEntry.rawInput !== undefined && lastEntry.rawArchiv !== undefined && lastEntry.rawError !== undefined) {
      // Use the raw values we stored during processing
      totalInput = parseInt(lastEntry.rawInput || '0');
      totalArchive = parseInt(lastEntry.rawArchiv || '0');
      errorCount = parseInt(lastEntry.rawError || '0');
      console.log('Using raw values for KPI calculation:', { totalInput, totalArchive, errorCount });
    } else {
      // Fall back to using the processed values
      totalInput = lastEntry.filesProcessed || 0;
      totalArchive = lastEntry.throughput || 0;
      errorCount = lastEntry.errorCount || 0;
      console.log('Using processed values for KPI calculation:', { totalInput, totalArchive, errorCount });
    }
    
    // Total files is the sum of these values
    totalFiles = totalInput + totalArchive + errorCount;
    console.log('Calculated totalFiles:', totalFiles);
  }
  
  // Store individual file counts for display
  const inputFiles = totalInput;
  const archiveFiles = totalArchive;
  const errorFiles = errorCount;
  // Use the improved error rate calculation from our modular component
  const errorRateValue = calculateErrorRate(filteredStatusData, filteredErrorData);
  const errorRate = errorRateValue.toFixed(1) + '%';
  const totalErrors = filteredErrorData.length;
  
  // Calculate throughput using our modular component
  let avgThroughput = calculateThroughput(filteredStatusData);
  
  // Calculate pattern matches
  const patternMatches = filteredPatternData ? filteredPatternData.length : 0;
  
  // Determine if processing is active based on recent status entries
  let processingActive = false;
  if (filteredStatusData.length > 0) {
    // Check if the most recent status entry is within the last hour
    const latestStatus = filteredStatusData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    processingActive = new Date(latestStatus.timestamp) > oneHourAgo;
  }
  
  // Determine connection status
  const connected = processingActive; // Simplified - assume connected if processing is active
  
  // Calculate error intensity (errors per hour)
  let errorIntensity = '0';
  if (filteredErrorData.length > 0 && startDate && endDate) {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const hours = Math.max(0.01, (endTime - startTime) / (1000 * 60 * 60));
    errorIntensity = (filteredErrorData.length / hours).toFixed(1);
  }
  
  // Calculate error trend (percentage change from previous period)
  let errorTrend = '0%';
  if (filteredErrorData.length >= 0 && startDate && endDate) {
    const currentPeriodLength = endDate.getTime() - startDate.getTime();
    const prevPeriodStart = new Date(startDate.getTime() - currentPeriodLength);
    const prevPeriodEnd = new Date(startDate.getTime());
    
    const currentErrors = filteredErrorData.length;
    const prevErrors = errorData.filter(entry => {
      if (!entry.timestamp) return false;
      const timestamp = new Date(entry.timestamp).getTime();
      return timestamp >= prevPeriodStart.getTime() && timestamp <= prevPeriodEnd.getTime();
    }).length;
    
    if (prevErrors === 0 && currentErrors === 0) {
      errorTrend = '0%';
    } else if (prevErrors === 0) {
      errorTrend = currentErrors > 0 ? '+∞%' : '0%';
    } else {
      const change = ((currentErrors - prevErrors) / prevErrors) * 100;
      const sign = change > 0 ? '+' : '';
      errorTrend = `${sign}${change.toFixed(1)}%`;
    }
  }
  
  // Calculate archive to error ratio
  let archiveToErrorRatio = 'N/A';
  if (filteredStatusData.length > 0) {
    const lastEntry = filteredStatusData[filteredStatusData.length - 1];
    const archiveCount = parseInt(lastEntry.throughput || 0);
    const errorCount = parseInt(lastEntry.errorCount || 0);
    
    if (errorCount === 0 && archiveCount === 0) {
      archiveToErrorRatio = 'N/A';
    } else if (errorCount === 0) {
      archiveToErrorRatio = '∞';
    } else if (archiveCount === 0) {
      archiveToErrorRatio = '0:1';
    } else {
      // Use full numbers instead of simplified ratios
      archiveToErrorRatio = `${archiveCount}:${errorCount}`;
    }
  }
  
  return {
    totalFiles,
    totalErrors,
    errorRate,
    errorRateValue,
    avgThroughput,
    throughput: avgThroughput, // For widget display
    patternMatches,
    processingActive,
    connected,
    healthScore: calculateHealthScore({
      errorRate: errorRateValue,
      throughput: avgThroughput,
      processingActive,
      connected
    }),
    inputFiles,
    archiveFiles,
    errorFiles,
    errorIntensity,
    errorTrend,
    archiveToErrorRatio
  };
}

/**
 * Update summary component with KPIs
 * @param {Object} kpis - Key performance indicators
 */
function updateSummary(kpis) {
  // Update summary values
  document.getElementById('totalFiles').textContent = kpis.totalFiles.toLocaleString();
  document.getElementById('totalErrors').textContent = kpis.totalErrors.toLocaleString();
  document.getElementById('errorRate').textContent = kpis.errorRate;
  document.getElementById('avgThroughput').textContent = kpis.avgThroughput.toLocaleString();
  document.getElementById('patternMatches').textContent = kpis.patternMatches.toLocaleString();
  
  // Update additional summary values from the original dashboard
  document.getElementById('inputFiles').textContent = kpis.inputFiles.toLocaleString();
  document.getElementById('archiveFiles').textContent = kpis.archiveFiles.toLocaleString();
  document.getElementById('errorFiles').textContent = kpis.errorFiles.toLocaleString();
  
  // Update KPI grid using our modular component
  updateKpiGrid(kpis);
}

/**
 * Update the health widget with KPI data
 * @param {Object} kpis - Key performance indicators
 */
// Function moved to components/widgets/healthGauge.js

/**
 * Calculate health score based on KPIs
 * @param {Object} kpis - Key performance indicators
 * @returns {number} - Health score (0-100)
 */
function calculateHealthScore(kpis) {
  // Base score starts at 100
  let score = 100;
  
  // Deduct for high error rate (up to -40)
  score -= Math.min(40, kpis.errorRateValue * 8);
  
  // Deduct for low throughput (up to -30)
  const throughputFactor = Math.max(0, 1 - (kpis.throughput / 100));
  score -= throughputFactor * 30;
  
  // Deduct for connection issues (-20)
  if (!kpis.connected) {
    score -= 20;
  }
  
  // Deduct for processing inactive (-10)
  if (!kpis.processingActive) {
    score -= 10;
  }
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get status for error rate
 * @param {number} errorRate - Error rate percentage
 * @returns {string} - Status (ok, warning, error)
 */
function getErrorRateStatus(errorRate) {
  if (errorRate > 5) {
    return 'error';
  } else if (errorRate > 2) {
    return 'warning';
  } else {
    return 'ok';
  }
}

/**
 * Calculate error rate based on status data changes
 * @returns {string} - Error rate as a percentage string
 */
// Function moved to components/widgets/healthGauge.js

/**
 * Calculate throughput as difference between the last two measurements
 * @param {Array} statusData - Status data array
 * @returns {number} - Throughput per hour
 */
// Function moved to components/widgets/healthGauge.js

/**
 * Get status for throughput
 * @param {number} throughput - Throughput in files per hour
 * @returns {string} - Status (ok, warning, error)
 */
// Function moved to components/widgets/healthGauge.js

/**
 * Update charts with current data
 */
function updateCharts() {
  // Create or update all charts with filtered data
  createErrorsByHourChart(filteredErrorData);
  createInputChart(filteredStatusData, getAggregationInterval);
  createThroughputChart(filteredStatusData, getAggregationInterval);
  createErrorRateChart(filteredStatusData, filteredErrorData, getAggregationInterval);
  createErrorTrendChart(filteredErrorData, getKnownErrorPatterns(), formatDate, getChartColor);
  createErrorsByWeekdayChart(filteredErrorData);
  createErrorTypePieChart(filteredErrorData, getChartColor);
  createErrorStackedLine(filteredPatternData, getAggregationInterval);
}

/**
 * Get appropriate aggregation interval based on date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} - Aggregation settings
 */
function getAggregationInterval(startDate, endDate) {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  // Determine appropriate interval based on the date range
  if (diffDays <= 1) {
    // For ranges up to 1 day, aggregate by hour
    return {
      interval: 'hour',
      roundFn: (date) => {
        const rounded = new Date(date);
        rounded.setMinutes(0, 0, 0);
        return rounded;
      },
      format: (date) => {
        return date.getHours() + ':00';
      }
    };
  } else if (diffDays <= 14) {
    // For ranges up to 2 weeks, aggregate by day
    return {
      interval: 'day',
      roundFn: (date) => {
        const rounded = new Date(date);
        rounded.setHours(0, 0, 0, 0);
        return rounded;
      },
      format: (date) => {
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      }
    };
  } else if (diffDays <= 90) {
    // For ranges up to 3 months, aggregate by week
    return {
      interval: 'week',
      roundFn: (date) => {
        const rounded = new Date(date);
        const day = rounded.getDay();
        const diff = rounded.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        rounded.setDate(diff);
        rounded.setHours(0, 0, 0, 0);
        return rounded;
      },
      format: (date) => {
        const weekStart = new Date(date);
        const weekEnd = new Date(date);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + 
               ' - ' + 
               weekEnd.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      }
    };
  } else {
    // For ranges over 3 months, aggregate by month
    return {
      interval: 'month',
      roundFn: (date) => {
        const rounded = new Date(date);
        rounded.setDate(1);
        rounded.setHours(0, 0, 0, 0);
        return rounded;
      },
      format: (date) => {
        return date.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
      }
    };
  }
}

/**
 * Create a stacked line chart showing error types over time
 */
// Function moved to components/charts/errorStackedLine.js

/**
 * Update tables with current data
 */
function updateTables() {
  // Update error table with filtered data
  updateErrorTable(filteredErrorData, formatDateTime);
  
  // Update top errors list
  updateTopErrorsList(filteredErrorData, getKnownErrorPatterns(), getChartColor);
}

/**
 * Update top errors list with most common error types
 */
// Function moved to components/widgets/topErrorsList.js

/**
 * Update error table with filtered data
 */
// Function moved to components/widgets/errorTable.js

/**
 * Create or update the errors by hour chart
 */
// Function moved to components/charts/errorsByHourChart.js

/**
 * Create or update the input chart
 */
// Function moved to components/charts/inputChart.js

/**
 * Create or update the throughput chart
 */
// Function moved to components/charts/throughputChart.js

/**
 * Create or update the error rate chart
 */
// Function moved to components/charts/errorRateChart.js

/**
 * Create or update the error trend chart
 */
// Function moved to components/charts/errorTrendChart.js

/**
 * Create or update the errors by weekday chart
 */
// Function moved to components/charts/errorsByWeekdayChart.js

/**
 * Create or update the error type pie chart
 */
// Function moved to components/charts/errorTypePieChart.js

// getChartColor function moved to utils.js

/**
 * Update the last update timestamp
 */
function updateLastUpdateTime() {
  const now = new Date();
  const formattedTime = now.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  // Update last update element directly
  const lastUpdateElement = document.getElementById('lastUpdate');
  if (lastUpdateElement) {
    // Preserve the icon element and update only the text content
    // First, check if the icon already exists
    let iconElement = lastUpdateElement.querySelector('.material-icons');
    
    // If the icon doesn't exist, create it
    if (!iconElement) {
      iconElement = document.createElement('i');
      iconElement.className = 'material-icons';
      iconElement.textContent = 'update';
      lastUpdateElement.prepend(iconElement);
    }
    
    // Clear the element's contents except for the icon
    let updateText = `Letzte Aktualisierung: ${formattedTime}`;
    
    // Add last backend run time if available
    if (window.lastBackendRunTime) {
      updateText += ` | Letzte Daten im Zeitraum: ${window.lastBackendRunTime}`;
    } else if (filteredStatusData && filteredStatusData.length === 0) {
      updateText += ` | Keine Daten im ausgewählten Zeitraum`;
    }
    
    const textNode = document.createTextNode(updateText);
    
    // Remove all child nodes except the icon
    while (lastUpdateElement.childNodes.length > 1) {
      lastUpdateElement.removeChild(lastUpdateElement.lastChild);
    }
    
    // Add the new text
    lastUpdateElement.appendChild(textNode);
    
    // Add animation class
    lastUpdateElement.classList.add('timestamp-updated');
    
    // Remove animation class after animation completes
    setTimeout(() => {
      lastUpdateElement.classList.remove('timestamp-updated');
    }, 2000); // Match the animation duration in CSS
  }
  
  // Store the last update time in localStorage for persistence
  localStorage.setItem('afmDashboardLastUpdate', now.toISOString());
  
  console.log('Last update time updated:', formattedTime);
}

/**
 * Update the filter display
 */
function updateFilterDisplay() {
  if (!startDate || !endDate) return;
  
  // Update timeframe display
  const timeframeDuration = document.getElementById('timeframeDuration');
  if (timeframeDuration) {
    // Calculate and format duration manually since we don't have formatDuration
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
    const durationHours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    let durationText = '';
    if (durationDays > 0) {
      durationText += `${durationDays} ${durationDays === 1 ? 'Tag' : 'Tage'}`;
      if (durationHours > 0) {
        durationText += ` ${durationHours} ${durationHours === 1 ? 'Stunde' : 'Stunden'}`;
      }
    } else if (durationHours > 0) {
      durationText += `${durationHours} ${durationHours === 1 ? 'Stunde' : 'Stunden'}`;
    } else {
      const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      durationText += `${durationMinutes} ${durationMinutes === 1 ? 'Minute' : 'Minuten'}`;
    }
    
    timeframeDuration.textContent = durationText;
  }
  
  // Update last update time display
  updateLastUpdateTime();
}

/**
 * Toggle card content visibility
 * @param {string} cardId - ID of the card to toggle
 */
export function toggleCard(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  
  const content = card.querySelector('.mdl-card__supporting-text');
  const toggleBtn = card.querySelector('.toggle-card-btn i');
  
  if (!content || !toggleBtn) return;
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    toggleBtn.textContent = 'expand_less';
  } else {
    content.style.display = 'none';
    toggleBtn.textContent = 'expand_more';
  }
}

/**
 * Show or hide loading indicators
 * @param {boolean} isLoading - Whether data is loading
 */
function showLoading(isLoading) {
  // Show or hide loading indicators
  const loadingIndicators = document.querySelectorAll('.loading-indicator');
  
  loadingIndicators.forEach(indicator => {
    if (isLoading) {
      indicator.style.display = 'block';
    } else {
      indicator.style.display = 'none';
    }
  });
}

/**
 * Placeholder for removed mock data functions
 * These functions were removed to ensure we only use real data
 */

// Export public API
export {
  loadAllData,
  // Functions already exported individually:
  // applyQuickFilter,
  // filterByErrorType,
  // toggleAutoRefresh,
  // toggleCard,
  // Functions still needed:
  toggleTheme,
  updateLastUpdateTime,
  toggleFilter,
  applyDateFilter,
  resetDateFilter,
  shiftDateRange,
  adjustDate,
  adjustTime
};
