// Print configuration handler with integrated file upload
document.addEventListener('DOMContentLoaded', () => {
  const printForm = document.getElementById('printForm');
  const printerSelect = document.getElementById('printerSelect');
  const filePreview = document.getElementById('filePreview');
  const selectedFileInfo = document.getElementById('selectedFileInfo');
  const fileName = document.getElementById('fileName');
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const fileInfo = document.getElementById('fileInfo');
  const printButton = document.getElementById('printButton');
  
  let selectedFileId = null;
  let printers = [];
  let selectedFile = null;
  let uploadedFile = null;
  
  // File upload handlers
  uploadZone.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    handleFileSelect(e.target.files[0]);
  });
  
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
    
    uploadedFile = file;
    uploadZone.classList.add('has-file');
    fileInfo.innerHTML = `
      <strong>Selected:</strong> ${file.name}<br>
      <small>Size: ${(file.size / 1024 / 1024).toFixed(2)} MB</small>
    `;
    
    // Upload file immediately
    uploadFile(file);
  }
  
  // Upload file
  async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    uploadZone.style.opacity = '0.6';
    fileInfo.innerHTML = '<span class="loading"></span> Uploading...';
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok && result.file) {
        selectedFileId = result.file.id;
        selectedFile = result.file;
        
        // Update UI
        selectedFileInfo.style.display = 'block';
        fileName.textContent = result.file.originalName;
        uploadZone.classList.remove('has-file');
        uploadZone.style.opacity = '1';
        fileInfo.innerHTML = 'Drag and drop a file here or click to select';
        printButton.disabled = false;
        
        // Load preview
        loadPreview(selectedFileId, result.file.type);
        
        showToast('File uploaded successfully!', 'success');
      } else {
        showToast(result.error || 'Upload failed', 'error');
        uploadZone.style.opacity = '1';
        fileInfo.innerHTML = 'Drag and drop a file here or click to select';
        uploadedFile = null;
      }
    } catch (error) {
      showToast('An error occurred during upload', 'error');
      uploadZone.style.opacity = '1';
      fileInfo.innerHTML = 'Drag and drop a file here or click to select';
      uploadedFile = null;
    }
  }
  
  // Load preview
  function loadPreview(fileId, fileType) {
    if (!filePreview) return;
    
    // Calculate available height for preview (viewport height minus navbar and padding)
    const previewHeight = window.innerHeight - 56 - 30 - 60; // navbar + padding + card headers
    
    if (fileType === 'pdf') {
      filePreview.innerHTML = '<iframe src="/api/preview/' + fileId + '" style="width: 100%; height: ' + previewHeight + 'px; border: 1px solid #ddd;"></iframe>';
    } else if (fileType === 'image') {
      filePreview.innerHTML = '<img src="/api/preview/' + fileId + '" style="max-width: 100%; max-height: ' + previewHeight + 'px; border: 1px solid #ddd; object-fit: contain;">';
    } else {
      filePreview.innerHTML = '<p class="text-muted">Preview not available for this file type</p>';
    }
  }
  
  // Update preview on window resize
  window.addEventListener('resize', () => {
    if (selectedFileId && selectedFile) {
      loadPreview(selectedFileId, selectedFile.type);
    }
  });
  
  // Load printers
  async function loadPrinters() {
    try {
      const response = await fetch('/api/printers', {
        credentials: 'include'
      });
      const result = await response.json();
      
      if (response.ok && result.printers) {
        printers = result.printers;
        populatePrinterSelect(result.printers);
        
        // Select default printer if available
        const defaultPrinter = printers.find(p => p.default);
        if (defaultPrinter) {
          printerSelect.value = defaultPrinter.name;
          loadPrinterOptions(defaultPrinter.name);
        }
      }
    } catch (error) {
      console.error('Error loading printers:', error);
      showToast('Failed to load printers', 'error');
    }
  }
  
  // Populate printer select
  function populatePrinterSelect(printers) {
    printerSelect.innerHTML = '<option value="">Select a printer...</option>';
    printers.forEach(printer => {
      const option = document.createElement('option');
      option.value = printer.name;
      option.textContent = `${printer.name}${printer.default ? ' (Default)' : ''} - ${printer.status}`;
      printerSelect.appendChild(option);
    });
  }
  
  // Load printer options
  async function loadPrinterOptions(printerName) {
    try {
      const response = await fetch(`/api/printers/${printerName}/options`, {
        credentials: 'include'
      });
      const result = await response.json();
      
      if (response.ok && result.options) {
        populatePaperSizes(result.options.paperSizes);
        populateColorModes(result.options.colorModes);
        populateDuplexModes(result.options.duplexModes || []);
      }
    } catch (error) {
      console.error('Error loading printer options:', error);
    }
  }
  
  // Populate paper sizes
  function populatePaperSizes(sizes) {
    const paperSizeSelect = document.getElementById('paperSize');
    if (!paperSizeSelect) return;
    
    const currentValue = paperSizeSelect.value;
    paperSizeSelect.innerHTML = '';
    sizes.forEach(size => {
      const option = document.createElement('option');
      option.value = size;
      option.textContent = size;
      if (size === 'A4' || size === currentValue) {
        option.selected = true;
      }
      paperSizeSelect.appendChild(option);
    });
  }
  
  // Populate color modes
  function populateColorModes(modes) {
    const colorModeSelect = document.getElementById('colorMode');
    if (!colorModeSelect) return;
    
    const currentValue = colorModeSelect.value;
    colorModeSelect.innerHTML = '';
    modes.forEach(mode => {
      const option = document.createElement('option');
      option.value = mode;
      option.textContent = mode;
      if (mode === 'Color' || mode === currentValue) {
        option.selected = true;
      }
      colorModeSelect.appendChild(option);
    });
  }
  
  // Populate duplex modes
  function populateDuplexModes(modes) {
    const duplexSelect = document.getElementById('duplex');
    if (!duplexSelect) return;
    
    const currentValue = duplexSelect.value;
    duplexSelect.innerHTML = '<option value="">None</option>';
    
    // Map CUPS duplex values to display values
    const duplexMap = {
      'two-sided-long-edge': 'Long-edge',
      'two-sided-short-edge': 'Short-edge',
      'DuplexNoTumble': 'Long-edge',
      'DuplexTumble': 'Short-edge'
    };
    
    const addedModes = new Set();
    modes.forEach(mode => {
      const displayMode = duplexMap[mode] || mode;
      if (!addedModes.has(displayMode) && mode !== 'None' && mode !== '*None') {
        const option = document.createElement('option');
        option.value = displayMode;
        option.textContent = displayMode;
        if (displayMode === currentValue) {
          option.selected = true;
        }
        duplexSelect.appendChild(option);
        addedModes.add(displayMode);
      }
    });
  }
  
  
  // Load default settings
  function loadDefaultSettings() {
    document.getElementById('copies').value = '1';
    document.getElementById('scaling').value = '100';
  }
  
  // Printer selection change
  printerSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      loadPrinterOptions(e.target.value);
    }
  });
  
  // Form submission
  printForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedFileId) {
      showToast('Please upload a file first', 'error');
      return;
    }
    
    const formData = new FormData(printForm);
    const data = {
      fileId: selectedFileId,
      printerName: formData.get('printerName'),
      copies: formData.get('copies'),
      colorMode: formData.get('colorMode'),
      paperSize: formData.get('paperSize'),
      orientation: formData.get('orientation'),
      scaling: formData.get('scaling'),
      quality: formData.get('quality'),
      margins: {
        top: formData.get('marginTop'),
        bottom: formData.get('marginBottom'),
        left: formData.get('marginLeft'),
        right: formData.get('marginRight')
      },
      duplex: formData.get('duplex') || null,
      pageRanges: formData.get('pageRanges') || null,
      collate: formData.get('collate') === 'on'
    };
    
    // Validate page ranges format
    if (data.pageRanges && data.pageRanges.trim()) {
      const pageRangePattern = /^(\d+(-\d+)?)(,\d+(-\d+)?)*$/;
      if (!pageRangePattern.test(data.pageRanges.trim())) {
        showToast('Invalid page range format. Use format like "1-5,8,10-12"', 'error');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Print';
        return;
      }
    }
    
    // Validate collate (only for multiple copies)
    if (data.collate && parseInt(data.copies) <= 1) {
      showToast('Collate option only applies to multiple copies', 'error');
      submitButton.disabled = false;
      submitButton.innerHTML = 'Print';
      return;
    }
    
    const submitButton = printForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="loading"></span> Printing...';
    
    try {
      const response = await fetch('/api/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        showToast(`Print job submitted successfully! Job ID: ${result.jobId}`, 'success');
        // Clear file selection
        selectedFileId = null;
        selectedFile = null;
        uploadedFile = null;
        fileInput.value = '';
        selectedFileInfo.style.display = 'none';
        filePreview.innerHTML = '<p class="text-muted">No file selected</p>';
        printButton.disabled = true;
        uploadZone.classList.remove('has-file');
        
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        showToast(result.error || 'Print job failed', 'error');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Print';
      }
    } catch (error) {
      showToast('An error occurred', 'error');
      submitButton.disabled = false;
      submitButton.innerHTML = 'Print';
    }
  });
  
  // Update scaling value display
  const scalingSlider = document.getElementById('scaling');
  if (scalingSlider) {
    scalingSlider.addEventListener('input', (e) => {
      document.getElementById('scalingValue').textContent = e.target.value;
    });
  }
  
  // Load printers on page load
  loadPrinters();
  loadDefaultSettings();
});

// Toast notification function
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
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
  
  setTimeout(() => {
    toast.remove();
  }, 5000);
}
