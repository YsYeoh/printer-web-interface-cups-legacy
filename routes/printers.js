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

module.exports = router;

