const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uuid = require('uuid');
const requireAuth = require('../middleware/auth').requireAuth;
const fileValidator = require('../utils/fileValidator');
const config = require('../config/config.json');

// Temporary uploads directory (files are deleted after print)
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage - use temporary directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use a temp subdirectory that gets cleaned up
    const tempDir = path.join(uploadsDir, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Use session ID + UUID to ensure uniqueness
    const sessionId = req.session.id.substring(0, 8);
    const uniqueName = `${sessionId}-${uuid.v4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    const validation = fileValidator.validateFile(file, config.maxFileSize);
    if (validation.valid) {
      cb(null, true);
    } else {
      cb(new Error(validation.errors.join(', ')), false);
    }
  }
});

// Upload endpoint - files are temporary, deleted after print
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Extract file ID from filename (sessionId-uuid-extension)
    const filenameParts = req.file.filename.split('-');
    const fileId = filenameParts.slice(0, 2).join('-'); // sessionId-uuid
    
    const fileInfo = {
      id: fileId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
      type: fileValidator.getFileType(req.file.originalname, req.file.mimetype),
      uploadedAt: new Date().toISOString()
    };
    
    res.json({ success: true, file: fileInfo });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'File upload failed' });
  }
});

// Get specific file info (for preview/print)
router.get('/:fileId', requireAuth, (req, res) => {
  try {
    const tempDir = path.join(uploadsDir, 'temp');
    
    if (!fs.existsSync(tempDir)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const files = fs.readdirSync(tempDir);
    const file = files.find(f => f.startsWith(req.params.fileId));
    
    if (!file) {
      return res.status(404).json({ error: 'File not found or expired' });
    }
    
    const filePath = path.join(tempDir, file);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const stats = fs.statSync(filePath);
    
    // Extract original name (everything after the second dash)
    const parts = file.split('-');
    const originalName = parts.slice(2).join('-');
    
    res.json({
      id: req.params.fileId,
      filename: file,
      originalName: originalName,
      size: stats.size,
      path: filePath,
      type: fileValidator.getFileType(file, null),
      uploadedAt: stats.mtime.toISOString()
    });
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

module.exports = router;

