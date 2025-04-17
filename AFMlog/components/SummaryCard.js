/**
 * SummaryCard component for the AFM Dashboard
 * Displays key summary metrics in a grid layout
 */
class SummaryCard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.elements = {}; // Store references to elements
    this.render();
    this.cacheElements();
  }

  /**
   * Create a summary item with the given data
   * @param {string} refName - Reference name for the data-ref attribute
   * @param {string} labelText - Text for the label
   * @param {string} tooltipText - Text for the tooltip
   * @returns {HTMLElement} - The created summary item element
   */
  createSummaryItem(refName, labelText, tooltipText) {
    // Clone the template
    const template = document.getElementById('summary-item-template');
    const summaryItem = template.content.cloneNode(true).querySelector('.summary-item');
    
    // Set the data-ref attribute
    const valueElement = summaryItem.querySelector('.summary-value');
    valueElement.setAttribute('data-ref', refName);
    
    // Set the label text
    const labelTextElement = summaryItem.querySelector('.label-text');
    labelTextElement.textContent = labelText;
    
    // Set the tooltip text
    const tooltipTextElement = summaryItem.querySelector('.tooltiptext');
    tooltipTextElement.textContent = tooltipText;
    
    return summaryItem;
  }
  
  render() {
    // Clear the container
    this.container.innerHTML = '';
    
    // Clone the summary card template
    const template = document.getElementById('summary-card-template');
    const summaryCard = template.content.cloneNode(true).querySelector('.summary-card');
    
    // Create summary items
    const summaryItems = [
      {
        refName: 'totalFiles',
        labelText: 'Dateien verarbeitet',
        tooltipText: 'Gesamtanzahl aller verarbeiteten Dateien (Input + Archiv + Fehler)'
      },
      {
        refName: 'inputFiles',
        labelText: 'Input-Dateien',
        tooltipText: 'Anzahl der Dateien, die aktuell im Input-Verzeichnis liegen'
      },
      {
        refName: 'archiveFiles',
        labelText: 'Archiv-Dateien',
        tooltipText: 'Anzahl der Dateien, die erfolgreich verarbeitet und archiviert wurden'
      },
      {
        refName: 'errorFiles',
        labelText: 'Fehler-Dateien',
        tooltipText: 'Anzahl der Dateien, die nicht verarbeitet werden konnten und im Fehler-Verzeichnis liegen'
      },
      {
        refName: 'totalErrors',
        labelText: 'Fehler gesamt',
        tooltipText: 'Anzahl der aufgetretenen Fehler im ausgewählten Zeitraum'
      },
      {
        refName: 'patternMatches',
        labelText: 'Muster erkannt',
        tooltipText: 'Anzahl der Fehler, die einem bekannten Muster zugeordnet werden konnten'
      },
      {
        refName: 'errorRate',
        labelText: 'Fehlerrate',
        tooltipText: 'Prozentualer Anteil der Fehler an der Gesamtzahl der Dateien'
      },
      {
        refName: 'avgThroughput',
        labelText: 'Durchsatz/Stunde',
        tooltipText: 'Durchschnittliche Anzahl der verarbeiteten Dateien pro Stunde'
      }
    ];
    
    // Add each summary item to the card
    summaryItems.forEach(item => {
      const summaryItem = this.createSummaryItem(item.refName, item.labelText, item.tooltipText);
      summaryCard.appendChild(summaryItem);
    });
    
    // Add the summary card to the container
    this.container.appendChild(summaryCard);
  }

  /**
   * Cache references to DOM elements for better performance
   * and proper encapsulation
   */
  cacheElements() {
    // Find all elements with data-ref attribute within this component
    const refElements = this.container.querySelectorAll('[data-ref]');
    
    // Store references in the elements object
    refElements.forEach(el => {
      const refName = el.getAttribute('data-ref');
      this.elements[refName] = el;
    });
  }

  /**
   * Update the summary card with new KPI values
   * @param {Object} kpis - Key performance indicators
   */
  update(kpis) {
    // Update summary values using component references
    if (this.elements.totalFiles) this.elements.totalFiles.textContent = kpis.totalFiles.toLocaleString();
    if (this.elements.totalErrors) this.elements.totalErrors.textContent = kpis.totalErrors.toLocaleString();
    if (this.elements.errorRate) this.elements.errorRate.textContent = kpis.errorRate;
    if (this.elements.avgThroughput) this.elements.avgThroughput.textContent = kpis.avgThroughput.toLocaleString();
    if (this.elements.patternMatches) this.elements.patternMatches.textContent = kpis.patternMatches.toLocaleString();
    
    // Update additional summary values
    if (this.elements.inputFiles) this.elements.inputFiles.textContent = kpis.inputFiles.toLocaleString();
    if (this.elements.archiveFiles) this.elements.archiveFiles.textContent = kpis.archiveFiles.toLocaleString();
    if (this.elements.errorFiles) this.elements.errorFiles.textContent = kpis.errorFiles.toLocaleString();
  }
}

export default SummaryCard;
