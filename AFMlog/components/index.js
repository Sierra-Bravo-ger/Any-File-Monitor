/**
 * Central export file for all AFM Dashboard components
 * Following the modular architecture pattern
 */

// Import components
import Header from './Header.js';
import Footer from './Footer.js';
import Sidebar from './Sidebar.js';
import SummaryCard from './SummaryCard.js';
import WidgetA from './WidgetA.js';

// Re-export components
export {
  Header,
  Footer,
  Sidebar,
  SummaryCard,
  WidgetA
};

// Export default object for backward compatibility
export default {
  Header,
  Footer,
  Sidebar,
  SummaryCard,
  WidgetA
};
