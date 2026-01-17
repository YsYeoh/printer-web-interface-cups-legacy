const express = require('express');
const router = express.Router();
const userManager = require('../utils/userManager');

// Login endpoint
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const user = await userManager.authenticateUser(username, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    req.session.user = user;
    res.json({ success: true, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout endpoint
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
};

module.exports = {
  login,
  logout
};

