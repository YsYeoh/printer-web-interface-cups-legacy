// Drag and drop file upload handler
document.addEventListener('DOMContentLoaded', () => {
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const fileInfo = document.getElementById('fileInfo');
  const uploadButton = document.getElementById('uploadButton');
  
  let selectedFile = null;
  
  // Click to select file
  uploadZone.addEventListener('click', () => {
    fileInput.click();
  });
  
  // File input change
  fileInput.addEventListener('change', (e) => {
    handleFileSelect(e.target.files[0]);
  });
  
  // Drag and drop handlers
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });
  
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  });
  
  // Handle file selection
  function handleFileSelect(file) {
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/postscript', 'application/eps'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'ps', 'eps'];
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      showToast('Invalid file type. Allowed: PDF, JPEG, PNG, GIF, PostScript', 'error');
      return;
    }
    
    // Validate file size (50MB)
    if (file.size > 52428800) {
      showToast('File size exceeds 50MB limit', 'error');
      return;
    }
    
    selectedFile = file;
    uploadZone.classList.add('has-file');
    fileInfo.innerHTML = `
      <strong>Selected:</strong> ${file.name}<br>
      <small>Size: ${(file.size / 1024 / 1024).toFixed(2)} MB</small>
    `;
    uploadButton.disabled = false;
  }
  
  // Upload button handler
  uploadButton.addEventListener('click', async () => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    uploadButton.disabled = true;
    uploadButton.innerHTML = '<span class="loading"></span> Uploading...';
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        showToast('File uploaded successfully! Redirecting to print page...', 'success');
        // Store file ID for print page
        sessionStorage.setItem('selectedFileId', result.file.id);
        // Redirect to print page immediately
        setTimeout(() => {
          window.location.href = '/print';
        }, 1000);
      } else {
        showToast(result.error || 'Upload failed', 'error');
        uploadButton.disabled = false;
        uploadButton.innerHTML = 'Upload';
      }
    } catch (error) {
      showToast('An error occurred during upload', 'error');
      uploadButton.disabled = false;
      uploadButton.innerHTML = 'Upload';
    }
  });
  
  // Note: Files are temporary and deleted after printing, so we don't load a file list
});

// Select file for printing (store in sessionStorage)
function selectFileForPrint(fileId) {
  sessionStorage.setItem('selectedFileId', fileId);
  showToast('File selected. Redirecting to print page...', 'success');
  setTimeout(() => {
    window.location.href = '/print';
  }, 1000);
}

// Toast notification function
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} alert-dismissible fade show`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    ${message}
    <button type="button" class="close" data-dismiss="alert">
      <span>&times;</span>
    </button>
  `;
  
  toastContainer.appendChild(toast);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

