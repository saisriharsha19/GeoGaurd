// onboarding.js
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('openOptionsBtn').addEventListener('click', function(e) {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  });