/**
 * UI Manager
 * Handles UI interactions and card toggling functionality
 */

/**
 * Toggle card content visibility
 * @param {string} cardId - ID of the card to toggle
 */
function toggleCard(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  
  const content = card.querySelector('.mdl-card__supporting-text');
  const toggleBtn = card.querySelector('.toggle-card-btn i');
  
  if (!content || !toggleBtn) return;
  
  // Use a class-based approach instead of inline styles
  if (card.classList.contains('card-collapsed')) {
    // Expand the card - first make it visible
    content.style.display = 'block';
    
    // Force a reflow to ensure the display change takes effect before animation
    content.offsetHeight;
    
    // Now remove the collapsed class to trigger the animation
    card.classList.remove('card-collapsed');
    // Keep the same icon and let CSS handle the rotation
    
    // Icon rotation is now handled by CSS
    
    // Add a small delay to allow the transition to work
    setTimeout(() => {
      // Reset heights on chart containers
      const chartContainers = content.querySelectorAll('.chart-container, .small-chart-container');
      chartContainers.forEach(container => {
        container.style.height = container.getAttribute('data-original-height') || '';
      });
      
      // Show any canvases
      const canvases = content.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        canvas.style.display = 'block';
      });
    }, 50);
  } else {
    // Collapse the card
    card.classList.add('card-collapsed');
    
    // Icon rotation is now handled by CSS
    
    // Store heights before collapsing
    const chartContainers = content.querySelectorAll('.chart-container, .small-chart-container');
    chartContainers.forEach(container => {
      if (!container.getAttribute('data-original-height')) {
        container.setAttribute('data-original-height', container.style.height || getComputedStyle(container).height);
      }
      container.style.height = '0';
    });
    
    // Hide canvases (they can interfere with smooth height animation)
    const canvases = content.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      canvas.style.display = 'none';
    });
    
    // Hide content after the transition completes
    setTimeout(() => {
      // Only set display:none after the animation completes
      content.style.display = 'none';
    }, 350); // Match the cubic-bezier transition duration
    
    // Keep the same icon and let CSS handle the rotation
  }
}

/**
 * Setup event listeners for card toggle buttons
 */
function setupCardToggleListeners() {
  // Track cards that are currently being toggled to prevent double-click issues
  const toggleInProgress = {};
  
  // Add click listeners to all toggle buttons
  const toggleButtons = document.querySelectorAll('.toggle-card-btn');
  toggleButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      // Prevent event from propagating to card title
      event.stopPropagation();
      
      const card = button.closest('.mdl-card');
      if (card && !toggleInProgress[card.id]) {
        // Set flag to prevent multiple rapid toggles
        toggleInProgress[card.id] = true;
        
        // Toggle the card
        toggleCard(card.id);
        
        // Clear the flag after animation completes
        setTimeout(() => {
          toggleInProgress[card.id] = false;
        }, 400); // Slightly longer than the animation duration
      }
    });
  });
  
  // Add click listeners to card titles
  const cardTitles = document.querySelectorAll('.mdl-card__title');
  cardTitles.forEach(title => {
    title.addEventListener('click', (event) => {
      // Only handle clicks directly on the title, not on buttons within it
      if (event.target === title || event.target.classList.contains('mdl-card__title-text')) {
        const card = title.closest('.mdl-card');
        if (card && !toggleInProgress[card.id]) {
          // Set flag to prevent multiple rapid toggles
          toggleInProgress[card.id] = true;
          
          // Toggle the card
          toggleCard(card.id);
          
          // Clear the flag after animation completes
          setTimeout(() => {
            toggleInProgress[card.id] = false;
          }, 350); // Slightly longer than the animation duration
        }
      }
    });
  });
}

/**
 * Toggle the accordion filter visibility
 */
function toggleAccordionFilter() {
  console.log('toggleAccordionFilter called');
  
  let accordionFilter = document.getElementById('accordionFilter');
  let filterToggleBtn = document.getElementById('filterToggleBtn');
  
  if (!accordionFilter) {
    console.error('Accordion filter element not found');
    return;
  }
  
  // Toggle expanded state
  let isExpanded = accordionFilter.classList.toggle('expanded');
  
  if (filterToggleBtn) {
    filterToggleBtn.classList.toggle('expanded', isExpanded);
  }
  
  console.log('Accordion expanded state:', isExpanded);
  
  // Adjust the page content if needed
  let pageContent = document.querySelector('.page-content');
  if (pageContent) {
    if (isExpanded) {
      pageContent.classList.add('filter-expanded');
    } else {
      pageContent.classList.remove('filter-expanded');
    }
  }
}

/**
 * Setup event listeners for accordion filter
 */
function setupAccordionFilterListeners() {
  // Prevent attaching multiple event listeners
  if (window._accordionListenersInitialized) {
    console.log('Accordion filter listeners already initialized');
    return;
  }

  // Accordion close button
  const accordionCloseBtn = document.getElementById('accordionCloseBtn');
  if (accordionCloseBtn) {
    accordionCloseBtn.addEventListener('click', toggleAccordionFilter);
  }
  
  // Filter toggle button in the header
  // This is the proper place for this event listener as part of UI management
  const filterToggleBtn = document.getElementById('filterToggleBtn');
  if (filterToggleBtn) {
    // Check if the event listener is already attached (for backward compatibility)
    if (!filterToggleBtn._hasToggleListener) {
      filterToggleBtn.addEventListener('click', toggleAccordionFilter);
      // Mark the button as having the listener to prevent duplicates
      filterToggleBtn._hasToggleListener = true;
    }
  }
  
  // Set flag to indicate listeners are initialized
  window._accordionListenersInitialized = true;
  console.log('Accordion filter listeners initialized');
}

/**
 * Initialize all UI components
 */
function initUI() {
  console.log('Initializing UI components...');
  
  // Setup card toggle listeners
  setupCardToggleListeners();
  
  // Setup accordion filter listeners
  setupAccordionFilterListeners();
}

/**
 * Register a dropdown to be closed when the accordion filter is closed
 * This allows for centralized management of UI interactions
 * @param {string} dropdownId - ID of the dropdown element to manage
 */
function registerDropdownWithAccordion(dropdownId) {
  const accordionFilter = document.getElementById('accordionFilter');
  const dropdown = document.getElementById(dropdownId);
  
  if (!accordionFilter || !dropdown) {
    console.error('Cannot register dropdown: elements not found');
    return;
  }
  
  // Create a MutationObserver to watch for changes in the accordion's class
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.attributeName === 'class') {
        // If the accordion is no longer expanded and the dropdown is visible, close it
        if (!accordionFilter.classList.contains('expanded') && 
            dropdown.style.display === 'block' && 
            typeof dropdown.closeDropdown === 'function') {
          dropdown.closeDropdown();
        }
      }
    });
  });
  
  // Start observing the accordion for class changes
  observer.observe(accordionFilter, { attributes: true });
  
  // Store the observer on the dropdown for later cleanup
  dropdown.accordionObserver = observer;
  
  console.log(`Dropdown ${dropdownId} registered with accordion filter`);
  return observer;
}

/**
 * Unregister a dropdown from accordion filter monitoring
 * @param {string} dropdownId - ID of the dropdown to unregister
 */
function unregisterDropdownFromAccordion(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  
  if (!dropdown || !dropdown.accordionObserver) {
    return;
  }
  
  // Disconnect the observer
  dropdown.accordionObserver.disconnect();
  dropdown.accordionObserver = null;
  console.log(`Dropdown ${dropdownId} unregistered from accordion filter`);
}

/**
 * Update the UI with current data
 * @param {Object} params - Parameters for UI update
 * @param {Array} params.filteredStatusData - Filtered status data
 * @param {Array} params.filteredErrorData - Filtered error data
 * @param {Array} params.filteredPatternData - Filtered pattern data
 * @param {Array} params.errorData - All error data
 * @param {Date} params.startDate - Start date of the filter range
 * @param {Date} params.endDate - End date of the filter range
 * @param {Function} params.calculateKPIs - Function to calculate KPIs
 * @param {Function} params.updateHealthWidget - Function to update health widget
 * @param {Function} params.debugErrorCategorization - Function to debug error categorization
 * @param {Function} params.updateCharts - Function to update charts
 */
function updateUI(params) {
  const {
    filteredStatusData,
    filteredErrorData,
    filteredPatternData,
    errorData,
    startDate,
    endDate,
    calculateKPIs,
    updateHealthWidget,
    debugErrorCategorization,
    updateCharts,
    widgetA
  } = params;
  
  // Calculate KPIs using our modular calculation component
  const kpis = calculateKPIs({
    filteredStatusData,
    filteredErrorData,
    filteredPatternData,
    errorData,
    startDate,
    endDate
  });
  
  // Update summary component
  updateSummary({
    kpis,
    summaryCard: params.summaryCard,
    updateKpiGrid: params.updateKpiGrid
  });
  
  // Update health widget
  updateHealthWidget(kpis, widgetA);
  
  // Debug error categorization
  if (debugErrorCategorization) {
    debugErrorCategorization();
  }
  
  // Update charts
  updateCharts({
    filteredStatusData,
    filteredErrorData,
    filteredPatternData,
    startDate,
    endDate
  });
  
  // Update tables
  updateTables({
    filteredErrorData,
    getKnownErrorPatterns: params.getKnownErrorPatterns,
    getChartColor: params.getChartColor,
    formatDateTime: params.formatDateTime,
    updateErrorTable: params.updateErrorTable,
    updateTopErrorsList: params.updateTopErrorsList
  });
}

/**
 * Update summary component with KPIs
 * @param {Object} params - Parameters for summary update
 * @param {Object} params.kpis - Key performance indicators
 * @param {Object} params.summaryCard - Summary card component
 * @param {Function} params.updateKpiGrid - Function to update KPI grid
 */
function updateSummary(params) {
  const { kpis, summaryCard, updateKpiGrid } = params;
  
  // Update summary card using our modular component
  if (summaryCard) {
    summaryCard.update(kpis);
  }
  
  // Update KPI grid using our modular component
  if (updateKpiGrid) {
    updateKpiGrid(kpis);
  }
}

/**
 * Update tables with current data
 * @param {Object} params - Parameters for tables update
 * @param {Array} params.filteredErrorData - Filtered error data
 * @param {Function} params.getKnownErrorPatterns - Function to get known error patterns
 * @param {Function} params.getChartColor - Function to get chart color
 * @param {Function} params.formatDateTime - Function to format date time
 * @param {Function} params.updateErrorTable - Function to update error table
 * @param {Function} params.updateTopErrorsList - Function to update top errors list
 */
function updateTables(params) {
  const {
    filteredStatusData,
    filteredErrorData,
    filteredPatternData,
    filteredInputData,
    getKnownErrorPatterns,
    getChartColor,
    formatDateTime,
    updateErrorTable,
    updateTopErrorsList
  } = params;
  
  // Update error table with filtered data
  if (updateErrorTable && formatDateTime) {
    updateErrorTable(filteredErrorData, formatDateTime);
  }
  
  // Update top errors list
  if (updateTopErrorsList && getKnownErrorPatterns && getChartColor) {
    updateTopErrorsList(filteredErrorData, getKnownErrorPatterns(), getChartColor);
  }
  
  // Update data tables with filtered data
  if (window.updateTablesWithFilters && typeof window.updateTablesWithFilters === 'function') {
    console.log('Calling updateTablesWithFilters from uiManager.updateTables');
    window.updateTablesWithFilters();
  }
}

/**
 * Update the last update timestamp
 * @param {Object} params - Parameters for last update time
 * @param {Function} params.updateLastUpdateTimeFromModule - Function from autoRefresh module
 * @param {Function} params.formatDateTime - Function to format date time
 * @param {Array} params.filteredData - Filtered status data
 * @param {string} params.lastBackendRunTime - Last backend run time
 */
function updateLastUpdateTime(params) {
  const {
    updateLastUpdateTimeFromModule,
    formatDateTime,
    filteredData,
    lastBackendRunTime
  } = params;
  
  // To avoid circular references, we don't call back to this function
  if (updateLastUpdateTimeFromModule) {
    return updateLastUpdateTimeFromModule({
      formatDateTime: formatDateTime,
      filteredData: filteredData,
      lastBackendRunTime: lastBackendRunTime,
      skipCallback: true // Important: prevent circular reference
    });
  }
}

/**
 * Update the filter display
 * @param {Object} params - Parameters for filter display update
 * @param {Date} params.startDate - Start date of the filter range
 * @param {Date} params.endDate - End date of the filter range
 * @param {Function} params.updateLastUpdateTimeFn - Function to update last update time
 */
function updateFilterDisplay(params) {
  const { startDate, endDate, updateLastUpdateTimeFn } = params;
  
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
  if (updateLastUpdateTimeFn) {
    updateLastUpdateTimeFn();
  }
}

// Export functions to global scope for any remaining inline handlers
window.toggleCard = toggleCard;
window.toggleAccordionFilter = toggleAccordionFilter;

// Export functions for ES modules
export {
  toggleCard,
  initUI,
  toggleAccordionFilter,
  registerDropdownWithAccordion,
  unregisterDropdownFromAccordion,
  updateUI,
  updateSummary,
  updateTables,
  updateLastUpdateTime,
  updateFilterDisplay
};
