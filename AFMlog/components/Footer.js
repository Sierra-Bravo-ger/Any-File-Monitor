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
    // Render the last update element
    const lastUpdateDiv = document.getElementById('lastUpdate');
    if (lastUpdateDiv) {
      lastUpdateDiv.innerHTML = 'Letzte Aktualisierung: --.--.---- --:--:--';
    }
    
    // Render the refresh button
    this.container.innerHTML = `
      <button class="mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored refresh-button" onclick="loadAllData()">
        <i class="material-icons">refresh</i>
      </button>
    `;
  }

  setupEventListeners() {
    const refreshButton = this.container.querySelector('.refresh-button');
    if (refreshButton) {
      // Replace the onclick attribute with an event listener
      refreshButton.removeAttribute('onclick');
      refreshButton.addEventListener('click', () => {
        // Call the loadAllData function directly
        if (typeof loadAllData === 'function') {
          loadAllData();
        }
        
        // Add animation to button
        refreshButton.style.transition = 'transform 0.5s';
        refreshButton.style.transform = 'rotate(360deg)';
        
        // Reset animation after completion
        setTimeout(() => {
          refreshButton.style.transition = '';
          refreshButton.style.transform = '';
        }, 500);
      });
    }
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
