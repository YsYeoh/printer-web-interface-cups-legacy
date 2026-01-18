// Printer Management
document.addEventListener('DOMContentLoaded', () => {
  const printersContainer = document.getElementById('printersContainer');

  // Load printers on page load
  loadPrinters();

  // Load all printers
  async function loadPrinters() {
    try {
      const response = await fetch('/api/printers', {
        credentials: 'include'
      });
      const result = await response.json();

      if (response.ok && result.printers) {
        renderPrinters(result.printers);
      } else {
        showError('Failed to load printers');
      }
    } catch (error) {
      console.error('Error loading printers:', error);
      showError('Failed to load printers');
    }
  }

  // Render printers
  async function renderPrinters(printers) {
    if (printers.length === 0) {
      printersContainer.innerHTML = `
        <div class="alert alert-info">
          <p class="mb-0">No printers found. Make sure CUPS is running and printers are configured.</p>
        </div>
      `;
      return;
    }

    const printersHTML = await Promise.all(
      printers.map(printer => renderPrinterCard(printer))
    );

    printersContainer.innerHTML = printersHTML.join('');
    
    // Attach event listeners
    attachPrinterListeners();
  }

  // Render individual printer card
  async function renderPrinterCard(printer) {
    try {
      // Load printer details
      const detailsResponse = await fetch(`/api/printers/${printer.name}/details`, {
        credentials: 'include'
      });
      const detailsResult = await detailsResponse.json();

      const details = detailsResponse.ok ? detailsResult.printer : null;

      // Load printer options
      const optionsResponse = await fetch(`/api/printers/${printer.name}/options`, {
        credentials: 'include'
      });
      const optionsResult = await optionsResponse.ok ? await optionsResponse.json() : null;
      const options = optionsResult ? optionsResult.options : null;

      const statusBadge = getStatusBadge(printer.status);
      const defaultBadge = printer.default ? '<span class="badge badge-primary printer-status-badge ml-2">Default</span>' : '';

      return `
        <div class="card printer-card" data-printer-name="${escapeHtml(printer.name)}">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div>
              <h5 class="mb-0">${escapeHtml(printer.name)}</h5>
              ${statusBadge}${defaultBadge}
            </div>
            <div>
              ${!printer.default ? `<button class="btn btn-sm btn-primary set-default-btn" data-printer-name="${escapeHtml(printer.name)}">Set as Default</button>` : ''}
            </div>
          </div>
          <div class="card-body">
            ${details ? renderPrinterDetails(details) : ''}
            ${options ? renderPrinterCapabilities(options) : ''}
          </div>
        </div>
      `;
    } catch (error) {
      console.error(`Error loading details for printer ${printer.name}:`, error);
      return `
        <div class="card printer-card">
          <div class="card-header">
            <h5 class="mb-0">${escapeHtml(printer.name)}</h5>
            ${getStatusBadge(printer.status)}
          </div>
          <div class="card-body">
            <p class="text-muted">Failed to load printer details</p>
          </div>
        </div>
      `;
    }
  }

  // Render printer details
  function renderPrinterDetails(details) {
    return `
      <div class="printer-details">
        <h6>Details</h6>
        <dl class="row">
          ${details.location ? `
            <dt class="col-sm-3">Location:</dt>
            <dd class="col-sm-9">${escapeHtml(details.location)}</dd>
          ` : ''}
          ${details.description ? `
            <dt class="col-sm-3">Description:</dt>
            <dd class="col-sm-9">${escapeHtml(details.description)}</dd>
          ` : ''}
          ${details.driver ? `
            <dt class="col-sm-3">Driver:</dt>
            <dd class="col-sm-9">${escapeHtml(details.driver)}</dd>
          ` : ''}
          <dt class="col-sm-3">Status:</dt>
          <dd class="col-sm-9">${getStatusBadge(details.status)}</dd>
        </dl>
      </div>
    `;
  }

  // Render printer capabilities
  function renderPrinterCapabilities(options) {
    let capabilitiesHTML = '<div class="printer-details mt-3"><h6>Capabilities</h6>';

    if (options.paperSizes && options.paperSizes.length > 0) {
      capabilitiesHTML += `
        <div class="mb-3">
          <strong>Paper Sizes:</strong>
          <ul class="capabilities-list">
            ${options.paperSizes.map(size => `<li>${escapeHtml(size)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (options.colorModes && options.colorModes.length > 0) {
      capabilitiesHTML += `
        <div class="mb-3">
          <strong>Color Modes:</strong>
          <ul class="capabilities-list">
            ${options.colorModes.map(mode => `<li>${escapeHtml(mode)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (options.duplexModes && options.duplexModes.length > 0) {
      capabilitiesHTML += `
        <div class="mb-3">
          <strong>Duplex Modes:</strong>
          <ul class="capabilities-list">
            ${options.duplexModes.map(mode => `<li>${escapeHtml(mode)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (options.collate) {
      capabilitiesHTML += `
        <div class="mb-3">
          <strong>Features:</strong>
          <ul class="capabilities-list">
            <li>Collate supported</li>
          </ul>
        </div>
      `;
    }

    capabilitiesHTML += '</div>';
    return capabilitiesHTML;
  }

  // Get status badge HTML
  function getStatusBadge(status) {
    const statusMap = {
      'idle': { class: 'success', text: 'Idle' },
      'printing': { class: 'info', text: 'Printing' },
      'stopped': { class: 'danger', text: 'Stopped' },
      'paused': { class: 'warning', text: 'Paused' }
    };

    const statusInfo = statusMap[status] || { class: 'secondary', text: status || 'Unknown' };
    return `<span class="badge badge-${statusInfo.class} printer-status-badge">${statusInfo.text}</span>`;
  }

  // Attach event listeners
  function attachPrinterListeners() {
    // Set default printer buttons
    document.querySelectorAll('.set-default-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const printerName = e.target.getAttribute('data-printer-name');
        await setDefaultPrinter(printerName);
      });
    });
  }

  // Set default printer
  async function setDefaultPrinter(printerName) {
    try {
      const response = await fetch(`/api/printers/${printerName}/default`, {
        method: 'PUT',
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok) {
        showToast(`Default printer set to ${printerName}`, 'success');
        // Reload printers to update UI
        loadPrinters();
      } else {
        showToast(result.error || 'Failed to set default printer', 'error');
      }
    } catch (error) {
      console.error('Error setting default printer:', error);
      showToast('An error occurred while setting default printer', 'error');
    }
  }

  // Show error message
  function showError(message) {
    printersContainer.innerHTML = `
      <div class="alert alert-danger">
        ${escapeHtml(message)}
      </div>
    `;
  }

  // Show toast notification
  function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.className = 'toast-container';
      toastContainer.style.position = 'fixed';
      toastContainer.style.top = '20px';
      toastContainer.style.right = '20px';
      toastContainer.style.zIndex = '9999';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} alert-dismissible fade show`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      ${escapeHtml(message)}
      <button type="button" class="close" data-dismiss="alert">
        <span>&times;</span>
      </button>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  // Escape HTML
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});

