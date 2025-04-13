/**
 * Data loading utilities for the AFM Dashboard
 * Handles loading CSV files and other data sources
 */

/**
 * Load CSV file
 * @param {string} filename - Name of the CSV file to load
 * @param {Object} options - Additional options for loading
 * @returns {Promise} - Promise that resolves with the parsed CSV data
 */
export function loadCSV(filename, options = {}) {
  return new Promise((resolve, reject) => {
    // Make sure we're using the correct path for CSV files
    const csvPath = filename;
    console.log(`Loading CSV file from: ${csvPath}`);
    
    // Default options
    const defaultOptions = {
      download: true,
      header: true,
      dynamicTyping: false, // Don't auto-convert to numbers to preserve date strings
      skipEmptyLines: true,
      delimiter: ';', // German CSV files use semicolon as delimiter
    };
    
    // Merge default options with user-provided options
    const papaOptions = { ...defaultOptions, ...options };
    
    // Add callbacks
    papaOptions.complete = function(results) {
      console.log(`Loaded ${filename}:`, results.data.length, 'rows');
      
      // Debug the CSV parsing results for input details file
      if (filename === './AFM_input_details.csv') {
        console.log('CSV PARSING DEBUG for input details:');
        console.log('Parser options used:', papaOptions);
        console.log('Meta information:', results.meta);
        
        if (results.data.length > 0) {
          console.log('First row keys:', Object.keys(results.data[0]));
          console.log('First row values:', Object.values(results.data[0]));
          console.log('First row full object:', JSON.stringify(results.data[0], null, 2));
          
          // Check if there are any unexpected columns
          const expectedColumns = ['Zeitpunkt', 'Anzahl', 'Dateinamen als String'];
          const actualColumns = Object.keys(results.data[0]);
          
          const unexpectedColumns = actualColumns.filter(col => !expectedColumns.includes(col));
          if (unexpectedColumns.length > 0) {
            console.warn('Unexpected columns found:', unexpectedColumns);
          }
        }
      }
      
      resolve(results.data);
    };
    
    papaOptions.error = function(error) {
      console.error(`Error loading ${filename}:`, error);
      // Don't use mock data, just return an empty array
      console.warn(`Failed to load ${filename}, returning empty data`);
      resolve([]);
    };
    
    // Use Papa Parse to load and parse the CSV file
    Papa.parse(csvPath, papaOptions);
  });
}

/**
 * Load all data files for the AFM Dashboard
 * @returns {Promise} - Promise that resolves with all loaded data
 */
export function loadAllDataFiles() {
  console.log('Loading all data files...');
  
  return Promise.all([
    loadCSV('./AFM_status_log.csv'),
    loadCSV('./AFM_error_log.csv'),
    loadCSV('./AFM_pattern_matches.csv'),
    loadCSV('./AFM_input_details.csv')
  ]).then(([statusResults, errorResults, patternResults, inputResults]) => {
    console.log('Data loaded:', {
      statusResults: statusResults.length,
      errorResults: errorResults.length,
      patternResults: patternResults.length,
      inputResults: inputResults.length
    });
    
    // Log the actual column names from the input data to diagnose the issue
    if (inputResults.length > 0) {
      console.log('Input data columns:', Object.keys(inputResults[0]));
      console.log('First row of input data:', inputResults[0]);
    }
    
    return {
      statusData: statusResults,
      errorData: errorResults,
      patternData: patternResults,
      inputData: inputResults
    };
  });
}

/**
 * Get the date range from the status data
 * @param {Array} statusData - Status data from the CSV file
 * @returns {Object} - Min and max dates from the status data
 */
export function getDateRangeFromStatusData(statusData) {
  if (!Array.isArray(statusData) || statusData.length === 0) {
    console.warn('No status data available to determine date range');
    // Return default range (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    return { minDate: thirtyDaysAgo, maxDate: now };
  }
  
  try {
    const timestamps = statusData.map(item => {
      const timestamp = item.Zeitpunkt || item.timestamp || item.Timestamp || item.Zeit || item.Date || item['Datum/Zeit'];
      if (!timestamp) return null;
      
      try {
        if (typeof timestamp === 'string') {
          if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(timestamp)) {
            const [datePart, timePart] = timestamp.split(' ');
            return new Date(`${datePart}T${timePart}`);
          }
          
          const parsedDate = new Date(timestamp);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
          }
          
          return null;
        } else if (timestamp instanceof Date) {
          return timestamp;
        }
      } catch (error) {
        console.warn('Error parsing timestamp:', timestamp, error);
        return null;
      }
      
      return null;
    }).filter(date => date !== null && !isNaN(date.getTime()));
    
    if (timestamps.length === 0) {
      console.warn('No valid timestamps found in status data');
      // Return default range (last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return { minDate: thirtyDaysAgo, maxDate: now };
    }
    
    const timestampValues = timestamps.map(date => date.getTime());
    
    const minTimestamp = Math.min(...timestampValues);
    const maxTimestamp = Math.max(...timestampValues);
    
    const minDate = new Date(minTimestamp);
    const maxDate = new Date(maxTimestamp);
    
    const rangeDays = Math.ceil((maxTimestamp - minTimestamp) / (1000 * 60 * 60 * 24));
    
    let finalMinDate = minDate;
    let finalMaxDate = maxDate;
    
    if (rangeDays < 3) {
      const expansionDays = Math.ceil((3 - rangeDays) / 2);
      
      finalMinDate = new Date(minDate);
      finalMinDate.setDate(finalMinDate.getDate() - expansionDays);
      
      finalMaxDate = new Date(maxDate);
      finalMaxDate.setDate(finalMaxDate.getDate() + expansionDays);
    }
    
    return { minDate: finalMinDate, maxDate: finalMaxDate };
  } catch (error) {
    console.error('Error getting date range from status data:', error);
    // Return default range (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    return { minDate: thirtyDaysAgo, maxDate: now };
  }
}

/**
 * Load pattern matches data for error categorization
 * @returns {Promise} - Promise that resolves with pattern matches data
 */
export function loadPatternMatchesData() {
  console.log('Loading pattern matches data for error categorization...');
  
  return loadCSV('./AFM_pattern_matches.csv')
    .then(data => {
      // Extract unique patterns from the data
      const patterns = new Set();
      data.forEach(item => {
        if (item['Muster']) {
          patterns.add(item['Muster']);
        }
      });
      
      // Convert Set to Array
      const knownErrorPatterns = Array.from(patterns);
      
      return {
        patternMatchesData: data,
        knownErrorPatterns: knownErrorPatterns
      };
    })
    .catch(error => {
      console.error('Error loading pattern matches:', error);
      // Set hardcoded error patterns as fallback
      const fallbackPatterns = [
        "Timeout", 
        "Zeitüberschreitung", 
        "Verbindung vom peer", 
        "multiple Rows in singleton select", 
        "deadlock", 
        "lock conflict on no wait transaction",
        "nicht definiert"
      ];
      
      return {
        patternMatchesData: [],
        knownErrorPatterns: fallbackPatterns
      };
    });
}
