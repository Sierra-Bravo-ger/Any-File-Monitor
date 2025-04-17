/**
 * Date Filter Widget Component
 * Handles date range selection, slider, and quick filters
 */
import { formatDate, formatTime, formatDateTime, debounce } from '../../scripts/utils.js';
import { adjustDate, adjustTime } from '../../scripts/dateUtils.js';
import { registerDropdownWithAccordion, unregisterDropdownFromAccordion } from '../../scripts/uiManager.js';

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
  
  // Clone the date range slider template
  const template = document.getElementById('date-range-slider-template');
  if (!template) {
    console.error('Date range slider template not found');
    return;
  }
  
  // Clone the template content
  const dateRangeSlider = template.content.cloneNode(true);
  
  // Add event listeners to the prev/next period buttons
  const prevBtn = dateRangeSlider.querySelector('#prevPeriodBtn');
  const nextBtn = dateRangeSlider.querySelector('#nextPeriodBtn');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', function() {
      shiftDateRange(-1, onFilterChange);
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      shiftDateRange(1, onFilterChange);
    });
  }
  
  // Handle the quick filter button
  const quickFilterBtn = dateRangeSlider.querySelector('#quick-filter-button');
  if (quickFilterBtn) {
    quickFilterBtn.addEventListener('click', function(event) {
      toggleQuickFilterDropdown(event);
    });
  }
  
  // Handle the error type filter button
  const errorTypeFilterBtn = dateRangeSlider.querySelector('#error-type-filter-button');
  if (errorTypeFilterBtn) {
    errorTypeFilterBtn.addEventListener('click', function(event) {
      // Call the error type filter toggle function if it exists
      if (typeof window.toggleErrorTypeDropdownDirect === 'function') {
        window.toggleErrorTypeDropdownDirect(event);
      }
    });
  }
  
  // Create a main container for all filter elements
  const filterElementsContainer = document.createElement('div');
  filterElementsContainer.className = 'filter-elements-container';
  
  // Add the date range slider to the filter elements container
  filterElementsContainer.appendChild(dateRangeSlider);
  
  // Create a wrapper for date inputs to control their layout
  const dateInputsWrapper = document.createElement('div');
  dateInputsWrapper.className = 'date-time-filter-groups';
  
  // Create the date/time input groups
  dateInputsWrapper.appendChild(createDateTimeGroup('Startdatum und -zeit', 'startDate', 'startTime'));
  dateInputsWrapper.appendChild(createDateTimeGroup('Enddatum und -zeit', 'endDate', 'endTime'));
  
  // Add the date/time input groups to the filter elements container
  filterElementsContainer.appendChild(dateInputsWrapper);
  
  // Add the filter elements container to the main container
  container.appendChild(filterElementsContainer);
  
  // Store references to module functions for global access if needed
  // These are used by inline handlers in the HTML
  window.resetDateFilter = function() {
    resetDateFilter(onFilterChange);
  };
  
  window.applyDateFilter = function() {
    applyDateFilter(onFilterChange);
  };
}

/**
 * Create a date/time input group
 * @param {string} label - Group label
 * @param {string} dateId - Date input ID
 * @param {string} timeId - Time input ID
 * @returns {HTMLElement} - Date/time group element
 */
function createDateTimeGroup(label, dateId, timeId) {
  // Clone the date-time group template
  const template = document.getElementById('date-time-group-template');
  if (!template) {
    console.error('Date-time group template not found');
    return document.createElement('div'); // Return empty div as fallback
  }
  
  // Clone the template content
  const group = template.content.cloneNode(true);
  
  // Set the label text and for attribute
  const labelEl = group.querySelector('.filter-label');
  if (labelEl) {
    labelEl.textContent = label;
    // Set the for attribute to point to the date input
    labelEl.setAttribute('for', dateId);
  }
  
  // Set IDs and names for the date and time inputs
  const dateInput = group.querySelector('.date-input');
  const timeInput = group.querySelector('.time-input');
  
  if (dateInput) {
    dateInput.id = dateId;
    dateInput.name = dateId;
    dateInput.setAttribute('aria-label', `${label} Datum`);
  }
  
  if (timeInput) {
    timeInput.id = timeId;
    timeInput.name = timeId;
    timeInput.setAttribute('aria-label', `${label} Zeit`);
    
    // Create a second label for the time input
    const timeLabel = document.createElement('label');
    timeLabel.className = 'visually-hidden';
    timeLabel.setAttribute('for', timeId);
    timeLabel.textContent = `${label} Zeit`;
    
    // Insert the time label before the time input
    if (timeInput.parentNode) {
      timeInput.parentNode.insertBefore(timeLabel, timeInput);
    }
  }
  
  // Set accessibility attributes for control buttons
  const dateUpBtn = group.querySelector('[data-control="date"][data-amount="1"]');
  const dateDownBtn = group.querySelector('[data-control="date"][data-amount="-1"]');
  const timeUpBtn = group.querySelector('[data-control="time"][data-amount="1"]');
  const timeDownBtn = group.querySelector('[data-control="time"][data-amount="-1"]');
  
  if (dateUpBtn) dateUpBtn.setAttribute('aria-label', `${label} Datum erhöhen`);
  if (dateDownBtn) dateUpBtn.setAttribute('aria-label', `${label} Datum verringern`);
  if (timeUpBtn) timeUpBtn.setAttribute('aria-label', `${label} Zeit erhöhen`);
  if (timeDownBtn) timeDownBtn.setAttribute('aria-label', `${label} Zeit verringern`);
  
  // Set data attributes and event listeners for date control buttons
  const dateButtons = group.querySelectorAll('[data-control="date"]');
  dateButtons.forEach(button => {
    button.dataset.input = dateId;
    button.dataset.unit = 'day';
    
    // Add event listener
    button.addEventListener('click', function() {
      const amount = parseInt(this.dataset.amount) || 0;
      adjustDate(dateId, amount, 'day', function(start, end) {
        // Update global date variables
        window.startDate = start;
        window.endDate = end;
        
        // Apply filters and update UI if the functions are available
        if (typeof window.applyFilters === 'function') window.applyFilters();
        if (typeof window.updateUI === 'function') window.updateUI();
        if (typeof window.updateFilterDisplay === 'function') window.updateFilterDisplay();
      });
    });
  });
  
  // Set data attributes and event listeners for time control buttons
  const timeButtons = group.querySelectorAll('[data-control="time"]');
  timeButtons.forEach(button => {
    button.dataset.input = timeId;
    button.dataset.unit = 'hour';
    
    // Add event listener
    button.addEventListener('click', function() {
      const amount = parseInt(this.dataset.amount) || 0;
      adjustTime(timeId, amount, 'hour', function(start, end) {
        // Update global date variables
        window.startDate = start;
        window.endDate = end;
        
        // Apply filters and update UI if the functions are available
        if (typeof window.applyFilters === 'function') window.applyFilters();
        if (typeof window.updateUI === 'function') window.updateUI();
        if (typeof window.updateFilterDisplay === 'function') window.updateFilterDisplay();
      });
    });
  });
  
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
        
        // Find the onFilterChange callback
        let onFilterChange;
        
        // Try to find the callback from the module's event listeners
        const applyFilterBtn = document.getElementById('applyFilterBtn');
        if (applyFilterBtn && applyFilterBtn._onFilterChange) {
          onFilterChange = applyFilterBtn._onFilterChange;
        } 
        // If not found, use the global window functions as fallback
        else if (typeof window.applyFilters === 'function' || typeof window.updateUI === 'function') {
          onFilterChange = function(start, end) {
            // Update global date variables
            if (window.startDate !== undefined && window.endDate !== undefined) {
              window.startDate = start;
              window.endDate = end;
              
              // Apply filters and update UI
              if (typeof window.applyFilters === 'function') window.applyFilters();
              if (typeof window.updateUI === 'function') window.updateUI();
              if (typeof window.updateFilterDisplay === 'function') window.updateFilterDisplay();
            }
          };
        }
        
        // Call the filter change callback if found
        if (typeof onFilterChange === 'function') {
          onFilterChange(newStartDate, newEndDate);
        } else {
          // Fallback to direct global function calls if no callback found
          if (window.startDate !== undefined && window.endDate !== undefined) {
            window.startDate = newStartDate;
            window.endDate = newEndDate;
            
            // Apply filters and update UI
            if (typeof window.applyFilters === 'function') window.applyFilters();
            if (typeof window.updateUI === 'function') window.updateUI();
            if (typeof window.updateFilterDisplay === 'function') window.updateFilterDisplay();
          }
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
    
    // Store the values for when dragging ends
    slider._lastDragValues = [newStart, newEnd];
  } else {
    // Normal update when not dragging, will trigger events
    slider.noUiSlider.set([newStart, newEnd]);
    
    // If we have stored values from dragging, make sure they're applied
    if (slider._lastDragValues) {
      // Apply the final values and ensure UI updates
      const finalValues = slider._lastDragValues;
      slider._lastDragValues = null; // Clear stored values
      
      // Create date objects from timestamps
      const startDate = new Date(finalValues[0]);
      const endDate = new Date(finalValues[1]);
      
      // Update date/time inputs to match the new dates
      updateDateTimeInputs(startDate, endDate);
      
      // Find the onFilterChange callback
      // First check if we have it in the module scope
      let onFilterChange;
      
      // Try to find the callback from the module's event listeners
      const applyFilterBtn = document.getElementById('applyFilterBtn');
      if (applyFilterBtn && applyFilterBtn._onFilterChange) {
        onFilterChange = applyFilterBtn._onFilterChange;
      } 
      // If not found, use the global window functions as fallback
      else if (typeof window.applyFilters === 'function' || typeof window.updateUI === 'function') {
        onFilterChange = function(start, end) {
          // Update global date variables
          if (window.startDate !== undefined && window.endDate !== undefined) {
            window.startDate = start;
            window.endDate = end;
            
            // Apply filters and update UI
            if (typeof window.applyFilters === 'function') window.applyFilters();
            if (typeof window.updateUI === 'function') window.updateUI();
            if (typeof window.updateFilterDisplay === 'function') window.updateFilterDisplay();
          }
        };
      }
      
      // Call the filter change callback if found
      if (typeof onFilterChange === 'function') {
        onFilterChange(startDate, endDate);
      }
    }
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
    // Get call stack to identify who's calling this function
    const stack = new Error().stack;
    console.log('[DateFilter] updateDateTimeInputs called from:', stack);
    
    // Skip updates if we're in the middle of user input
    if (window.isUserEditingDateInput) {
      console.log('[DateFilter] Skipping updateDateTimeInputs because user is editing');
      return;
    }
    
    // Update start date/time inputs
    const startDateInput = document.getElementById('startDate');
    const startTimeInput = document.getElementById('startTime');
    
    if (startDateInput) {
      const oldValue = startDateInput.value;
      const newValue = formatDateForInput(startDate);
      if (oldValue !== newValue) {
        console.log(`[DateFilter] Updating startDate from ${oldValue} to ${newValue}`);
        startDateInput.value = newValue;
      }
    }
    
    if (startTimeInput) {
      const oldValue = startTimeInput.value;
      const newValue = formatTimeForInput(startDate);
      if (oldValue !== newValue) {
        console.log(`[DateFilter] Updating startTime from ${oldValue} to ${newValue}`);
        startTimeInput.value = newValue;
      }
    }
    
    // Update end date/time inputs
    const endDateInput = document.getElementById('endDate');
    const endTimeInput = document.getElementById('endTime');
    
    if (endDateInput) {
      const oldValue = endDateInput.value;
      const newValue = formatDateForInput(endDate);
      if (oldValue !== newValue) {
        console.log(`[DateFilter] Updating endDate from ${oldValue} to ${newValue}`);
        endDateInput.value = newValue;
      }
    }
    
    if (endTimeInput) {
      const oldValue = endTimeInput.value;
      const newValue = formatTimeForInput(endDate);
      if (oldValue !== newValue) {
        console.log(`[DateFilter] Updating endTime from ${oldValue} to ${newValue}`);
        endTimeInput.value = newValue;
      }
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
  
  // Apply and reset filter buttons removed - filters now apply dynamically
  // Functions applyDateFilter and resetDateFilter are still used elsewhere in the codebase
  
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
  
  // Date adjustment buttons
  const dateControlButtons = document.querySelectorAll('.date-time-control-btn[data-control="date"]');
  dateControlButtons.forEach(button => {
    button.addEventListener('click', () => {
      const inputId = button.getAttribute('data-input');
      const amount = parseInt(button.getAttribute('data-amount'), 10);
      const unit = button.getAttribute('data-unit');
      if (inputId && !isNaN(amount) && unit) {
        adjustDate(inputId, amount, unit, onFilterChange);
      }
    });
  });
  
  // Time adjustment buttons
  const timeControlButtons = document.querySelectorAll('.date-time-control-btn[data-control="time"]');
  timeControlButtons.forEach(button => {
    button.addEventListener('click', () => {
      const inputId = button.getAttribute('data-input');
      const amount = parseInt(button.getAttribute('data-amount'), 10);
      const unit = button.getAttribute('data-unit');
      if (inputId && !isNaN(amount) && unit) {
        adjustTime(inputId, amount, unit, onFilterChange);
      }
    });
  });
  
  // Quick filter button
  const quickFilterButton = document.getElementById('quick-filter-button');
  if (quickFilterButton) {
    quickFilterButton.addEventListener('click', (event) => {
      toggleQuickFilterDropdown(event);
    });
  }
  
  // Quick filter dropdown items
  const quickFilterItems = document.querySelectorAll('.quick-filter-dropdown-item');
  quickFilterItems.forEach(item => {
    item.addEventListener('click', () => {
      const value = parseInt(item.getAttribute('data-value'), 10);
      const unit = item.getAttribute('data-unit');
      if (!isNaN(value) && unit) {
        // Close the dropdown
        document.getElementById('quickFilterDropdown').style.display = 'none';
        // Apply the filter
        applyQuickFilter(value, unit, onFilterChange);
      }
    });
  });
  
  // Add event listeners for date input fields
  const dateInputs = document.querySelectorAll('#startDate, #endDate');
  dateInputs.forEach(input => {
    // Track focus and blur to know when user is editing
    input.addEventListener('focus', () => {
      console.log(`[DateFilter] User started editing ${input.id}`);
      window.isUserEditingDateInput = true;
    });
    
    input.addEventListener('blur', () => {
      console.log(`[DateFilter] User stopped editing ${input.id}`);
      // Small delay to allow the change event to fire first
      setTimeout(() => {
        window.isUserEditingDateInput = false;
      }, 100);
    });
    
    // Use the change event to handle both manual input and date picker selection
    input.addEventListener('change', () => {
      // Check if we're already in an update cycle to prevent circular updates
      if (window.isUpdatingDateFilter) return;
      
      console.log(`[DateFilter] Date input changed: ${input.id} to ${input.value}`);
      
      // Set a flag to prevent other components from overriding this change
      window.isUpdatingDateFilter = true;
      
      try {
        // Store the current value to check if it gets overridden
        const currentValue = input.value;
        
        // Update the slider based on the input values
        updateSliderFromInputs();
        
        // Apply the filter with the new date range
        const startDateInput = document.getElementById('startDate');
        const startTimeInput = document.getElementById('startTime');
        const endDateInput = document.getElementById('endDate');
        const endTimeInput = document.getElementById('endTime');
        
        if (startDateInput && startTimeInput && endDateInput && endTimeInput) {
          const startDate = parseInputDate(startDateInput.value, startTimeInput.value);
          const endDate = parseInputDate(endDateInput.value, endTimeInput.value);
          
          if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            if (typeof onFilterChange === 'function') {
              onFilterChange(startDate, endDate);
            }
          }
        }
        
        // Check if the value was overridden
        if (input.value !== currentValue) {
          console.log(`[DateFilter] WARNING: Value was overridden from ${currentValue} to ${input.value}`);
          // Force it back to what the user entered
          setTimeout(() => {
            input.value = currentValue;
            console.log(`[DateFilter] Forced value back to ${currentValue}`);
          }, 10);
        }
      } finally {
        // Reset the flag after a delay
        setTimeout(() => {
          window.isUpdatingDateFilter = false;
          console.log('[DateFilter] Reset update flag');
        }, 200);
      }
    });
  });
  
  // Add event listeners for time input fields
  const timeInputs = document.querySelectorAll('#startTime, #endTime');
  timeInputs.forEach(input => {
    // Track focus and blur to know when user is editing
    input.addEventListener('focus', () => {
      console.log(`[DateFilter] User started editing ${input.id}`);
      window.isUserEditingDateInput = true;
    });
    
    input.addEventListener('blur', () => {
      console.log(`[DateFilter] User stopped editing ${input.id}`);
      // Small delay to allow the change event to fire first
      setTimeout(() => {
        window.isUserEditingDateInput = false;
      }, 100);
    });
    
    input.addEventListener('change', () => {
      // Check if we're already in an update cycle to prevent circular updates
      if (window.isUpdatingDateFilter) return;
      
      console.log(`[DateFilter] Time input changed: ${input.id} to ${input.value}`);
      
      // Set a flag to prevent other components from overriding this change
      window.isUpdatingDateFilter = true;
      
      try {
        // Store the current value to check if it gets overridden
        const currentValue = input.value;
        
        // Update the slider based on the input values
        updateSliderFromInputs();
        
        // Apply the filter with the new date range
        const startDateInput = document.getElementById('startDate');
        const startTimeInput = document.getElementById('startTime');
        const endDateInput = document.getElementById('endDate');
        const endTimeInput = document.getElementById('endTime');
        
        if (startDateInput && startTimeInput && endDateInput && endTimeInput) {
          const startDate = parseInputDate(startDateInput.value, startTimeInput.value);
          const endDate = parseInputDate(endDateInput.value, endTimeInput.value);
          
          if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            if (typeof onFilterChange === 'function') {
              onFilterChange(startDate, endDate);
            }
          }
        }
        
        // Check if the value was overridden
        if (input.value !== currentValue) {
          console.log(`[DateFilter] WARNING: Value was overridden from ${currentValue} to ${input.value}`);
          // Force it back to what the user entered
          setTimeout(() => {
            input.value = currentValue;
            console.log(`[DateFilter] Forced value back to ${currentValue}`);
          }, 10);
        }
      } finally {
        // Reset the flag after a delay
        setTimeout(() => {
          window.isUpdatingDateFilter = false;
          console.log('[DateFilter] Reset update flag');
        }, 200);
      }
    });
  });
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
/**
 * Normalize a date to minute precision (remove seconds and milliseconds)
 * @param {Date} date - Date to normalize
 * @returns {Date} - Normalized date
 */
function normalizeDateToMinute(date) {
  const normalized = new Date(date);
  normalized.setSeconds(0, 0);
  return normalized;
}

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
    
    // Create dates and normalize to minute precision
    const startDate = normalizeDateToMinute(new Date(startTimestamp));
    const endDate = normalizeDateToMinute(new Date(endTimestamp));
    
    // Calculate the actual duration in milliseconds
    const duration = endDate.getTime() - startDate.getTime();
    
    // Normalize the duration to standard time units to prevent small shifts
    let normalizedDuration = duration;
    
    // Determine the closest standard time unit (minute, hour, day)
    if (duration < 3600000) { // Less than 1 hour
      // Round to the nearest minute
      normalizedDuration = Math.round(duration / 60000) * 60000;
    } else if (duration < 86400000) { // Less than 1 day
      // Round to the nearest hour
      normalizedDuration = Math.round(duration / 3600000) * 3600000;
    } else {
      // Round to the nearest day
      normalizedDuration = Math.round(duration / 86400000) * 86400000;
    }
    
    // Shift by the normalized duration
    // Shift both dates by the same amount to maintain the same timeframe width
    const newStartDate = normalizeDateToMinute(new Date(startDate.getTime() + direction * normalizedDuration));
    const newEndDate = normalizeDateToMinute(new Date(endDate.getTime() + direction * normalizedDuration));
    
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
    // Calculate new date range with normalized time (no milliseconds/seconds)
    let now = new Date();
    // Normalize to minute precision
    now = normalizeDateToMinute(now);
    
    // Create a new start date from the normalized now date
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
    
    // Normalize the start date again after adjustments
    const normalizedStartDate = normalizeDateToMinute(startDate);
    
    // Log normalized dates for debugging
    console.log('Normalized date range:', {
      startDate: normalizedStartDate.toISOString(),
      endDate: now.toISOString(),
      duration: now.getTime() - normalizedStartDate.getTime()
    });
    
    // Update UI
    updateSlider(normalizedStartDate, now);
    updateDateTimeInputs(normalizedStartDate, now);
    updateTimeMarkers();
    
    // Call filter change callback
    if (typeof onFilterChange === 'function') {
      onFilterChange(normalizedStartDate, now);
    }
  } catch (error) {
    console.error('Error applying quick filter:', error);
  }
}

// No longer need to export to global scope as we're using proper event listeners

/**
 * Toggle quick filter dropdown
 * @param {Event} event - Click event
 */
export function toggleQuickFilterDropdown(event) {
  try {
    const dropdown = document.getElementById('quickFilterDropdown');
    if (!dropdown) return;
    
    // Get the button that was clicked
    let button = null;
    if (event && event.target) {
      button = event.target.closest('#quick-filter-button') || document.getElementById('quick-filter-button');
    } else {
      button = document.getElementById('quick-filter-button');
    }
    
    if (!button) return;
    
    // Store the original parent for later use
    if (!dropdown.originalParent) {
      dropdown.originalParent = dropdown.parentNode;
    }
    
    // Toggle dropdown visibility
    if (dropdown.style.display === 'block') {
      // Remove active class from button
      button.classList.remove('active');
      
      // Use the closeDropdown method to ensure consistent behavior
      if (typeof dropdown.closeDropdown === 'function') {
        dropdown.closeDropdown();
      } else {
        // Fallback if closeDropdown method is not defined
        dropdown.style.display = 'none';
        
        // Remove event listeners when closing the dropdown
        if (dropdown.scrollListeners) {
          dropdown.removeEventListener('scroll', dropdown.scrollListeners.preventScroll);
          dropdown.removeEventListener('wheel', dropdown.scrollListeners.preventWheel, { passive: false });
          dropdown.removeEventListener('touchstart', dropdown.scrollListeners.preventScroll);
          dropdown.removeEventListener('touchmove', dropdown.scrollListeners.preventScroll);
          dropdown.scrollListeners = null;
        }
        
        // Unregister from the accordion
        unregisterDropdownFromAccordion('quickFilterDropdown');
        
        // Return the dropdown to its original parent when closed
        if (dropdown.originalParent && dropdown.parentNode === document.body) {
          dropdown.originalParent.appendChild(dropdown);
        }
      }
    } else {
      // Add active class to button
      button.classList.add('active');
      
      // Close any other open dropdowns first
      const openDropdowns = document.querySelectorAll('.quick-filter-dropdown-content');
      openDropdowns.forEach(item => {
        if (item !== dropdown) item.style.display = 'none';
      });
      
      // Append the dropdown to the body to avoid any clipping issues
      document.body.appendChild(dropdown);
      
      // Position the dropdown relative to the button
      const buttonRect = button.getBoundingClientRect();
      
      // Set the position of the dropdown
      dropdown.style.position = 'absolute';
      dropdown.style.top = (buttonRect.bottom + window.scrollY + 5) + 'px';
      dropdown.style.left = (buttonRect.left + window.scrollX) + 'px';
      dropdown.style.width = '200px';
      dropdown.style.padding = '12px';
      dropdown.style.maxHeight = '400px';
      // Use theme variables instead of hardcoded colors
      const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
      dropdown.style.backgroundColor = isDarkMode ? 'var(--card-bg-color)' : 'white';
      dropdown.style.border = `1px solid ${isDarkMode ? 'var(--border-color)' : '#ccc'}`;
      dropdown.style.borderRadius = '4px';
      dropdown.style.boxShadow = isDarkMode ? '0 2px 10px rgba(0, 0, 0, 0.3)' : '0 2px 5px rgba(0,0,0,0.2)';
      dropdown.style.zIndex = '9999';
      dropdown.style.display = 'block';
      
      // Make sure we have a dedicated scrollable container for the items
      let quickFilterList = dropdown.querySelector('.quick-filter-list');
      if (!quickFilterList) {
        // Create a dedicated scrollable container for the filter items
        quickFilterList = document.createElement('div');
        quickFilterList.className = 'quick-filter-list';
        
        // Move all existing items into the scrollable container
        const items = dropdown.querySelectorAll('.quick-filter-dropdown-item');
        items.forEach(item => {
          quickFilterList.appendChild(item);
        });
        
        // Add the scrollable container to the dropdown
        dropdown.appendChild(quickFilterList);
      }
      
      // Apply explicit styling to the scrollable container
      quickFilterList.style.maxHeight = '300px';
      quickFilterList.style.overflowY = 'auto !important';
      quickFilterList.style.overflowX = 'hidden !important';
      quickFilterList.style.display = 'block !important';
      quickFilterList.style.marginBottom = '8px';
      
      // Prevent scroll events from propagating to the main page
      const preventScroll = function(e) {
        e.stopPropagation();
      };
      
      // Prevent wheel events from propagating
      const preventWheel = function(e) {
        // Just stop propagation without preventing default behavior
        e.stopPropagation();
      };
      
      // Close dropdown when accordion filter is closed
      const checkAccordionState = function() {
        // Check if accordion filter is expanded
        const accordionFilter = document.getElementById('accordionFilter');
        if (accordionFilter && !accordionFilter.classList.contains('expanded')) {
          // If accordion is closed and dropdown is open, close the dropdown
          if (dropdown.style.display === 'block') {
            // Close the dropdown directly
            dropdown.style.display = 'none';
            
            // Remove event listeners
            dropdown.removeEventListener('scroll', dropdown.scrollListeners.preventScroll);
            dropdown.removeEventListener('wheel', dropdown.scrollListeners.preventWheel, { passive: false });
            dropdown.removeEventListener('touchstart', dropdown.scrollListeners.preventScroll);
            dropdown.removeEventListener('touchmove', dropdown.scrollListeners.preventScroll);
            document.removeEventListener('click', dropdown.scrollListeners.checkAccordionState);
            dropdown.scrollListeners = null;
            
            // Return the dropdown to its original parent
            if (dropdown.originalParent && dropdown.parentNode === document.body) {
              dropdown.originalParent.appendChild(dropdown);
            }
          }
        }
      };
      
      // Add event listeners to prevent scroll propagation
      dropdown.addEventListener('scroll', preventScroll);
      dropdown.addEventListener('wheel', preventWheel, { passive: false });
      dropdown.addEventListener('touchstart', preventScroll);
      dropdown.addEventListener('touchmove', preventScroll);
      
      // Add a method to close the dropdown that can be called by the UI Manager
      dropdown.closeDropdown = function() {
        if (dropdown.style.display === 'block') {
          dropdown.style.display = 'none';
          
          // Remove active class from the button
          const button = document.getElementById('quick-filter-button');
          if (button) button.classList.remove('active');
          
          // Clean up event listeners
          if (dropdown.scrollListeners) {
            dropdown.removeEventListener('scroll', dropdown.scrollListeners.preventScroll);
            dropdown.removeEventListener('wheel', dropdown.scrollListeners.preventWheel, { passive: false });
            dropdown.removeEventListener('touchstart', dropdown.scrollListeners.preventScroll);
            dropdown.removeEventListener('touchmove', dropdown.scrollListeners.preventScroll);
            dropdown.scrollListeners = null;
          }
          
          // Return the dropdown to its original parent
          if (dropdown.originalParent && dropdown.parentNode === document.body) {
            dropdown.originalParent.appendChild(dropdown);
          }
          
          // Unregister from the accordion
          unregisterDropdownFromAccordion('quickFilterDropdown');
        }
      };
      
      // Register the dropdown with the accordion filter through the UI Manager
      registerDropdownWithAccordion('quickFilterDropdown');
      
      // Store the event listeners for later removal
      dropdown.scrollListeners = {
        preventScroll,
        preventWheel
      };
    }
    
    // Remove any existing event listeners to prevent duplicates
    document.removeEventListener('click', window.closeQuickFilterDropdown);
    
    // Define the close function and store it on the window object for later removal
    window.closeQuickFilterDropdown = function(e) {
      if (!e.target.closest('#quick-filter-button') && !e.target.closest('#quickFilterDropdown')) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', window.closeQuickFilterDropdown);
        
        // Remove active class from the button when clicking outside
        const button = document.getElementById('quick-filter-button');
        if (button) button.classList.remove('active');
      }
    };
    
    // Add the event listener with a slight delay to prevent immediate closing
    setTimeout(() => {
      document.addEventListener('click', window.closeQuickFilterDropdown);
    }, 100);
    
    // Prevent event from bubbling up
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
  } catch (error) {
    console.error('Error toggling quick filter dropdown:', error);
  }
}
