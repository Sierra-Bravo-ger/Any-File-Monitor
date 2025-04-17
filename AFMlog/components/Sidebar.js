/**
 * Sidebar component for the AFM Dashboard
 * Provides the date filter controls and mobile navigation
 * Note: HTML structure is now defined directly in index.html
 */
class Sidebar {
  constructor(containerId) {
    // No longer need to store container reference since HTML is in index.html
    this.activeTab = 'overview'; // Default active tab
    this.setupEventListeners();
  }

  render() {
    // HTML is now directly in index.html, so this method is just for compatibility
    console.log('Sidebar render method called, but HTML is now in index.html');
  }

  renderFilterContent(container) {
    // HTML is now directly in index.html, so this method is just for compatibility
    console.log('Sidebar renderFilterContent method called, but HTML is now in index.html');
  }

  setupEventListeners() {
    // Setup any event listeners that need to be initialized by JavaScript
    // This method can remain to handle any dynamic behavior
    
    // Example: Add event listener for tab switching if needed
    document.querySelectorAll('.mdl-navigation__link').forEach(link => {
      link.addEventListener('click', (e) => {
        const tabId = e.target.getAttribute('href').substring(1);
        this.switchTab(tabId);
      });
    });
  }

  switchTab(tabId) {
    // Update active tab
    this.activeTab = tabId;
    
    // Get the current active tab before switching
    const currentActiveTab = document.querySelector('.tab-container.active');
    
    // Prepare the new tab for animation
    const newTab = document.getElementById(tabId);
    if (!newTab) return;
    
    // If there's a currently active tab, animate it out first
    if (currentActiveTab && currentActiveTab !== newTab) {
      // Add a class for the exit animation
      currentActiveTab.style.opacity = '0';
      currentActiveTab.style.transform = 'translateY(10px)';
      
      // After a short delay, hide the old tab and show the new one
      setTimeout(() => {
        // Hide the old tab
        currentActiveTab.classList.remove('active');
        
        // Show and animate in the new tab
        newTab.classList.add('active');
      }, 150); // Short delay for a smooth transition
    } else {
      // If no current active tab, just show the new one
      newTab.classList.add('active');
    }
    
    // Update navigation links with animation
    document.querySelectorAll('.mdl-navigation__link').forEach(link => {
      const linkTabId = link.getAttribute('href').substring(1);
      if (linkTabId === tabId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
}

// Export the component
export default Sidebar;
