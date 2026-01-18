const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth').requireAuth;
const requireAdmin = require('../middleware/rbac').requireAdmin;
const userManager = require('../utils/userManager');

// List all users
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  try {
    const users = userManager.listUsers();
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Create new user
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }
    
    // Validate username
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    
    // Validate password
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    // Validate role
    if (role !== 'Admin' && role !== 'Regular') {
      return res.status(400).json({ error: 'Role must be Admin or Regular' });
    }
    
    const user = await userManager.createUser(username, password, role);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).json({ error: error.message || 'Failed to create user' });
  }
});

// Update user
router.put('/users/:username', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    const { password, role } = req.body;
    
    if (!password && !role) {
      return res.status(400).json({ error: 'At least one field (password or role) must be provided' });
    }
    
    const updates = {};
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      updates.password = password;
    }
    
    if (role) {
      if (role !== 'Admin' && role !== 'Regular') {
        return res.status(400).json({ error: 'Role must be Admin or Regular' });
      }
      updates.role = role;
    }
    
    const user = await userManager.updateUser(username, updates);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(400).json({ error: error.message || 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:username', requireAuth, requireAdmin, (req, res) => {
  try {
    const { username } = req.params;
    
    // Prevent deleting yourself
    if (username === req.session.user.username) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    userManager.deleteUser(username);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(400).json({ error: error.message || 'Failed to delete user' });
  }
});

module.exports = router;


