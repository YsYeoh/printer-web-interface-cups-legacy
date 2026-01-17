// CUPS Status Panel
let cupsStatusInterval = null;

function loadCUPSStatus() {
  fetch('/api/printers/status', {
    credentials: 'include'
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      updateCUPSStatusPanel(data);
    } else {
      updateCUPSStatusPanel({
        online: false,
        message: data.message || 'Failed to get CUPS status',
        printers: []
      });
    }
  })
  .catch(error => {
    console.error('Error loading CUPS status:', error);
    updateCUPSStatusPanel({
      online: false,
      message: 'Failed to connect to CUPS',
      printers: []
    });
  });
}

function updateCUPSStatusPanel(status) {
  const statusPanel = document.getElementById('cupsStatusPanel');
  if (!statusPanel) return;
  
  const statusBadge = statusPanel.querySelector('.status-badge');
  const statusMessage = statusPanel.querySelector('.status-message');
  const printersList = statusPanel.querySelector('.printers-list');
  
  // Update status badge
  if (statusBadge) {
    statusBadge.className = `badge badge-${status.online ? 'success' : 'danger'}`;
    statusBadge.textContent = status.online ? 'Online' : 'Offline';
  }
  
  // Update status message
  if (statusMessage) {
    statusMessage.textContent = status.message || (status.online ? 'CUPS is running' : 'CUPS is not available');
  }
  
  // Update printers list
  if (printersList) {
    if (!status.online || !status.printers || status.printers.length === 0) {
      printersList.innerHTML = '<p class="text-muted mb-0">No printers available</p>';
    } else {
      printersList.innerHTML = status.printers.map(printer => {
        const statusClass = printer.status === 'idle' ? 'success' : printer.status === 'printing' ? 'warning' : 'secondary';
        return `
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span>
              ${printer.name}
              ${printer.default ? '<span class="badge badge-info ml-1">Default</span>' : ''}
            </span>
            <span class="badge badge-${statusClass}">${printer.status}</span>
          </div>
        `;
      }).join('');
    }
  }
  
  // Update printer count
  const printerCount = statusPanel.querySelector('.printer-count');
  if (printerCount) {
    printerCount.textContent = status.printerCount || (status.printers ? status.printers.length : 0);
  }
}

function startCUPSStatusPolling(interval = 30000) {
  // Load immediately
  loadCUPSStatus();
  
  // Then poll every interval
  if (cupsStatusInterval) {
    clearInterval(cupsStatusInterval);
  }
  
  cupsStatusInterval = setInterval(loadCUPSStatus, interval);
}

function stopCUPSStatusPolling() {
  if (cupsStatusInterval) {
    clearInterval(cupsStatusInterval);
    cupsStatusInterval = null;
  }
}

// Auto-start polling when page loads
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cupsStatusPanel')) {
    startCUPSStatusPolling(30000); // Poll every 30 seconds
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  stopCUPSStatusPolling();
});

