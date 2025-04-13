/**
 * Date Filter Widget Component
 * Handles date range selection, slider, and quick filters
 */
import { formatDate, formatTime, formatDateTime, debounce } from '../../scripts/utils.js';
import { adjustDate, adjustTime } from '../../scripts/dateUtils.js';

// Default values
const DEFAULT_RANGE_DAYS = 1;

/**
 * Initialize the date filter component
 * @param {Object} options - Configuration options
 * @param {Function} options.onFilterChange - Callback when filter changes
 * @param {HTMLElement} options.container - Container element
 * @returns {Object} - Date filter API
 */
export function initDateFilter(options = {}) {
  const container = options.container || document.getElementById('filterContent');
  const onFilterChange = options.onFilterChange || (() => {});
  
  // Create filter container HTML
  createDateFilterUI(container, onFilterChange);
  
  // Get date range - use global values if available, otherwise use default
  let startDateValue, endDateValue;
  
  // Check if data-driven date range is available
  if (window.dataDateRange && window.dataDateRange.minDate && window.dataDateRange.maxDate) {
    // Use the last day of data as the default range
    const maxDate = window.dataDateRange.maxDate;
    const oneDayBefore = new Date(maxDate);
    oneDayBefore.setDate(maxDate.getDate() - 1);
    
    startDateValue = oneDayBefore;
    endDateValue = maxDate;
    
    console.log('Using data-driven date range from dashboard:', {
      startDate: startDateValue.toISOString(),
      endDate: endDateValue.toISOString(),
      dataMinDate: window.dataDateRange.minDate.toISOString(),
      dataMaxDate: window.dataDateRange.maxDate.toISOString()
    });
  } else {
    // Use default date range as fallback
    const { startDate, endDate } = setDefaultDateRange();
    startDateValue = startDate;
    endDateValue = endDate;
  }
  
  // Initialize slider
  initDateRangeSlider(startDateValue, endDateValue);
  
  // Update time markers
  updateTimeMarkers();
  
  // Initialize date/time inputs
  updateDateTimeInputs(startDateValue, endDateValue);
  
  // Setup event listeners
  setupDateFilterEvents(onFilterChange);
  
  // Return public API
  return {
    getDateRange: () => ({ startDate: startDateValue, endDate: endDateValue }),
    setDateRange: (start, end) => {
      updateSlider(start, end);
      updateDateTimeInputs(start, end);
      updateTimeMarkers();
    },
    applyQuickFilter: (value, unit) => applyQuickFilter(value, unit, onFilterChange),
    toggleQuickFilterDropdown: (event) => toggleQuickFilterDropdown(event)
  };
}

/**
 * Create the date filter UI
 * @param {HTMLElement} container - Container element
 * @param {Function} onFilterChange - Callback when filter changes
 */
function createDateFilterUI(container, onFilterChange) {
  if (!container) return;
  
  // Clear container
  container.innerHTML = '';
  
  // Create date range slider container
  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'date-range-slider-container mdl-shadow--2dp';
  
  // Create slider title
  const sliderTitle = document.createElement('div');
  sliderTitle.className = 'date-range-slider-title';
  sliderTitle.textContent = 'Zeitraumauswahl';
  sliderContainer.appendChild(sliderTitle);
  
  // Create slider controls
  const sliderControls = document.createElement('div');
  sliderControls.className = 'slider-controls';
  
  // Create slider
  const slider = document.createElement('div');
  slider.id = 'dateRangeSlider';
  slider.className = 'slider-container';
  sliderControls.appendChild(slider);
  
  // Create slider duration tooltip
  const sliderTooltip = document.createElement('div');
  sliderTooltip.id = 'sliderDurationTooltip';
  sliderTooltip.className = 'slider-duration-tooltip';
  sliderTooltip.textContent = '1 Tag';
  sliderTooltip.style.position = 'absolute';
  sliderTooltip.style.top = '0px'; // Position closer to the slider
  sliderTooltip.style.left = '50%';
  sliderTooltip.style.transform = 'translateX(-50%)';
  sliderTooltip.style.backgroundColor = 'var(--accent-color, #3f51b5)';
  sliderTooltip.style.color = 'white';
  sliderTooltip.style.padding = '4px 8px';
  sliderTooltip.style.borderRadius = '4px';
  sliderTooltip.style.fontSize = '12px';
  sliderTooltip.style.whiteSpace = 'nowrap';
  sliderTooltip.style.zIndex = '5';
  sliderTooltip.style.display = 'block';
  sliderTooltip.style.cursor = 'grab';
  sliderControls.appendChild(sliderTooltip);
  
  // Create time markers
  const timeMarkers = document.createElement('div');
  timeMarkers.id = 'timeMarkers';
  timeMarkers.className = 'time-markers';
  sliderControls.appendChild(timeMarkers);
  
  sliderContainer.appendChild(sliderControls);
  
  // Create timeframe navigation
  const timeframeNav = document.createElement('div');
  timeframeNav.className = 'timeframe-navigation';
  
  // Store reference to module function
  const moduleShiftDateRange = shiftDateRange;
  
  // Previous period button
  const prevBtn = document.createElement('button');
  prevBtn.id = 'prevPeriodBtn';
  prevBtn.className = 'timeframe-button';
  prevBtn.onclick = function() { 
    moduleShiftDateRange(-1, onFilterChange); 
  };
  const prevIcon = document.createElement('i');
  prevIcon.className = 'material-icons';
  prevIcon.textContent = 'chevron_left';
  prevBtn.appendChild(prevIcon);
  timeframeNav.appendChild(prevBtn);
  
  // Timeframe display
  const timeframeDisplay = document.createElement('div');
  timeframeDisplay.id = 'timeframeDisplay';
  timeframeDisplay.className = 'timeframe-display';
  timeframeDisplay.innerHTML = 'Zeitraum: <span id="timeframeDuration">1 Tag</span>';
  timeframeNav.appendChild(timeframeDisplay);
  
  // Next period button
  const nextBtn = document.createElement('button');
  nextBtn.id = 'nextPeriodBtn';
  nextBtn.className = 'timeframe-button';
  nextBtn.onclick = function() { 
    moduleShiftDateRange(1, onFilterChange); 
  };
  const nextIcon = document.createElement('i');
  nextIcon.className = 'material-icons';
  nextIcon.textContent = 'chevron_right';
  nextBtn.appendChild(nextIcon);
  timeframeNav.appendChild(nextBtn);
  
  // Quick filter dropdown container
  const quickFilterContainer = document.createElement('div');
  quickFilterContainer.className = 'quick-filter-dropdown-container';
  
  // Quick filter button
  const quickFilterBtn = document.createElement('button');
  quickFilterBtn.id = 'quick-filter-button';
  quickFilterBtn.className = 'mdl-button mdl-js-button mdl-button--icon';
  quickFilterBtn.title = 'Schnell-Filter';
  
  // Use local function reference instead of global window function
  quickFilterBtn.onclick = function(event) { 
    toggleQuickFilterDropdown(event); 
  };
  
  const filterIcon = document.createElement('i');
  filterIcon.className = 'material-icons';
  filterIcon.textContent = 'filter_list';
  quickFilterBtn.appendChild(filterIcon);
  quickFilterContainer.appendChild(quickFilterBtn);
  
  // Quick filter dropdown
  const quickFilterDropdown = document.createElement('div');
  quickFilterDropdown.className = 'quick-filter-dropdown-content';
  quickFilterDropdown.id = 'quickFilterDropdown';
  
  // Add quick filter options
  const quickFilterOptions = [
    { value: 5, unit: 'minute', label: 'Letzte 5 Minuten' },
    { value: 15, unit: 'minute', label: 'Letzte 15 Minuten' },
    { value: 30, unit: 'minute', label: 'Letzte 30 Minuten' },
    { value: 60, unit: 'minute', label: 'Letzte 60 Minuten' },
    { value: 4, unit: 'hour', label: 'Letzte 4 Stunden' },
    { value: 8, unit: 'hour', label: 'Letzte 8 Stunden' },
    { value: 1, unit: 'day', label: 'Letzter Tag' },
    { value: 7, unit: 'day', label: 'Letzte Woche' },
    { value: 14, unit: 'day', label: 'Letzte 2 Wochen' },
    { value: 30, unit: 'day', label: 'Letzter Monat' },
    { value: 90, unit: 'day', label: 'Letzte 3 Monate' },
    { value: 180, unit: 'day', label: 'Letzte 6 Monate' },
    { value: 365, unit: 'day', label: 'Letztes Jahr' }
  ];
  
  // Store a reference to the module's applyQuickFilter function
  const moduleApplyQuickFilter = applyQuickFilter;
  
  quickFilterOptions.forEach(option => {
    const item = document.createElement('div');
    item.className = 'quick-filter-dropdown-item';
    item.textContent = option.label;
    
    // Use local function reference instead of global window function
    item.onclick = function() {
      // Call the module's applyQuickFilter function directly with the onFilterChange callback
      moduleApplyQuickFilter(option.value, option.unit, onFilterChange);
      quickFilterDropdown.style.display = 'none';
    };
    
    quickFilterDropdown.appendChild(item);
  });
  
  quickFilterContainer.appendChild(quickFilterDropdown);
  timeframeNav.appendChild(quickFilterContainer);
  
  sliderContainer.appendChild(timeframeNav);
  
  // Create date/time inputs
  const startDateGroup = createDateTimeGroup('Startdatum und -zeit', 'startDate', 'startTime');
  const endDateGroup = createDateTimeGroup('Enddatum und -zeit', 'endDate', 'endTime');
  
  // Create filter actions
  const filterActions = document.createElement('div');
  filterActions.className = 'filter-actions';
  
  // Store references to module functions
  const moduleResetDateFilter = resetDateFilter;
  const moduleApplyDateFilter = applyDateFilter;
  
  // Reset button
  const resetBtn = document.createElement('button');
  resetBtn.id = 'resetFilterBtn';
  resetBtn.className = 'mdl-button mdl-js-button';
  resetBtn.textContent = 'Zurücksetzen';
  resetBtn.onclick = function() { 
    moduleResetDateFilter(onFilterChange); 
  };
  filterActions.appendChild(resetBtn);
  
  // Apply button
  const applyBtn = document.createElement('button');
  applyBtn.id = 'applyFilterBtn';
  applyBtn.className = 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent';
  applyBtn.textContent = 'Anwenden';
  applyBtn.onclick = function() { 
    moduleApplyDateFilter(onFilterChange); 
  };
  filterActions.appendChild(applyBtn);
  
  // Append all elements to container
  container.appendChild(sliderContainer);
  container.appendChild(startDateGroup);
  container.appendChild(endDateGroup);
  container.appendChild(filterActions);
}

/**
 * Create a date/time input group
 * @param {string} label - Group label
 * @param {string} dateId - Date input ID
 * @param {string} timeId - Time input ID
 * @returns {HTMLElement} - Date/time group element
 */
function createDateTimeGroup(label, dateId, timeId) {
  const group = document.createElement('div');
  group.className = 'filter-group';
  group.style.display = 'flex';
  group.style.flexDirection = 'column';
  group.style.margin = '8px 16px';
  group.style.justifyContent = 'flex-start';
  
  const labelEl = document.createElement('label');
  labelEl.className = 'filter-label';
  labelEl.style.color = 'white';
  labelEl.style.marginTop = '0';
  labelEl.textContent = label;
  group.appendChild(labelEl);
  
  const inputGroup = document.createElement('div');
  inputGroup.className = 'date-time-input-group';
  
  // Date input container
  const dateContainer = document.createElement('div');
  dateContainer.className = 'date-time-flex-container';
  
  // Date input
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.id = dateId;
  dateInput.className = 'date-input';
  dateContainer.appendChild(dateInput);
  
  // Date controls
  const dateControls = document.createElement('div');
  dateControls.className = 'date-time-controls';
  
  // Up button
  const dateUpBtn = document.createElement('button');
  dateUpBtn.className = 'mdl-button mdl-js-button mdl-button--icon date-time-control-btn';
  dateUpBtn.onclick = function() { 
    adjustDate(dateId, 1, 'day', function(start, end) {
      // Update global date variables
      window.startDate = start;
      window.endDate = end;
      
      // Apply filters and update UI if the functions are available
      if (typeof window.applyFilters === 'function') window.applyFilters();
      if (typeof window.updateUI === 'function') window.updateUI();
      if (typeof window.updateFilterDisplay === 'function') window.updateFilterDisplay();
    });
  };
  const dateUpIcon = document.createElement('i');
  dateUpIcon.className = 'material-icons';
  dateUpIcon.textContent = 'keyboard_arrow_up';
  dateUpBtn.appendChild(dateUpIcon);
  dateControls.appendChild(dateUpBtn);
  
  // Down button
  const dateDownBtn = document.createElement('button');
  dateDownBtn.className = 'mdl-button mdl-js-button mdl-button--icon date-time-control-btn';
  dateDownBtn.onclick = function() { 
    adjustDate(dateId, -1, 'day', function(start, end) {
      // Update global date variables
      window.startDate = start;
      window.endDate = end;
      
      // Apply filters and update UI if the functions are available
      if (typeof window.applyFilters === 'function') window.applyFilters();
      if (typeof window.updateUI === 'function') window.updateUI();
      if (typeof window.updateFilterDisplay === 'function') window.updateFilterDisplay();
    });
  };
  const dateDownIcon = document.createElement('i');
  dateDownIcon.className = 'material-icons';
  dateDownIcon.textContent = 'keyboard_arrow_down';
  dateDownBtn.appendChild(dateDownIcon);
  dateControls.appendChild(dateDownBtn);
  
  dateContainer.appendChild(dateControls);
  inputGroup.appendChild(dateContainer);
  
  // Time input container
  const timeContainer = document.createElement('div');
  timeContainer.className = 'date-time-flex-container';
  
  // Time input
  const timeInput = document.createElement('input');
  timeInput.type = 'time';
  timeInput.id = timeId;
  timeInput.className = 'time-input';
  timeContainer.appendChild(timeInput);
  
  // Time controls
  const timeControls = document.createElement('div');
  timeControls.className = 'date-time-controls';
  
  // Up button
  const timeUpBtn = document.createElement('button');
  timeUpBtn.className = 'mdl-button mdl-js-button mdl-button--icon date-time-control-btn';
  timeUpBtn.onclick = function() { 
    adjustTime(timeId, 1, 'hour', function(start, end) {
      // Update global date variables
      window.startDate = start;
      window.endDate = end;
      
      // Apply filters and update UI if the functions are available
      if (typeof window.applyFilters === 'function') window.applyFilters();
      if (typeof window.updateUI === 'function') window.updateUI();
      if (typeof window.updateFilterDisplay === 'function') window.updateFilterDisplay();
    });
  };
  const timeUpIcon = document.createElement('i');
  timeUpIcon.className = 'material-icons';
  timeUpIcon.textContent = 'keyboard_arrow_up';
  timeUpBtn.appendChild(timeUpIcon);
  timeControls.appendChild(timeUpBtn);
  
  // Down button
  const timeDownBtn = document.createElement('button');
  timeDownBtn.className = 'mdl-button mdl-js-button mdl-button--icon date-time-control-btn';
  timeDownBtn.onclick = function() { 
    adjustTime(timeId, -1, 'hour', function(start, end) {
      // Update global date variables
      window.startDate = start;
      window.endDate = end;
      
      // Apply filters and update UI if the functions are available
      if (typeof window.applyFilters === 'function') window.applyFilters();
      if (typeof window.updateUI === 'function') window.updateUI();
      if (typeof window.updateFilterDisplay === 'function') window.updateFilterDisplay();
    });
  };
  const timeDownIcon = document.createElement('i');
  timeDownIcon.className = 'material-icons';
  timeDownIcon.textContent = 'keyboard_arrow_down';
  timeDownBtn.appendChild(timeDownIcon);
  timeControls.appendChild(timeDownBtn);
  
  timeContainer.appendChild(timeControls);
  inputGroup.appendChild(timeContainer);
  
  group.appendChild(inputGroup);
  
  return group;
}

/**
 * Adjust date by a specified amount
 * @param {string} inputId - ID of the date input element
 * @param {number} amount - Amount to adjust by
 * @param {string} unit - Unit to adjust by (day, month, year)
 */
// adjustDate function moved to dateUtils.js

/**
 * Adjust time by a specified amount
 * @param {string} inputId - ID of the time input element
 * @param {number} amount - Amount to adjust by
 * @param {string} unit - Unit to adjust by (hour, minute)
 */
// adjustTime function moved to dateUtils.js

/**
 * Set default date range
 * @returns {Object} - Start and end dates
 */
function setDefaultDateRange() {
  try {
    // Use the current date and time
    const now = new Date();
    const oneDayAgo = new Date(now.getTime());
    oneDayAgo.setDate(now.getDate() - DEFAULT_RANGE_DAYS);
    
    console.log('Setting default date range:', {
      now: now.toISOString(),
      oneDayAgo: oneDayAgo.toISOString()
    });
    
    return { startDate: oneDayAgo, endDate: now };
  } catch (error) {
    console.error('Error setting default date range:', error);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return { startDate: yesterday, endDate: now };
  }
}

/**
 * Initialize the date range slider
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
function initDateRangeSlider(startDate, endDate) {
  const slider = document.getElementById('dateRangeSlider');
  if (!slider) {
    console.error('Date range slider element not found');
    return;
  }
  
  try {
    // Get min/max dates from data if available, otherwise use default range
    let minDate, maxDate;
    
    if (window.dataDateRange && window.dataDateRange.minDate && window.dataDateRange.maxDate) {
      // Use the date range from the actual data
      minDate = window.dataDateRange.minDate;
      maxDate = window.dataDateRange.maxDate;
    } else {
      // Fallback to default range (30 days before start to current date)
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      minDate = thirtyDaysAgo;
      maxDate = now;
    }
    
    // Create slider
    if (slider.noUiSlider) {
      slider.noUiSlider.destroy();
    }
    
    // IMPORTANT: Force the range to match the actual data range from CSV
    // This ensures the slider shows the correct range
    if (window.dataDateRange && window.dataDateRange.minDate && window.dataDateRange.maxDate) {
      minDate = window.dataDateRange.minDate;
      maxDate = window.dataDateRange.maxDate;
    }
    
    // Calculate range span in days for logging
    const rangeSpanDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`FINAL SLIDER RANGE: ${rangeSpanDays} days from ${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`);
    
    noUiSlider.create(slider, {
      start: [startDate.getTime(), endDate.getTime()],
      connect: true,
      behaviour: 'tap-drag',  // Enable clicking on the slider to move it
      range: {
        'min': minDate.getTime(),
        'max': maxDate.getTime()
      },
      step: 60 * 1000, // 1 minute steps
      format: {
        to: value => value,
        from: value => value
      }
    });
    
    // Add event listener for slider updates - use a longer debounce for input updates
    // but update the tooltip position more frequently
    slider.noUiSlider.on('update', function(values, handle) {
      try {
        const startTimestamp = parseFloat(values[0]);
        const endTimestamp = parseFloat(values[1]);
        
        if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
          return;
        }
        
        const newStartDate = new Date(startTimestamp);
        const newEndDate = new Date(endTimestamp);
        
        // Update duration tooltip position immediately
        updateDurationTooltip(newStartDate, newEndDate);
      } catch (error) {
        console.error('Error updating tooltip position:', error);
      }
    });
    
    // Use a separate debounced handler for updating inputs (which is more expensive)
    slider.noUiSlider.on('update', debounce(function(values, handle) {
      try {
        const startTimestamp = parseFloat(values[0]);
        const endTimestamp = parseFloat(values[1]);
        
        if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
          console.error('Invalid slider values:', values);
          return;
        }
        
        const newStartDate = new Date(startTimestamp);
        const newEndDate = new Date(endTimestamp);
        
        // Update date/time inputs (more expensive operation)
        updateDateTimeInputs(newStartDate, newEndDate);
      } catch (error) {
        console.error('Error updating date/time inputs:', error);
      }
    }, 250)); // Longer debounce time for expensive operations
    
    // Add event listener for when slider value is set (after user interaction)
    slider.noUiSlider.on('set', function(values, handle) {
      try {
        const startTimestamp = parseFloat(values[0]);
        const endTimestamp = parseFloat(values[1]);
        
        if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
          console.error('Invalid slider values:', values);
          return;
        }
        
        const newStartDate = new Date(startTimestamp);
        const newEndDate = new Date(endTimestamp);
        
        // Update global date variables
        if (window.startDate !== undefined && window.endDate !== undefined) {
          window.startDate = newStartDate;
          window.endDate = newEndDate;
          
          // Apply filters and update UI
          if (typeof window.applyFilters === 'function') window.applyFilters();
          if (typeof window.updateUI === 'function') window.updateUI();
          if (typeof window.updateFilterDisplay === 'function') window.updateFilterDisplay();
        }
      } catch (error) {
        console.error('Error handling slider set event:', error);
      }
    });
    
    // Make the duration tooltip draggable
    initDurationTooltip(slider);
    
    console.log('Date range slider initialized');
  } catch (error) {
    console.error('Error initializing date range slider:', error);
  }
}

/**
 * Initialize the duration tooltip
 * @param {HTMLElement} slider - Slider element
 */
function initDurationTooltip(slider) {
  const tooltip = document.getElementById('sliderDurationTooltip');
  if (!tooltip) {
    console.error('Slider duration tooltip element not found');
    return;
  }
  
  let isDragging = false;
  let startX = 0;
  let startLeft = 0;
  
  // Mouse events
  tooltip.addEventListener('mousedown', function(e) {
    isDragging = true;
    startX = e.clientX;
    startLeft = parseFloat(tooltip.style.left || '50');
    tooltip.style.cursor = 'grabbing';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    const newLeft = Math.max(0, Math.min(100, startLeft + dx * 0.1));
    tooltip.style.left = newLeft + '%';
    
    // Only update the slider position during dragging, not the UI
    // Store the position for later use
    tooltip._lastPosition = newLeft;
    updateRangeFromTooltip(newLeft, true); // true = dragging mode (no UI updates)
  });
  
  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      tooltip.style.cursor = 'grab';
      
      // Now that dragging is done, update the UI with the final position
      if (tooltip._lastPosition !== undefined) {
        // Update with UI refresh
        updateRangeFromTooltip(tooltip._lastPosition, false); // false = apply UI updates
        
        // Apply filters and update UI
        const slider = document.getElementById('dateRangeSlider');
        if (slider && slider.noUiSlider) {
          const values = slider.noUiSlider.get();
          const startTimestamp = parseFloat(values[0]);
          const endTimestamp = parseFloat(values[1]);
          
          if (!isNaN(startTimestamp) && !isNaN(endTimestamp)) {
            const newStartDate = new Date(startTimestamp);
            const newEndDate = new Date(endTimestamp);
            
            // Update global date variables
            if (window.startDate !== undefined && window.endDate !== undefined) {
              window.startDate = newStartDate;
              window.endDate = newEndDate;
              
              // Apply filters and update UI
              if (typeof window.applyFilters === 'function') window.applyFilters();
              if (typeof window.updateUI === 'function') window.updateUI();
              if (typeof window.updateFilterDisplay === 'function') window.updateFilterDisplay();
            }
          }
        }
      }
    }
  });
  
  // Touch events for mobile
  tooltip.addEventListener('touchstart', function(e) {
    isDragging = true;
    startX = e.touches[0].clientX;
    startLeft = parseFloat(tooltip.style.left || '50');
    e.preventDefault();
  });
  
  document.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    
    const dx = e.touches[0].clientX - startX;
    const newLeft = Math.max(0, Math.min(100, startLeft + dx * 0.1));
    tooltip.style.left = newLeft + '%';
    
    // Only update the slider position during dragging, not the UI
    // Store the position for later use
    tooltip._lastPosition = newLeft;
    updateRangeFromTooltip(newLeft, true); // true = dragging mode (no UI updates)
  });
  
  document.addEventListener('touchend', function() {
    if (isDragging) {
      isDragging = false;
      
      // Now that dragging is done, update the UI with the final position
      if (tooltip._lastPosition !== undefined) {
        // Update with UI refresh
        updateRangeFromTooltip(tooltip._lastPosition, false); // false = apply UI updates
        
        // Apply filters and update UI
        const slider = document.getElementById('dateRangeSlider');
        if (slider && slider.noUiSlider) {
          const values = slider.noUiSlider.get();
          const startTimestamp = parseFloat(values[0]);
          const endTimestamp = parseFloat(values[1]);
          
          if (!isNaN(startTimestamp) && !isNaN(endTimestamp)) {
            const newStartDate = new Date(startTimestamp);
            const newEndDate = new Date(endTimestamp);
            
            // Update global date variables
            if (window.startDate !== undefined && window.endDate !== undefined) {
              window.startDate = newStartDate;
              window.endDate = newEndDate;
              
              // Apply filters and update UI
              if (typeof window.applyFilters === 'function') window.applyFilters();
              if (typeof window.updateUI === 'function') window.updateUI();
              if (typeof window.updateFilterDisplay === 'function') window.updateFilterDisplay();
            }
          }
        }
      }
    }
  });
}

/**
 * Update the date range based on tooltip position
 * @param {number} position - Tooltip position (0-100)
 * @param {boolean} isDragging - Whether the tooltip is being dragged
 */
function updateRangeFromTooltip(position, isDragging = false) {
  const slider = document.getElementById('dateRangeSlider');
  if (!slider || !slider.noUiSlider) return;
  
  // Get current range (use cached values if available)
  let min, max;
  if (slider._rangeCache) {
    min = slider._rangeCache.min;
    max = slider._rangeCache.max;
  } else {
    const range = slider.noUiSlider.options.range;
    min = range.min;
    max = range.max;
    
    // Cache these values for better performance
    slider._rangeCache = {
      min: min,
      max: max,
      totalRange: max - min
    };
  }
  
  // Calculate center point
  const center = min + (max - min) * (position / 100);
  
  // Get current values
  const values = slider.noUiSlider.get();
  const currentStart = parseFloat(values[0]);
  const currentEnd = parseFloat(values[1]);
  const currentDuration = currentEnd - currentStart;
  
  // Calculate new start and end
  const newStart = Math.max(min, center - currentDuration / 2);
  const newEnd = Math.min(max, newStart + currentDuration);
  
  // Update slider - use the 'set' method if not dragging (triggers 'set' event)
  // or the 'setHandle' method if dragging (doesn't trigger events, better performance)
  if (isDragging) {
    // Silent update during dragging for better performance
    slider.noUiSlider.set([newStart, newEnd], false);
  } else {
    // Normal update when not dragging, will trigger events
    slider.noUiSlider.set([newStart, newEnd]);
  }
}

/**
 * Update the duration tooltip
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
function updateDurationTooltip(startDate, endDate) {
  const tooltip = document.getElementById('sliderDurationTooltip');
  const slider = document.getElementById('dateRangeSlider');
  if (!tooltip || !slider || !slider.noUiSlider) return;
  
  // Calculate duration text
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  let durationText = '';
  if (diffDays > 0) {
    // Days and hours format
    durationText = diffDays + (diffDays === 1 ? ' Tag' : ' Tage');
    if (diffHours > 0) {
      durationText += ' ' + diffHours + (diffHours === 1 ? ' Stunde' : ' Stunden');
    }
  } else if (diffHours > 0) {
    // Hours and minutes format
    durationText = diffHours + (diffHours === 1 ? ' Stunde' : ' Stunden');
    if (diffMinutes > 0) {
      durationText += ' ' + diffMinutes + (diffMinutes === 1 ? ' Minute' : ' Minuten');
    }
  } else {
    // Minutes only format
    durationText = diffMinutes + (diffMinutes === 1 ? ' Minute' : ' Minuten');
  }
  
  // Update tooltip text only if it changed
  if (tooltip.textContent !== durationText) {
    tooltip.textContent = durationText;
    
    // Also update the timeframe display
    const timeframeDisplay = document.getElementById('timeframeDuration');
    if (timeframeDisplay) {
      timeframeDisplay.textContent = durationText;
    }
  }
  
  // Only update position during dragging or when explicitly needed
  // Get the current slider values
  const values = slider.noUiSlider.get();
  const startVal = parseFloat(values[0]);
  const endVal = parseFloat(values[1]);
  
  // Calculate the center position of the selected range as a percentage
  // Use cached values for range min/max to avoid recomputing
  if (!slider._rangeCache) {
    const range = slider.noUiSlider.options.range;
    slider._rangeCache = {
      min: range.min,
      max: range.max,
      totalRange: range.max - range.min
    };
  }
  
  const cache = slider._rangeCache;
  const center = startVal + (endVal - startVal) / 2;
  const centerPercentage = ((center - cache.min) / cache.totalRange) * 100;
  
  // Update tooltip position to center it over the selected range
  tooltip.style.left = centerPercentage + '%';
}

/**
 * Update time markers below the slider
 */
function updateTimeMarkers() {
  const markersContainer = document.getElementById('timeMarkers');
  if (!markersContainer) return;
  
  const slider = document.getElementById('dateRangeSlider');
  if (!slider || !slider.noUiSlider) return;
  
  const range = slider.noUiSlider.options.range;
  const min = range.min;
  const max = range.max;
  const duration = max - min;
  
  // Clear existing markers
  markersContainer.innerHTML = '';
  
  // Determine number of markers based on duration
  let numMarkers = 5;
  if (duration > 86400000 * 60) { // More than 60 days
    numMarkers = 3;
  }
  
  // Create markers
  for (let i = 0; i < numMarkers; i++) {
    const marker = document.createElement('div');
    marker.className = 'time-marker';
    marker.style.left = (i / (numMarkers - 1) * 100) + '%';
    
    const timestamp = min + (duration * (i / (numMarkers - 1)));
    const date = new Date(timestamp);
    marker.textContent = formatDate(date);
    
    markersContainer.appendChild(marker);
  }
}

/**
 * Update date and time input fields
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
function updateDateTimeInputs(startDate, endDate) {
  try {
    // Update start date/time inputs
    const startDateInput = document.getElementById('startDate');
    const startTimeInput = document.getElementById('startTime');
    
    if (startDateInput) {
      startDateInput.value = formatDateForInput(startDate);
    }
    
    if (startTimeInput) {
      startTimeInput.value = formatTimeForInput(startDate);
    }
    
    // Update end date/time inputs
    const endDateInput = document.getElementById('endDate');
    const endTimeInput = document.getElementById('endTime');
    
    if (endDateInput) {
      endDateInput.value = formatDateForInput(endDate);
    }
    
    if (endTimeInput) {
      endTimeInput.value = formatTimeForInput(endDate);
    }
  } catch (error) {
    console.error('Error updating date/time inputs:', error);
  }
}

/**
 * Format date for input field
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date
 */
function formatDateForInput(date) {
  if (!date || isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Format time for input field
 * @param {Date} date - Date to format
 * @returns {string} - Formatted time
 */
function formatTimeForInput(date) {
  if (!date || isNaN(date.getTime())) return '';
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * Setup event listeners for date filter
 * @param {Function} onFilterChange - Callback when filter changes
 */
function setupDateFilterEvents(onFilterChange) {
  // Date/time input change events
  const startDateInput = document.getElementById('startDate');
  const startTimeInput = document.getElementById('startTime');
  const endDateInput = document.getElementById('endDate');
  const endTimeInput = document.getElementById('endTime');
  
  if (startDateInput && startTimeInput && endDateInput && endTimeInput) {
    [startDateInput, startTimeInput, endDateInput, endTimeInput].forEach(input => {
      input.addEventListener('change', () => {
        updateSliderFromInputs();
      });
    });
  }
  
  // Apply filter button
  const applyFilterBtn = document.getElementById('applyFilterBtn');
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', () => {
      applyDateFilter(onFilterChange);
    });
  }
  
  // Reset filter button
  const resetFilterBtn = document.getElementById('resetFilterBtn');
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', () => {
      resetDateFilter(onFilterChange);
    });
  }
  
  // Period navigation buttons
  const prevPeriodBtn = document.getElementById('prevPeriodBtn');
  const nextPeriodBtn = document.getElementById('nextPeriodBtn');
  
  if (prevPeriodBtn) {
    prevPeriodBtn.addEventListener('click', () => {
      shiftDateRange(-1, onFilterChange);
    });
  }
  
  if (nextPeriodBtn) {
    nextPeriodBtn.addEventListener('click', () => {
      shiftDateRange(1, onFilterChange);
    });
  }
}

/**
 * Update slider from input fields
 */
function updateSliderFromInputs() {
  try {
    // Get input values
    const startDateInput = document.getElementById('startDate');
    const startTimeInput = document.getElementById('startTime');
    const endDateInput = document.getElementById('endDate');
    const endTimeInput = document.getElementById('endTime');
    
    if (!startDateInput || !startTimeInput || !endDateInput || !endTimeInput) {
      console.error('Date/time input elements not found');
      return;
    }
    
    // Parse dates
    const startDate = parseInputDate(startDateInput.value, startTimeInput.value);
    const endDate = parseInputDate(endDateInput.value, endTimeInput.value);
    
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date/time input values');
      return;
    }
    
    // Update slider
    updateSlider(startDate, endDate);
  } catch (error) {
    console.error('Error updating slider from inputs:', error);
  }
}

/**
 * Parse date from input fields
 * @param {string} dateStr - Date string
 * @param {string} timeStr - Time string
 * @returns {Date} - Parsed date
 */
function parseInputDate(dateStr, timeStr) {
  if (!dateStr) return null;
  
  try {
    // Default time to 00:00 if not provided
    const time = timeStr || '00:00';
    
    // Create date string in format that JavaScript can parse
    const dateTimeStr = `${dateStr}T${time}:00`;
    
    return new Date(dateTimeStr);
  } catch (error) {
    console.error('Error parsing input date:', error);
    return null;
  }
}

/**
 * Update slider with new date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
function updateSlider(startDate, endDate) {
  const slider = document.getElementById('dateRangeSlider');
  if (!slider || !slider.noUiSlider) return;
  
  try {
    slider.noUiSlider.set([startDate.getTime(), endDate.getTime()]);
    updateDurationTooltip(startDate, endDate);
  } catch (error) {
    console.error('Error updating slider:', error);
  }
}

/**
 * Apply date filter
 * @param {Function} onFilterChange - Callback when filter changes
 */
export function applyDateFilter(onFilterChange) {
  try {
    // Get date range from inputs
    const startDateInput = document.getElementById('startDate');
    const startTimeInput = document.getElementById('startTime');
    const endDateInput = document.getElementById('endDate');
    const endTimeInput = document.getElementById('endTime');
    
    if (!startDateInput || !startTimeInput || !endDateInput || !endTimeInput) {
      console.error('Date/time input elements not found');
      return;
    }
    
    // Parse dates
    const startDate = parseInputDate(startDateInput.value, startTimeInput.value);
    const endDate = parseInputDate(endDateInput.value, endTimeInput.value);
    
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date/time input values');
      return;
    }
    
    // Call filter change callback
    if (typeof onFilterChange === 'function') {
      onFilterChange(startDate, endDate);
    }
  } catch (error) {
    console.error('Error applying date filter:', error);
  }
}

/**
 * Reset date filter to default
 * @param {Function} onFilterChange - Callback when filter changes
 */
export function resetDateFilter(onFilterChange) {
  try {
    // Set default date range
    const { startDate, endDate } = setDefaultDateRange();
    
    // Update UI
    updateSlider(startDate, endDate);
    updateDateTimeInputs(startDate, endDate);
    updateTimeMarkers();
    
    // Call filter change callback
    if (typeof onFilterChange === 'function') {
      onFilterChange(startDate, endDate);
    }
  } catch (error) {
    console.error('Error resetting date filter:', error);
  }
}

/**
 * Shift date range by a number of periods
 * @param {number} direction - Direction to shift (1 for forward, -1 for backward)
 * @param {Function} onFilterChange - Callback when filter changes
 */
export function shiftDateRange(direction, onFilterChange) {
  try {
    // Get current date range
    const slider = document.getElementById('dateRangeSlider');
    if (!slider || !slider.noUiSlider) return;
    
    const values = slider.noUiSlider.get();
    const startTimestamp = parseFloat(values[0]);
    const endTimestamp = parseFloat(values[1]);
    
    if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
      console.error('Invalid slider values:', values);
      return;
    }
    
    const startDate = new Date(startTimestamp);
    const endDate = new Date(endTimestamp);
    
    // Calculate period duration
    const periodDuration = endDate.getTime() - startDate.getTime();
    
    // Shift by one period
    const newStartDate = new Date(startDate.getTime() + direction * periodDuration);
    const newEndDate = new Date(endDate.getTime() + direction * periodDuration);
    
    // Update UI
    updateSlider(newStartDate, newEndDate);
    updateDateTimeInputs(newStartDate, newEndDate);
    
    // Call filter change callback
    if (typeof onFilterChange === 'function') {
      onFilterChange(newStartDate, newEndDate);
    }
  } catch (error) {
    console.error('Error shifting date range:', error);
  }
}



/**
 * Apply quick filter
 * @param {number} value - Filter value
 * @param {string} unit - Filter unit (minute, hour, day)
 * @param {Function} onFilterChange - Callback when filter changes
 */
export function applyQuickFilter(value, unit, onFilterChange) {
  try {
    // Calculate new date range
    const now = new Date();
    const startDate = new Date(now);
    
    // Adjust start date based on filter
    switch (unit) {
      case 'minute':
        startDate.setMinutes(startDate.getMinutes() - value);
        break;
      case 'hour':
        startDate.setHours(startDate.getHours() - value);
        break;
      case 'day':
        startDate.setDate(startDate.getDate() - value);
        break;
      default:
        console.error('Invalid quick filter unit:', unit);
        return;
    }
    
    // Update UI
    updateSlider(startDate, now);
    updateDateTimeInputs(startDate, now);
    updateTimeMarkers();
    
    // Call filter change callback
    if (typeof onFilterChange === 'function') {
      onFilterChange(startDate, now);
    }
  } catch (error) {
    console.error('Error applying quick filter:', error);
  }
}

/**
 * Toggle quick filter dropdown
 * @param {Event} event - Click event
 */
export function toggleQuickFilterDropdown(event) {
  try {
    const dropdown = document.getElementById('quickFilterDropdown');
    if (!dropdown) return;
    
    // Toggle dropdown visibility
    if (dropdown.style.display === 'block') {
      dropdown.style.display = 'none';
    } else {
      dropdown.style.display = 'block';
      
      // Position dropdown
      if (event && event.target) {
        const button = event.target.closest('button');
        if (button) {
          const rect = button.getBoundingClientRect();
          dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
          dropdown.style.right = (window.innerWidth - rect.right) + 'px';
        }
      }
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
      if (!e.target.closest('#quick-filter-button') && !e.target.closest('#quickFilterDropdown')) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', closeDropdown);
      }
    });
    
    // Prevent event from bubbling up
    if (event) {
      event.stopPropagation();
    }
  } catch (error) {
    console.error('Error toggling quick filter dropdown:', error);
  }
}
