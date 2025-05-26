// Use proper service worker initialization
// This ensures the service worker is properly activated and avoids preload warnings
self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('GeoGuard Privacy: Service worker installed');
  });
  
  self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
    console.log('GeoGuard Privacy: Service worker activated');
  });
  
  // Global state
  let privacyState = {
    enabled: true,
    privacyLevel: 5,
    saveHistory: true,
    protectSensitive: true,
    lastLocation: null,
    lastPrivateLocation: null,
    lastIsSensitive: false,
    lastPrivacyLevel: 5,
    siteSettings: {}
  };
  
  // Initialize settings
  function loadSettings() {
    chrome.storage.local.get({
      privacyEnabled: true,
      privacyLevel: 5,
      saveHistory: true,
      protectSensitive: true,
      siteSettings: {}
    }, function(items) {
      privacyState.enabled = items.privacyEnabled;
      privacyState.privacyLevel = items.privacyLevel;
      privacyState.saveHistory = items.saveHistory;
      privacyState.protectSensitive = items.protectSensitive;
      privacyState.siteSettings = items.siteSettings || {};
      console.log('GeoGuard Privacy: Settings loaded', privacyState);
    });
  }
  
  // Add listener for browser startup
  chrome.runtime.onStartup.addListener(function() {
    console.log("GeoGuard Privacy: Browser started, re-initializing protection");
    loadSettings();
  });
  
  // Set up a reliable wake-up mechanism to mimic persistence
  try {
    if (chrome.alarms) {
      chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
      console.log('GeoGuard Privacy: Alarm created successfully');
      
      // Listen for alarms
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'keepAlive') {
          console.log('GeoGuard Privacy: Keeping protection active');
          // Refresh settings to ensure we're always using the latest
          loadSettings();
        }
      });
    }
  } catch (e) {
    console.error('GeoGuard Privacy: Error with alarms API', e);
  }
  
  // Load settings on initialization
  loadSettings();
  
  // Listen for messages from popup or content scripts
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    try {
      switch(message.action) {
        case 'updatePrivacyState':
          privacyState.enabled = message.enabled;
          break;
          
        case 'updatePrivacyLevel':
          privacyState.privacyLevel = message.level;
          break;
          
        case 'updateSiteSettings':
          privacyState.siteSettings = message.siteSettings;
          console.log('GeoGuard Privacy: Site settings updated', privacyState.siteSettings);
          break;
          
        case 'processLocation':
          // Get current site domain from sender's tab URL
          let currentDomain = '';
          if (sender.tab && sender.tab.url) {
            try {
              currentDomain = new URL(sender.tab.url).hostname;
            } catch (e) {
              console.error('Error extracting domain:', e);
            }
          }
          
          // Check if we have site-specific settings
          let isPrivacyEnabled = privacyState.enabled;
          let privacyLevel = privacyState.privacyLevel;
          
          if (currentDomain && privacyState.siteSettings[currentDomain]) {
            const siteSettings = privacyState.siteSettings[currentDomain];
            isPrivacyEnabled = siteSettings.enabled;
            privacyLevel = siteSettings.privacyLevel;
            console.log(`GeoGuard Privacy: Using site-specific settings for ${currentDomain}`, siteSettings);
          }
          
          if (!isPrivacyEnabled) {
            // If privacy is disabled for this site, just pass through the original location
            console.log('GeoGuard Privacy: Privacy disabled for this site, using original location');
            sendResponse({ 
              latitude: message.latitude, 
              longitude: message.longitude,
              original: true,
              privacyLevel: privacyLevel
            });
          } else {
            // Process location and get privacy-preserving coordinates
            processLocation(message.latitude, message.longitude, privacyLevel, currentDomain)
              .then(result => {
                sendResponse(result);
              })
              .catch(error => {
                console.error('Error processing location:', error);
                // In case of error, return the original location
                sendResponse({ 
                  latitude: message.latitude, 
                  longitude: message.longitude,
                  original: true,
                  error: true,
                  privacyLevel: privacyLevel
                });
              });
            return true; // Indicate async response
          }
          break;
          
        case 'getLocationInfo':
          if (privacyState.lastLocation) {
            sendResponse({
              data: {
                original: privacyState.lastLocation,
                private: privacyState.lastPrivateLocation,
                is_sensitive: privacyState.lastIsSensitive,
                privacy_level: privacyState.lastPrivacyLevel
              }
            });
          } else {
            sendResponse({ data: null });
          }
          break;
          
        case 'getPrivacyState':
          // Get current tab URL to check for site-specific settings
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            try {
              if (tabs.length > 0) {
                let currentDomain = '';
                try {
                  currentDomain = new URL(tabs[0].url).hostname;
                } catch (e) {
                  console.error('Error extracting domain:', e);
                }
                
                let isEnabled = privacyState.enabled;
                let level = privacyState.privacyLevel;
                
                if (currentDomain && privacyState.siteSettings[currentDomain]) {
                  const siteSettings = privacyState.siteSettings[currentDomain];
                  isEnabled = siteSettings.enabled;
                  level = siteSettings.privacyLevel;
                }
                
                sendResponse({
                  enabled: isEnabled,
                  privacyLevel: level,
                  domain: currentDomain
                });
              } else {
                sendResponse({
                  enabled: privacyState.enabled,
                  privacyLevel: privacyState.privacyLevel,
                  domain: ''
                });
              }
            } catch (e) {
              console.error('Error in getPrivacyState', e);
              sendResponse({
                enabled: privacyState.enabled,
                privacyLevel: privacyState.privacyLevel,
                domain: '',
                error: true
              });
            }
          });
          return true; // Indicate async response
          break;
      }
    } catch (e) {
      console.error('Error handling message', e);
      // Try to send error response
      try {
        sendResponse({ error: true, message: e.toString() });
      } catch (err) {
        console.error('Failed to send error response', err);
      }
    }
  });
  
  /**
   * Process a location through the privacy backend
   */
  async function processLocation(latitude, longitude, customPrivacyLevel = null, domain = '') {
    const privacyLevel = customPrivacyLevel !== null ? customPrivacyLevel : privacyState.privacyLevel;
    
    try {
      const response = await fetch('http://127.0.0.1:5000/protect_location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: latitude,
          longitude: longitude,
          privacy_level: privacyLevel,
          save_history: privacyState.saveHistory,
          domain: domain
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update internal state
      privacyState.lastLocation = data.original;
      privacyState.lastPrivateLocation = data.private;
      privacyState.lastIsSensitive = data.is_sensitive;
      privacyState.lastPrivacyLevel = privacyLevel;
      
      // Auto-increase privacy for sensitive locations if enabled
      let finalPrivacyLevel = privacyLevel;
      if (privacyState.protectSensitive && data.is_sensitive) {
        finalPrivacyLevel = Math.max(finalPrivacyLevel, 8); // Increase to at least 8 for sensitive locations
      }
      
      // Broadcast location update to popup if open
      try {
        chrome.runtime.sendMessage({
          action: 'locationUpdated',
          data: {
            original: data.original,
            private: data.private,
            is_sensitive: data.is_sensitive,
            privacy_level: finalPrivacyLevel,
            domain: domain
          }
        });
      } catch (e) {
        console.warn('Could not broadcast location update', e);
      }
      
      // Return the privacy-preserving location
      return {
        latitude: data.private.latitude,
        longitude: data.private.longitude,
        original: false,
        is_sensitive: data.is_sensitive,
        privacyLevel: finalPrivacyLevel,
        domain: domain
      };
    } catch (error) {
      console.error('Error connecting to privacy server:', error);
      // In case of error, return the original location
      return {
        latitude: latitude,
        longitude: longitude,
        original: true,
        error: true,
        privacyLevel: privacyLevel,
        domain: domain
      };
    }
  }
  
  // Try to recover from service worker termination
  self.addEventListener('fetch', (event) => {
    // This empty fetch handler helps keep the service worker alive
  });