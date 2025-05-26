/**
 * GeoGuard Privacy Extension
 * Main popup script
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize UI components
  initTabs();
  initToggles();
  initSliders();
  initButtons();
  initModal();
  initStatusIndicator();

  // Load data
  loadLocationData();
  loadCurrentSite();
  loadStatistics();
  loadSavedSites();
});

/**
 * Initialize tab navigation
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      
      // Hide all tab contents
      tabContents.forEach(content => {
        content.classList.add('hidden');
      });
      
      // Remove active class from all buttons
      tabButtons.forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Show the selected tab content
      document.getElementById(`${tabName}-tab`).classList.remove('hidden');
      
      // Add active class to clicked button
      this.classList.add('active');

      // Save selected tab in storage
      chrome.storage.local.set({ 'selectedTab': tabName });
    });
  });

  // Restore last selected tab if available
  chrome.storage.local.get('selectedTab', function(data) {
    if (data.selectedTab) {
      const tabButton = document.querySelector(`.tab-button[data-tab="${data.selectedTab}"]`);
      if (tabButton) {
        tabButton.click();
      }
    }
  });
}

/**
 * Initialize toggle switches
 */
function initToggles() {
  const privacyToggle = document.getElementById('privacyToggle');
  const sitePrivacyToggle = document.getElementById('sitePrivacyToggle');
  const saveHistoryToggle = document.getElementById('saveHistory');
  const protectSensitiveToggle = document.getElementById('protectSensitive');
  const enforceMinimumPrivacyToggle = document.getElementById('enforceMinimumPrivacy');
  
  // Load saved toggle states
  chrome.storage.local.get([
    'privacyEnabled', 
    'saveHistory', 
    'protectSensitive', 
    'enforceMinimumPrivacy'
  ], function(data) {
    if (data.privacyEnabled !== undefined) {
      privacyToggle.checked = data.privacyEnabled;
    }
    
    if (data.saveHistory !== undefined) {
      saveHistoryToggle.checked = data.saveHistory;
    }
    
    if (data.protectSensitive !== undefined) {
      protectSensitiveToggle.checked = data.protectSensitive;
    }
    
    if (data.enforceMinimumPrivacy !== undefined) {
      enforceMinimumPrivacyToggle.checked = data.enforceMinimumPrivacy;
    }
  });
  
  // Add event listeners to toggles
  privacyToggle.addEventListener('change', function() {
    chrome.storage.local.set({ 'privacyEnabled': this.checked });
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'togglePrivacy',
      enabled: this.checked
    });
    
    updateStatusIndicator(this.checked);
    showToast(this.checked ? 'Privacy protection enabled' : 'Privacy protection disabled');
  });
  
  saveHistoryToggle.addEventListener('change', function() {
    chrome.storage.local.set({ 'saveHistory': this.checked });
  });
  
  protectSensitiveToggle.addEventListener('change', function() {
    chrome.storage.local.set({ 'protectSensitive': this.checked });
  });
  
  enforceMinimumPrivacyToggle.addEventListener('change', function() {
    chrome.storage.local.set({ 'enforceMinimumPrivacy': this.checked });
  });
}

/**
 * Initialize sliders
 */
function initSliders() {
  const privacyLevel = document.getElementById('privacyLevel');
  const privacyLevelValue = document.getElementById('privacyLevelValue');
  const sitePrivacyLevel = document.getElementById('sitePrivacyLevel');
  const sitePrivacyLevelValue = document.getElementById('sitePrivacyLevelValue');
  const newSitePrivacyLevel = document.getElementById('newSitePrivacyLevel');
  const newSitePrivacyValue = document.getElementById('newSitePrivacyValue');
  
  // Load saved privacy level
  chrome.storage.local.get('privacyLevel', function(data) {
    if (data.privacyLevel) {
      privacyLevel.value = data.privacyLevel;
      privacyLevelValue.textContent = data.privacyLevel;
    }
  });
  
  // Add event listeners to sliders
  privacyLevel.addEventListener('input', function() {
    privacyLevelValue.textContent = this.value;
  });
  
  privacyLevel.addEventListener('change', function() {
    chrome.storage.local.set({ 'privacyLevel': this.value });
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'setPrivacyLevel',
      level: parseInt(this.value)
    });
    
    showToast(`Privacy level set to ${this.value}`);
  });
  
  sitePrivacyLevel.addEventListener('input', function() {
    sitePrivacyLevelValue.textContent = this.value;
  });
  
  if (newSitePrivacyLevel && newSitePrivacyValue) {
    newSitePrivacyLevel.addEventListener('input', function() {
      newSitePrivacyValue.textContent = this.value;
    });
  }
}

/**
 * Initialize buttons
 */
function initButtons() {
  const refreshLocationBtn = document.getElementById('refreshLocationBtn');
  const saveSiteSettingsBtn = document.getElementById('saveSiteSettingsBtn');
  const clearAllSitesBtn = document.getElementById('clearAllSitesBtn');
  const refreshStatsBtn = document.getElementById('refreshStatsBtn');
  const testConnectionBtn = document.getElementById('testConnectionBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const exportDataBtn = document.getElementById('exportDataBtn');
  
  refreshLocationBtn.addEventListener('click', function() {
    loadLocationData(true);
  });
  
  saveSiteSettingsBtn.addEventListener('click', function() {
    saveSiteSettings();
  });
  
  clearAllSitesBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all site settings? This cannot be undone.')) {
      clearAllSites();
    }
  });
  
  refreshStatsBtn.addEventListener('click', function() {
    loadStatistics(true);
  });
  
  testConnectionBtn.addEventListener('click', function() {
    testConnection();
  });
  
  clearHistoryBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear your location history? This cannot be undone.')) {
      clearLocationHistory();
    }
  });
  
  exportDataBtn.addEventListener('click', function() {
    exportData();
  });
}

/**
 * Initialize modal functionality
 */
function initModal() {
  const modal = document.getElementById('addSiteModal');
  const addNewSiteBtn = document.getElementById('addNewSiteBtn');
  const closeBtn = document.querySelector('.close');
  const cancelBtn = document.getElementById('cancelAddSite');
  const confirmBtn = document.getElementById('confirmAddSite');
  
  addNewSiteBtn.addEventListener('click', function() {
    modal.style.display = 'block';
  });
  
  closeBtn.addEventListener('click', function() {
    modal.style.display = 'none';
  });
  
  cancelBtn.addEventListener('click', function() {
    modal.style.display = 'none';
  });
  
  confirmBtn.addEventListener('click', function() {
    const siteUrl = document.getElementById('newSiteUrl').value.trim();
    const privacyLevel = document.getElementById('newSitePrivacyLevel').value;
    const enabled = document.getElementById('newSiteEnabled').checked;
    
    if (siteUrl) {
      addSite(siteUrl, parseInt(privacyLevel), enabled);
      modal.style.display = 'none';
      
      // Clear input fields
      document.getElementById('newSiteUrl').value = '';
      document.getElementById('newSitePrivacyLevel').value = '5';
      document.getElementById('newSitePrivacyValue').textContent = '5';
      document.getElementById('newSiteEnabled').checked = true;
    } else {
      alert('Please enter a valid website URL.');
    }
  });
  
  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}

/**
 * Initialize status indicator
 */
function initStatusIndicator() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  // Check if privacy protection is enabled
  chrome.storage.local.get('privacyEnabled', function(data) {
    updateStatusIndicator(data.privacyEnabled !== false);
  });
}

/**
 * Update status indicator
 * @param {boolean} enabled - Whether privacy protection is enabled
 */
function updateStatusIndicator(enabled) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  if (enabled) {
    statusDot.className = 'status-dot online';
    statusText.textContent = 'Protection Active';
  } else {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Protection Disabled';
  }
}

/**
 * Load location data
 * @param {boolean} refresh - Whether to force a refresh
 */
function loadLocationData(refresh = false) {
  const loadingIndicator = document.getElementById('locationLoadingIndicator');
  const dataContainer = document.getElementById('locationDataContainer');
  const errorIndicator = document.getElementById('locationErrorIndicator');
  
  loadingIndicator.style.display = 'block';
  dataContainer.classList.add('hidden');
  errorIndicator.classList.add('hidden');
  
  if (refresh) {
    showToast('Refreshing location data...');
  }
  
  // Simulated location data
  setTimeout(() => {
    try {
      // Simulate successful location data
      const originalLocation = { lat: 40.7128, lng: -74.0060 };
      const privateLocation = { lat: 40.7135, lng: -74.0048 };
      
      // Update UI with location data
      document.getElementById('originalLocation').textContent = 
        `${originalLocation.lat.toFixed(6)}, ${originalLocation.lng.toFixed(6)}`;
      document.getElementById('privateLocation').textContent = 
        `${privateLocation.lat.toFixed(6)}, ${privateLocation.lng.toFixed(6)}`;
      document.getElementById('locationStatus').textContent = 'Protected';
      document.getElementById('accuracyInfo').textContent = 'Medium (±100m)';
      document.getElementById('distanceInfo').textContent = '84m from original';
      document.getElementById('timestampInfo').textContent = new Date().toLocaleTimeString();
      
      loadingIndicator.style.display = 'none';
      dataContainer.classList.remove('hidden');
      
      if (refresh) {
        showToast('Location data refreshed');
      }
    } catch (error) {
      loadingIndicator.style.display = 'none';
      errorIndicator.classList.remove('hidden');
      
      console.error('Error loading location data:', error);
    }
  }, 1500);
}

/**
 * Load current site information
 */
function loadCurrentSite() {
  // Get the current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs && tabs.length > 0) {
      const currentTab = tabs[0];
      const url = new URL(currentTab.url);
      const domain = url.hostname;
      
      // Update UI with current site info
      document.getElementById('currentSiteUrl').textContent = domain;
      
      // Load site-specific settings
      chrome.storage.local.get('sites', function(data) {
        const sites = data.sites || {};
        
        if (sites[domain]) {
          const siteSettings = sites[domain];
          
          document.getElementById('sitePrivacyToggle').checked = siteSettings.enabled;
          document.getElementById('sitePrivacyLevel').value = siteSettings.privacyLevel;
          document.getElementById('sitePrivacyLevelValue').textContent = siteSettings.privacyLevel;
        } else {
          // Use default settings
          document.getElementById('sitePrivacyToggle').checked = true;
          document.getElementById('sitePrivacyLevel').value = 5;
          document.getElementById('sitePrivacyLevelValue').textContent = '5';
        }
      });
    } else {
      document.getElementById('currentSiteUrl').textContent = 'No active tab';
    }
  });
}

/**
 * Save site settings for the current site
 */
function saveSiteSettings() {
  const currentSiteUrl = document.getElementById('currentSiteUrl').textContent;
  
  if (currentSiteUrl && currentSiteUrl !== 'No active tab') {
    const enabled = document.getElementById('sitePrivacyToggle').checked;
    const privacyLevel = parseInt(document.getElementById('sitePrivacyLevel').value);
    
    chrome.storage.local.get('sites', function(data) {
      const sites = data.sites || {};
      
      sites[currentSiteUrl] = {
        enabled: enabled,
        privacyLevel: privacyLevel,
        lastUpdated: new Date().toISOString()
      };
      
      chrome.storage.local.set({ 'sites': sites }, function() {
        showToast('Site settings saved');
        
        // Send message to background script
        chrome.runtime.sendMessage({
          action: 'updateSiteSettings',
          site: currentSiteUrl,
          settings: sites[currentSiteUrl]
        });
        
        // Refresh sites list if on that tab
        if (document.querySelector('.tab-button[data-tab="sites"]').classList.contains('active')) {
          loadSavedSites();
        }
      });
    });
  } else {
    showToast('No active site to save settings for', true);
  }
}

/**
 * Load statistics data
 * @param {boolean} refresh - Whether to force a refresh
 */
function loadStatistics(refresh = false) {
  const loadingIndicator = document.getElementById('statsLoadingIndicator');
  const statsContent = document.getElementById('statsContent');
  const errorIndicator = document.getElementById('statsErrorIndicator');
  
  loadingIndicator.style.display = 'block';
  statsContent.classList.add('hidden');
  errorIndicator.style.display = 'none';
  
  if (refresh) {
    showToast('Refreshing statistics...');
  }
  
  // Simulated statistics data
  setTimeout(() => {
    try {
      // Update UI with statistics
      document.getElementById('poisDetected').textContent = Math.floor(Math.random() * 20) + 5;
      document.getElementById('locationsSaved').textContent = Math.floor(Math.random() * 500) + 100;
      document.getElementById('clustersFound').textContent = Math.floor(Math.random() * 10) + 3;
      document.getElementById('sitesProtected').textContent = Math.floor(Math.random() * 30) + 10;
      
      // Create a date 30-60 days in the past
      const days = Math.floor(Math.random() * 30) + 30;
      const activeSinceDate = new Date();
      activeSinceDate.setDate(activeSinceDate.getDate() - days);
      document.getElementById('activeSince').textContent = activeSinceDate.toLocaleDateString();
      
      loadingIndicator.style.display = 'none';
      statsContent.classList.remove('hidden');
      
      // Update server status
      document.getElementById('serverStatus').textContent = 'Online';
      document.getElementById('serverVersion').textContent = 'v1.2.3';
      
      if (refresh) {
        showToast('Statistics refreshed');
      }
    } catch (error) {
      loadingIndicator.style.display = 'none';
      errorIndicator.style.display = 'block';
      
      console.error('Error loading statistics:', error);
    }
  }, 1500);
}

/**
 * Load saved sites list
 */
function loadSavedSites() {
  const sitesContainer = document.getElementById('sitesList');
  
  // Get saved sites from storage
  chrome.storage.local.get('sites', function(data) {
    const sites = data.sites || {};
    const sitesList = Object.keys(sites);
    
    if (sitesList.length > 0) {
      let sitesHTML = '';
      
      sitesList.forEach(site => {
        const siteData = sites[site];
        sitesHTML += `
          <div class="site-item" data-site="${site}">
            <div class="site-item-url">${site}</div>
            <div class="site-item-controls">
              <button class="edit-site-btn secondary-btn" data-site="${site}">Edit</button>
              <button class="remove-site-btn danger-btn" data-site="${site}">Remove</button>
            </div>
          </div>
        `;
      });
      
      sitesContainer.innerHTML = sitesHTML;
      
      // Add event listeners to edit and remove buttons
      document.querySelectorAll('.edit-site-btn').forEach(button => {
        button.addEventListener('click', function() {
          const site = this.getAttribute('data-site');
          editSite(site, sites[site]);
        });
      });
      
      document.querySelectorAll('.remove-site-btn').forEach(button => {
        button.addEventListener('click', function() {
          const site = this.getAttribute('data-site');
          if (confirm(`Are you sure you want to remove ${site}?`)) {
            removeSite(site);
          }
        });
      });
      
      // Add search functionality
      const siteSearch = document.getElementById('siteSearch');
      siteSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        document.querySelectorAll('.site-item').forEach(item => {
          const siteUrl = item.getAttribute('data-site').toLowerCase();
          if (siteUrl.includes(searchTerm)) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      });
    } else {
      sitesContainer.innerHTML = '<div class="no-sites">No specific website settings saved yet</div>';
    }
  });
}

/**
 * Add a new site to saved sites
 * @param {string} url - Site URL
 * @param {number} privacyLevel - Privacy level (1-10)
 * @param {boolean} enabled - Whether protection is enabled
 */
function addSite(url, privacyLevel, enabled) {
  chrome.storage.local.get('sites', function(data) {
    const sites = data.sites || {};
    
    sites[url] = {
      enabled: enabled,
      privacyLevel: privacyLevel,
      lastUpdated: new Date().toISOString()
    };
    
    chrome.storage.local.set({ 'sites': sites }, function() {
      showToast(`Added ${url} to saved sites`);
      loadSavedSites();
      
      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'updateSiteSettings',
        site: url,
        settings: sites[url]
      });
    });
  });
}

/**
 * Edit an existing site
 * @param {string} url - Site URL
 * @param {object} settings - Site settings
 */
function editSite(url, settings) {
  // Populate and show modal
  document.getElementById('newSiteUrl').value = url;
  document.getElementById('newSitePrivacyLevel').value = settings.privacyLevel;
  document.getElementById('newSitePrivacyValue').textContent = settings.privacyLevel;
  document.getElementById('newSiteEnabled').checked = settings.enabled;
  
  // Change modal title and button text
  document.querySelector('#addSiteModal h2').textContent = 'Edit Website';
  document.getElementById('confirmAddSite').textContent = 'Save Changes';
  
  // Show modal
  document.getElementById('addSiteModal').style.display = 'block';
  
  // Override confirm button action
  const confirmBtn = document.getElementById('confirmAddSite');
  const originalClickListener = confirmBtn.onclick;
  
  confirmBtn.onclick = function() {
    const newUrl = document.getElementById('newSiteUrl').value.trim();
    const privacyLevel = parseInt(document.getElementById('newSitePrivacyLevel').value);
    const enabled = document.getElementById('newSiteEnabled').checked;
    
    if (newUrl) {
      removeSite(url, false); // Remove old URL without notification
      addSite(newUrl, privacyLevel, enabled);
      document.getElementById('addSiteModal').style.display = 'none';
      
      // Reset modal
      document.querySelector('#addSiteModal h2').textContent = 'Add Website';
      document.getElementById('confirmAddSite').textContent = 'Add Website';
      document.getElementById('newSiteUrl').value = '';
      document.getElementById('newSitePrivacyLevel').value = '5';
      document.getElementById('newSitePrivacyValue').textContent = '5';
      document.getElementById('newSiteEnabled').checked = true;
      
      // Restore original click listener
      confirmBtn.onclick = originalClickListener;
    } else {
      alert('Please enter a valid website URL.');
    }
  };
  
  // Reset modal on cancel
  const cancelBtn = document.getElementById('cancelAddSite');
  const closeBtn = document.querySelector('.close');
  
  const resetModal = function() {
    document.querySelector('#addSiteModal h2').textContent = 'Add Website';
    document.getElementById('confirmAddSite').textContent = 'Add Website';
    document.getElementById('newSiteUrl').value = '';
    document.getElementById('newSitePrivacyLevel').value = '5';
    document.getElementById('newSitePrivacyValue').textContent = '5';
    document.getElementById('newSiteEnabled').checked = true;
    
    // Restore original click listener
    confirmBtn.onclick = originalClickListener;
  };
  
  cancelBtn.addEventListener('click', resetModal);
  closeBtn.addEventListener('click', resetModal);
}

/**
 * Remove a site from saved sites
 * @param {string} url - Site URL
 * @param {boolean} showNotification - Whether to show a notification
 */
function removeSite(url, showNotification = true) {
  chrome.storage.local.get('sites', function(data) {
    const sites = data.sites || {};
    
    if (sites[url]) {
      delete sites[url];
      
      chrome.storage.local.set({ 'sites': sites }, function() {
        if (showNotification) {
          showToast(`Removed ${url} from saved sites`);
        }
        
        loadSavedSites();
        
        // Send message to background script
        chrome.runtime.sendMessage({
          action: 'removeSiteSettings',
          site: url
        });
      });
    }
  });
}

/**
 * Clear all saved sites
 */
function clearAllSites() {
  chrome.storage.local.set({ 'sites': {} }, function() {
    showToast('All saved sites cleared');
    loadSavedSites();
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'clearAllSiteSettings'
    });
  });
}

/**
 * Test connection to backend server
 */
function testConnection() {
  const serverStatus = document.getElementById('serverStatus');
  const serverVersion = document.getElementById('serverVersion');
  
  serverStatus.textContent = 'Testing...';
  showToast('Testing server connection...');
  
  // Simulate server connection test
  setTimeout(() => {
    // 90% chance of success
    if (Math.random() < 0.9) {
      serverStatus.textContent = 'Online';
      serverVersion.textContent = 'v1.2.3';
      showToast('Server connection successful');
    } else {
      serverStatus.textContent = 'Offline';
      serverVersion.textContent = 'Unknown';
      showToast('Server connection failed', true);
    }
  }, 1500);
}

/**
 * Clear location history
 */
function clearLocationHistory() {
  showToast('Clearing location history...');
  
  // Simulate clearing location history
  setTimeout(() => {
    chrome.storage.local.set({
      'locationHistory': [],
      'poisDetected': 0,
      'clustersFound': 0
    }, function() {
      showToast('Location history cleared');
      
      // Refresh statistics
      loadStatistics(true);
      
      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'clearLocationHistory'
      });
    });
  }, 1000);
}

/**
 * Export user data
 */
function exportData() {
  showToast('Preparing data for export...');
  
  // Collect data to export
  chrome.storage.local.get(null, function(data) {
    // Create export data object
    const exportData = {
      privacyEnabled: data.privacyEnabled,
      privacyLevel: data.privacyLevel,
      saveHistory: data.saveHistory,
      protectSensitive: data.protectSensitive,
      enforceMinimumPrivacy: data.enforceMinimumPrivacy,
      sites: data.sites || {},
      stats: {
        poisDetected: data.poisDetected || 0,
        locationsSaved: data.locationsSaved || 0,
        clustersFound: data.clustersFound || 0,
        sitesProtected: Object.keys(data.sites || {}).length,
        activeSince: data.activeSince || new Date().toISOString()
      },
      exportDate: new Date().toISOString()
    };
    
    // Convert to JSON string
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `geoguard-export-${new Date().toISOString().slice(0, 10)}.json`;
    
    // Add to document, click and remove
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    showToast('Data exported successfully');
  });
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {boolean} isError - Whether this is an error message
 */
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  
  toast.style.backgroundColor = isError ? '#f44336' : '#333';
  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  
  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// Check for extension updates (example implementation)
function checkForUpdates() {
  const currentVersion = chrome.runtime.getManifest().version;
  
  // In a real extension, this would call an API to check for updates
  // This is just a simulation
  setTimeout(() => {
    const hasUpdate = Math.random() < 0.2; // 20% chance of an update
    
    if (hasUpdate) {
      const serverVersion = '1.0.0';
      if (serverVersion !== currentVersion) {
        showToast(`Update available: v${serverVersion}`, false);
      }
    }
  }, 5000);
}

// Call update check when extension loads
checkForUpdates();