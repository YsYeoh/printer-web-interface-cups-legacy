// Print Job Queue Management
document.addEventListener('DOMContentLoaded', () => {
  const activeJobsContainer = document.getElementById('activeJobsContainer');
  const historyJobsContainer = document.getElementById('historyJobsContainer');
  const refreshBtn = document.getElementById('refreshBtn');
  const refreshIcon = refreshBtn.querySelector('.refresh-icon');
  
  let pollingInterval = null;
  const POLL_INTERVAL = 5000; // 5 seconds

  // Load jobs on page load
  loadJobs();

  // Setup refresh button
  refreshBtn.addEventListener('click', () => {
    refreshIcon.classList.add('spinning');
    loadJobs().finally(() => {
      setTimeout(() => {
        refreshIcon.classList.remove('spinning');
      }, 500);
    });
  });

  // Start polling
  startPolling();

  // Stop polling when page is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopPolling();
    } else {
      startPolling();
    }
  });

  // Load all jobs
  async function loadJobs() {
    try {
      // Load active jobs
      const activeResponse = await fetch('/api/jobs', {
        credentials: 'include'
      });
      const activeResult = await activeResponse.json();

      if (activeResponse.ok && activeResult.jobs) {
        const activeJobs = activeResult.jobs.filter(job => 
          job.status === 'pending' || job.status === 'processing' || !job.status
        );
        renderActiveJobs(activeJobs);
      }

      // Load job history
      const historyResponse = await fetch('/api/jobs/history/list?limit=50', {
        credentials: 'include'
      });
      const historyResult = await historyResponse.json();

      if (historyResponse.ok && historyResult.jobs) {
        renderHistoryJobs(historyResult.jobs);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      showError('Failed to load print jobs');
    }
  }

  // Render active jobs
  function renderActiveJobs(jobs) {
    if (jobs.length === 0) {
      activeJobsContainer.innerHTML = `
        <div class="empty-state">
          <p>No active print jobs</p>
        </div>
      `;
      return;
    }

    const table = document.createElement('table');
    table.className = 'table table-sm table-hover job-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Job ID</th>
          <th>Printer</th>
          <th>User</th>
          <th>Size</th>
          <th>Status</th>
          <th>Submitted</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${jobs.map(job => `
          <tr>
            <td><code>${escapeHtml(job.jobId)}</code></td>
            <td>${escapeHtml(job.printer || 'Unknown')}</td>
            <td>${escapeHtml(job.username || 'Unknown')}</td>
            <td>${formatFileSize(job.size || 0)}</td>
            <td>${getStatusBadge(job.status || 'pending')}</td>
            <td>${escapeHtml(job.submittedAt || 'Unknown')}</td>
            <td class="job-actions">
              ${getJobActions(job)}
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;

    activeJobsContainer.innerHTML = '';
    activeJobsContainer.appendChild(table);

    // Attach event listeners
    attachJobActionListeners();
  }

  // Render job history
  function renderHistoryJobs(jobs) {
    if (jobs.length === 0) {
      historyJobsContainer.innerHTML = `
        <div class="empty-state">
          <p>No job history</p>
        </div>
      `;
      return;
    }

    const table = document.createElement('table');
    table.className = 'table table-sm table-hover job-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Job ID</th>
          <th>Printer</th>
          <th>User</th>
          <th>Size</th>
          <th>Status</th>
          <th>Submitted</th>
        </tr>
      </thead>
      <tbody>
        ${jobs.map(job => `
          <tr>
            <td><code>${escapeHtml(job.jobId)}</code></td>
            <td>${escapeHtml(job.printer || 'Unknown')}</td>
            <td>${escapeHtml(job.username || 'Unknown')}</td>
            <td>${formatFileSize(job.size || 0)}</td>
            <td>${getStatusBadge(job.status || 'completed')}</td>
            <td>${escapeHtml(job.submittedAt || 'Unknown')}</td>
          </tr>
        `).join('')}
      </tbody>
    `;

    historyJobsContainer.innerHTML = '';
    historyJobsContainer.appendChild(table);
  }

  // Get status badge HTML
  function getStatusBadge(status) {
    const statusMap = {
      'pending': { class: 'warning', text: 'Pending' },
      'processing': { class: 'info', text: 'Processing' },
      'printing': { class: 'info', text: 'Printing' },
      'completed': { class: 'success', text: 'Completed' },
      'cancelled': { class: 'secondary', text: 'Cancelled' },
      'aborted': { class: 'danger', text: 'Aborted' },
      'held': { class: 'warning', text: 'Held' }
    };

    const statusInfo = statusMap[status] || { class: 'secondary', text: status };
    return `<span class="badge badge-${statusInfo.class} job-status-badge">${statusInfo.text}</span>`;
  }

  // Get job action buttons
  function getJobActions(job) {
    const status = job.status || 'pending';
    let actions = '';

    if (status === 'held') {
      actions += `<button class="btn btn-sm btn-success release-btn" data-job-id="${escapeHtml(job.jobId)}">Release</button>`;
    } else if (status !== 'completed' && status !== 'cancelled' && status !== 'aborted') {
      actions += `<button class="btn btn-sm btn-warning hold-btn" data-job-id="${escapeHtml(job.jobId)}">Hold</button>`;
    }

    if (status !== 'completed' && status !== 'cancelled' && status !== 'aborted') {
      actions += `<button class="btn btn-sm btn-danger cancel-btn" data-job-id="${escapeHtml(job.jobId)}">Cancel</button>`;
    }

    return actions || '<span class="text-muted">-</span>';
  }

  // Attach event listeners for job actions
  function attachJobActionListeners() {
    // Cancel buttons
    document.querySelectorAll('.cancel-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const jobId = e.target.getAttribute('data-job-id');
        if (confirm(`Are you sure you want to cancel job ${jobId}?`)) {
          await cancelJob(jobId);
        }
      });
    });

    // Hold buttons
    document.querySelectorAll('.hold-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const jobId = e.target.getAttribute('data-job-id');
        await holdJob(jobId);
      });
    });

    // Release buttons
    document.querySelectorAll('.release-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const jobId = e.target.getAttribute('data-job-id');
        await releaseJob(jobId);
      });
    });
  }

  // Cancel job
  async function cancelJob(jobId) {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok) {
        showToast(`Job ${jobId} cancelled successfully`, 'success');
        loadJobs();
      } else {
        showToast(result.error || 'Failed to cancel job', 'error');
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
      showToast('An error occurred while cancelling job', 'error');
    }
  }

  // Hold job
  async function holdJob(jobId) {
    try {
      const response = await fetch(`/api/jobs/${jobId}/hold`, {
        method: 'POST',
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok) {
        showToast(`Job ${jobId} held successfully`, 'success');
        loadJobs();
      } else {
        showToast(result.error || 'Failed to hold job', 'error');
      }
    } catch (error) {
      console.error('Error holding job:', error);
      showToast('An error occurred while holding job', 'error');
    }
  }

  // Release job
  async function releaseJob(jobId) {
    try {
      const response = await fetch(`/api/jobs/${jobId}/release`, {
        method: 'POST',
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok) {
        showToast(`Job ${jobId} released successfully`, 'success');
        loadJobs();
      } else {
        showToast(result.error || 'Failed to release job', 'error');
      }
    } catch (error) {
      console.error('Error releasing job:', error);
      showToast('An error occurred while releasing job', 'error');
    }
  }

  // Start polling for job updates
  function startPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    pollingInterval = setInterval(() => {
      loadJobs();
    }, POLL_INTERVAL);
  }

  // Stop polling
  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  // Format file size
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Show error message
  function showError(message) {
    activeJobsContainer.innerHTML = `
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
});

