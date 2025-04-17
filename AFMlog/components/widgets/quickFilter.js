/**
 * Quick Filter UI Component
 * Provides a dropdown with preset time filter options
 */
import { formatDate, formatTime, formatDateTime, debounce } from '../../scripts/utils.js';
import { registerDropdownWithAccordion, unregisterDropdownFromAccordion } from '../../scripts/uiManager.js';

// Module state
let quickFilterButton = null;
let quickFilterDropdown = null;
let onFilterChangeCallback = null;

// Make the callback accessible to the window object for portal access
window.quickFilterCallbacks = {
  onFilterChange: null
};

/**
 * Apply quick filter
 * @param {number} value - Filter value
 * @param {string} unit - Filter unit (minute, hour, day)
 */
export function applyQuickFilter(value, unit) {
  console.log('[QuickFilter] Applying filter:', value, unit);
  
  // Try to get the callback from either the module state or the window object
  const callback = onFilterChangeCallback || window.quickFilterCallbacks.onFilterChange;
  console.log('[QuickFilter] Callback status:', callback ? 'Available' : 'Not available');
  
  if (!callback) {
    console.warn('[QuickFilter] No filter change callback available');
    return;
  }
  
  const now = new Date();
  let startDate = new Date(now);
  
  // Calculate the start date based on the selected quick filter
  switch (unit) {
    case 'minute':
      startDate.setMinutes(now.getMinutes() - value);
      break;
    case 'hour':
      startDate.setHours(now.getHours() - value);
      break;
    case 'day':
      startDate.setDate(now.getDate() - value);
      break;
    default:
      console.error(`[QuickFilter] Unknown unit: ${unit}`);
      return;
  }
  
  console.log('[QuickFilter] Calculated date range:', startDate, now);
  
  // Call the filter change callback with the new date range
  if (typeof callback === 'function') {
    callback(startDate, now);
    console.log('[QuickFilter] Filter callback executed');
    
    // Dispatch a custom event for other components to listen to
    const event = new CustomEvent('quick-filter-applied', {
      detail: {
        startDate,
        endDate: now,
        filter: { value, unit }
      }
    });
    document.dispatchEvent(event);
    console.log('[QuickFilter] Event dispatched');
  }
}

/**
 * Initialize the quick filter UI
 * @param {Object} options - Configuration options
 * @param {HTMLElement} options.container - Container element for the filter button
 * @param {Function} options.onFilterChange - Callback when filter changes
 * @returns {Object} - Quick filter API
 */
export function initQuickFilter(options = {}) {
  console.log('[QuickFilter] Initializing with options:', options);
  const { container, onFilterChange } = options;
  
  if (!container) {
    console.error('[QuickFilter] Container element is required');
    return null;
  }
  
  console.log('[QuickFilter] Container found:', container);
  console.log('[QuickFilter] Setting callback:', onFilterChange);
  
  // Set the callback in both places to ensure it's accessible
  onFilterChangeCallback = onFilterChange;
  window.quickFilterCallbacks.onFilterChange = onFilterChange;
  
  console.log('[QuickFilter] Callback set:', onFilterChangeCallback ? 'Available' : 'Not available');
  console.log('[QuickFilter] Window callback set:', window.quickFilterCallbacks.onFilterChange ? 'Available' : 'Not available');
  
  // Check if the button already exists
  const existingButton = container.querySelector('#quick-filter-button');
  if (existingButton) {
    console.log('[QuickFilter] Button already exists, using existing button');
    quickFilterButton = existingButton;
  }
  
  // Find the timeframe-navigation container where filter buttons should be added
  let filterButtonsContainer = container.querySelector('.timeframe-navigation');
  console.log('[QuickFilter] Filter buttons container found:', filterButtonsContainer);
  
  // If not, create one using the template
  if (!filterButtonsContainer) {
    console.log('[QuickFilter] Filter buttons container not found, creating from template');
    const containerTemplate = document.getElementById('filter-buttons-container-template');
    if (!containerTemplate) {
      console.error('[QuickFilter] Filter buttons container template not found');
      return null;
    }
    
    filterButtonsContainer = containerTemplate.content.cloneNode(true).querySelector('.filter-buttons-container');
    container.appendChild(filterButtonsContainer);
    console.log('[QuickFilter] Created new filter buttons container:', filterButtonsContainer);
  }
  
  // Create quick filter button from template
  if (!quickFilterButton) {
    console.log('[QuickFilter] Creating new button from template');
    const buttonTemplate = document.getElementById('filter-button-template');
    if (!buttonTemplate) {
      console.error('[QuickFilter] Filter button template not found');
      return null;
    }
    
    const buttonElement = buttonTemplate.content.cloneNode(true);
    const button = buttonElement.querySelector('.filter-button');
    button.id = 'quick-filter-button';
    
    // Set button text and icon
    const buttonText = button.querySelector('.filter-button-text');
    if (buttonText) {
      buttonText.textContent = 'Schnellfilter';
    }
    
    // Set tooltip text
    const tooltipText = button.querySelector('.tooltiptext');
    if (tooltipText) {
      tooltipText.textContent = 'Schnell-Filter für Zeitraum';
    }
    
    // Add the button to the container
    filterButtonsContainer.appendChild(button);
    quickFilterButton = button;
    console.log('[QuickFilter] Button created and added to container:', button);
  }
  
  // Configure the button - don't add mdl-button classes to match error filter button
  // quickFilterButton.classList.add('mdl-button', 'mdl-button--icon');
  // Remove title attribute to allow our custom tooltip to work
  quickFilterButton.removeAttribute('title');
  
  // Ensure tooltip class is present
  if (!quickFilterButton.classList.contains('tooltip')) {
    quickFilterButton.classList.add('tooltip');
  }
  
  // Hide the text element
  const buttonText = quickFilterButton.querySelector('.filter-button-text');
  if (buttonText) {
    buttonText.style.display = 'none';
  }
  
  // Set the icon
  const icon = quickFilterButton.querySelector('.filter-button-icon');
  if (icon) {
    icon.textContent = 'filter_list';
    icon.classList.add('material-icons');
  }
  
  // Ensure tooltip text is set
  let tooltipText = quickFilterButton.querySelector('.tooltiptext');
  if (!tooltipText) {
    tooltipText = document.createElement('span');
    tooltipText.className = 'tooltiptext';
    quickFilterButton.appendChild(tooltipText);
  }
  tooltipText.textContent = 'Schnell-Filter für Zeitraum';
  
  // Create dropdown from template
  const dropdownTemplate = document.getElementById('quick-filter-dropdown-template');
  if (!dropdownTemplate) {
    console.error('[QuickFilter] Dropdown template not found');
    return null;
  }
  
  // Clone the dropdown template
  const dropdownElement = dropdownTemplate.content.cloneNode(true);
  const dropdown = dropdownElement.querySelector('.quick-filter-dropdown-content');
  if (!dropdown) {
    console.error('[QuickFilter] Dropdown content not found in template');
    return null;
  }
  
  quickFilterDropdown = dropdown;
  
  // Set the ID for proper registration with the accordion
  quickFilterDropdown.id = 'quickFilterDropdown';
  
  // Populate the dropdown with quick filter options
  populateQuickFilterDropdown(quickFilterDropdown);
  
  // Add the dropdown to the DOM next to the button
  quickFilterButton.parentNode.appendChild(quickFilterDropdown);
  
  // Set up event listeners
  setupQuickFilterEvents();
  
  return {
    applyQuickFilter: applyQuickFilter,
    toggleQuickFilterDropdown,
    closeQuickFilterDropdown
  };
}

/**
 * Populate the quick filter dropdown with preset options
 * @param {HTMLElement} dropdown - The dropdown element
 */
function populateQuickFilterDropdown(dropdown) {
  // We're using a pre-populated list from the template, so we don't need to create items dynamically
  // Instead, we'll just add event listeners to the existing items
  
  const quickFilterList = dropdown.querySelector('.quick-filter-list');
  if (!quickFilterList) {
    console.error('Quick Filter: Filter list element not found in dropdown');
    return;
  }
  
  // Find all filter items
  const filterItems = quickFilterList.querySelectorAll('.quick-filter-dropdown-item');
  if (!filterItems || filterItems.length === 0) {
    console.error('Quick Filter: No filter items found in dropdown');
    return;
  }
  
  // Add click event listeners to each item
  filterItems.forEach(item => {
    // Get filter values from data attributes
    const value = parseInt(item.getAttribute('data-value'), 10);
    const unit = item.getAttribute('data-unit');
    
    if (!isNaN(value) && unit) {
      // Add click event listener
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        applyQuickFilter(value, unit);
        closeQuickFilterDropdown();
      });
    } else {
      console.warn('Quick Filter: Item missing data attributes', item);
    }
  });
}

/**
 * Set up event listeners for the quick filter
 */
function setupQuickFilterEvents() {
  if (!quickFilterButton || !quickFilterDropdown) return;
  
  // Add click event listener to the button
  quickFilterButton.addEventListener('click', toggleQuickFilterDropdown);
  
  // Add click event listener to the document to close the dropdown when clicking outside
  document.addEventListener('click', (event) => {
    if (quickFilterDropdown && 
        quickFilterDropdown.classList.contains('visible') && 
        !quickFilterDropdown.contains(event.target) && 
        !quickFilterButton.contains(event.target)) {
      closeQuickFilterDropdown();
    }
  });
}

/**
 * Toggle the quick filter dropdown
 * @param {Event} event - The click event
 */
export function toggleQuickFilterDropdown(event) {
  // Prevent the event from propagating to the document
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  // Close any other open dropdowns first
  const openDropdowns = document.querySelectorAll('.quick-filter-dropdown-content.visible, .error-type-dropdown-content.visible');
  openDropdowns.forEach(item => {
    if (item !== quickFilterDropdown) item.classList.remove('visible');
  });

  // Check if portal exists
  const isVisible = window.quickFilterDropdownPortal !== undefined;

  if (isVisible) {
    closeQuickFilterDropdown();
  } else {
    // Add active class to button
    quickFilterButton.classList.add('active');

    // Create a portal container for the dropdown
    const portalContainer = document.createElement('div');
    portalContainer.id = 'quickFilterDropdownPortal';
    portalContainer.style.position = 'fixed';
    portalContainer.style.zIndex = '10000';
    portalContainer.style.backgroundColor = 'white';
    portalContainer.style.border = '1px solid #ccc';
    portalContainer.style.borderRadius = '4px';
    portalContainer.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    portalContainer.style.width = '200px';
    portalContainer.style.maxHeight = '300px';
    portalContainer.style.overflow = 'hidden';
    
    // Prevent scroll propagation on the container itself
    portalContainer.addEventListener('wheel', function(e) {
      e.stopPropagation();
    }, true);

    // Position the portal
    const buttonRect = quickFilterButton.getBoundingClientRect();
    portalContainer.style.top = (buttonRect.bottom + 5) + 'px';
    portalContainer.style.left = buttonRect.left + 'px';

    // Create the dropdown content directly instead of cloning
    createQuickFilterContent(portalContainer);
    
    // Add the portal to the body
    document.body.appendChild(portalContainer);
    window.quickFilterDropdownPortal = portalContainer;

    // Add a close method to the portal
    portalContainer.closeDropdown = function() {
      if (portalContainer.parentNode) {
        portalContainer.parentNode.removeChild(portalContainer);
      }
      if (quickFilterButton) {
        quickFilterButton.classList.remove('active');
      }
      window.quickFilterDropdownPortal = undefined;
    };

    // Add a click handler to close the dropdown when clicking outside
    const closeHandler = function(e) {
      if (!e.target.closest('#quick-filter-button') && 
          !e.target.closest('#quickFilterDropdownPortal')) {
        if (window.quickFilterDropdownPortal) {
          window.quickFilterDropdownPortal.closeDropdown();
        }
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 100);
  }
}

/**
 * Create quick filter content directly in the portal container
 * @param {HTMLElement} container - The container to populate
 */
function createQuickFilterContent(container) {
  if (!container) return;
  
  // Create the quick filter list
  const quickFilterList = document.createElement('div');
  quickFilterList.className = 'quick-filter-list';
  
  // Define filter options
  const filterOptions = [
    { value: 5, unit: 'minute', text: 'Letzte 5 Minuten' },
    { value: 15, unit: 'minute', text: 'Letzte 15 Minuten' },
    { value: 30, unit: 'minute', text: 'Letzte 30 Minuten' },
    { value: 1, unit: 'hour', text: 'Letzte Stunde' },
    { value: 3, unit: 'hour', text: 'Letzte 3 Stunden' },
    { value: 6, unit: 'hour', text: 'Letzte 6 Stunden' },
    { value: 12, unit: 'hour', text: 'Letzte 12 Stunden' },
    { value: 1, unit: 'day', text: 'Letzter Tag' },
    { value: 3, unit: 'day', text: 'Letzte 3 Tage' },
    { value: 7, unit: 'day', text: 'Letzte Woche' },
    { value: 14, unit: 'day', text: 'Letzte 2 Wochen' }
  ];
  
  // Create filter items
  filterOptions.forEach(option => {
    const item = document.createElement('div');
    item.className = 'quick-filter-dropdown-item filter-item';
    item.setAttribute('data-value', option.value);
    item.setAttribute('data-unit', option.unit);
    item.textContent = option.text;
    
    // Add click event listener
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Log the click for debugging
      console.log('[QuickFilter] Item clicked:', option.value, option.unit);
      console.log('[QuickFilter] Module callback status:', onFilterChangeCallback ? 'Available' : 'Not available');
      console.log('[QuickFilter] Window callback status:', window.quickFilterCallbacks.onFilterChange ? 'Available' : 'Not available');
      
      // Apply the filter
      applyQuickFilter(option.value, option.unit);
      
      // Close the dropdown
      closeQuickFilterDropdown();
    });
    
    quickFilterList.appendChild(item);
  });
  
  container.appendChild(quickFilterList);
}

export function closeQuickFilterDropdown() {
  // Close the portal if it exists
  if (window.quickFilterDropdownPortal) {
    window.quickFilterDropdownPortal.closeDropdown();
    return;
  }
  
  // Legacy close method for the original dropdown
  if (quickFilterDropdown) {
    quickFilterDropdown.classList.remove('visible');
  }
  
  if (quickFilterButton) {
    quickFilterButton.classList.remove('active');
  }
  
  // Unregister from the accordion
  unregisterDropdownFromAccordion('quickFilterDropdown');
}
