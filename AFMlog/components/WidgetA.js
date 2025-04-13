/**
 * WidgetA component for the AFM Dashboard
 * Displays a system health gauge and status information
 */
class WidgetA {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.render();
    this.initGauge();
  }

  render() {
    this.container.innerHTML = `
      <div class="mdl-card__title">
        <h2 class="mdl-card__title-text">System-Gesundheit</h2>
        <button class="mdl-button mdl-js-button mdl-button--icon toggle-card-btn" onclick="toggleCard('healthCard')" title="Ein-/ausklappen">
          <i class="material-icons">expand_less</i>
        </button>
      </div>
      <div class="mdl-card__supporting-text">
        <div class="health-gauge-container">
          <canvas id="healthGauge"></canvas>
          <div id="healthScore">100</div>
        </div>
        
        <div style="margin-top: 16px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span class="status-indicator status-ok"></span>
            <span style="flex: 1;">Dateiverarbeitung</span>
            <span id="fileProcessingStatus">Aktiv</span>
          </div>
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span class="status-indicator status-ok"></span>
            <span style="flex: 1;">Fehlerrate</span>
            <span id="errorRateStatus">0.0%</span>
          </div>
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span class="status-indicator status-ok"></span>
            <span style="flex: 1;">Durchsatz</span>
            <span id="throughputStatus">0 Dateien/h</span>
          </div>
          <div style="display: flex; align-items: center;">
            <span class="status-indicator status-ok"></span>
            <span style="flex: 1;">Verbindungsstatus</span>
            <span id="connectionStatus">Verbunden</span>
          </div>
        </div>
      </div>
    `;
  }

  initGauge() {
    // Initialize the health gauge using Chart.js
    const ctx = document.getElementById('healthGauge').getContext('2d');
    
    // Create the gauge chart
    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [100, 0],
          backgroundColor: [
            '#4caf50', // Green for good health
            '#e0e0e0'  // Gray for background
          ],
          borderWidth: 0
        }]
      },
      options: {
        cutout: '75%',
        circumference: 180,
        rotation: 270,
        maintainAspectRatio: false,
        animation: {
          animateRotate: true,
          animateScale: true
        },
        plugins: {
          tooltip: {
            enabled: false
          },
          legend: {
            display: false
          }
        }
      }
    });
  }

  // Public method to update the health score
  updateHealthScore(score) {
    const healthScore = Math.round(score);
    
    // Update score display
    const scoreElement = document.getElementById('healthScore');
    if (scoreElement) {
      scoreElement.textContent = healthScore;
      scoreElement.style.color = this.getHealthColor(healthScore);
    }
    
    // Update gauge chart
    if (this.chart) {
      this.chart.data.datasets[0].data = [healthScore, 100 - healthScore];
      this.chart.data.datasets[0].backgroundColor[0] = this.getHealthColor(healthScore);
      this.chart.update();
    }
  }

  // Public method to update status indicators
  updateStatus(data) {
    const { fileProcessing, errorRate, throughput, connection } = data;
    
    this.updateStatusItem('fileProcessingStatus', fileProcessing.value, fileProcessing.status);
    this.updateStatusItem('errorRateStatus', errorRate.value, errorRate.status);
    this.updateStatusItem('throughputStatus', throughput.value, throughput.status);
    this.updateStatusItem('connectionStatus', connection.value, connection.status);
  }
  
  // Helper method to update a status item
  updateStatusItem(id, value, status) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
      
      // Update indicator
      const indicator = element.parentElement.querySelector('.status-indicator');
      indicator.className = 'status-indicator';
      
      switch (status) {
        case 'ok':
          indicator.classList.add('status-ok');
          break;
        case 'warning':
          indicator.classList.add('status-warning');
          break;
        case 'error':
          indicator.classList.add('status-error');
          break;
      }
    }
  }

  // Helper method to get color based on health score
  getHealthColor(score) {
    if (score >= 80) {
      return 'var(--success-color)';
    } else if (score >= 60) {
      return 'var(--warning-color)';
    } else {
      return 'var(--error-color)';
    }
  }
}

export default WidgetA;
