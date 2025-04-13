// Main application module
import { loadConfig } from './config.js';
import { initDateFilter, applyDateFilter, resetDateFilter } from './date-filter.js';
import { loadAllData, processAllData } from './data-loader.js';
import { showTab } from './navigation.js';
import { toggleAutoRefresh } from './auto-refresh.js';
import { toggleTheme } from './theme.js';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// Main initialization function
function initApp() {
  // Register all components
  registerComponents();
  
  // Initialize theme
  initTheme();
  
  // Initialize event listeners
  setupEventListeners();
  
  // Load configuration
  loadConfig().then(() => {
    // Initialize date filter
    initDateFilter();
    
    // Load initial data
    loadAllData();
    
    // Start auto-refresh
    toggleAutoRefresh(true);
  });
}

// Register all custom components
function registerComponents() {
  // Import components dynamically to ensure they're registered
  import('../components/header.js');
  import('../components/footer.js');
  import('../components/date-filter.js');
  import('../components/card.js');
  import('../components/chart.js');
  import('../components/summary.js');
  import('../components/health-gauge.js');
  import('../components/data-table.js');
}

// Initialize theme based on user preference
function initTheme() {
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Set initial theme
  if (savedTheme === 'dark' || (savedTheme === null && prefersDarkMode)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    
    // Update theme toggle in header
    const headerComponent = document.querySelector('header-component');
    if (headerComponent) {
      headerComponent.setThemeToggle(true);
    }
  }
}

// Setup global event listeners
function setupEventListeners() {
  // Header component events
  const headerComponent = document.querySelector('header-component');
  if (headerComponent) {
    headerComponent.addEventListener('theme-toggle', (e) => {
      toggleTheme(e.detail.darkMode);
    });
    
    headerComponent.addEventListener('auto-refresh-toggle', (e) => {
      toggleAutoRefresh(e.detail.enabled);
    });
    
    headerComponent.addEventListener('tab-change', (e) => {
      showTab(e.detail.tabId);
    });
  }
  
  // Footer component events
  const footerComponent = document.querySelector('footer-component');
  if (footerComponent) {
    footerComponent.addEventListener('refresh-data', () => {
      loadAllData();
    });
  }
  
  // Date filter component events
  const dateFilterComponent = document.querySelector('date-filter-component');
  if (dateFilterComponent) {
    dateFilterComponent.addEventListener('date-filter-change', (e) => {
      applyDateFilter(e.detail.startDate, e.detail.endDate);
    });
  }
  
  // Card component events
  document.addEventListener('card-toggle', (e) => {
    // Save card state to localStorage
    localStorage.setItem(`card_${e.detail.id}_collapsed`, e.detail.collapsed);
  });
  
  // Window resize event for charts
  window.addEventListener('resize', () => {
    const chartComponents = document.querySelectorAll('chart-component');
    chartComponents.forEach(chart => {
      chart.resize();
    });
  });
}

// Export public API
export {
  loadAllData,
  processAllData,
  applyDateFilter,
  resetDateFilter,
  showTab,
  toggleAutoRefresh
};
