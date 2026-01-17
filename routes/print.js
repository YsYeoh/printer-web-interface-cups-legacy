const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const requireAuth = require('../middleware/auth').requireAuth;
const cups = require('../utils/cups');
const config = require('../config/config.json');

// Submit print job
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      fileId,
      printerName,
      copies,
      colorMode,
      paperSize,
      orientation,
      scaling,
      quality,
      margins
    } = req.body;
    
    // Validate required fields
    if (!fileId || !printerName) {
      return res.status(400).json({ error: 'File ID and printer name are required' });
    }
    
    // Validate printer name
    if (!cups.validatePrinterName(printerName)) {
      return res.status(400).json({ error: 'Invalid printer name' });
    }
    
    // Get file path from temporary directory
    const uploadsDir = path.join(__dirname, '../uploads');
    const tempDir = path.join(uploadsDir, 'temp');
    
    if (!fs.existsSync(tempDir)) {
      return res.status(404).json({ error: 'File not found or expired' });
    }
    
    const files = fs.readdirSync(tempDir);
    const file = files.find(f => f.startsWith(fileId));
    
    if (!file) {
      return res.status(404).json({ error: 'File not found or expired' });
    }
    
    const filePath = path.join(tempDir, file);
    
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Build print options
    const printOptions = {
      copies: parseInt(copies) || config.defaultPrintSettings.copies,
      colorMode: colorMode || config.defaultPrintSettings.colorMode,
      paperSize: paperSize || config.defaultPrintSettings.paperSize,
      orientation: orientation || config.defaultPrintSettings.orientation,
      scaling: parseInt(scaling) || config.defaultPrintSettings.scaling,
      quality: quality || config.defaultPrintSettings.quality,
      margins: margins || config.defaultPrintSettings.margins
    };
    
    // Validate options
    if (printOptions.copies < 1 || printOptions.copies > 99) {
      return res.status(400).json({ error: 'Copies must be between 1 and 99' });
    }
    
    if (printOptions.scaling < 25 || printOptions.scaling > 200) {
      return res.status(400).json({ error: 'Scaling must be between 25% and 200%' });
    }
    
    // Submit print job
    const result = await cups.submitPrintJob(printerName, filePath, printOptions);
    
    // Delete file after successful print (temporary files only)
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted temporary file after print: ${filePath}`);
      }
    } catch (deleteError) {
      console.error('Error deleting file after print:', deleteError);
      // Don't fail the request if deletion fails
    }
    
    res.json({
      success: true,
      jobId: result.jobId,
      message: result.message
    });
  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit print job' });
  }
});

module.exports = router;

