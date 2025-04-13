/**
 * Sidebar component for the AFM Dashboard
 * Provides the date filter controls
 */
class Sidebar {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="filter-title">Zeitraumfilter</div>
      <button id="toggleFilterBtn" class="mdl-button mdl-js-button mdl-button--icon" title="Filter ein-/ausklappen" onclick="toggleFilter()">
        <i class="material-icons">expand_less</i>
      </button>
    `;
    
    // Render the filter content
    const filterContent = document.getElementById('filterContent');
    if (filterContent) {
      this.renderFilterContent(filterContent);
    }
  }

  renderFilterContent(container) {
    container.innerHTML = `
      <!-- Date Range Slider -->
      <div class="date-range-slider-container mdl-shadow--2dp">
        <div class="date-range-slider-title">Zeitraumauswahl</div>
        <div class="slider-controls">
          <div id="dateRangeSlider" class="slider-container"></div>
          <div class="time-markers" id="timeMarkers"></div>
        </div>
        
        <div class="timeframe-navigation">
          <button id="prevPeriodBtn" class="timeframe-button" onclick="shiftDateRange(-1)">
            <i class="material-icons">chevron_left</i>
          </button>
          <div id="timeframeDisplay" class="timeframe-display">
            Zeitraum: <span id="timeframeDuration"></span>
          </div>
          <button id="nextPeriodBtn" class="timeframe-button" onclick="shiftDateRange(1)">
            <i class="material-icons">chevron_right</i>
          </button>
          
          <!-- Quick filter button positioned at the right side -->
          <div class="quick-filter-dropdown-container">
            <button id="quick-filter-button" class="mdl-button mdl-js-button mdl-button--icon" title="Schnell-Filter" onclick="toggleQuickFilterDropdown(event)">
              <i class="material-icons">filter_list</i>
            </button>
            <div class="quick-filter-dropdown-content" id="quickFilterDropdown">
              <div class="quick-filter-dropdown-item" onclick="applyQuickFilter(5, 'minute'); document.getElementById('quickFilterDropdown').style.display='none';">Letzte 5 Minuten</div>
              <div class="quick-filter-dropdown-item" onclick="applyQuickFilter(15, 'minute'); document.getElementById('quickFilterDropdown').style.display='none';">Letzte 15 Minuten</div>
              <div class="quick-filter-dropdown-item" onclick="applyQuickFilter(30, 'minute'); document.getElementById('quickFilterDropdown').style.display='none';">Letzte 30 Minuten</div>
              <div class="quick-filter-dropdown-item" onclick="applyQuickFilter(60, 'minute'); document.getElementById('quickFilterDropdown').style.display='none';">Letzte 60 Minuten</div>
              <div class="quick-filter-dropdown-item" onclick="applyQuickFilter(4, 'hour'); document.getElementById('quickFilterDropdown').style.display='none';">Letzte 4 Stunden</div>
              <div class="quick-filter-dropdown-item" onclick="applyQuickFilter(8, 'hour'); document.getElementById('quickFilterDropdown').style.display='none';">Letzte 8 Stunden</div>
              <div class="quick-filter-dropdown-item" onclick="applyQuickFilter(1, 'day'); document.getElementById('quickFilterDropdown').style.display='none';">Letzter Tag</div>
              <div class="quick-filter-dropdown-item" onclick="applyQuickFilter(7, 'day'); document.getElementById('quickFilterDropdown').style.display='none';">Letzte Woche</div>
              <div class="quick-filter-dropdown-item" onclick="applyQuickFilter(14, 'day'); document.getElementById('quickFilterDropdown').style.display='none';">Letzte 2 Wochen</div>
              <div class="quick-filter-dropdown-item" onclick="applyQuickFilter(30, 'day'); document.getElementById('quickFilterDropdown').style.display='none';">Letzter Monat</div>
              <div class="quick-filter-dropdown-item" onclick="applyQuickFilter(90, 'day'); document.getElementById('quickFilterDropdown').style.display='none';">Letzte 3 Monate</div>
              <div class="quick-filter-dropdown-item" onclick="applyQuickFilter(180, 'day'); document.getElementById('quickFilterDropdown').style.display='none';">Letzte 6 Monate</div>
              <div class="quick-filter-dropdown-item" onclick="applyQuickFilter(365, 'day'); document.getElementById('quickFilterDropdown').style.display='none';">Letztes Jahr</div>
            </div>
          </div>
        </div>
        
        <!-- Quick filter buttons removed in favor of the dropdown menu -->
      </div>
      
      <!-- Start Date and Time -->
      <div class="filter-group" style="display: flex; flex-direction: column; margin: 8px 16px; justify-content: flex-start;">
        <label class="filter-label" style="color: white; margin-top: 0;">Startdatum und -zeit</label>
        <div class="date-time-input-group">
          <div class="date-time-flex-container">
            <!-- Date Input with Controls -->
            <input type="date" id="startDate" class="date-input">
            <div class="date-time-controls">
              <button class="mdl-button mdl-js-button mdl-button--icon date-time-control-btn" onclick="adjustDate('startDate', 1, 'day')">
                <i class="material-icons">keyboard_arrow_up</i>
              </button>
              <button class="mdl-button mdl-js-button mdl-button--icon date-time-control-btn" onclick="adjustDate('startDate', -1, 'day')">
                <i class="material-icons">keyboard_arrow_down</i>
              </button>
            </div>
          </div>
          
          <div class="date-time-flex-container">
            <!-- Time Input with Controls -->
            <input type="time" id="startTime" class="time-input">
            <div class="date-time-controls">
              <button class="mdl-button mdl-js-button mdl-button--icon date-time-control-btn" onclick="adjustTime('startTime', 1, 'hour')">
                <i class="material-icons">keyboard_arrow_up</i>
              </button>
              <button class="mdl-button mdl-js-button mdl-button--icon date-time-control-btn" onclick="adjustTime('startTime', -1, 'hour')">
                <i class="material-icons">keyboard_arrow_down</i>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- End Date and Time -->
      <div class="filter-group" style="display: flex; flex-direction: column; margin: 8px 16px; justify-content: flex-start;">
        <label class="filter-label" style="color: white; margin-top: 0;">Enddatum und -zeit</label>
        <div class="date-time-input-group">
          <div class="date-time-flex-container">
            <!-- Date Input with Controls -->
            <input type="date" id="endDate" class="date-input">
            <div class="date-time-controls">
              <button class="mdl-button mdl-js-button mdl-button--icon date-time-control-btn" onclick="adjustDate('endDate', 1, 'day')">
                <i class="material-icons">keyboard_arrow_up</i>
              </button>
              <button class="mdl-button mdl-js-button mdl-button--icon date-time-control-btn" onclick="adjustDate('endDate', -1, 'day')">
                <i class="material-icons">keyboard_arrow_down</i>
              </button>
            </div>
          </div>
          
          <div class="date-time-flex-container">
            <!-- Time Input with Controls -->
            <input type="time" id="endTime" class="time-input">
            <div class="date-time-controls">
              <button class="mdl-button mdl-js-button mdl-button--icon date-time-control-btn" onclick="adjustTime('endTime', 1, 'hour')">
                <i class="material-icons">keyboard_arrow_up</i>
              </button>
              <button class="mdl-button mdl-js-button mdl-button--icon date-time-control-btn" onclick="adjustTime('endTime', -1, 'hour')">
                <i class="material-icons">keyboard_arrow_down</i>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Filter Actions -->
      <div class="filter-actions">
        <button id="resetFilterBtn" class="mdl-button mdl-js-button" onclick="resetDateFilter()">Zurücksetzen</button>
        <button id="applyFilterBtn" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent" onclick="applyDateFilter()">Anwenden</button>
      </div>
    `;
  }
}

export default Sidebar;
