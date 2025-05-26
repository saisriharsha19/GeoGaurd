// GeoGuard Test Suite - Comprehensive testing for all extension features
console.log('[GeoGuard Test] Script starting execution');

// Initialize the test suite
function initTestSuite() {
  console.log('[GeoGuard Test] Initializing test suite');
  
  // DOM elements
  const elements = {
    // Basic test elements
    getLocationBtn: document.getElementById('getLocationBtn'),
    watchLocationBtn: document.getElementById('watchLocationBtn'),
    stopWatchBtn: document.getElementById('stopWatchBtn'),
    highAccuracyBtn: document.getElementById('highAccuracyBtn'),
    noFallbackBtn: document.getElementById('noFallbackBtn'),
    cacheBustBtn: document.getElementById('cacheBustBtn'),
    basicResult: document.getElementById('basicResult'),
    advancedResult: document.getElementById('advancedResult'),
    originalCoordinates: document.getElementById('originalCoordinates'),
    protectedCoordinates: document.getElementById('protectedCoordinates'),
    fullLocationOutput: document.getElementById('fullLocationOutput'),
    advancedLocationOutput: document.getElementById('advancedLocationOutput'),
    privacyStatus: document.getElementById('privacyStatus'),
    distanceOffset: document.getElementById('distanceOffset'),
    accuracyValue: document.getElementById('accuracyValue'),
    privacyLevel: document.getElementById('privacyLevel'),
    sensitiveLocation: document.getElementById('sensitiveLocation')
  };

  // Check for missing DOM elements and log warnings
  Object.entries(elements).forEach(([key, element]) => {
    if (!element) {
      console.warn(`[GeoGuard Test] DOM element not found: ${key}`);
    }
  });

  // Variable to store watch position ID
  let watchId = null;

  // Check if GeoGuard is installed
  function detectGeoGuard() {
    console.log('[GeoGuard Test] Detecting GeoGuard extension');
    
    // Detection indicators
    const indicators = {
      extension: !!window.__geoGuardEnabled__,
      nativeOverride: navigator.geolocation.getCurrentPosition.toString().indexOf('native code') === -1,
      testFunction: typeof window.testGeoGuard === 'function'
    };
    
    console.log('[GeoGuard Test] Detection results:', indicators);
    
    // Update UI with extension status - prioritize the nativeOverride check
    if (elements.privacyStatus) {
      if (indicators.nativeOverride) {
        elements.privacyStatus.innerHTML = 'GeoGuard status: <span class="privacy-indicator privacy-high">Active and Functional ✓</span>';
      } else if (indicators.extension) {
        elements.privacyStatus.innerHTML = 'GeoGuard status: <span class="privacy-indicator privacy-medium">Present but May Not Be Working</span>';
      } else {
        elements.privacyStatus.innerHTML = 'GeoGuard status: <span class="privacy-indicator privacy-low">Not Detected ✗</span>';
      }
    }
    
    return indicators.nativeOverride; // Return true if the geolocation API is overridden
}

  // Standard location request
  function getLocation(options = {}) {
    console.log('[GeoGuard Test] Requesting location with options:', options);
    if (elements.basicResult) elements.basicResult.style.display = 'block';
    if (elements.protectedCoordinates) elements.protectedCoordinates.textContent = 'Requesting location...';
    if (elements.fullLocationOutput) elements.fullLocationOutput.textContent = 'Waiting for response...';
    
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position => {
          console.log('[GeoGuard Test] Received position:', position);
          handleLocationSuccess(position);
          resolve(position);
        },
        error => {
          console.error('[GeoGuard Test] Location error:', error);
          handleLocationError(error);
          reject(error);
        },
        { maximumAge: 0, timeout: 15000, ...options }
      );
    });
  }

  // Start watching location
  function startWatchingLocation() {
    console.log('[GeoGuard Test] Starting location watch');
    if (watchId !== null) {
      console.warn('[GeoGuard Test] Watch already active, stopping previous watch');
      stopWatchingLocation();
    }
    
    if (elements.basicResult) elements.basicResult.style.display = 'block';
    if (elements.protectedCoordinates) elements.protectedCoordinates.textContent = 'Watching location...';
    if (elements.fullLocationOutput) elements.fullLocationOutput.textContent = 'Waiting for updates...';
    
    watchId = navigator.geolocation.watchPosition(
      handleLocationSuccess,
      handleLocationError,
      { maximumAge: 0 }
    );
    
    // Update UI
    if (elements.watchLocationBtn) elements.watchLocationBtn.disabled = true;
    if (elements.stopWatchBtn) elements.stopWatchBtn.disabled = false;
    
    return watchId;
  }

  // Stop watching location
  function stopWatchingLocation() {
    if (watchId !== null) {
      console.log('[GeoGuard Test] Stopping location watch');
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      
      // Update UI
      if (elements.watchLocationBtn) elements.watchLocationBtn.disabled = false;
      if (elements.stopWatchBtn) elements.stopWatchBtn.disabled = true;
      
      return true;
    }
    
    console.warn('[GeoGuard Test] No active watch to stop');
    return false;
  }

  // Format location object for display
  function formatLocationObject(position) {
    return JSON.stringify({
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed
      },
      timestamp: position.timestamp
    }, null, 2);
  }

  // Calculate distance between coordinates
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c); // Distance in meters
  }

  // Handle successful location retrieval
  function handleLocationSuccess(position) {
    console.log('[GeoGuard Test] Processing location success');
    
    // Display the protected coordinates
    if (elements.protectedCoordinates) {
      elements.protectedCoordinates.textContent = 
        `Latitude: ${position.coords.latitude.toFixed(7)}\n` +
        `Longitude: ${position.coords.longitude.toFixed(7)}`;
    }
    
    // Display the full location object
    if (elements.fullLocationOutput) {
      elements.fullLocationOutput.textContent = formatLocationObject(position);
    }
    
    // Update privacy assessment
    if (elements.accuracyValue) {
      elements.accuracyValue.textContent = `${Math.round(position.coords.accuracy)} meters`;
    }
    
    // Calculate privacy level based on accuracy
    let privacyRating, privacyClass;
    if (position.coords.accuracy < 100) {
      privacyRating = 'Low';
      privacyClass = 'privacy-low';
    } else if (position.coords.accuracy < 500) {
      privacyRating = 'Medium';
      privacyClass = 'privacy-medium';
    } else {
      privacyRating = 'High';
      privacyClass = 'privacy-high';
    }
    
    // Update privacy level indicator
    if (elements.privacyLevel) {
      elements.privacyLevel.innerHTML = `<span class="privacy-indicator ${privacyClass}">${privacyRating}</span>`;
    }
    
    // Estimate if location is sensitive based on accuracy
    let sensitivityRating, sensitivityClass;
    if (position.coords.accuracy > 300) {
      sensitivityRating = 'Likely';
      sensitivityClass = 'privacy-high';
    } else {
      sensitivityRating = 'Unlikely';
      sensitivityClass = 'privacy-low';
    }
    
    // Update sensitivity indicator
    if (elements.sensitiveLocation) {
      elements.sensitiveLocation.innerHTML = `<span class="privacy-indicator ${sensitivityClass}">${sensitivityRating}</span>`;
    }
  }

  // Handle location retrieval errors
  function handleLocationError(error) {
    console.error('[GeoGuard Test] Handling location error:', error);
    
    // Display error in the coordinates area
    if (elements.protectedCoordinates) {
      elements.protectedCoordinates.textContent = `Error: ${error.message} (Code: ${error.code})`;
    }
    
    // Display full error object
    if (elements.fullLocationOutput) {
      elements.fullLocationOutput.textContent = JSON.stringify(error, null, 2);
    }
    
    // Update status to show error
    if (elements.privacyStatus) {
      elements.privacyStatus.innerHTML = 'GeoGuard status: <span class="privacy-indicator privacy-medium">Error Occurred</span>';
    }
  }

  // Advanced test: High accuracy request
  function testHighAccuracy() {
    console.log('[GeoGuard Test] Testing high accuracy mode');
    if (elements.advancedResult) elements.advancedResult.style.display = 'block';
    if (elements.advancedLocationOutput) elements.advancedLocationOutput.textContent = 'Requesting location with high accuracy...';
    
    navigator.geolocation.getCurrentPosition(
      position => {
        console.log('[GeoGuard Test] High accuracy result:', position);
        if (elements.advancedLocationOutput) {
          elements.advancedLocationOutput.textContent = formatLocationObject(position);
        }
      },
      error => {
        console.error('[GeoGuard Test] High accuracy error:', error);
        if (elements.advancedLocationOutput) {
          elements.advancedLocationOutput.textContent = `Error: ${error.message} (Code: ${error.code})`;
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  // Advanced test: Short timeout
  function testShortTimeout() {
    console.log('[GeoGuard Test] Testing with short timeout (5s)');
    if (elements.advancedResult) elements.advancedResult.style.display = 'block';
    if (elements.advancedLocationOutput) elements.advancedLocationOutput.textContent = 'Requesting location with 5s timeout...';
    
    navigator.geolocation.getCurrentPosition(
      position => {
        console.log('[GeoGuard Test] Short timeout result:', position);
        if (elements.advancedLocationOutput) {
          elements.advancedLocationOutput.textContent = formatLocationObject(position);
        }
      },
      error => {
        console.error('[GeoGuard Test] Short timeout error:', error);
        if (elements.advancedLocationOutput) {
          elements.advancedLocationOutput.textContent = `Error: ${error.message} (Code: ${error.code})`;
        }
      },
      { timeout: 5000, maximumAge: Infinity }
    );
  }

  // Advanced test: Cache busting
  function testCacheBusting() {
    console.log('[GeoGuard Test] Testing cache busting (maximumAge: 0)');
    if (elements.advancedResult) elements.advancedResult.style.display = 'block';
    if (elements.advancedLocationOutput) elements.advancedLocationOutput.textContent = 'Requesting fresh location (no cache)...';
    
    navigator.geolocation.getCurrentPosition(
      position => {
        console.log('[GeoGuard Test] Fresh location result:', position);
        if (elements.advancedLocationOutput) {
          elements.advancedLocationOutput.textContent = formatLocationObject(position);
        }
      },
      error => {
        console.error('[GeoGuard Test] Fresh location error:', error);
        if (elements.advancedLocationOutput) {
          elements.advancedLocationOutput.textContent = `Error: ${error.message} (Code: ${error.code})`;
        }
      },
      { maximumAge: 0, timeout: 15000 }
    );
  }

  // Set up event handlers for all buttons
  function setupEventHandlers() {
    console.log('[GeoGuard Test] Setting up event handlers');
    
    // Basic location test
    if (elements.getLocationBtn) {
      elements.getLocationBtn.onclick = () => getLocation();
    }
    
    // Watch position
    if (elements.watchLocationBtn) {
      elements.watchLocationBtn.onclick = startWatchingLocation;
    }
    
    // Stop watching
    if (elements.stopWatchBtn) {
      elements.stopWatchBtn.onclick = stopWatchingLocation;
    }
    
    // Advanced tests
    if (elements.highAccuracyBtn) {
      elements.highAccuracyBtn.onclick = testHighAccuracy;
    }
    
    if (elements.noFallbackBtn) {
      elements.noFallbackBtn.onclick = testShortTimeout;
    }
    
    if (elements.cacheBustBtn) {
      elements.cacheBustBtn.onclick = testCacheBusting;
    }
  }

  // Initialize the test suite
  function init() {
    // Detect GeoGuard
    const geoGuardStatus = detectGeoGuard();
    
    // Set up all event handlers
    setupEventHandlers();
    
    // Make test functions globally available for direct calling
    window.GeoGuardTest = {
      getLocation,
      startWatchingLocation,
      stopWatchingLocation,
      testHighAccuracy,
      testShortTimeout,
      testCacheBusting,
      detectGeoGuard
    };
    
    console.log('[GeoGuard Test] Test suite initialized and ready');
    return geoGuardStatus;
  }

  // Run initialization
  return init();
}

// Run the test suite when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTestSuite);
  console.log('[GeoGuard Test] Waiting for DOMContentLoaded');
} else {
  // DOM already loaded, run immediately
  const status = initTestSuite();
  console.log('[GeoGuard Test] Initialized immediately, status:', status);
}

// Global function to run the location test from anywhere
window.runGeoGuardTest = function() {
  console.log('[GeoGuard Test] Manual test triggered');
  if (window.GeoGuardTest && window.GeoGuardTest.getLocation) {
    return window.GeoGuardTest.getLocation();
  } else {
    console.error('[GeoGuard Test] Test suite not initialized');
    return Promise.reject(new Error('Test suite not initialized'));
  }
};

console.log('[GeoGuard Test] Script execution completed');