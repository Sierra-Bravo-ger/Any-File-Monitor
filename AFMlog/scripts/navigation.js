/**
 * Navigation Module
 * 
 * Handles all navigation-related functionality for the AFM Dashboard,
 * including tab switching and navigation event listeners.
 */

/**
 * Show a specific tab and hide others
 * @param {string} tabName - The ID of the tab to show
 */
export function showTab(tabName) {
  console.log('Switching to tab:', tabName);
  
  // Hide all tab containers
  const tabContainers = document.querySelectorAll('.tab-container');
  tabContainers.forEach(container => {
    container.style.display = 'none';
  });
  
  // Show the selected tab container
  const selectedTab = document.getElementById(tabName);
  if (selectedTab) {
    selectedTab.style.display = 'block';
  }
  
  // Update active state in navigation
  const navLinks = document.querySelectorAll('.mdl-navigation__link');
  navLinks.forEach(link => {
    const linkTabName = link.getAttribute('href').replace('#', '');
    if (linkTabName === tabName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Set up event listeners for navigation links
 */
export function setupNavigationListeners() {
  console.log('Setting up navigation listeners');
  
  // Add event listeners to drawer navigation links
  const drawerLinks = document.querySelectorAll('.mdl-layout__drawer .mdl-navigation__link');
  drawerLinks.forEach(link => {
    link.addEventListener('click', event => {
      const tabName = link.getAttribute('href').replace('#', '');
      showTab(tabName);
    });
  });
  
  console.log('Navigation listeners initialized');
}
