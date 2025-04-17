/**
 * Footer component for the AFM Dashboard
 * Displays the last update timestamp and refresh button
 */
class Footer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.render();
    this.setupEventListeners();
  }

  render() {
    // Clear the container
    this.container.innerHTML = '';
    
    // Use the template to create the footer buttons
    const template = document.getElementById('footer-buttons-template');
    if (!template) {
      console.error('Footer buttons template not found');
      return;
    }
    
    // Clone the template content and add it to the container
    const footerContent = template.content.cloneNode(true);
    this.container.appendChild(footerContent);
    
    // Register MDL components
    if (typeof componentHandler !== 'undefined') {
      // Find and upgrade all MDL elements within the footer
      const mdlElements = this.container.querySelectorAll('.mdl-button');
      mdlElements.forEach(element => {
        componentHandler.upgradeElement(element);
      });
    }
  }

  setupEventListeners() {
    // Set up refresh button
    const refreshButton = this.container.querySelector('.refresh-button');
    if (refreshButton) {
      // Replace the onclick attribute with an event listener
      refreshButton.removeAttribute('onclick');
      refreshButton.addEventListener('click', () => {
        // Call the loadAllData function directly
        if (typeof loadAllData === 'function') {
          loadAllData();
        }
        
        // Add spinning class to trigger CSS animation
        refreshButton.classList.add('spinning');
        
        // Remove spinning class after animation completes
        setTimeout(() => {
          refreshButton.classList.remove('spinning');
        }, 1200);
      });
    }
    
    // Apply and reset filter buttons removed - filters now apply dynamically
  }

  // Public method to update the last update timestamp
  updateLastUpdateTime(timestamp) {
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
      const formattedTime = new Date(timestamp).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      lastUpdateElement.textContent = `Letzte Aktualisierung: ${formattedTime}`;
    }
  }
}

export default Footer;
