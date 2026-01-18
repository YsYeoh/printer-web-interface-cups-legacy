const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth').requireAuth;
const cups = require('../utils/cups');

// List all printers
router.get('/', requireAuth, async (req, res) => {
  try {
    const printers = await cups.listPrinters();
    res.json({ success: true, printers });
  } catch (error) {
    console.error('Error listing printers:', error);
    res.status(500).json({ error: error.message || 'Failed to list printers' });
  }
});

// Get CUPS status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const status = await cups.getCUPSStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    console.error('Error getting CUPS status:', error);
    res.status(500).json({ 
      success: false,
      online: false,
      message: error.message || 'Failed to get CUPS status',
      printers: []
    });
  }
});

// Get printer options/capabilities
router.get('/:printerName/options', requireAuth, async (req, res) => {
  try {
    const { printerName } = req.params;
    
    // Validate printer name
    if (!cups.validatePrinterName(printerName)) {
      return res.status(400).json({ error: 'Invalid printer name' });
    }
    
    const options = await cups.getPrinterOptions(printerName);
    res.json({ success: true, options });
  } catch (error) {
    console.error('Error getting printer options:', error);
    res.status(500).json({ error: error.message || 'Failed to get printer options' });
  }
});

// Get detailed printer information
router.get('/:printerName/details', requireAuth, async (req, res) => {
  try {
    const { printerName } = req.params;
    
    // Validate printer name
    if (!cups.validatePrinterName(printerName)) {
      return res.status(400).json({ error: 'Invalid printer name' });
    }
    
    const details = await cups.getPrinterDetails(printerName);
    res.json({ success: true, printer: details });
  } catch (error) {
    console.error('Error getting printer details:', error);
    res.status(500).json({ error: error.message || 'Failed to get printer details' });
  }
});

// Get PPD options
router.get('/:printerName/ppd', requireAuth, async (req, res) => {
  try {
    const { printerName } = req.params;
    
    // Validate printer name
    if (!cups.validatePrinterName(printerName)) {
      return res.status(400).json({ error: 'Invalid printer name' });
    }
    
    const options = await cups.getPPDOptions(printerName);
    res.json({ success: true, options });
  } catch (error) {
    console.error('Error getting PPD options:', error);
    res.status(500).json({ error: error.message || 'Failed to get PPD options' });
  }
});

// Set default printer
router.put('/:printerName/default', requireAuth, async (req, res) => {
  try {
    const { printerName } = req.params;
    
    // Validate printer name
    if (!cups.validatePrinterName(printerName)) {
      return res.status(400).json({ error: 'Invalid printer name' });
    }
    
    const result = await cups.setDefaultPrinter(printerName);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error setting default printer:', error);
    res.status(500).json({ error: error.message || 'Failed to set default printer' });
  }
});

module.exports = router;

