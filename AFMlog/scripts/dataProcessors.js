/**
 * Data processing functions for the AFM Dashboard
 * Handles transforming raw data into the format needed by the dashboard
 */

// Reference to known error patterns (will be set from dashboard.js)
let knownErrorPatterns = [];
let patternMatchesData = [];

/**
 * Set the known error patterns for use in error categorization
 * @param {Array} patterns - Array of known error patterns
 */
export function setKnownErrorPatterns(patterns) {
  knownErrorPatterns = patterns;
}

/**
 * Get the known error patterns
 * @returns {Array} - Array of known error patterns
 */
export function getKnownErrorPatterns() {
  return knownErrorPatterns;
}

/**
 * Set the pattern matches data for use in error categorization
 * @param {Array} data - Pattern matches data
 */
export function setPatternMatchesData(data) {
  patternMatchesData = data;
}

/**
 * Process status data
 * @param {Array} data - Raw status data
 * @returns {Array} - Processed status data
 */
export function processStatusData(data) {
  
  if (!data || data.length === 0) {
    return [];
  }
  
  // We'll extract the last run time in the applyFilters function after filtering
  // This ensures we get the last run time within the selected timeframe
  
  // Process the data
  return data.map(item => {
    // Try to extract timestamp from various possible column names
    const timestamp = item.Zeitpunkt || item.Timestamp || item.timestamp || item.Zeit || item.Time || item.time || '';
    
    // Try to extract values from various possible column names
    const input = parseInt(item.Input || item.input || item.Eingang || item.eingang || 0);
    const archive = parseInt(item.Archiv || item.archiv || item.Archive || item.archive || 0);
    const error = parseInt(item.Error || item.error || item.Fehler || item.fehler || 0);
    
    // Store raw values for later use in calculations
    const rawInput = item.Input || item.input || item.Eingang || item.eingang;
    const rawArchiv = item.Archiv || item.archiv || item.Archive || item.archive;
    const rawError = item.Error || item.error || item.Fehler || item.fehler;
    
    // Removed debug logging for processed status item
    
    return {
      timestamp,
      filesProcessed: input,
      throughput: archive,
      errorCount: error,
      // Store raw values for calculations
      rawInput,
      rawArchiv,
      rawError,
      // Store the original data for table display
      rawData: { ...item }
    };
  });
}

/**
 * Process error data
 * @param {Array} data - Raw error data
 * @returns {Array} - Processed error data
 */
export function processErrorData(data) {
  // Removed debug logging for error data
  
  // Ensure all required fields are present and properly formatted
  return data.map(item => {
    // Map German column names to our expected field names based on actual CSV structure
    const timestamp = item['Zeitpunkt'] || new Date().toISOString();
    const errorFile = item['ErrorDatei'] || ''; // Correct column name from CSV
    const message = item['Fehlermeldung'] || 'Unknown error'; // Correct column name from CSV
    
    // Default type to unknown
    let type = 'unknown';
    
    // First try to find a matching pattern in the pattern matches data by filename
    if (patternMatchesData && patternMatchesData.length > 0 && errorFile) {
      // Look for a pattern match entry with the same filename
      const matchingPattern = patternMatchesData.find(pattern => 
        pattern['Datei'] === errorFile
      );
      
      if (matchingPattern && matchingPattern['Muster']) {
        // Use the pattern from the pattern matches data
        type = matchingPattern['Muster'];
        // Removed debug logging
      }
    }
    
    // If no match found in pattern data, try matching against known patterns in the message
    if (type === 'unknown' && knownErrorPatterns && knownErrorPatterns.length > 0 && message) {
      // Find the first matching pattern in the error message
      const matchedPattern = knownErrorPatterns.find(pattern => 
        message.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (matchedPattern) {
        type = matchedPattern; // Use the matched pattern as the error type
        // Removed debug logging for pattern match in message
      }
    }
    
    // Removed debug logging for error categorization
    
    return {
      timestamp: timestamp,
      type: type,
      message: message,
      file: errorFile,
      // Also store the original values for direct access
      rawData: { ...item }
    };
  });
}

/**
 * Process pattern data
 * @param {Array} data - Raw pattern data
 * @returns {Array} - Processed pattern data
 */
export function processPatternData(data) {
  // Removed all debug logging for pattern data
  
  // Ensure all required fields are present and properly formatted
  return data.map(item => {
    // Map German column names to our expected field names
    const timestamp = item['Zeitpunkt'] || new Date().toISOString();
    const pattern = item['Muster'] || item['Pattern'] || 'unknown';
    const file = item['Datei'] || item['File'] || '';
    const matches = parseInt(item['Treffer'] || item['Matches'] || '0');
    
    // Log a few samples to verify parsing
    if (data.indexOf(item) < 3) {
      // Removed debug logging for parsed pattern item
    }
    
    return {
      timestamp: timestamp,
      pattern: pattern,
      file: file,
      matches: matches,
      // Also store the original values for direct access
      rawData: { ...item }
    };
  });
}

/**
 * Process input data
 * @param {Array} data - Raw input data
 * @returns {Array} - Processed input data
 */
export function processInputData(data) {
  // Removed debug logging for input data
  
  // Ensure all required fields are present and properly formatted
  return data.map(item => {
    // Map German column names to our expected field names
    const timestamp = item['Zeitpunkt'] || new Date().toISOString();
    const source = item['Quelle'] || item['Source'] || 'unknown';
    const fileCount = parseInt(item['Dateien'] || item['FileCount'] || '0');
    const size = parseInt(item['Größe'] || item['Size'] || '0');
    
    // Removed debug logging for parsed input item
    
    return {
      timestamp: timestamp,
      source: source,
      fileCount: fileCount,
      size: size,
      // Also store the original values for direct access
      rawData: { ...item }
    };
  });
}
