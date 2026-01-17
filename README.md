# CUPS Web Interface

A modern web interface for managing and printing documents through CUPS (Common Unix Printing System), designed for Raspberry Pi 1 with Node.js 10 compatibility.

## Features

- **Authentication System**: Secure login with role-based access control (Admin/Regular users)
- **File Upload**: Drag-and-drop file upload supporting PDF, images, and PostScript files
- **Printer Management**: List and select available CUPS printers
- **Print Configuration**: Advanced print settings including:
  - Copies
  - Color mode (Color/Black & White)
  - Paper size (A4, Letter, Legal, etc.)
  - Orientation (Portrait/Landscape)
  - Scaling (25% - 200%)
  - Print quality (Draft/Normal/High)
  - Margins
- **PDF Preview**: Preview PDF files before printing
- **Account Management**: Admin users can create, edit, and delete user accounts
- **No Database**: Simple JSON-based authentication configuration

## Requirements

- Node.js 10.x
- CUPS installed and configured
- poppler-utils (for PDF preview thumbnails)
- Ghostscript (for PostScript conversion)

## Installation

### 1. Install System Dependencies

On Debian/Ubuntu/Raspbian:
```bash
sudo apt-get update
sudo apt-get install cups cups-client poppler-utils ghostscript
```

### 2. Install Node.js 10

For Raspberry Pi 1, you may need to compile Node.js 10 from source or use a pre-built binary:
```bash
# Download Node.js 10.x binary for ARMv6
wget https://nodejs.org/dist/v10.24.1/node-v10.24.1-linux-armv6l.tar.xz
tar -xf node-v10.24.1-linux-armv6l.tar.xz
sudo cp -r node-v10.24.1-linux-armv6l/* /usr/local/
```

### 3. Install Application Dependencies

```bash
npm install
```

### 4. Configure CUPS

Ensure CUPS is running and printers are configured:
```bash
sudo systemctl start cups
sudo systemctl enable cups
```

### 5. Create Initial Admin User

```bash
node scripts/create-admin.js
```

Follow the prompts to create your first admin user.

### 6. Start the Application

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Configuration

Edit `config/config.json` to customize:
- Port number
- Maximum file size
- Session timeout
- Default print settings
- Upload cleanup interval

## Security Notes

- Change the session secret in `app.js` before deploying to production
- Enable HTTPS and set `secure: true` in session cookie configuration for production
- The application uses CSRF protection, rate limiting, and input validation
- User passwords are hashed using bcryptjs

## Project Structure

```
printer-web-interface-cups-legacy/
├── config/              # Configuration files
├── routes/              # API route handlers
├── middleware/          # Authentication and RBAC middleware
├── utils/               # Utility functions
├── views/               # EJS templates
├── public/              # Static assets (CSS, JS)
├── uploads/             # Uploaded files (gitignored)
├── previews/            # Generated previews (gitignored)
├── app.js               # Express application
└── server.js            # Server entry point
```

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/login` | Public | Authenticate user |
| POST | `/api/logout` | User | End session |
| GET | `/api/printers` | User | List available printers |
| POST | `/api/upload` | User | Upload file |
| GET | `/api/preview/:fileId` | User | Get file preview |
| POST | `/api/print` | User | Submit print job |
| GET | `/api/admin/users` | Admin | List users |
| POST | `/api/admin/users` | Admin | Create user |
| PUT | `/api/admin/users/:username` | Admin | Update user |
| DELETE | `/api/admin/users/:username` | Admin | Delete user |

## Deployment

### Systemd Service

Create `/etc/systemd/system/cups-web-interface.service`:

```ini
[Unit]
Description=CUPS Web Interface
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/path/to/printer-web-interface-cups-legacy
ExecStart=/usr/local/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable cups-web-interface
sudo systemctl start cups-web-interface
```

## Troubleshooting

### Printers not showing up
- Ensure CUPS is running: `sudo systemctl status cups`
- Check printer status: `lpstat -p`
- Verify CUPS web interface is accessible: `http://localhost:631`

### File upload fails
- Check file size limits in `config/config.json`
- Verify uploads directory permissions
- Check disk space

### Preview not working
- Ensure poppler-utils is installed: `which pdftoppm`
- For PostScript, ensure Ghostscript is installed: `which gs`

## License

MIT
