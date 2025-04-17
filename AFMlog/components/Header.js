/**
 * Header component for the AFM Dashboard
 * Handles the top navigation bar, theme toggle, and auto-refresh controls
 */
import { toggleAutoRefresh } from '../scripts/autoRefresh.js';
class Header {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.render();
    this.setupEventListeners();
  }

  render() {
    // Clear the container
    this.container.innerHTML = '';
    
    // Use the template to create the header content
    const template = document.getElementById('header-template');
    if (!template) {
      console.error('Header template not found');
      return;
    }
    
    // Clone the template content and add it to the container
    const headerContent = template.content.cloneNode(true);
    this.container.appendChild(headerContent);
    
    // Register MDL components
    if (typeof componentHandler !== 'undefined') {
      // Find and upgrade all MDL elements within the header
      const mdlElements = this.container.querySelectorAll('.mdl-button, .mdl-tooltip, .mdl-menu');
      mdlElements.forEach(element => {
        componentHandler.upgradeElement(element);
      });
    }
  }

  setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
          document.documentElement.setAttribute('data-theme', 'dark');
          localStorage.setItem('theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
          localStorage.setItem('theme', 'light');
        }
      });
    }
    
    // Setup refresh interval dropdown
    this.setupRefreshIntervalDropdown();
    
    // Filter toggle button is now handled by uiManager.js
    // This ensures all UI interactions are managed in one place
    
    // Setup desktop navigation links
    const navLinks = document.querySelectorAll('.mdl-layout__header .mdl-navigation__link');
    navLinks.forEach(link => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const tabId = link.getAttribute('href').substring(1); // Remove the # from the href
        if (typeof window.showTab === 'function') {
          window.showTab(tabId);
        }
      });
    });
    
    // Auto-refresh toggle in header
    const autoRefreshToggle = document.getElementById('autoRefreshToggle');
    if (autoRefreshToggle) {
      autoRefreshToggle.addEventListener('change', (e) => {
        toggleAutoRefresh(e.target.checked);
        // Sync with drawer toggle
        const drawerToggle = document.getElementById('autoRefreshToggleDrawer');
        if (drawerToggle) {
          drawerToggle.checked = e.target.checked;
        }
      });
    }
    
    // Auto-refresh toggle in drawer
    const autoRefreshToggleDrawer = document.getElementById('autoRefreshToggleDrawer');
    if (autoRefreshToggleDrawer) {
      autoRefreshToggleDrawer.addEventListener('change', (e) => {
        toggleAutoRefresh(e.target.checked);
        // Sync with header toggle
        const headerToggle = document.getElementById('autoRefreshToggle');
        if (headerToggle) {
          headerToggle.checked = e.target.checked;
        }
      });
    }
    
    // Initialize theme based on saved preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (savedTheme === null && prefersDarkMode)) {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (themeToggle) {
        themeToggle.checked = true;
      }
    }
  }

  /**
   * Set the auto-refresh toggle state
   * @param {boolean} isEnabled - Whether auto-refresh is enabled
   */
  setAutoRefreshToggle(isEnabled) {
    const headerToggle = document.getElementById('autoRefreshToggle');
    const drawerToggle = document.getElementById('autoRefreshToggleDrawer');
    
    if (headerToggle) {
      headerToggle.checked = isEnabled;
    }
    
    if (drawerToggle) {
      drawerToggle.checked = isEnabled;
    }
  }
  
  /**
   * Setup the refresh interval dropdown menu and event listeners
   */
  setupRefreshIntervalDropdown() {
    // Get the menu items
    const menuItems = document.querySelectorAll('.refresh-interval-container .mdl-menu__item');
    
    // Add click event listeners to each menu item
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        if (item.classList.contains('custom-interval')) {
          // Show custom interval dialog
          this.showCustomIntervalDialog();
        } else {
          // Get the interval from the data attribute
          const interval = item.getAttribute('data-interval');
          if (interval && typeof window.setRefreshInterval === 'function') {
            window.setRefreshInterval(interval);
            
            // Update the button tooltip to show current interval
            const tooltip = document.querySelector('.mdl-tooltip[for="refreshIntervalButton"]');
            if (tooltip) {
              tooltip.textContent = `Refresh interval: ${item.textContent}`;
            }
          }
        }
      });
    });
  }
  
  /**
   * Show a dialog to set a custom refresh interval
   */
  showCustomIntervalDialog() {
    // Create a dialog if it doesn't exist
    let dialog = document.getElementById('customIntervalDialog');
    
    if (!dialog) {
      // Create the dialog element
      dialog = document.createElement('dialog');
      dialog.id = 'customIntervalDialog';
      dialog.className = 'mdl-dialog';
      
      // Use the template to create the dialog content
      const template = document.getElementById('refresh-interval-dialog-template');
      if (!template) {
        console.error('Refresh interval dialog template not found');
        return;
      }
      
      // Clone the template content and add it to the dialog
      const dialogContent = template.content.cloneNode(true);
      dialog.appendChild(dialogContent);
      
      // Add the dialog to the DOM
      document.body.appendChild(dialog);
      
      // Register the dialog and its children with MDL
      if (typeof componentHandler !== 'undefined') {
        // Upgrade the dialog element
        componentHandler.upgradeElement(dialog);
        
        // Find and upgrade all MDL elements within the dialog
        const mdlElements = dialog.querySelectorAll('.mdl-textfield, .mdl-button');
        mdlElements.forEach(element => {
          componentHandler.upgradeElement(element);
        });
      }
      
      // Add event listeners to the dialog buttons
      const applyButton = dialog.querySelector('.mdl-button.apply');
      const closeButton = dialog.querySelector('.mdl-button.close');
      
      applyButton.addEventListener('click', () => {
        const input = document.getElementById('customIntervalInput');
        const seconds = parseInt(input.value, 10);
        
        if (!isNaN(seconds) && seconds >= 10) {
          // Convert seconds to milliseconds
          const intervalMs = seconds * 1000;
          
          // Set the refresh interval
          if (typeof window.setRefreshInterval === 'function') {
            window.setRefreshInterval(intervalMs);
            
            // Update the button tooltip
            const tooltip = document.querySelector('.mdl-tooltip[for="refreshIntervalButton"]');
            if (tooltip) {
              tooltip.textContent = `Refresh interval: ${seconds} seconds`;
            }
          }
          
          // Close the dialog
          dialog.close();
        }
      });
      
      closeButton.addEventListener('click', () => {
        dialog.close();
      });
    }
    
    // Show the dialog
    if (!dialog.open) {
      dialog.showModal();
    }
  }
}

// Export the Header class
export default Header;
