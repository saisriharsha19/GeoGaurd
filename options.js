// options.js - Advanced settings interface for GeoGuard
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements - Protection scope
    const protectAllSites = document.getElementById('protectAllSites');
    const protectSpecificSites = document.getElementById('protectSpecificSites');
    const protectedSiteList = document.getElementById('protectedSiteList');
    const newSiteInput = document.getElementById('newSiteInput');
    const addSiteBtn = document.getElementById('addSiteBtn');
    const importFromCurrentBtn = document.getElementById('importFromCurrentBtn');
    const clearAllSitesBtn = document.getElementById('clearAllSitesBtn');
    
    // DOM elements - Privacy settings
    const privacyLevelInput = document.getElementById('privacyLevelInput');
    const sensitivityRadiusInput = document.getElementById('sensitivityRadiusInput');
    const poiThresholdInput = document.getElementById('poiThresholdInput');
    
    // DOM elements - History
    const historyCount = document.getElementById('historyCount');
    const sensitiveCount = document.getElementById('sensitiveCount');
    const historyTableBody = document.getElementById('historyTableBody');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const currentPage = document.getElementById('currentPage');
    const totalPages = document.getElementById('totalPages');
    const exportHistoryBtn = document.getElementById('exportHistoryBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    
    // DOM elements - Advanced settings
    const backendUrlInput = document.getElementById('backendUrlInput');
    const testConnectionBtn = document.getElementById('testConnectionBtn');
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    const connectionStatus = document.getElementById('connectionStatus');
    
    // State variables
    let protectedSites = [];
    let locationHistory = [];
    let currentPageNum = 1;
    const entriesPerPage = 10;
    
    // Load settings and initialize UI
    loadSettings();
    
    // Event listeners - Protection scope
    protectAllSites.addEventListener('change', updateProtectionScope);
    protectSpecificSites.addEventListener('change', updateProtectionScope);
    addSiteBtn.addEventListener('click', addProtectedSite);
    importFromCurrentBtn.addEventListener('click', importCurrentSite);
    clearAllSitesBtn.addEventListener('click', clearAllSites);
    newSiteInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        addProtectedSite();
      }
    });
    
    // Event listeners - Privacy settings
    privacyLevelInput.addEventListener('change', updatePrivacySettings);
    sensitivityRadiusInput.addEventListener('change', updateBackendSettings);
    poiThresholdInput.addEventListener('change', updateBackendSettings);
    
    // Event listeners - History
    prevPageBtn.addEventListener('click', goToPrevPage);
    nextPageBtn.addEventListener('click', goToNextPage);
    exportHistoryBtn.addEventListener('click', exportHistory);
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // Event listeners - Advanced settings
    backendUrlInput.addEventListener('change', updateBackendUrl);
    testConnectionBtn.addEventListener('click', testBackendConnection);
    resetSettingsBtn.addEventListener('click', resetAllSettings);
    
    // Load all settings from storage
    function loadSettings() {
      chrome.storage.local.get([
        'enabled',
        'privacyLevel',
        'protectAll',
        'protectedSites',
        'locationHistory',
        'backendUrl',
        'sensitivityRadius',
        'poiThreshold',
        'sensitiveLocationsCount'
      ], function(result) {
        // Protection scope
        if (result.protectAll !== undefined) {
          protectAllSites.checked = result.protectAll;
          protectSpecificSites.checked = !result.protectAll;
        } else {
          protectAllSites.checked = true; // Default
          protectSpecificSites.checked = false;
        }
        
        // Protected sites
        if (result.protectedSites) {
          protectedSites = result.protectedSites;
          renderProtectedSites();
        }
        
        // Privacy level
        if (result.privacyLevel) {
          privacyLevelInput.value = result.privacyLevel;
        }
        
        // Backend URL
        if (result.backendUrl) {
          backendUrlInput.value = result.backendUrl;
        }
        
        // Sensitivity radius and POI threshold
        if (result.sensitivityRadius) {
          sensitivityRadiusInput.value = result.sensitivityRadius;
        }
        
        if (result.poiThreshold) {
          poiThresholdInput.value = result.poiThreshold;
        }
        
        // Location history
        if (result.locationHistory) {
          locationHistory = result.locationHistory;
          historyCount.textContent = locationHistory.length;
          sensitiveCount.textContent = result.sensitiveLocationsCount || 
            locationHistory.filter(entry => entry.isSensitive).length;
          renderHistoryTable();
        }
      });
    }
    
    // Update protection scope (all sites vs. specific sites)
    function updateProtectionScope() {
      const protectAll = protectAllSites.checked;
      
      chrome.storage.local.set({ protectAll: protectAll }, function() {
        console.log('[GeoGuard] Protect all sites:', protectAll);
        
        // Enable/disable site list based on selection
        newSiteInput.disabled = protectAll;
        addSiteBtn.disabled = protectAll;
        importFromCurrentBtn.disabled = protectAll;
        clearAllSitesBtn.disabled = protectAll;
        
        // Notify background script
        chrome.runtime.sendMessage({
          type: 'updateSettings',
          protectAll: protectAll
        });
        
        showStatusMessage('Protection scope updated');
      });
    }
    
    // Add a new protected site
    function addProtectedSite() {
      const newSite = newSiteInput.value.trim();
      
      if (!newSite) {
        showStatusMessage('Please enter a valid domain', true);
        return;
      }
      
      // Basic validation - must be a domain format
      if (!/^(\*\.)?([\w-]+\.)+[\w-]+$/.test(newSite)) {
        showStatusMessage('Invalid domain format. Use example.com or *.example.com', true);
        return;
      }
      
      // Check for duplicates
      if (protectedSites.includes(newSite)) {
        showStatusMessage('This site is already in the list', true);
        return;
      }
      
      // Add to list
      protectedSites.push(newSite);
      
      // Save to storage
      chrome.storage.local.set({ protectedSites: protectedSites }, function() {
        console.log('[GeoGuard] Protected sites updated:', protectedSites);
        
        // Clear input
        newSiteInput.value = '';
        
        // Update UI
        renderProtectedSites();
        
        // Notify background script
        chrome.runtime.sendMessage({
          type: 'updateSettings',
          protectedSites: protectedSites
        });
        
        showStatusMessage('Site added to protection list');
      });
    }
    
    // Import domain from current tab
    function importCurrentSite() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs && tabs.length > 0 && tabs[0].url) {
          try {
            const url = new URL(tabs[0].url);
            if (url.hostname) {
              newSiteInput.value = url.hostname;
              addProtectedSite();
            }
          } catch (error) {
            console.error('[GeoGuard] Error parsing current tab URL:', error);
            showStatusMessage('Could not import domain from current tab', true);
          }
        } else {
          showStatusMessage('No valid tab found to import from', true);
        }
      });
    }
    
    // Remove a protected site
    function removeProtectedSite(site) {
      protectedSites = protectedSites.filter(s => s !== site);
      
      // Save to storage
      chrome.storage.local.set({ protectedSites: protectedSites }, function() {
        console.log('[GeoGuard] Protected sites updated:', protectedSites);
        
        // Update UI
        renderProtectedSites();
        
        // Notify background script
        chrome.runtime.sendMessage({
          type: 'updateSettings',
          protectedSites: protectedSites
        });
        
        showStatusMessage('Site removed from protection list');
      });
    }
    
    // Clear all protected sites
    function clearAllSites() {
      if (confirm('Are you sure you want to clear all protected sites?')) {
        protectedSites = [];
        
        // Save to storage
        chrome.storage.local.set({ protectedSites: protectedSites }, function() {
          console.log('[GeoGuard] Protected sites cleared');
          
          // Update UI
          renderProtectedSites();
          
          // Notify background script
          chrome.runtime.sendMessage({
            type: 'updateSettings',
            protectedSites: protectedSites
          });
          
          showStatusMessage('All protected sites cleared');
        });
      }
    }
    
    // Render the list of protected sites in the UI
    function renderProtectedSites() {
      // Clear existing content
      protectedSiteList.innerHTML = '';
      
      if (protectedSites.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.textContent = 'No protected sites added yet.';
        emptyMessage.style.padding = '10px';
        emptyMessage.style.color = '#777';
        emptyMessage.style.fontStyle = 'italic';
        protectedSiteList.appendChild(emptyMessage);
        return;
      }
      
      // Sort alphabetically
      const sortedSites = [...protectedSites].sort();
      
      // Add each site to the list
      sortedSites.forEach(site => {
        const siteItem = document.createElement('div');
        siteItem.className = 'site-item';
        
        const siteText = document.createElement('span');
        siteText.textContent = site;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-danger';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => removeProtectedSite(site));
        
        siteItem.appendChild(siteText);
        siteItem.appendChild(removeBtn);
        
        protectedSiteList.appendChild(siteItem);
      });
      
      // Update enabled/disabled state
      const isProtectAll = protectAllSites.checked;
      newSiteInput.disabled = isProtectAll;
      addSiteBtn.disabled = isProtectAll;
      importFromCurrentBtn.disabled = isProtectAll;
      clearAllSitesBtn.disabled = isProtectAll;
    }
    
    // Update privacy level setting
    function updatePrivacySettings() {
      const level = parseInt(privacyLevelInput.value);
      
      if (isNaN(level) || level < 1 || level > 10) {
        showStatusMessage('Privacy level must be between 1 and 10', true);
        privacyLevelInput.value = 5; // Reset to default
        return;
      }
      
      chrome.storage.local.set({ privacyLevel: level }, function() {
        console.log('[GeoGuard] Privacy level set to', level);
        
        // Notify background script
        chrome.runtime.sendMessage({
          type: 'updateSettings',
          privacyLevel: level,
          clearLocationCache: true
        });
        
        showStatusMessage('Privacy level updated');
      });
    }
    
    // Update backend settings
    function updateBackendSettings() {
      const sensitivityRadius = parseInt(sensitivityRadiusInput.value);
      const poiThreshold = parseInt(poiThresholdInput.value);
      
      // Validate inputs
      if (isNaN(sensitivityRadius) || sensitivityRadius < 10 || sensitivityRadius > 1000) {
        showStatusMessage('Sensitivity radius must be between 10 and 1000 meters', true);
        sensitivityRadiusInput.value = 100; // Reset to default
        return;
      }
      
      if (isNaN(poiThreshold) || poiThreshold < 2 || poiThreshold > 20) {
        showStatusMessage('POI threshold must be between 2 and 20 visits', true);
        poiThresholdInput.value = 5; // Reset to default
        return;
      }
      
      // Save to storage
      chrome.storage.local.set({
        sensitivityRadius: sensitivityRadius,
        poiThreshold: poiThreshold
      }, function() {
        console.log('[GeoGuard] Backend settings updated:', { sensitivityRadius, poiThreshold });
        
        // Attempt to update backend settings
        updateBackendWithNewSettings(sensitivityRadius, poiThreshold);
        
        showStatusMessage('Backend settings updated');
      });
    }
    
    // Send updated settings to the backend
    function updateBackendWithNewSettings(sensitivityRadius, poiThreshold) {
      const backendUrl = backendUrlInput.value.trim();
      
      fetch(`${backendUrl}/update_settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sensitivity_radius: sensitivityRadius,
          poi_threshold: poiThreshold
        })
      })
      .then(response => response.json())
      .then(data => {
        console.log('[GeoGuard] Backend settings response:', data);
      })
      .catch(error => {
        console.error('[GeoGuard] Error updating backend settings:', error);
        // It's okay if this fails, the backend might not support this endpoint
      });
    }
    
    // Update backend URL
    function updateBackendUrl() {
      const url = backendUrlInput.value.trim();
      
      if (!url) {
        showStatusMessage('Backend URL cannot be empty', true);
        return;
      }
      
      chrome.storage.local.set({ backendUrl: url }, function() {
        console.log('[GeoGuard] Backend URL updated to', url);
        
        // Notify background script
        chrome.runtime.sendMessage({
          type: 'updateSettings',
          backendUrl: url
        });
        
        showStatusMessage('Backend URL updated');
        
        // Test the connection immediately
        testBackendConnection();
      });
    }
    
    // Test backend connection
    function testBackendConnection() {
      const backendUrl = backendUrlInput.value.trim();
      
      if (!backendUrl) {
        showStatusMessage('Backend URL cannot be empty', true);
        return;
      }
      
      showStatusMessage('Testing connection...', false, false);
      
      chrome.runtime.sendMessage({ type: 'testBackendConnection' }, function(response) {
        if (response && response.connected) {
          showStatusMessage('Connection successful!');
        } else {
          showStatusMessage('Connection failed: ' + (response?.error || 'Backend not responding'), true);
        }
      });
    }
    
    // Reset all settings to defaults
    function resetAllSettings() {
      if (confirm('Are you sure you want to reset all settings to defaults?')) {
        const defaultSettings = {
          enabled: true,
          privacyLevel: 5,
          protectAll: true,
          protectedSites: [],
          backendUrl: 'http://localhost:5000',
          sensitivityRadius: 100,
          poiThreshold: 5
        };
        
        chrome.storage.local.set(defaultSettings, function() {
          console.log('[GeoGuard] All settings reset to defaults');
          
          // Notify background script
          chrome.runtime.sendMessage({
            type: 'updateSettings',
            ...defaultSettings
          });
          
          // Reload settings in UI
          loadSettings();
          
          showStatusMessage('All settings reset to defaults');
        });
      }
    }
    
    // Render history table with pagination
    function renderHistoryTable() {
      // Calculate total pages
      const totalEntries = locationHistory.length;
      const numPages = Math.ceil(totalEntries / entriesPerPage);
      
      totalPages.textContent = numPages;
      currentPage.textContent = currentPageNum;
      
      // Enable/disable pagination buttons
      prevPageBtn.disabled = currentPageNum <= 1;
      nextPageBtn.disabled = currentPageNum >= numPages;
      
      // Clear existing table
      historyTableBody.innerHTML = '';
      
      // If no history
      if (totalEntries === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 4;
        emptyCell.textContent = 'No location history available.';
        emptyCell.style.textAlign = 'center';
        emptyCell.style.padding = '20px';
        emptyCell.style.fontStyle = 'italic';
        emptyRow.appendChild(emptyCell);
        historyTableBody.appendChild(emptyRow);
        return;
      }
      
      // Calculate slice for current page
      const startIndex = (currentPageNum - 1) * entriesPerPage;
      const endIndex = Math.min(startIndex + entriesPerPage, totalEntries);
      
      // Get entries for current page (reversed to show newest first)
      const pageEntries = [...locationHistory].reverse().slice(startIndex, endIndex);
      
      // Add each entry to the table
      pageEntries.forEach(entry => {
        const row = document.createElement('tr');
        
        // Date & Time column
        const dateCell = document.createElement('td');
        const date = new Date(entry.timestamp);
        dateCell.textContent = date.toLocaleString();
        
        // Coordinates column
        const coordsCell = document.createElement('td');
        coordsCell.textContent = `${entry.latitude.toFixed(6)}, ${entry.longitude.toFixed(6)}`;
        
        // Protection Level column
        const levelCell = document.createElement('td');
        levelCell.textContent = entry.privacyLevel || 'Default';
        
        // Status column
        const statusCell = document.createElement('td');
        if (entry.isFallback) {
          statusCell.textContent = 'Fallback Protection';
        } else if (entry.isSensitive) {
          statusCell.innerHTML = 'Protected <span class="sensitive-badge">Sensitive</span>';
        } else {
          statusCell.textContent = 'Protected';
        }
        
        // Add cells to row
        row.appendChild(dateCell);
        row.appendChild(coordsCell);
        row.appendChild(levelCell);
        row.appendChild(statusCell);
        
        // Add row to table
        historyTableBody.appendChild(row);
      });
    }
    
    // Go to previous page in history
    function goToPrevPage() {
      if (currentPageNum > 1) {
        currentPageNum--;
        renderHistoryTable();
      }
    }
    
    // Go to next page in history
    function goToNextPage() {
      const numPages = Math.ceil(locationHistory.length / entriesPerPage);
      if (currentPageNum < numPages) {
        currentPageNum++;
        renderHistoryTable();
      }
    }
    
    // Export history to JSON file
    function exportHistory() {
      if (locationHistory.length === 0) {
        showStatusMessage('No history to export', true);
        return;
      }
      
      // Create export object
      const exportData = {
        exportDate: new Date().toISOString(),
        locationHistory: locationHistory
      };
      
      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create download link
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create temporary link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `geoguard_history_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      showStatusMessage('History exported successfully');
    }
    
    // Clear location history
    function clearHistory() {
      if (confirm('Are you sure you want to clear your location history? This cannot be undone.')) {
        chrome.runtime.sendMessage({ type: 'clearHistory' }, function(response) {
          if (response && response.success) {
            // Update local data
            locationHistory = [];
            historyCount.textContent = '0';
            sensitiveCount.textContent = '0';
            
            // Reset to first page
            currentPageNum = 1;
            
            // Update UI
            renderHistoryTable();
            
            showStatusMessage('Location history cleared');
          } else {
            showStatusMessage('Failed to clear history', true);
          }
        });
      }
    }
    
    // Show status message
    function showStatusMessage(message, isError = false, autoHide = true) {
      connectionStatus.textContent = message;
      connectionStatus.style.display = 'block';
      
      if (isError) {
        connectionStatus.classList.add('error');
      } else {
        connectionStatus.classList.remove('error');
      }
      
      if (autoHide) {
        setTimeout(() => {
          connectionStatus.style.display = 'none';
        }, 3000);
      }
    }
  });