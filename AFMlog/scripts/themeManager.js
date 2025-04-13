/**
 * Theme management module for the AFM Dashboard
 * Handles theme initialization, toggling, and persistence
 */

/**
 * Initialize theme based on user preference
 */
export function initTheme() {
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Set initial theme
  if (savedTheme === 'dark' || (savedTheme === null && prefersDarkMode)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    
    // Update theme toggle in header
    const headerElement = document.querySelector('afm-header');
    if (headerElement) {
      headerElement.setThemeToggle(true);
    }
  }
}

/**
 * Toggle theme between light and dark
 * @param {boolean} isDarkMode - Whether to enable dark mode
 */
export function toggleTheme(isDarkMode) {
  if (isDarkMode) {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  }
}

/**
 * Setup theme-related event listeners
 */
export function setupThemeEventListeners() {
  // Theme toggle event
  document.addEventListener('theme-toggle', (e) => {
    toggleTheme(e.detail.darkMode);
  });
}
