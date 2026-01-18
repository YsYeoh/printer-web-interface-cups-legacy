const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

// List all available printers
const listPrinters = async () => {
  try {
    const { stdout } = await execFileAsync('lpstat', ['-p'], { timeout: 5000 });
    
    const printers = [];
    const lines = stdout.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // lpstat -p output format: "printer name is idle.  enabled since ..."
      const match = line.match(/^printer\s+(\S+)\s+is\s+(\S+)/);
      if (match) {
        const [, name, status] = match;
        printers.push({
          name: name,
          status: status === 'idle' ? 'idle' : status === 'printing' ? 'printing' : 'unknown',
          default: false // Will be updated if needed
        });
      }
    }
    
    // Get default printer
    try {
      const { stdout: defaultStdout } = await execFileAsync('lpstat', ['-d'], { timeout: 5000 });
      const defaultMatch = defaultStdout.match(/system default destination:\s*(\S+)/);
      if (defaultMatch) {
        const defaultName = defaultMatch[1];
        printers.forEach(p => {
          if (p.name === defaultName) {
            p.default = true;
          }
        });
      }
    } catch (err) {
      // No default printer set, continue
    }
    
    return printers;
  } catch (error) {
    console.error('Error listing printers:', error);
    throw new Error('Failed to list printers. Make sure CUPS is installed and running.');
  }
};

// Get printer options/capabilities
const getPrinterOptions = async (printerName) => {
  try {
    const { stdout } = await execFileAsync('lpoptions', ['-p', printerName, '-l'], { timeout: 5000 });
    
    const options = {
      paperSizes: [],
      colorModes: [],
      qualities: [],
      duplexModes: [],
      collate: false
    };
    
    const lines = stdout.split('\n');
    for (const line of lines) {
      // Parse paper sizes: "PageSize/Media Size: *A4 Letter Legal ..."
      if (line.includes('PageSize') || line.includes('Media')) {
        const match = line.match(/:\s*(.+)/);
        if (match) {
          const sizes = match[1].split(/\s+/).filter(s => s && !s.startsWith('*'));
          options.paperSizes = sizes;
        }
      }
      
      // Parse color modes: "ColorModel/Color Model: *Color Gray ..."
      if (line.includes('ColorModel') || line.includes('Color')) {
        const match = line.match(/:\s*(.+)/);
        if (match) {
          const modes = match[1].split(/\s+/).filter(s => s && !s.startsWith('*'));
          options.colorModes = modes;
        }
      }
      
      // Parse duplex modes: "Duplex/Duplex: *None DuplexNoTumble DuplexTumble ..."
      if (line.includes('Duplex') && !line.includes('Color')) {
        const match = line.match(/:\s*(.+)/);
        if (match) {
          const duplexModes = match[1].split(/\s+/).filter(s => s && !s.startsWith('*'));
          options.duplexModes = duplexModes;
        }
      }
      
      // Parse collate support
      if (line.includes('Collate')) {
        options.collate = true;
      }
    }
    
    // Default values if not found
    if (options.paperSizes.length === 0) {
      options.paperSizes = ['A4', 'Letter', 'Legal', 'A3'];
    }
    if (options.colorModes.length === 0) {
      options.colorModes = ['Color', 'Gray'];
    }
    if (options.duplexModes.length === 0) {
      options.duplexModes = ['None'];
    }
    options.qualities = ['Draft', 'Normal', 'High'];
    
    return options;
  } catch (error) {
    console.error('Error getting printer options:', error);
    // Return defaults
    return {
      paperSizes: ['A4', 'Letter', 'Legal', 'A3'],
      colorModes: ['Color', 'Gray'],
      qualities: ['Draft', 'Normal', 'High'],
      duplexModes: ['None'],
      collate: false
    };
  }
};

// Submit print job
const submitPrintJob = async (printerName, filePath, options) => {
  try {
    // Build lp command arguments
    const args = [];
    
    // Printer destination
    args.push('-d', printerName);
    
    // Number of copies
    if (options.copies && options.copies > 1) {
      args.push('-n', String(options.copies));
    }
    
    // Color mode
    if (options.colorMode) {
      const colorValue = options.colorMode === 'Color' ? 'Color' : 'Gray';
      args.push('-o', `ColorModel=${colorValue}`);
    }
    
    // Paper size
    if (options.paperSize) {
      args.push('-o', `media=${options.paperSize}`);
    }
    
    // Orientation
    if (options.orientation) {
      const orientValue = options.orientation === 'Landscape' ? 'landscape' : 'portrait';
      args.push('-o', `orientation-requested=${orientValue}`);
    }
    
    // Scaling
    if (options.scaling && options.scaling !== 100) {
      args.push('-o', `fit-to-page=${options.scaling}%`);
    }
    
    // Print quality
    if (options.quality) {
      const qualityMap = {
        'Draft': '3',
        'Normal': '4',
        'High': '5'
      };
      const qualityValue = qualityMap[options.quality] || '4';
      args.push('-o', `print-quality=${qualityValue}`);
    }
    
    // Margins (in inches)
    if (options.margins) {
      const m = options.margins;
      if (m.left) args.push('-o', `page-left=${m.left}in`);
      if (m.right) args.push('-o', `page-right=${m.right}in`);
      if (m.top) args.push('-o', `page-top=${m.top}in`);
      if (m.bottom) args.push('-o', `page-bottom=${m.bottom}in`);
    }
    
    // Duplex printing
    if (options.duplex) {
      if (options.duplex === 'Long-edge' || options.duplex === 'two-sided-long-edge') {
        args.push('-o', 'sides=two-sided-long-edge');
      } else if (options.duplex === 'Short-edge' || options.duplex === 'two-sided-short-edge') {
        args.push('-o', 'sides=two-sided-short-edge');
      }
    }
    
    // Page ranges
    if (options.pageRanges) {
      args.push('-o', `page-ranges=${options.pageRanges}`);
    }
    
    // Collate
    if (options.collate && options.copies && options.copies > 1) {
      args.push('-o', 'Collate=True');
    }
    
    // File path (must be last)
    args.push(filePath);
    
    // Execute lp command
    const { stdout } = await execFileAsync('lp', args, { timeout: 30000 });
    
    // Parse job ID from output: "request id is PrinterName-123 (1 file(s))"
    const jobIdMatch = stdout.match(/request id is (\S+)/);
    const jobId = jobIdMatch ? jobIdMatch[1] : null;
    
    return {
      success: true,
      jobId: jobId,
      message: stdout.trim()
    };
  } catch (error) {
    console.error('Print job error:', error);
    throw new Error(`Failed to submit print job: ${error.message}`);
  }
};

// Check CUPS service status
const checkCUPSStatus = async () => {
  try {
    // Try to run a simple CUPS command to check if service is running
    await execFileAsync('lpstat', ['-r'], { timeout: 3000 });
    return {
      online: true,
      message: 'CUPS is running'
    };
  } catch (error) {
    return {
      online: false,
      message: 'CUPS service is not available'
    };
  }
};

// Get comprehensive CUPS status including printers
const getCUPSStatus = async () => {
  const status = await checkCUPSStatus();
  
  if (!status.online) {
    return {
      ...status,
      printers: []
    };
  }
  
  try {
    const printers = await listPrinters();
    return {
      ...status,
      printers: printers,
      printerCount: printers.length
    };
  } catch (error) {
    return {
      ...status,
      printers: [],
      printerCount: 0,
      error: error.message
    };
  }
};

// Validate printer name (prevent injection)
const validatePrinterName = (printerName) => {
  // Only allow alphanumeric, dash, underscore
  return /^[a-zA-Z0-9_-]+$/.test(printerName);
};

// List all print jobs
const listJobs = async (printerName = null) => {
  try {
    const args = ['-o'];
    if (printerName) {
      args.push(printerName);
    }
    
    const { stdout } = await execFileAsync('lpstat', args, { timeout: 5000 });
    
    const jobs = [];
    const lines = stdout.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // lpstat -o output format: "PrinterName-123   username   1024   Mon 01 Jan 2024 12:00:00 PM"
      // or "PrinterName-123   username   1024   Mon 01 Jan 2024 12:00:00 PM - completed"
      const match = line.match(/^(\S+)\s+(\S+)\s+(\d+)\s+(.+?)(?:\s+-\s+(\S+))?$/);
      if (match) {
        const [, jobId, username, size, dateTime, status] = match;
        const jobStatus = status || 'pending';
        jobs.push({
          jobId: jobId,
          username: username,
          size: parseInt(size),
          submittedAt: dateTime.trim(),
          status: jobStatus,
          printer: jobId.split('-')[0]
        });
      }
    }
    
    return jobs;
  } catch (error) {
    console.error('Error listing jobs:', error);
    // Return empty array if no jobs found (not an error)
    if (error.message && error.message.includes('No destinations added')) {
      return [];
    }
    throw new Error(`Failed to list print jobs: ${error.message}`);
  }
};

// Get job status
const getJobStatus = async (jobId) => {
  try {
    // Validate job ID format (PrinterName-Number)
    if (!/^[a-zA-Z0-9_-]+-\d+$/.test(jobId)) {
      throw new Error('Invalid job ID format');
    }
    
    const { stdout } = await execFileAsync('lpstat', ['-o', jobId], { timeout: 5000 });
    
    const lines = stdout.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return null;
    }
    
    const line = lines[0];
    const match = line.match(/^(\S+)\s+(\S+)\s+(\d+)\s+(.+?)(?:\s+-\s+(\S+))?$/);
    if (match) {
      const [, id, username, size, dateTime, status] = match;
      return {
        jobId: id,
        username: username,
        size: parseInt(size),
        submittedAt: dateTime.trim(),
        status: status || 'pending',
        printer: id.split('-')[0]
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting job status:', error);
    return null;
  }
};

// Cancel print job
const cancelJob = async (jobId) => {
  try {
    // Validate job ID format
    if (!/^[a-zA-Z0-9_-]+-\d+$/.test(jobId)) {
      throw new Error('Invalid job ID format');
    }
    
    await execFileAsync('cancel', [jobId], { timeout: 5000 });
    return { success: true, message: `Job ${jobId} cancelled` };
  } catch (error) {
    console.error('Error cancelling job:', error);
    throw new Error(`Failed to cancel job: ${error.message}`);
  }
};

// Hold print job
const holdJob = async (jobId) => {
  try {
    // Validate job ID format
    if (!/^[a-zA-Z0-9_-]+-\d+$/.test(jobId)) {
      throw new Error('Invalid job ID format');
    }
    
    await execFileAsync('lp', ['-i', jobId, '-H', 'hold'], { timeout: 5000 });
    return { success: true, message: `Job ${jobId} held` };
  } catch (error) {
    console.error('Error holding job:', error);
    throw new Error(`Failed to hold job: ${error.message}`);
  }
};

// Release print job
const releaseJob = async (jobId) => {
  try {
    // Validate job ID format
    if (!/^[a-zA-Z0-9_-]+-\d+$/.test(jobId)) {
      throw new Error('Invalid job ID format');
    }
    
    await execFileAsync('lp', ['-i', jobId, '-H', 'resume'], { timeout: 5000 });
    return { success: true, message: `Job ${jobId} released` };
  } catch (error) {
    console.error('Error releasing job:', error);
    throw new Error(`Failed to release job: ${error.message}`);
  }
};

// Get job history (completed jobs)
const getJobHistory = async (limit = 50) => {
  try {
    const jobs = await listJobs();
    // Filter completed/cancelled jobs and limit results
    const history = jobs
      .filter(job => job.status === 'completed' || job.status === 'cancelled' || job.status === 'aborted')
      .slice(0, limit);
    return history;
  } catch (error) {
    console.error('Error getting job history:', error);
    return [];
  }
};

// Get detailed printer information
const getPrinterDetails = async (printerName) => {
  try {
    if (!validatePrinterName(printerName)) {
      throw new Error('Invalid printer name');
    }
    
    // Get printer status
    let status = 'unknown';
    let location = '';
    let description = '';
    let driver = '';
    
    try {
      const { stdout: statusStdout } = await execFileAsync('lpstat', ['-p', printerName, '-l'], { timeout: 5000 });
      const statusLines = statusStdout.split('\n');
      
      for (const line of statusLines) {
        // Parse status: "printer name is idle.  enabled since ..."
        const statusMatch = line.match(/printer\s+\S+\s+is\s+(\S+)/);
        if (statusMatch) {
          status = statusMatch[1];
        }
        
        // Parse description: "Description: ..."
        const descMatch = line.match(/Description:\s*(.+)/);
        if (descMatch) {
          description = descMatch[1].trim();
        }
        
        // Parse location: "Location: ..."
        const locMatch = line.match(/Location:\s*(.+)/);
        if (locMatch) {
          location = locMatch[1].trim();
        }
      }
    } catch (err) {
      // Printer might not exist, continue with defaults
    }
    
    // Get driver info
    try {
      const { stdout: driverStdout } = await execFileAsync('lpinfo', ['-m'], { timeout: 5000 });
      // Try to find driver for this printer
      // This is a simplified approach - full driver detection would require PPD parsing
    } catch (err) {
      // Driver info not critical
    }
    
    // Get default printer
    let isDefault = false;
    try {
      const { stdout: defaultStdout } = await execFileAsync('lpstat', ['-d'], { timeout: 5000 });
      const defaultMatch = defaultStdout.match(/system default destination:\s*(\S+)/);
      if (defaultMatch && defaultMatch[1] === printerName) {
        isDefault = true;
      }
    } catch (err) {
      // No default printer set
    }
    
    return {
      name: printerName,
      status: status,
      location: location,
      description: description,
      driver: driver,
      default: isDefault
    };
  } catch (error) {
    console.error('Error getting printer details:', error);
    throw new Error(`Failed to get printer details: ${error.message}`);
  }
};

// Set default printer
const setDefaultPrinter = async (printerName) => {
  try {
    if (!validatePrinterName(printerName)) {
      throw new Error('Invalid printer name');
    }
    
    await execFileAsync('lpoptions', ['-d', printerName], { timeout: 5000 });
    return { success: true, message: `Default printer set to ${printerName}` };
  } catch (error) {
    console.error('Error setting default printer:', error);
    throw new Error(`Failed to set default printer: ${error.message}`);
  }
};

// Get PPD options (enhanced parsing)
const getPPDOptions = async (printerName) => {
  try {
    if (!validatePrinterName(printerName)) {
      throw new Error('Invalid printer name');
    }
    
    const { stdout } = await execFileAsync('lpoptions', ['-p', printerName, '-l'], { timeout: 5000 });
    
    const options = {
      paperSizes: [],
      colorModes: [],
      qualities: [],
      duplexModes: [],
      collate: false,
      raw: stdout
    };
    
    const lines = stdout.split('\n');
    for (const line of lines) {
      // Parse paper sizes
      if (line.includes('PageSize') || line.includes('Media')) {
        const match = line.match(/:\s*(.+)/);
        if (match) {
          const sizes = match[1].split(/\s+/).filter(s => s && !s.startsWith('*'));
          options.paperSizes = sizes;
        }
      }
      
      // Parse color modes
      if (line.includes('ColorModel') || line.includes('Color')) {
        const match = line.match(/:\s*(.+)/);
        if (match) {
          const modes = match[1].split(/\s+/).filter(s => s && !s.startsWith('*'));
          options.colorModes = modes;
        }
      }
      
      // Parse duplex modes
      if (line.includes('Duplex') && !line.includes('Color')) {
        const match = line.match(/:\s*(.+)/);
        if (match) {
          const duplexModes = match[1].split(/\s+/).filter(s => s && !s.startsWith('*'));
          options.duplexModes = duplexModes;
        }
      }
      
      // Parse collate
      if (line.includes('Collate')) {
        options.collate = true;
      }
    }
    
    return options;
  } catch (error) {
    console.error('Error getting PPD options:', error);
    throw new Error(`Failed to get PPD options: ${error.message}`);
  }
};

module.exports = {
  listPrinters,
  getPrinterOptions,
  submitPrintJob,
  validatePrinterName,
  checkCUPSStatus,
  getCUPSStatus,
  listJobs,
  getJobStatus,
  cancelJob,
  holdJob,
  releaseJob,
  getJobHistory,
  getPrinterDetails,
  setDefaultPrinter,
  getPPDOptions
};

