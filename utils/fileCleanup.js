const fs = require('fs');
const path = require('path');
const config = require('../config/config.json');

const cleanupOldFiles = () => {
  const uploadsDir = path.join(__dirname, '../uploads');
  const previewsDir = path.join(__dirname, '../previews');
  const tempDir = path.join(uploadsDir, 'temp');
  
  // Clean up temp directory - delete files older than 1 hour (safety cleanup)
  const maxAge = 60 * 60 * 1000; // 1 hour
  const now = Date.now();
  
  const cleanupDirectory = (dir, isTemp = false) => {
    if (!fs.existsSync(dir)) {
      return;
    }
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      const filePath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        cleanupDirectory(filePath, isTemp);
        // Remove empty directories
        try {
          const subFiles = fs.readdirSync(filePath);
          if (subFiles.length === 0) {
            fs.rmdirSync(filePath);
          }
        } catch (err) {
          // Directory might have been removed already
        }
      } else {
        try {
          const stats = fs.statSync(filePath);
          const age = now - stats.mtimeMs;
          
          // For temp directory, use shorter cleanup time (1 hour)
          // For other directories, use config cleanup hours
          const cleanupAge = isTemp ? maxAge : (config.uploadCleanupHours || 24) * 60 * 60 * 1000;
          
          if (age > cleanupAge) {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up old file: ${filePath}`);
          }
        } catch (err) {
          console.error(`Error cleaning up file ${filePath}:`, err);
        }
      }
    });
  };
  
  // Clean temp directory with shorter timeout
  cleanupDirectory(tempDir, true);
  
  // Clean previews directory
  cleanupDirectory(previewsDir);
  
  // Clean old user directories if they exist
  try {
    const userDirs = fs.readdirSync(uploadsDir, { withFileTypes: true })
      .filter(item => item.isDirectory() && item.name !== 'temp');
    
    userDirs.forEach(dir => {
      const userDirPath = path.join(uploadsDir, dir.name);
      cleanupDirectory(userDirPath);
    });
  } catch (err) {
    // Directory might not exist or be empty
  }
};

module.exports = cleanupOldFiles;
