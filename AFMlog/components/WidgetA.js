/**
 * WidgetA component for the AFM Dashboard
 * Displays a system health gauge and status information
 */
class WidgetA {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.initGauge();
    this.setupEventListeners();
  }

  /**
   * Initialize the health gauge using Chart.js
   */
  initGauge() {
    const canvas = document.getElementById('healthGauge');
    
    // Restore original dimensions
    canvas.height = 200;
    canvas.style.height = '200px';
    
    const ctx = canvas.getContext('2d');
    
    // Get theme-aware colors
    this.updateChartColors();
    
    // Create the gauge chart with enhanced visuals
    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [100, 0],
          backgroundColor: [
            this.colors.successColor, // Theme-aware color for good health
            this.colors.bgColor       // Theme-aware background
          ],
          borderWidth: 2,
          borderColor: 'rgba(0,0,0,0.05)',
          hoverOffset: 10,
          borderRadius: 5
        }]
      },
      options: {
        cutout: '75%',
        circumference: 180,
        rotation: 270,
        maintainAspectRatio: false,
        aspectRatio: 2, // Make the chart wider than it is tall
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000,
          easing: 'easeOutQuart'
        },
        plugins: {
          tooltip: {
            enabled: false
          },
          legend: {
            display: false
          }
        },
        layout: {
          padding: {
            top: -60,    // Negative padding to move gauge up
            right: 20,
            bottom: 100, // Increased bottom padding to balance the chart
            left: 20
          }
        },
        scales: {
          y: {
            display: false
          },
          x: {
            display: false
          }
        }
      }
    });
  }

  // Public method to update the health score
  updateHealthScore(score) {
    // Store current health for theme change updates
    this.currentHealth = Math.min(Math.max(0, Math.round(score)), 100); // Ensure score is between 0-100
    
    // Update the chart with current health
    this.updateChart(this.currentHealth);
    
    // Update the health score text without % and with matching color
    const scoreElement = document.getElementById('healthScore');
    if (scoreElement) {
      scoreElement.textContent = this.currentHealth;
      scoreElement.style.color = this.getHealthColor(this.currentHealth);
      
      // Add a transition effect
      scoreElement.style.transition = 'color 0.5s ease';
    }
  }
  
  /**
   * Update chart with current health score and theme-aware colors
   * @param {number} score - Health score between 0-100
   */
  updateChart(score) {
    if (!this.chart || !this.colors) return;
    
    // Get theme-aware colors based on health score
    let healthColor;
    if (score >= 80) {
      healthColor = this.colors.successColor;
    } else if (score >= 50) {
      healthColor = this.colors.warningColor;
    } else {
      healthColor = this.colors.errorColor;
    }
    
    // Update chart data
    this.chart.data.datasets[0].data = [score, 100 - score];
    this.chart.data.datasets[0].backgroundColor = [healthColor, this.colors.bgColor];
    this.chart.update();
  }

  // Public method to update status indicators
  updateStatus(data) {
    const { fileProcessing, errorRate, throughput, connection, errorIntensity, errorTrend, archiveToErrorRatio } = data;
    
    this.updateStatusItem('fileProcessingStatus', fileProcessing.value, fileProcessing.status);
    this.updateStatusItem('errorRateStatus', errorRate.value, errorRate.status);
    this.updateStatusItem('throughputStatus', throughput.value, throughput.status);
    this.updateStatusItem('connectionStatus', connection.value, connection.status);
    
    // Update new status indicators if they exist
    if (errorIntensity) {
      this.updateStatusItem('errorIntensityStatus', errorIntensity.value, errorIntensity.status);
    }
    
    if (errorTrend) {
      this.updateStatusItem('errorTrendStatus', errorTrend.value, errorTrend.status);
    }
    
    if (archiveToErrorRatio) {
      this.updateStatusItem('ratioStatus', archiveToErrorRatio.value, archiveToErrorRatio.status);
    }
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
    // Make sure we have the current theme colors
    if (!this.colors) {
      this.updateChartColors();
    }
    
    if (score >= 80) {
      return this.colors.successColor;
    } else if (score >= 60) {
      return this.colors.warningColor;
    } else {
      return this.colors.errorColor;
    }
  }

  /**
   * Set up event listeners for the widget
   */
  setupEventListeners() {
    // NOTE: Toggle card functionality is now handled centrally by uiManager.js
    // through setupCardToggleListeners(), which adds listeners to all toggle buttons.
    // We don't need to add our own event listener here to avoid double-firing.
    
    // Add theme change listener to update chart colors
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          this.updateChartColors();
          this.updateChart(this.currentHealth || 100);
          
          // Also update the health score text color
          const scoreElement = document.getElementById('healthScore');
          if (scoreElement && this.currentHealth) {
            scoreElement.style.color = this.getHealthColor(this.currentHealth);
          }
        }
      });
    });
    
    // Start observing theme changes
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }
  
  /**
   * Clean up resources when the widget is destroyed
   */
  destroy() {
    // Stop observing theme changes
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
    
    // Destroy chart instance
    if (this.chart) {
      this.chart.destroy();
    }
  }
  
  /**
   * Update chart colors based on current theme
   */
  updateChartColors() {
    this.colors = {
      successColor: getComputedStyle(document.documentElement).getPropertyValue('--success-color').trim(),
      warningColor: getComputedStyle(document.documentElement).getPropertyValue('--warning-color').trim(),
      errorColor: getComputedStyle(document.documentElement).getPropertyValue('--error-color').trim(),
      bgColor: getComputedStyle(document.documentElement).getPropertyValue('--card-bg-color').trim()
    };
  }
}

export default WidgetA;
