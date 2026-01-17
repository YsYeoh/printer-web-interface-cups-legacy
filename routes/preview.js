const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');
const requireAuth = require('../middleware/auth').requireAuth;
const fileValidator = require('../utils/fileValidator');

const execFileAsync = promisify(execFile);

// Get file preview
router.get('/:fileId', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const uploadsDir = path.join(__dirname, '../uploads');
    const tempDir = path.join(uploadsDir, 'temp');
    const previewsDir = path.join(__dirname, '../previews');
    
    if (!fs.existsSync(tempDir)) {
      return res.status(404).json({ error: 'File not found or expired' });
    }
    
    // Find file in temp directory
    const files = fs.readdirSync(tempDir);
    const file = files.find(f => f.startsWith(fileId));
    
    if (!file) {
      return res.status(404).json({ error: 'File not found or expired' });
    }
    
    const filePath = path.join(tempDir, file);
    const fileType = fileValidator.getFileType(file, null);
    
    // For PDFs, serve directly (client will use PDF.js)
    if (fileType === 'pdf') {
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      return res.sendFile(path.resolve(filePath));
    }
    
    // For images, serve directly
    if (fileType === 'image') {
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      return res.sendFile(path.resolve(filePath));
    }
    
    // For PostScript, try to convert to PDF/image
    if (fileType === 'postscript') {
      const previewPath = path.join(previewsDir, `${fileId}.png`);
      
      // Check if preview already exists
      if (fs.existsSync(previewPath)) {
        return res.sendFile(path.resolve(previewPath));
      }
      
      // Generate preview using Ghostscript
      try {
        await execFileAsync('gs', [
          '-dNOPAUSE',
          '-dBATCH',
          '-sDEVICE=png16m',
          '-r150',
          '-dFirstPage=1',
          '-dLastPage=1',
          `-sOutputFile=${previewPath}`,
          filePath
        ], { timeout: 10000 });
        
        if (fs.existsSync(previewPath)) {
          return res.sendFile(path.resolve(previewPath));
        }
      } catch (error) {
        console.error('Ghostscript conversion error:', error);
        // Fallback: return error or original file
        return res.status(500).json({ error: 'Preview generation failed. Ghostscript may not be installed.' });
      }
    }
    
    res.status(400).json({ error: 'Preview not available for this file type' });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

module.exports = router;

