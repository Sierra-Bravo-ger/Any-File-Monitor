/**
 * Header component for the AFM Dashboard
 * Handles the top navigation bar, theme toggle, and auto-refresh controls
 */
class Header {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <header class="mdl-layout__header">
        <div class="mdl-layout__header-row">
          <div class="header-left" style="display: flex; align-items: center; margin-right: auto;">
            <!-- Theme-Toggle-Button mit Abstand zum Burger-Menü -->
            <label class="theme-toggle" style="margin-left: 48px;">
              <input type="checkbox" id="themeToggle">
              <span class="theme-toggle-slider">
                <i class="material-icons theme-toggle-icon sun">light_mode</i>
                <i class="material-icons theme-toggle-icon moon">dark_mode</i>
              </span>
            </label>
            <span class="mdl-layout-title">AnyFileMonitor Dashboard</span>
          </div>
          
          <div class="header-right" style="display: flex; align-items: center;">
            <div class="auto-refresh-container">
              <span class="auto-refresh-label">Auto-Refresh:</span>
              <label class="switch">
                <input type="checkbox" id="autoRefreshToggle" checked>
                <span class="slider"></span>
              </label>
            </div>
            <div class="mdl-layout-spacer"></div>
            <nav class="mdl-navigation">
              <a class="mdl-navigation__link" href="#" id="overviewTab" onclick="showTab('overview')">Übersicht</a>
              <a class="mdl-navigation__link" href="#" id="statusTab" onclick="showTab('status')">Status</a>
              <a class="mdl-navigation__link" href="#" id="analysisTab" onclick="showTab('analysis')">Analyse</a>
              <a class="mdl-navigation__link" href="#" id="tablesTab" onclick="showTab('tables')">Tabellen</a>
            </nav>
          </div>
        </div>
      </header>
    `;
  }

  setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('change', () => {
      if (themeToggle.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      }
    });

    // Auto refresh toggle
    const autoRefreshToggle = document.getElementById('autoRefreshToggle');
    autoRefreshToggle.addEventListener('change', () => {
      toggleAutoRefresh();
    });

    // Initialize theme based on saved preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (savedTheme === null && prefersDarkMode)) {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggle.checked = true;
    }
  }
}

// Export the Header class
export default Header;
