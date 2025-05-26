// Inject the location overriding script into the page
function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('locationOverride.js');
    script.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }
  
  // Execute the injection as early as possible
  injectScript();
  
  // Listen for messages from the injected script
  window.addEventListener('message', function(event) {
    // Only accept messages from the current window
    if (event.source !== window) return;
    
    // Check if the message is a location request
    if (event.data.type && event.data.type === 'GEO_GUARD_LOCATION_REQUEST') {
      // Forward the request to the background script
      chrome.runtime.sendMessage({
        action: 'processLocation',
        latitude: event.data.latitude,
        longitude: event.data.longitude
      }, function(response) {
        // Handle case where response might be undefined (if service worker is inactive)
        if (!response) {
          console.warn('GeoGuard Privacy: No response from background script, using original coordinates');
          response = {
            latitude: event.data.latitude,
            longitude: event.data.longitude,
            original: true,
            error: true
          };
        }
        
        // Send the response back to the page
        window.postMessage({
          type: 'GEO_GUARD_LOCATION_RESPONSE',
          originalRequestId: event.data.requestId,
          latitude: response.latitude,
          longitude: response.longitude,
          original: response.original,
          error: response.error,
          privacyLevel: response.privacyLevel || 5, // Pass privacy level back to the page
          is_sensitive: response.is_sensitive
        }, '*');
      });
    }
  }, { passive: true });
  
  // Handle messages from the background script
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    // Nothing needed here yet, but this is where you would handle
    // any messages sent from the background script to content script
  });