const mimeTypes = require('mime-types');
const path = require('path');

// Allowed file extensions
const ALLOWED_EXTENSIONS = {
  pdf: ['application/pdf'],
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
  postscript: ['application/postscript', 'application/eps']
};

const ALLOWED_MIME_TYPES = [
  ...ALLOWED_EXTENSIONS.pdf,
  ...ALLOWED_EXTENSIONS.images,
  ...ALLOWED_EXTENSIONS.postscript
];

// Validate file extension
const validateExtension = (filename) => {
  const ext = path.extname(filename).toLowerCase().substring(1);
  const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'ps', 'eps'];
  return validExtensions.includes(ext);
};

// Validate MIME type
const validateMimeType = (mimeType) => {
  return ALLOWED_MIME_TYPES.includes(mimeType);
};

// Get file type category
const getFileType = (filename, mimeType) => {
  const ext = path.extname(filename).toLowerCase().substring(1);
  
  if (ext === 'pdf' || mimeType === 'application/pdf') {
    return 'pdf';
  }
  
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext) || mimeType.startsWith('image/')) {
    return 'image';
  }
  
  if (['ps', 'eps'].includes(ext) || mimeType === 'application/postscript' || mimeType === 'application/eps') {
    return 'postscript';
  }
  
  return null;
};

// Validate file
const validateFile = (file, maxSize) => {
  const errors = [];
  
  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
  }
  
  // Check extension
  if (!validateExtension(file.originalname)) {
    errors.push('Invalid file type. Allowed types: PDF, JPEG, PNG, GIF, PostScript');
  }
  
  // Check MIME type
  const mimeType = mimeTypes.lookup(file.originalname);
  if (mimeType && !validateMimeType(mimeType)) {
    errors.push('Invalid file MIME type');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    fileType: getFileType(file.originalname, mimeType)
  };
};

module.exports = {
  validateFile,
  validateExtension,
  validateMimeType,
  getFileType,
  ALLOWED_EXTENSIONS
};


