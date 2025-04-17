/**
 * Error Type Filter UI Component
 * Provides a dropdown with checkboxes for filtering by error types
 */
import { 
  getSelectedErrorTypes, 
  getAllErrorTypes, 
  isErrorTypeSelected, 
  toggleErrorType, 
  selectAllErrorTypes, 
  clearErrorTypeSelection 
} from '../../components/filters/index.js';
import { registerDropdownWithAccordion, unregisterDropdownFromAccordion } from '../../scripts/uiManager.js';

// Module state
let errorFilterButton = null;
let errorFilterDropdown = null;

/**
 * Initialize the error type filter UI
 * @param {Object} options - Configuration options
 * @param {HTMLElement} options.container - Container element for the filter button
 * @returns {Object} - Error filter API
 */
export function initErrorTypeFilter(options = {}) {
  console.log('[ErrorTypeFilter] Initializing with options:', options);
  const { container } = options;
  
  // Make sure we have a container
  if (!container) {
    console.error('[ErrorTypeFilter] Container element is required');
    return null;
  }
  
  console.log('[ErrorTypeFilter] Container found:', container);
  
  // Check if the button already exists
  const existingButton = container.querySelector('#error-type-filter-button');
  if (existingButton) {
    console.log('[ErrorTypeFilter] Button already exists, using existing button');
    errorFilterButton = existingButton;
  }
  
  // Find the timeframe-navigation container where filter buttons should be added
  let filterButtonsContainer = container.querySelector('.timeframe-navigation');
  console.log('[ErrorTypeFilter] Filter buttons container found:', filterButtonsContainer);
  
  // If not, create one using the template
  if (!filterButtonsContainer) {
    console.log('[ErrorTypeFilter] Filter buttons container not found, creating from template');
    const containerTemplate = document.getElementById('filter-buttons-container-template');
    if (!containerTemplate) {
      console.error('[ErrorTypeFilter] Filter buttons container template not found');
      return null;
    }
    
    filterButtonsContainer = containerTemplate.content.cloneNode(true).querySelector('.filter-buttons-container');
    container.appendChild(filterButtonsContainer);
    console.log('[ErrorTypeFilter] Created new filter buttons container:', filterButtonsContainer);
  }
  
  // Create error filter button from template
  if (!errorFilterButton) {
    console.log('[ErrorTypeFilter] Creating new button from template');
    const buttonTemplate = document.getElementById('filter-button-template');
    if (!buttonTemplate) {
      console.error('[ErrorTypeFilter] Filter button template not found');
      return null;
    }
    
    const buttonElement = buttonTemplate.content.cloneNode(true);
    const button = buttonElement.querySelector('.filter-button');
    button.id = 'error-type-filter-button';
    
    // Set button text and icon
    const buttonText = button.querySelector('.filter-button-text');
    if (buttonText) {
      buttonText.textContent = 'Fehlertypen';
    }
    
    // Set tooltip text
    const tooltipText = button.querySelector('.tooltiptext');
    if (tooltipText) {
      tooltipText.textContent = 'Filter nach Fehlertypen';
    }
    
    // Add the button to the container
    filterButtonsContainer.appendChild(button);
    errorFilterButton = button;
    console.log('[ErrorTypeFilter] Button created and added to container:', button);
  }
  
  // Create dropdown from template
  const dropdownTemplate = document.getElementById('error-type-filter-dropdown-template');
  if (!dropdownTemplate) {
    console.error('Error Filter: Dropdown template not found');
    return null;
  }
  
  // Clone the dropdown template
  const dropdownElement = dropdownTemplate.content.cloneNode(true);
  const dropdown = dropdownElement.querySelector('.error-type-dropdown-content');
  
  // Add ID to the dropdown for proper reference
  if (dropdown) {
    dropdown.id = 'errorTypeFilterDropdown';
    
    // Add the filter-dropdown-content class for proper positioning
    dropdown.classList.add('filter-dropdown-content');
    
    // Add the dropdown to the DOM next to the button
    errorFilterButton.parentNode.appendChild(dropdown);
  } else {
    console.error('Error Filter: Dropdown content not found in template');
    return null;
  }
  
  errorFilterDropdown = dropdown;
  
  // Populate the dropdown with error types
  updateErrorTypeFilterUI();
  
  // Set up event listeners
  setupErrorTypeFilterEvents();
  
  return {
    toggleErrorTypeDropdown,
    closeErrorTypeDropdown,
    updateErrorTypeFilterUI
  };
}

/**
 * Set up event listeners for the error type filter
 */
function setupErrorTypeFilterEvents() {
  // Add click event listener to the button if it exists
  if (errorFilterButton) {
    errorFilterButton.addEventListener('click', (event) => {
      toggleErrorTypeDropdown(event);
    });
  } else {
    console.warn('Error Filter: Button not found, cannot add click listener');
  }
  
  // Setup action buttons if dropdown exists
  if (!errorFilterDropdown) {
    console.warn('Error Filter: Dropdown not found, cannot setup action buttons');
    return;
  }
  
  const selectAllBtn = errorFilterDropdown.querySelector('#selectAllErrorTypes');
  const deselectAllBtn = errorFilterDropdown.querySelector('#deselectAllErrorTypes');
  
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectAllErrorTypes();
      updateErrorTypeFilterUI();
      
      // Dispatch event for other components
      const event = new CustomEvent('error-filter-changed', {
        detail: { errorTypes: getSelectedErrorTypes() }
      });
      document.dispatchEvent(event);
    });
  }
  
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearErrorTypeSelection();
      updateErrorTypeFilterUI();
      
      // Dispatch event for other components
      const event = new CustomEvent('error-filter-changed', {
        detail: { errorTypes: getSelectedErrorTypes() }
      });
      document.dispatchEvent(event);
    });
  }
  
  // Add click event listener to the document to close dropdown when clicking outside
  document.addEventListener('click', (event) => {
    if (errorFilterDropdown && errorFilterButton && 
        errorFilterDropdown.classList.contains('visible') && 
        !errorFilterDropdown.contains(event.target) && 
        !errorFilterButton.contains(event.target)) {
      closeErrorTypeDropdown();
    }
  });
}

// Register dropdown with accordion system

/**
 * Toggle the error type filter dropdown
 * @param {Event} event - The click event
 */
export function toggleErrorTypeDropdown(event) {
  // Prevent the event from propagating to the document
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  // Check if dropdown exists
  if (!errorFilterDropdown) {
    console.warn('Error Filter: Dropdown not found, cannot toggle');
    return;
  }
  
  // Close any other open dropdowns first
  const openDropdowns = document.querySelectorAll('.quick-filter-dropdown-content.visible, .error-type-dropdown-content.visible');
  openDropdowns.forEach(item => {
    if (item !== errorFilterDropdown) item.classList.remove('visible');
  });
  
  // Check visibility using portal existence instead of class
  const isVisible = window.errorTypeDropdownPortal !== undefined;
  
  if (isVisible) {
    closeErrorTypeDropdown();
  } else {
    // Add active class to button if it exists
    if (errorFilterButton) {
      errorFilterButton.classList.add('active');
    }
    
    // Create a completely new dropdown container directly in the body
    const portalContainer = document.createElement('div');
    portalContainer.id = 'errorTypeDropdownPortal';
    portalContainer.style.position = 'fixed';
    portalContainer.style.zIndex = '10000';
    portalContainer.style.backgroundColor = 'white';
    portalContainer.style.border = '1px solid #ccc';
    portalContainer.style.borderRadius = '4px';
    portalContainer.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    portalContainer.style.width = '200px';
    portalContainer.style.maxHeight = '300px';
    portalContainer.style.overflow = 'hidden';
    
    // Prevent scroll propagation on the container itself
    portalContainer.addEventListener('wheel', function(e) {
      e.stopPropagation();
    }, true);
    
    // Position the portal
    const buttonRect = errorFilterButton.getBoundingClientRect();
    portalContainer.style.top = (buttonRect.bottom + 5) + 'px';
    portalContainer.style.left = buttonRect.left + 'px';
    
    // Create content directly in the portal container
    openErrorTypeDropdown(portalContainer);
    
    // Add the portal to the body
    document.body.appendChild(portalContainer);
    
    // Store a reference to the portal
    window.errorTypeDropdownPortal = portalContainer;
    
    // Add a close method to the portal
    portalContainer.closeDropdown = function() {
      if (portalContainer.parentNode) {
        portalContainer.parentNode.removeChild(portalContainer);
      }
      
      // Remove active class from button
      if (errorFilterButton) {
        errorFilterButton.classList.remove('active');
      }
      
      window.errorTypeDropdownPortal = undefined;
    };
    
    // Add a click handler to close the dropdown when clicking outside
    const closeHandler = function(e) {
      if (!e.target.closest('#error-type-filter-button') && 
          !e.target.closest('#errorTypeDropdownPortal')) {
        if (window.errorTypeDropdownPortal) {
          window.errorTypeDropdownPortal.closeDropdown();
        }
        document.removeEventListener('click', closeHandler);
      }
    };
    
    // Add the event listener with a slight delay to prevent immediate closing
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 100);
  }
}

/**
 * Open the error type filter dropdown
 * @param {HTMLElement} container - The container to populate
 */
function openErrorTypeDropdown(container) {
  if (!container) return;
  
  // Clear existing content
  container.innerHTML = '';
  
  // Get all error types
  let allTypes = [];
  try {
    allTypes = getAllErrorTypes();
  } catch (error) {
    // Fallback to empty array
    allTypes = [];
  }
  
  // Create header with select all/none options
  const header = document.createElement('div');
  header.className = 'error-type-filter-header';
  
  const actions = document.createElement('div');
  actions.className = 'error-type-filter-actions';
  
  const selectAllBtn = document.createElement('button');
  selectAllBtn.className = 'mdl-button mdl-js-button mdl-button--primary error-filter-btn';
  selectAllBtn.textContent = 'All';
  selectAllBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectAllErrorTypes();
    updateErrorTypeFilterUI();
  });
  
  const clearBtn = document.createElement('button');
  clearBtn.className = 'mdl-button mdl-js-button mdl-button--primary error-filter-btn';
  clearBtn.textContent = 'None';
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearErrorTypeSelection();
    updateErrorTypeFilterUI();
  });
  
  actions.appendChild(selectAllBtn);
  actions.appendChild(clearBtn);
  header.appendChild(actions);
  
  container.appendChild(header);
  
  // Create divider
  const divider = document.createElement('div');
  divider.className = 'error-type-filter-divider';
  container.appendChild(divider);
  
  // Create scrollable container for the list
  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'error-type-filter-list'; 
  
  // Add event listener to prevent scroll propagation
  scrollContainer.addEventListener('wheel', function(e) {
    const scrollTop = this.scrollTop;
    const scrollHeight = this.scrollHeight;
    const height = this.clientHeight;
    const delta = e.deltaY;
    
    // If we're at the top and trying to scroll up, or at the bottom and trying to scroll down
    if ((scrollTop <= 0 && delta < 0) || (scrollTop + height >= scrollHeight && delta > 0)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // Always stop propagation to prevent scroll bleed
    e.stopPropagation();
  }, { passive: false });
  
  // Also prevent touchmove propagation for mobile
  scrollContainer.addEventListener('touchmove', function(e) {
    e.stopPropagation();
  }, { passive: true });
  
  // Create list of error types with checkboxes
  const list = document.createElement('div');
  list.className = 'error-type-filter-items';
  
  // Add some default options for testing if no error types are available
  if (allTypes.length === 0) {
    // Add a message that no error types are available
    const noTypes = document.createElement('div');
    noTypes.className = 'error-type-filter-no-types';
    noTypes.textContent = 'No error types available';
    list.appendChild(noTypes);
    
    // Add some default error types for testing
    const defaultTypes = ['Error', 'Warning', 'Info', 'Debug'];
    defaultTypes.forEach(type => {
      const item = document.createElement('div');
      item.className = 'error-type-filter-item';
      
      const label = document.createElement('label');
      label.className = 'mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'mdl-checkbox__input';
      checkbox.checked = true;
      
      const span = document.createElement('span');
      span.className = 'mdl-checkbox__label';
      span.textContent = type;
      
      label.appendChild(checkbox);
      label.appendChild(span);
      item.appendChild(label);
      list.appendChild(item);
    });
  } else {
    allTypes.forEach(type => {
      const item = document.createElement('div');
      item.className = 'error-type-filter-item';
      
      const label = document.createElement('label');
      label.className = 'mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'mdl-checkbox__input';
      checkbox.checked = isErrorTypeSelected(type);
      checkbox.addEventListener('change', () => {
        toggleErrorType(type);
      });
      
      const span = document.createElement('span');
      span.className = 'mdl-checkbox__label';
      span.textContent = type;
      
      label.appendChild(checkbox);
      label.appendChild(span);
      item.appendChild(label);
      list.appendChild(item);
    });
  }
  
  scrollContainer.appendChild(list);
  container.appendChild(scrollContainer);
}

/**
 * Close the error type filter dropdown
 */
export function closeErrorTypeDropdown() {
  // Close the portal if it exists
  if (window.errorTypeDropdownPortal) {
    window.errorTypeDropdownPortal.closeDropdown();
    window.errorTypeDropdownPortal = undefined;
    return;
  }
  
  // Legacy close method for the original dropdown
  if (errorFilterDropdown) {
    errorFilterDropdown.classList.remove('visible');
  }
  
  // Remove active class from button
  if (errorFilterButton) {
    errorFilterButton.classList.remove('active');
  }
  
  // Unregister from the accordion
  unregisterDropdownFromAccordion('errorTypeFilterDropdown');
}

/**
 * Update the error type filter UI with current error types
 */
export function updateErrorTypeFilterUI() {
  // Check if dropdown exists
  if (!errorFilterDropdown) {
    console.warn('Error Type Filter: Dropdown element not found');
    return;
  }
  
  // Find the filter list element in the dropdown
  const filterList = errorFilterDropdown.querySelector('.error-type-filter-list');
  if (!filterList) {
    console.warn('Error Type Filter: Filter list element not found in dropdown');
    return;
  }
  
  // Make sure the filter list has the correct classes
  filterList.className = 'error-type-filter-list scrollable-filter-list';
  
  // Clear existing content in the filter list
  filterList.innerHTML = '';
  
  // Get all error types
  const allTypes = getAllErrorTypes();
  
  // Create list of error types with checkboxes
  if (allTypes.length === 0) {
    const noTypes = document.createElement('div');
    noTypes.className = 'error-type-filter-no-types filter-item';
    noTypes.textContent = 'Keine Fehlertypen verfügbar';
    filterList.appendChild(noTypes);
  } else {
    allTypes.forEach(type => {
      const item = document.createElement('div');
      item.className = 'error-type-item filter-item';
      
      // Create checkbox wrapper with unique ID
      const checkboxId = `error-type-${type.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
      const checkboxWrapper = document.createElement('label');
      checkboxWrapper.className = 'mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect';
      checkboxWrapper.setAttribute('for', checkboxId);
      
      // Create checkbox input with ID and name
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'mdl-checkbox__input';
      checkbox.id = checkboxId;
      checkbox.name = checkboxId;
      checkbox.checked = isErrorTypeSelected(type);
      
      // Create label text
      const labelText = document.createElement('span');
      labelText.className = 'mdl-checkbox__label';
      labelText.textContent = type || 'unbekannt';
      
      // Add event listener to checkbox
      checkbox.addEventListener('change', (e) => {
        // Stop propagation to prevent scroll bleed
        e.stopPropagation();
        
        toggleErrorType(type);
        
        // Dispatch event for other components
        const event = new CustomEvent('error-filter-changed', {
          detail: { errorTypes: getSelectedErrorTypes() }
        });
        document.dispatchEvent(event);
      });
      
      // Assemble checkbox
      checkboxWrapper.appendChild(checkbox);
      checkboxWrapper.appendChild(labelText);
      item.appendChild(checkboxWrapper);
      filterList.appendChild(item);
      
      // Initialize Material Design Lite components
      if (window.componentHandler) {
        window.componentHandler.upgradeElement(checkboxWrapper);
      }
    });
  }
  
  // No need to update filter indicator here, it will be handled by event listeners
}

// Export all functions
export default {
  initErrorTypeFilter,
  toggleErrorTypeDropdown,
  updateErrorTypeFilterUI
};
