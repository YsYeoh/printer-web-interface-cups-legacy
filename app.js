const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const csurf = require('csurf');
const rateLimit = require('express-rate-limit');
const config = require('./config/config.json');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: 'cups-web-interface-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Set to true if using HTTPS
    maxAge: config.sessionTimeout,
    sameSite: 'strict'
  }
}));

// CSRF protection (skip for API routes)
// csurf works with sessions by default, no need for cookie option
const csrfProtection = csurf();
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  csrfProtection(req, res, next);
});

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later.'
});

// Routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const printRoutes = require('./routes/print');
const printersRoutes = require('./routes/printers');
const adminRoutes = require('./routes/admin');
const previewRoutes = require('./routes/preview');

// Public routes
app.post('/api/login', authLimiter, authRoutes.login);
app.post('/api/logout', authRoutes.logout);

// Protected routes (will be added after auth middleware)
app.use('/api/upload', uploadRoutes);
app.use('/api/print', printRoutes);
app.use('/api/printers', printersRoutes);
app.use('/api/preview', previewRoutes);
app.use('/api/admin', adminRoutes);

// Page routes
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { csrfToken: req.csrfToken(), error: null });
});

app.get('/dashboard', require('./middleware/auth').requireAuth, (req, res) => {
  res.render('dashboard', { 
    user: req.session.user,
    csrfToken: req.csrfToken() 
  });
});

app.get('/print', require('./middleware/auth').requireAuth, (req, res) => {
  res.render('print', { 
    user: req.session.user,
    csrfToken: req.csrfToken(),
    fullscreen: true
  });
});

app.get('/admin/users', require('./middleware/auth').requireAuth, require('./middleware/rbac').requireAdmin, (req, res) => {
  res.render('admin/users', { 
    user: req.session.user,
    csrfToken: req.csrfToken() 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }
  console.error(err.stack);
  res.status(500).render('error', { 
    error: err.message,
    user: req.session.user || null
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { 
    error: 'Page not found',
    user: req.session.user || null
  });
});

module.exports = app;

