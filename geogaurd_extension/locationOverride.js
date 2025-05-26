/**
 * GeoGuard Privacy - Location API Override
 * 
 * This script overrides the browser's Geolocation API to provide
 * privacy-preserving coordinates instead of actual location.
 * It also adds synthetic accuracy values to enhance privacy.
 */
(function() {
    // Keep track of generated request IDs
    let requestCounter = 0;
    
    // Store pending callbacks for location requests
    const pendingRequests = new Map();
    
    // Store the original geolocation methods
    const originalGeolocation = navigator.geolocation;
    const originalGetCurrentPosition = originalGeolocation.getCurrentPosition.bind(originalGeolocation);
    const originalWatchPosition = originalGeolocation.watchPosition.bind(originalGeolocation);
    const originalClearWatch = originalGeolocation.clearWatch.bind(originalGeolocation);
    
    // Function to generate unique request IDs
    function generateRequestId() {
      return 'geo_req_' + (requestCounter++);
    }
    
    // Function to generate synthetic accuracy based on privacy level
    // Higher privacy level = less accurate (larger value)
    function generateSyntheticAccuracy(privacyLevel) {
      // Base accuracy (in meters)
      const baseAccuracy = 20;
      
      // Adjust based on privacy level (1-10)
      // Higher privacy level means less accuracy (higher number)
      return baseAccuracy * (1 + privacyLevel / 2);
    }
    
    // Override the Geolocation API
    navigator.geolocation = {
      getCurrentPosition: function(successCallback, errorCallback, options) {
        // First get the real position using the original method
        originalGetCurrentPosition(
          position => {
            const requestId = generateRequestId();
            
            console.log('GeoGuard: Original position', {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy || 'N/A'
            });
            
            // Store the callbacks so we can invoke them when we get a response
            pendingRequests.set(requestId, {
              successCallback,
              errorCallback,
              originalPosition: position,
              timeoutId: null
            });
            
            // Send the original position to the content script for privacy processing
            window.postMessage({
              type: 'GEO_GUARD_LOCATION_REQUEST',
              requestId: requestId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }, '*');
            
            // Set a timeout to handle case where extension messaging fails
            setRequestTimeout(requestId);
          },
          error => {
            // If getting the position fails, just pass through the error
            if (errorCallback) {
              errorCallback(error);
            }
          },
          options
        );
      },
      
      watchPosition: function(successCallback, errorCallback, options) {
        // Create a mapping for this watch
        const watchId = originalWatchPosition(
          position => {
            const requestId = generateRequestId();
            
            console.log('GeoGuard: Watch original position', {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy || 'N/A'
            });
            
            // Store this request with the associated watch ID
            pendingRequests.set(requestId, {
              successCallback,
              errorCallback,
              originalPosition: position,
              isWatch: true,
              watchId,
              timeoutId: null
            });
            
            // Send for privacy processing
            window.postMessage({
              type: 'GEO_GUARD_LOCATION_REQUEST',
              requestId: requestId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }, '*');
            
            // Set a timeout for this request
            setRequestTimeout(requestId);
          },
          error => {
            // Pass through errors
            if (errorCallback) {
              errorCallback(error);
            }
          },
          options
        );
        
        return watchId;
      },
      
      clearWatch: function(watchId) {
        // Just pass through to the original method
        return originalClearWatch(watchId);
      }
    };
    
    // Listen for responses from the content script
    window.addEventListener('message', function(event) {
      // Only accept messages from the current window
      if (event.source !== window) return;
      
      // Check if the message is a location response
      if (event.data.type && event.data.type === 'GEO_GUARD_LOCATION_RESPONSE') {
        const requestId = event.data.originalRequestId;
        const request = pendingRequests.get(requestId);
        
        if (request) {
          // Clear any pending timeout for this request
          if (request.timeoutId) {
            clearTimeout(request.timeoutId);
          }
          
          // If there was an error or privacy is disabled, use the original position
          if (event.data.error || event.data.original) {
            request.successCallback(request.originalPosition);
          } else {
            // Generate synthetic accuracy based on privacy level
            const privacyLevel = event.data.privacyLevel || 5; // Default to medium if not provided
            const syntheticAccuracy = generateSyntheticAccuracy(privacyLevel);
            
            // Create a modified position object with the privacy-preserving coordinates
            // and synthetic accuracy
            const modifiedPosition = {
              ...request.originalPosition,
              coords: {
                ...request.originalPosition.coords,
                latitude: event.data.latitude,
                longitude: event.data.longitude,
                accuracy: syntheticAccuracy // Add synthetic accuracy
              }
            };
            
            console.log('GeoGuard: Modified position', {
              lat: modifiedPosition.coords.latitude,
              lng: modifiedPosition.coords.longitude,
              accuracy: modifiedPosition.coords.accuracy,
              privacyLevel: privacyLevel
            });
            
            // Call the success callback with the modified position
            request.successCallback(modifiedPosition);
          }
          
          // Clean up if this wasn't a watch position request
          if (!request.isWatch) {
            pendingRequests.delete(requestId);
          }
        }
      }
    }, { passive: true });
    
    // Add a utility function to set timeouts for pending requests
    function setRequestTimeout(requestId, timeoutMs = 3000) {
      const request = pendingRequests.get(requestId);
      if (!request) return;
      
      request.timeoutId = setTimeout(() => {
        console.warn(`GeoGuard Privacy: Request ${requestId} timed out, using original coordinates`);
        // Use original position if we don't get a response in time
        request.successCallback(request.originalPosition);
        
        // Clean up if not a watch
        if (!request.isWatch) {
          pendingRequests.delete(requestId);
        }
      }, timeoutMs);
    }
    
    // Log that the override is active
    console.debug('GeoGuard Privacy: Location API override active with synthetic accuracy');
  })();