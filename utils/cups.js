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
      qualities: []
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
    }
    
    // Default values if not found
    if (options.paperSizes.length === 0) {
      options.paperSizes = ['A4', 'Letter', 'Legal', 'A3'];
    }
    if (options.colorModes.length === 0) {
      options.colorModes = ['Color', 'Gray'];
    }
    options.qualities = ['Draft', 'Normal', 'High'];
    
    return options;
  } catch (error) {
    console.error('Error getting printer options:', error);
    // Return defaults
    return {
      paperSizes: ['A4', 'Letter', 'Legal', 'A3'],
      colorModes: ['Color', 'Gray'],
      qualities: ['Draft', 'Normal', 'High']
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

module.exports = {
  listPrinters,
  getPrinterOptions,
  submitPrintJob,
  validatePrinterName,
  checkCUPSStatus,
  getCUPSStatus
};

