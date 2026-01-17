const requireAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'Admin') {
    return next();
  }
  
  if (req.path.startsWith('/api/')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  res.status(403).render('error', { 
    error: 'Access denied. Admin privileges required.',
    user: req.session.user || null
  });
};

module.exports = {
  requireAdmin
};

