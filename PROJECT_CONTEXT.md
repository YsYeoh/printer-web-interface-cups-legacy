# Project Context: CUPS Web Interface

## Overview

This is a **legacy-compatible web-based printing interface** designed specifically for **Raspberry Pi 1** systems running **Node.js 10.x**. The application provides a modern web UI for managing and printing documents through CUPS (Common Unix Printing System) with authentication, file upload, preview, and advanced print configuration capabilities.

## Target Environment

- **Hardware**: Raspberry Pi 1 (ARMv6 architecture)
- **Node.js**: Version 10.x (legacy compatibility required)
- **OS**: Debian/Ubuntu/Raspbian (Linux-based)
- **Printing System**: CUPS (Common Unix Printing System)

## Core Purpose

Provide a web-based interface that allows users to:
1. Upload documents (PDF, images, PostScript)
2. Preview files before printing
3. Configure advanced print settings
4. Submit print jobs to CUPS printers
5. Manage user accounts (admin only)

## Architecture

### Technology Stack

**Backend:**
- **Express.js** 4.16.4 - Web framework
- **EJS** 2.6.1 - Template engine for server-side rendering
- **express-session** 1.15.6 - Session management
- **bcryptjs** 2.4.3 - Password hashing
- **multer** 1.4.2 - File upload handling
- **jsonfile** 4.0.0 - JSON file I/O for user storage
- **csurf** 1.11.0 - CSRF protection
- **express-rate-limit** 3.0.0 - Rate limiting

**System Integration:**
- CUPS command-line tools (`lp`, `lpstat`, `lpoptions`)
- poppler-utils (for PDF preview thumbnails)
- Ghostscript (for PostScript conversion)

### Project Structure

```
printer-web-interface-cups-legacy/
├── app.js                    # Express application setup & middleware
├── server.js                 # Server entry point & initialization
├── config/
│   ├── config.json          # Application configuration
│   └── users.json           # User database (JSON file)
├── routes/                   # API route handlers
│   ├── auth.js              # Authentication endpoints
│   ├── upload.js            # File upload endpoints
│   ├── print.js             # Print job submission
│   ├── printers.js          # Printer listing & status
│   ├── preview.js           # File preview generation
│   └── admin.js             # Admin user management
├── middleware/
│   ├── auth.js              # Authentication middleware
│   └── rbac.js              # Role-based access control
├── utils/
│   ├── cups.js              # CUPS integration utilities
│   ├── userManager.js       # User CRUD operations
│   ├── fileValidator.js     # File validation logic
│   └── fileCleanup.js       # Temporary file cleanup
├── views/                    # EJS templates
│   ├── login.ejs
│   ├── dashboard.ejs
│   ├── upload.ejs
│   ├── print.ejs
│   ├── admin/
│   │   └── users.ejs
│   ├── error.ejs
│   └── layouts/
│       ├── main.ejs
│       ├── main-start.ejs
│       └── main-end.ejs
├── public/                   # Static assets
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── upload.js
│   │   ├── print.js
│   │   └── cups-status.js
│   └── lib/
│       └── pdfjs/           # PDF.js for preview
├── uploads/                  # Uploaded files (gitignored)
│   └── temp/                # Temporary files (deleted after print)
├── previews/                 # Generated previews (gitignored)
└── scripts/
    └── create-admin.js      # Admin user creation script
```

## Key Features

### 1. Authentication System

- **Session-based authentication** using express-session
- **Role-based access control** (Admin/Regular users)
- **Password hashing** with bcryptjs (10 rounds)
- **JSON-based user storage** (no database required)
- **CSRF protection** for form submissions
- **Rate limiting** on login endpoints (5 attempts per 15 minutes)

**User Roles:**
- **Admin**: Full access including user management
- **Regular**: Print and upload capabilities only

**User Storage:**
- Stored in `config/users.json`
- Atomic writes using temporary files
- Password hashes stored (never plaintext)
- Prevents deletion of last admin user

### 2. File Upload

- **Drag-and-drop** file upload interface
- **Supported formats**: PDF, JPEG, PNG, GIF, PostScript (.ps, .eps)
- **File validation**: Extension, MIME type, and size checks
- **Maximum file size**: 50MB (configurable)
- **Temporary storage**: Files stored in `uploads/temp/` with unique IDs
- **Auto-cleanup**: Files deleted after successful print or after timeout (24 hours default)

**File Naming Convention:**
- Format: `{sessionId}-{uuid}-{originalFilename}`
- File ID: `{sessionId}-{uuid}` (first two parts)

### 3. Printer Management

- **Dynamic printer discovery** via CUPS `lpstat` command
- **Printer status** monitoring (idle, printing, unknown)
- **Default printer** detection
- **Printer capabilities** query (paper sizes, color modes)
- **CUPS service status** checking

**CUPS Integration:**
- Uses command-line tools: `lp`, `lpstat`, `lpoptions`
- Validates printer names to prevent injection attacks
- Handles CUPS errors gracefully

### 4. Print Configuration

**Available Settings:**
- **Copies**: 1-99 copies
- **Color Mode**: Color or Black & White (Gray)
- **Paper Size**: A4, Letter, Legal, A3, etc. (printer-dependent)
- **Orientation**: Portrait or Landscape
- **Scaling**: 25% - 200%
- **Print Quality**: Draft, Normal, High
- **Margins**: Top, Bottom, Left, Right (in inches)

**Print Job Submission:**
- Uses CUPS `lp` command with options
- Validates all parameters before submission
- Returns CUPS job ID on success
- Deletes temporary file after successful print

### 5. PDF Preview

- **PDF.js integration** for client-side PDF rendering
- **Thumbnail generation** using poppler-utils (server-side)
- **PostScript support** via Ghostscript conversion
- Preview available before printing

### 6. Admin Features

- **User Management**: Create, read, update, delete users
- **Role Management**: Assign Admin or Regular roles
- **Password Management**: Change user passwords
- **Protection**: Cannot delete last admin user

## Security Features

1. **CSRF Protection**: All non-API routes protected with CSRF tokens
2. **Rate Limiting**: Login endpoints limited to 5 attempts per 15 minutes
3. **Input Validation**: File types, sizes, printer names validated
4. **Session Security**: HttpOnly cookies, SameSite strict, configurable secure flag
5. **Password Security**: bcrypt hashing with 10 rounds
6. **Printer Name Validation**: Prevents command injection via regex validation
7. **File Path Validation**: Prevents directory traversal attacks

## Configuration

**Main Config File** (`config/config.json`):
```json
{
  "maxFileSize": 52428800,        // 50MB in bytes
  "sessionTimeout": 86400000,     // 24 hours in milliseconds
  "uploadCleanupHours": 24,       // Hours before cleanup
  "port": 3000,                   // Server port
  "defaultPrintSettings": { ... }  // Default print options
}
```

**Session Secret**: Hardcoded in `app.js` (line 24) - **MUST BE CHANGED** for production

## API Endpoints

### Public Endpoints
- `POST /api/login` - Authenticate user (rate limited)
- `POST /api/logout` - End session

### Protected Endpoints (require authentication)
- `GET /api/printers` - List available printers
- `POST /api/upload` - Upload file
- `GET /api/upload/:fileId` - Get file info
- `GET /api/preview/:fileId` - Get file preview
- `POST /api/print` - Submit print job

### Admin Endpoints (require admin role)
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:username` - Update user
- `DELETE /api/admin/users/:username` - Delete user

### Page Routes
- `GET /` - Redirects to login or dashboard
- `GET /login` - Login page
- `GET /dashboard` - Main dashboard (protected)
- `GET /print` - Print interface (protected)
- `GET /admin/users` - User management (admin only)

## File Lifecycle

1. **Upload**: File uploaded to `uploads/temp/` with unique ID
2. **Preview**: User can preview file (if supported)
3. **Print**: User configures settings and submits print job
4. **Cleanup**: File deleted immediately after successful print
5. **Timeout**: Files older than 24 hours cleaned up automatically

## Dependencies & Compatibility

**Critical Compatibility Notes:**
- **Node.js 10.x**: Required for Raspberry Pi 1 compatibility
- **Express 4.16.4**: Last version compatible with Node 10
- **Legacy packages**: All dependencies pinned to Node 10 compatible versions
- **No modern ES6+ features**: Uses CommonJS require/module.exports

**System Dependencies:**
- CUPS (Common Unix Printing System)
- poppler-utils (`pdftoppm` command)
- Ghostscript (`gs` command)

## Deployment

### Development
```bash
npm run dev  # Uses nodemon for auto-reload
```

### Production
```bash
npm start  # Runs server.js
```

### Systemd Service
The README includes a systemd service file template for running as a system service.

## Error Handling

- **CSRF errors**: Returns 403 with JSON error
- **Authentication errors**: Redirects to login or returns 401 JSON
- **Authorization errors**: Returns 403 with error message
- **File errors**: Returns appropriate HTTP status codes
- **CUPS errors**: Catches and returns user-friendly error messages
- **404 handler**: Renders error page for unknown routes

## Known Limitations

1. **No Database**: Uses JSON file for user storage (not suitable for high concurrency)
2. **Single Server**: No clustering or load balancing support
3. **File Storage**: Temporary files stored on filesystem (no cloud storage)
4. **Session Storage**: In-memory sessions (lost on restart)
5. **Legacy Node.js**: Cannot use modern JavaScript features or packages
6. **Raspberry Pi 1**: Limited to ARMv6 architecture

## Development Workflow

1. **Create Admin**: Run `node scripts/create-admin.js` to create first admin user
2. **Start Server**: Run `npm start` or `npm run dev`
3. **Access**: Navigate to `http://localhost:3000`
4. **Login**: Use admin credentials
5. **Upload**: Upload a file via drag-and-drop
6. **Print**: Configure settings and submit print job

## Maintenance Notes

- **File Cleanup**: Automatic cleanup runs on server startup
- **User Management**: Admin users can manage accounts via web UI
- **Configuration**: Edit `config/config.json` for settings
- **Logs**: Check console output for errors and debug information
- **CUPS Status**: Monitor CUPS service status via systemctl

## Future Considerations

If upgrading from Raspberry Pi 1:
- Could upgrade to Node.js 14+ or 18+
- Could migrate to database (SQLite, PostgreSQL, etc.)
- Could add Redis for session storage
- Could implement file storage abstraction (S3, etc.)
- Could add print job history/queue management
- Could add email notifications
- Could add print job scheduling

