const app = require('./app');
const config = require('./config/config.json');
const fs = require('fs');
const path = require('path');

// Ensure required directories exist
const directories = ['uploads', 'previews'];
directories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Cleanup old uploads on startup
const cleanupOldFiles = require('./utils/fileCleanup');
try {
  cleanupOldFiles();
} catch (error) {
  console.error('Error during file cleanup:', error);
}

const PORT = process.env.PORT || config.port;

app.listen(PORT, () => {
  console.log(`CUPS Web Interface server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});

