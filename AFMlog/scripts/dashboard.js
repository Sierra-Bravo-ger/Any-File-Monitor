/**
 * Main dashboard script for the AFM Dashboard
 * Handles component initialization, data loading, and event handling
 */
import { formatDate, formatTime, formatDateTime, debounce, getUnitText, getChartColor } from './utils.js';
import { updateCharts as updateChartsModule, getAggregationInterval as getAggregationIntervalModule } from '../components/charts/chartManager.js';
import { toggleCard, initUI, toggleAccordionFilter, updateUI as updateUIFromManager, updateSummary as updateSummaryFromManager, updateTables as updateTablesFromManager, updateLastUpdateTime as updateLastUpdateTimeFromManager, updateFilterDisplay as updateFilterDisplayFromManager } from './uiManager.js';
import { filterDataByDate, adjustDate, adjustTime } from './dateUtils.js';
import { processStatusData, processErrorData, processPatternData, processInputData, setKnownErrorPatterns, getKnownErrorPatterns, setPatternMatchesData } from './dataProcessors.js';
import { filterByErrorType as filterByErrorTypeModule, filterByErrorTypes, dispatchErrorTypeFilter, dispatchErrorFilterChanged, initErrorFilter, getUniqueErrorTypes, getAllErrorTypes, getSelectedErrorTypes, toggleErrorType, selectAllErrorTypes, clearErrorTypeSelection } from '../components/filters/index.js';
import { loadCSV, loadAllDataFiles, loadPatternMatchesData, getDateRangeFromStatusData } from './dataLoader.js';
import { initTheme, toggleTheme, setupThemeEventListeners } from './themeManager.js';
import { initAutoRefresh, toggleAutoRefresh, startAutoRefresh, stopAutoRefresh, isAutoRefreshEnabled, setRefreshInterval, updateLastUpdateTime as updateLastUpdateTimeFromModule } from './autoRefresh.js';
import { createErrorsByHourChart, createErrorStackedLine, createInputChart, createThroughputChart, createErrorRateChart, createErrorTrendChart, createErrorsByWeekdayChart, createErrorTypePieChart, createErrorHeatmapChart, initHealthGauge } from '../components/charts/index.js';
import { updateTopErrorsList, updateErrorTable, updateHealthWidget, updateKpiGrid, createKpiGrid, initDateFilter, applyDateFilter, resetDateFilter, applyQuickFilter, toggleQuickFilterDropdown, closeQuickFilterDropdown, shiftDateRange, initErrorTypeFilter, toggleErrorTypeDropdown, closeErrorTypeDropdown, updateErrorTypeFilterUI, initQuickFilter, initDataTables, searchStatus, searchErrorLog, searchPatterns, searchInputs, changePage, setupSearchButtonListeners } from '../components/widgets/index.js';
import { calculateKPIs, calculateErrorRate, calculateThroughput, calculateHealthScore, getErrorRateStatus } from '../components/calculations/index.js';
import Header from '../components/Header.js';
import Footer from '../components/Footer.js';
import Sidebar from '../components/Sidebar.js';
import WidgetA from '../components/WidgetA.js';
import SummaryCard from '../components/SummaryCard.js';

// Make functions available globally for inline handlers
window.toggleAccordionFilter = toggleAccordionFilter;
window.toggleCard = toggleCard;

// Re-export functions that are imported elsewhere
export { toggleCard };

// Global variables
let statusData = [];
let errorData = [];
let patternData = [];
let inputData = [];
let filteredStatusData = [];
let filteredErrorData = [];
let filteredPatternData = []; // Initialize filteredPatternData
let filteredInputData = []; // Initialize filteredInputData

// Flag to prevent circular updates
let isUpdatingDateFilter = false;

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
let summaryCard = null;

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
  
  // Expose key functions globally for the wrapper functions
  window.applyFilters = applyFilters;
  // Use the modular updateUI function from uiManager.js for global access
  window.updateUI = (params) => updateUIFromManager({
    filteredStatusData,
    filteredErrorData,
    filteredPatternData,
    errorData,
    startDate,
    endDate,
    calculateKPIs,
    updateHealthWidget,
    debugErrorCategorization,
    updateCharts: updateChartsModule,
    widgetA,
    summaryCard,
    updateKpiGrid,
    getKnownErrorPatterns,
    getChartColor,
    formatDateTime,
    updateErrorTable,
    updateTopErrorsList
  });
  
  // Expose auto-refresh functions globally
  window.setRefreshInterval = setRefreshInterval;
  window.toggleAutoRefresh = toggleAutoRefresh;
  
  // Expose search functions globally
  window.searchStatus = searchStatus;
  window.searchErrorLog = searchErrorLog;
  window.searchPatterns = searchPatterns;
  window.searchInputs = searchInputs;
  window.changePage = changePage;
  
  // Expose showTab function globally for navigation links
  window.showTab = showTab;
});

/**
 * Initialize the dashboard
 */
export function initDashboard() {
  console.log('Initializing AFM Dashboard...');
  
  // Initialize components (except date filter)
  initComponentsExceptDateFilter();
  
  // Initialize theme
  initTheme();
  
  // Initialize auto-refresh module with loadAllData as the refresh callback
  // Don't pass updateLastUpdateTime as a callback to avoid circular references
  // Ensure the DOM is fully loaded before initializing auto-refresh
  initAutoRefresh(loadAllData, null);
  
  // Setup event listeners
  setupEventListeners();
  
  // Load configuration and initial data
  loadConfig()
    .then(() => {
      // Load all data
      loadAllData();
      
      // Note: Date filter will be initialized after data is loaded in the loadAllData function
      
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
 * Initialize all components except date filter
 */
function initComponentsExceptDateFilter() {
  // Initialize header
  header = new Header('header-container');
  
  // Initialize footer
  footer = new Footer('footer-container');
  
  // Initialize sidebar
  sidebar = new Sidebar('sidebar-container');
  
  // Initialize widget A
  widgetA = initHealthGauge();
  
  // Initialize summary card
  summaryCard = new SummaryCard('summary-container');
  
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
  
  // Initialize UI components (card toggling, etc.)
  initUI();
  console.log('UI components initialized');
  
  // Initialize search button listeners
  setupSearchButtonListeners();
  console.log('Search button listeners initialized');
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
  widgetA = initHealthGauge();
  
  // Initialize summary card
  summaryCard = new SummaryCard('summary-container');
  
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
  
  // Initialize error type filter
  console.log('About to initialize error type filter from dashboard.js');
  initErrorTypeFilter({
    container: document.querySelector('.filter-elements-container')
  });
  console.log('Error type filter initialization completed');
  
  // Initialize quick filter
  console.log('Initializing quick filter component');
  initQuickFilter({
    container: document.querySelector('.filter-elements-container'),
    onFilterChange: (start, end) => {
      startDate = start;
      endDate = end;
      applyFilters();
      updateUI();
    }
  });
  console.log('Quick filter initialization completed');
  
  // Initialize UI components (card toggling, etc.)
  initUI();
}

// Theme initialization moved to themeManager.js

/**
 * Setup global event listeners
 */
function setupEventListeners() {
  // Add wheel event listener to close accordion filter when scrolling down
  window.addEventListener('wheel', function(e) {
    const accordionFilter = document.getElementById('accordionFilter');
    if (!accordionFilter || !accordionFilter.classList.contains('expanded')) {
      return; // Only proceed if the accordion is expanded
    }
    
    // If scrolling down (positive deltaY)
    if (e.deltaY > 0) {
      // User is scrolling down, close the accordion
      toggleAccordionFilter();
      
      // Also close any open portal dropdowns
      if (window.errorTypeDropdownPortal) {
        window.errorTypeDropdownPortal.closeDropdown();
      }
      if (window.quickFilterDropdownPortal) {
        window.quickFilterDropdownPortal.closeDropdown();
      }
    }
  }, { passive: true }); // Use passive event listener for better performance
  
  // Also handle touch events for mobile devices
  let touchStartY = 0;
  
  window.addEventListener('touchstart', function(e) {
    const accordionFilter = document.getElementById('accordionFilter');
    if (!accordionFilter || !accordionFilter.classList.contains('expanded')) {
      return; // Only proceed if the accordion is expanded
    }
    
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  
  window.addEventListener('touchmove', function(e) {
    const accordionFilter = document.getElementById('accordionFilter');
    if (!accordionFilter || !accordionFilter.classList.contains('expanded')) {
      return; // Only proceed if the accordion is expanded
    }
    
    const touchY = e.touches[0].clientY;
    const touchDiff = touchStartY - touchY;
    
    // If scrolling down (positive diff) and past threshold
    if (touchDiff > 10) { // 10px threshold for touch movement
      // User is scrolling down, close the accordion
      toggleAccordionFilter();
      
      // Also close any open portal dropdowns
      if (window.errorTypeDropdownPortal) {
        window.errorTypeDropdownPortal.closeDropdown();
      }
      if (window.quickFilterDropdownPortal) {
        window.quickFilterDropdownPortal.closeDropdown();
      }
    }
  }, { passive: true });
  
  // Setup theme-related event listeners
  setupThemeEventListeners();
  
  // Auto-refresh toggle
  const autoRefreshToggle = document.getElementById('autoRefreshToggle');
  
  // Auto-refresh toggle event
  document.addEventListener('auto-refresh-toggle', (e) => {
    toggleAutoRefresh(e.detail.enabled);
  });
  
  // Tab change event
  document.addEventListener('tab-change', (e) => {
    showTab(e.detail.tabId);
  });
  
  // Quick filter applied event
  document.addEventListener('quick-filter-applied', (e) => {
    console.log('[Dashboard] Quick filter applied event received:', e.detail);
    if (e.detail && e.detail.startDate && e.detail.endDate && !isUpdatingDateFilter) {
      // Set flag to prevent circular updates
      isUpdatingDateFilter = true;
      
      try {
        // Update the global date range
        startDate = e.detail.startDate;
        endDate = e.detail.endDate;
        
        // Update the date filter UI to reflect the new date range
        const dateFilterInputs = document.querySelectorAll('#startDate, #startTime, #endDate, #endTime');
        if (dateFilterInputs.length > 0) {
          document.getElementById('startDate').value = formatDate(startDate);
          document.getElementById('startTime').value = formatTime(startDate);
          document.getElementById('endDate').value = formatDate(endDate);
          document.getElementById('endTime').value = formatTime(endDate);
        }
        
        // Update the slider to reflect the new date range
        const slider = document.getElementById('dateRangeSlider');
        if (slider && slider.noUiSlider) {
          console.log('[Dashboard] Updating slider with new date range:', startDate, endDate);
          // Use silent update to prevent triggering slider events
          slider.noUiSlider.set([startDate.getTime(), endDate.getTime()], false);
          
          // Update the duration tooltip manually
          const durationTooltip = document.getElementById('sliderDurationTooltip');
          if (durationTooltip) {
            // Calculate duration in milliseconds
            const durationMs = endDate.getTime() - startDate.getTime();
            
            // Format the duration text
            let durationText = '';
            const minutes = Math.floor(durationMs / (1000 * 60));
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) {
              durationText = `${days} Tag${days !== 1 ? 'e' : ''}`;
            } else if (hours > 0) {
              durationText = `${hours} Stunde${hours !== 1 ? 'n' : ''}`;
            } else {
              durationText = `${minutes} Minute${minutes !== 1 ? 'n' : ''}`;
            }
            
            durationTooltip.textContent = durationText;
            
            // Calculate the center position of the selected range as a percentage
            const values = slider.noUiSlider.get();
            const startVal = parseFloat(values[0]);
            const endVal = parseFloat(values[1]);
            
            // Get the slider range
            const range = slider.noUiSlider.options.range;
            const min = range.min;
            const max = range.max;
            const totalRange = max - min;
            
            // Calculate center position
            const center = startVal + (endVal - startVal) / 2;
            const centerPercentage = ((center - min) / totalRange) * 100;
            
            // Update tooltip position to center it over the selected range
            console.log(`[Dashboard] Updating tooltip position to ${centerPercentage}%`);
            durationTooltip.style.left = centerPercentage + '%';
            durationTooltip.style.transform = 'translateX(-50%)';
            
            // Also update the timeframe display
            const timeframeDisplay = document.getElementById('timeframeDuration');
            if (timeframeDisplay) {
              timeframeDisplay.textContent = durationText;
            }
          }
        }
        
        // Apply the filters with the new date range
        applyFilters();
        
        // Update the timeframe display
        updateFilterDisplay();
      } finally {
        // Reset the flag after a short delay to ensure all events have completed
        setTimeout(() => {
          isUpdatingDateFilter = false;
          console.log('[Dashboard] Date filter update complete');
        }, 100);
      }
    }
  });
  
  // Refresh data event
  document.addEventListener('refresh-data', () => {
    loadAllData();
  });
  
  // Quick filter event
  document.addEventListener('quick-filter', (e) => {
    applyQuickFilter(e.detail.amount, e.detail.unit);
  });
  
  // Error type filter event (legacy single-type filter)
  document.addEventListener('error-type-filter', (e) => {
    // Use the wrapper function for backward compatibility
    filterByErrorType(e.detail.type);
  });
  
  // Multi-select error filter event
  document.addEventListener('error-filter-changed', () => {
    // When error filters change, reapply all filters and update UI
    applyFilters();
    updateUI();
  });
  
  // Window resize event for responsive adjustments
  window.addEventListener('resize', debounce(() => {
    // Redraw charts if needed
    updateCharts();
  }, 250));
}

// Theme toggling moved to themeManager.js
// Auto-refresh functionality moved to autoRefresh.js

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
  
  // Force chart reinitialization by clearing existing chart instances
  // This ensures proper axis scaling when switching tabs
  if (window.inputChart && typeof window.inputChart.destroy === 'function') {
    window.inputChart.destroy();
    window.inputChart = null;
  }
  if (window.throughputChart && typeof window.throughputChart.destroy === 'function') {
    window.throughputChart.destroy();
    window.throughputChart = null;
  }
  if (window.errorRateChart && typeof window.errorRateChart.destroy === 'function') {
    window.errorRateChart.destroy();
    window.errorRateChart = null;
  }
  if (window.errorTrendChart && typeof window.errorTrendChart.destroy === 'function') {
    window.errorTrendChart.destroy();
    window.errorTrendChart = null;
  }
  if (window.errorsByHourChart && typeof window.errorsByHourChart.destroy === 'function') {
    window.errorsByHourChart.destroy();
    window.errorsByHourChart = null;
  }
  if (window.errorsByWeekdayChart && typeof window.errorsByWeekdayChart.destroy === 'function') {
    window.errorsByWeekdayChart.destroy();
    window.errorsByWeekdayChart = null;
  }
  if (window.errorTypePieChart && typeof window.errorTypePieChart.destroy === 'function') {
    window.errorTypePieChart.destroy();
    window.errorTypePieChart = null;
  }
  if (window.errorStackedLineChart && typeof window.errorStackedLineChart.destroy === 'function') {
    window.errorStackedLineChart.destroy();
    window.errorStackedLineChart = null;
  }
  
  // Use a slight delay to ensure DOM is ready before recreating charts
  setTimeout(() => {
    // Update charts with current data
    updateCharts();
    
    // Log tab change for debugging
    console.log(`Tab changed to ${tabId}, charts reinitialized`);
  }, 50);
}

/**
 * Global variable for pattern matches data reference
 */
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
      
      // Initialize error filter with unique error types
      const uniqueErrorTypes = getUniqueErrorTypes(errorData);
      console.log('Unique error types:', uniqueErrorTypes);
      initErrorFilter(uniqueErrorTypes);
      
      // Make error filter functions available globally for debugging
      window.errorFilter = {
        getAllErrorTypes,
        getSelectedErrorTypes,
        toggleErrorType,
        selectAllErrorTypes,
        clearErrorTypeSelection
      };
      
      // Update the error type filter UI with new error types
      if (window.updateErrorTypeFilterUI) {
        window.updateErrorTypeFilterUI();
      }
      
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
      
      // Apply any active filters
      applyFilters();
      
      console.log('Filters applied:', {
        filteredStatusData: filteredStatusData.length,
        filteredErrorData: filteredErrorData.length,
        filteredPatternData: filteredPatternData.length,
        filteredInputData: filteredInputData.length
      });
      
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
  // Apply date filter first (primary filter)
  filteredStatusData = filterDataByDate(statusData, startDate, endDate);
  filteredErrorData = filterDataByDate(errorData, startDate, endDate);
  filteredPatternData = filterDataByDate(patternData, startDate, endDate);
  filteredInputData = filterDataByDate(inputData, startDate, endDate);
  
  // Apply error type filter (secondary filter, only affects error data)
  filteredErrorData = filterByErrorTypes(filteredErrorData);
  
  // Expose filtered data as global variables for other components to use
  window.filteredStatusData = filteredStatusData;
  window.filteredErrorData = filteredErrorData;
  window.filteredPatternData = filteredPatternData;
  window.filteredInputData = filteredInputData;
  
  console.log('Filtered data:', {
    filteredStatusData: filteredStatusData.length,
    filteredErrorData: filteredErrorData.length,
    filteredPatternData: filteredPatternData.length,
    filteredInputData: filteredInputData.length
  });
  
  // Dispatch event to notify components that filters have been applied
  document.dispatchEvent(new CustomEvent('filter-applied', {
    detail: {
      startDate,
      endDate,
      errorTypes: getSelectedErrorTypes()
    }
  }));
  
  // Update tables directly
  updateTables({
    filteredStatusData,
    filteredErrorData,
    filteredPatternData,
    filteredInputData
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
 * Legacy toggle filter function (kept for backward compatibility)
 */
function toggleFilter() {
  // Call the new accordion filter function instead
  toggleAccordionFilter();
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
 * @deprecated Use the modular filterByErrorType from components/filters/errorFilter.js instead
 */
export function filterByErrorType(type) {
  // Use the modular implementation from errorFilter.js
  filteredErrorData = filterByErrorTypeModule(filteredErrorData, type);
  
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
 * @deprecated This function is now just a wrapper for the modular updateUIFromManager function from uiManager.js
 */
export function updateUI() {
  // Call the global window.updateUI function which uses the modular implementation
  window.updateUI();
}

// calculateKPIs function has been moved to the kpiCalc.js module

/**
 * Update summary component with KPIs
 * @param {Object} kpis - Key performance indicators
 * @deprecated This is now just a wrapper for the function in uiManager.js
 */
function updateSummary(kpis) {
  // Use the modular updateSummary function from uiManager.js
  updateSummaryFromManager({
    kpis,
    summaryCard,
    updateKpiGrid
  });
}

/**
 * Update the health widget with KPI data
 * @param {Object} kpis - Key performance indicators
 */
// Function moved to components/widgets/healthGauge.js

/**
 * Calculate health score based on KPIs
 * @deprecated This function has been moved to healthGauge.js
 * @see calculateHealthScore in components/widgets/healthGauge.js
 */
// Function moved to components/widgets/healthGauge.js

/**
 * Get status for error rate
 * @deprecated This function has been moved to healthGauge.js
 * @see getErrorRateStatus in components/widgets/healthGauge.js
 */
// Function moved to components/widgets/healthGauge.js

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
 * @deprecated Use updateCharts from chartManager.js instead
 */
function updateCharts() {
  // Use the modular implementation from chartManager.js
  updateChartsModule({
    filteredErrorData,
    filteredStatusData,
    filteredPatternData,
    startDate,
    endDate
  });
}

/**
 * Get appropriate aggregation interval based on date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} - Aggregation settings
 * @deprecated Use getAggregationInterval from chartManager.js instead
 */
function getAggregationInterval(startDate, endDate) {
  // Use the modular implementation from chartManager.js
  return getAggregationIntervalModule(startDate, endDate);
}

/**
 * Create a stacked line chart showing error types over time
 */
// Function moved to components/charts/errorStackedLine.js

/**
 * Update tables with current data
 * @deprecated This function is now just a wrapper for the modular updateTablesFromManager function from uiManager.js
 */
function updateTables() {
  // Use the modular updateTables function from uiManager.js
  updateTablesFromManager({
    filteredErrorData,
    getKnownErrorPatterns,
    getChartColor,
    formatDateTime,
    updateErrorTable,
    updateTopErrorsList
  });
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
 * @deprecated This is now just a wrapper for the function in uiManager.js
 */
function updateLastUpdateTime() {
  // Use the modular updateLastUpdateTime function from uiManager.js
  return updateLastUpdateTimeFromManager({
    updateLastUpdateTimeFromModule,
    formatDateTime,
    filteredData: filteredStatusData,
    lastBackendRunTime: window.lastBackendRunTime
  });
}

/**
 * Update the filter display
 * @deprecated This is now just a wrapper for the function in uiManager.js
 */
function updateFilterDisplay() {
  // Use the modular updateFilterDisplay function from uiManager.js
  updateFilterDisplayFromManager({
    startDate,
    endDate,
    updateLastUpdateTimeFn: updateLastUpdateTime
  });
}

// toggleCard function moved to uiManager.js

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
  toggleAccordionFilter,
  applyDateFilter,
  resetDateFilter,
  shiftDateRange,
  adjustDate,
  adjustTime
};
