/**
 * Responsive Design Module
 * 
 * Handles responsive design features for the AFM Dashboard,
 * including mobile detection and responsive layout adjustments.
 */

/**
 * Check if the device is mobile and add appropriate class to body
 */
function checkMobileAndAddClass() {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    document.body.classList.add('mobile-device');
  } else {
    document.body.classList.remove('mobile-device');
  }
}

/**
 * Initialize responsive design features
 */
export function initResponsiveDesign() {
  console.log('Initializing responsive design features');
  
  // Run mobile detection on page load
  checkMobileAndAddClass();
  
  // Set up event listener for window resize
  window.addEventListener('resize', checkMobileAndAddClass);
  
  console.log('Responsive design features initialized');
}
