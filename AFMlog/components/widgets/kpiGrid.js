/**
 * KPI Grid Widget Component
 * Displays key performance indicators in a grid layout
 */

/**
 * Update the KPI grid with the latest data
 * @param {Object} kpis - Key performance indicators
 * @returns {void}
 */
export function updateKpiGrid(kpis) {
  // Update KPI cards
  document.getElementById('errorIntensityKPI').textContent = kpis.errorIntensity;
  document.getElementById('errorTrendKPI').textContent = kpis.errorTrend;
  document.getElementById('archiveToErrorRatio').textContent = kpis.archiveToErrorRatio;
  
  // Add color coding for error trend
  const errorTrendElement = document.getElementById('errorTrendKPI');
  if (errorTrendElement) {
    // Reset classes first
    errorTrendElement.classList.remove('trend-positive', 'trend-negative', 'trend-neutral');
    
    // Add appropriate class based on trend value
    if (kpis.errorTrend.includes('+')) {
      errorTrendElement.classList.add('trend-negative'); // More errors is negative
    } else if (kpis.errorTrend.includes('-')) {
      errorTrendElement.classList.add('trend-positive'); // Fewer errors is positive
    } else {
      errorTrendElement.classList.add('trend-neutral'); // No change is neutral
    }
  }
}

/**
 * Create the KPI grid HTML structure
 * @param {HTMLElement} container - The container element to append the grid to
 * @returns {void}
 */
export function createKpiGrid(container) {
  // Create the grid container
  const gridContainer = document.createElement('div');
  gridContainer.className = 'mdl-grid';
  
  // Create Archive to Error Ratio KPI card
  const archiveErrorRatioCard = createKpiCard(
    'Archiv : Fehler',
    'archiveToErrorRatio',
    'Verhältnis zwischen archivierten und fehlerhaften Dateien'
  );
  
  // Create Error Intensity KPI card
  const errorIntensityCard = createKpiCard(
    'Fehlerintensität',
    'errorIntensityKPI',
    'Durchschnittliche Anzahl der Fehler pro Stunde im ausgewählten Zeitraum'
  );
  
  // Create Error Trend KPI card
  const errorTrendCard = createKpiCard(
    'Fehlertrend',
    'errorTrendKPI',
    'Prozentuale Veränderung der Fehleranzahl im Vergleich zum vorherigen Zeitraum'
  );
  
  // Append cards to grid
  gridContainer.appendChild(wrapInGridCell(archiveErrorRatioCard));
  gridContainer.appendChild(wrapInGridCell(errorIntensityCard));
  gridContainer.appendChild(wrapInGridCell(errorTrendCard));
  
  // Append grid to container
  container.appendChild(gridContainer);
}

/**
 * Create a KPI card element
 * @param {string} label - The label for the KPI
 * @param {string} id - The ID for the value element
 * @param {string} tooltip - The tooltip text
 * @returns {HTMLElement} - The KPI card element
 */
function createKpiCard(label, id, tooltip) {
  const card = document.createElement('div');
  card.className = 'kpi-card mdl-shadow--2dp';
  
  // Create label container
  const labelContainer = document.createElement('div');
  labelContainer.className = 'kpi-label';
  labelContainer.textContent = label;
  
  // Create tooltip
  const tooltipSpan = document.createElement('span');
  tooltipSpan.className = 'tooltip';
  
  const infoIcon = document.createElement('i');
  infoIcon.className = 'material-icons info-icon';
  infoIcon.textContent = 'info_outline';
  
  const tooltipText = document.createElement('span');
  tooltipText.className = 'tooltiptext';
  tooltipText.textContent = tooltip;
  
  tooltipSpan.appendChild(infoIcon);
  tooltipSpan.appendChild(tooltipText);
  labelContainer.appendChild(tooltipSpan);
  
  // Create value container
  const valueContainer = document.createElement('div');
  valueContainer.className = 'kpi-value';
  valueContainer.id = id;
  
  // Assemble card
  card.appendChild(labelContainer);
  card.appendChild(valueContainer);
  
  return card;
}

/**
 * Wrap an element in a grid cell
 * @param {HTMLElement} element - The element to wrap
 * @returns {HTMLElement} - The wrapped element
 */
function wrapInGridCell(element) {
  const cell = document.createElement('div');
  cell.className = 'mdl-cell mdl-cell--4-col';
  cell.appendChild(element);
  return cell;
}
