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
  console.log('Processing status data:', data.length, 'rows');
  
  if (!data || data.length === 0) {
    console.warn('No status data available');
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
    
    console.log('Processed status item:', { timestamp, input, archive, error });
    
    return {
      timestamp,
      filesProcessed: input,
      throughput: archive,
      errorCount: error,
      // Store raw values for calculations
      rawInput,
      rawArchiv,
      rawError
    };
  });
}

/**
 * Process error data
 * @param {Array} data - Raw error data
 * @returns {Array} - Processed error data
 */
export function processErrorData(data) {
  // Log the first few items to debug column names and data structure
  if (data.length > 0) {
    console.log('Processing error data sample:');
    console.log('First row:', data[0]);
    console.log('Available columns:', Object.keys(data[0]));
  } else {
    console.log('No error data available');
  }
  
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
        console.log(`Found pattern match for ${errorFile}: ${type}`);
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
        console.log(`Found pattern match in message for ${errorFile}: ${type}`);
      }
    }
    
    // Log the categorization result
    if (data.indexOf(item) < 3) {
      console.log('Error categorization result:', {
        errorFile,
        message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        type
      });
    }
    
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
  // Log the first few items to debug column names and data structure
  if (data.length > 0) {
    console.log('Processing pattern data sample:');
    console.log('First row:', data[0]);
    console.log('Available columns:', Object.keys(data[0]));
  } else {
    console.log('No pattern data available');
  }
  
  // Ensure all required fields are present and properly formatted
  return data.map(item => {
    // Map German column names to our expected field names
    const timestamp = item['Zeitpunkt'] || new Date().toISOString();
    const pattern = item['Muster'] || item['Pattern'] || 'unknown';
    const file = item['Datei'] || item['File'] || '';
    const matches = parseInt(item['Treffer'] || item['Matches'] || '0');
    
    // Log a few samples to verify parsing
    if (data.indexOf(item) < 3) {
      console.log('Parsed pattern item:', { timestamp, pattern, file, matches });
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
  // Log the first few items to debug column names and data structure
  if (data.length > 0) {
    console.log('Processing input data sample:');
    console.log('First row:', data[0]);
    console.log('Available columns:', Object.keys(data[0]));
  } else {
    console.log('No input data available');
  }
  
  // Ensure all required fields are present and properly formatted
  return data.map(item => {
    // Map German column names to our expected field names
    const timestamp = item['Zeitpunkt'] || new Date().toISOString();
    const source = item['Quelle'] || item['Source'] || 'unknown';
    const fileCount = parseInt(item['Dateien'] || item['FileCount'] || '0');
    const size = parseInt(item['Größe'] || item['Size'] || '0');
    
    // Log a few samples to verify parsing
    if (data.indexOf(item) < 3) {
      console.log('Parsed input item:', { timestamp, source, fileCount, size });
    }
    
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
