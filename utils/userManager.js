const jsonfile = require('jsonfile');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, '../config/users.json');
const USERS_TEMP_FILE = path.join(__dirname, '../config/users.json.tmp');

// Ensure users.json exists
if (!fs.existsSync(USERS_FILE)) {
  jsonfile.writeFileSync(USERS_FILE, { users: [] });
}

// Read users from JSON file
const readUsers = () => {
  try {
    const data = jsonfile.readFileSync(USERS_FILE);
    return data.users || [];
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

// Write users to JSON file atomically
const writeUsers = (users) => {
  try {
    // Write to temp file first
    jsonfile.writeFileSync(USERS_TEMP_FILE, { users }, { spaces: 2 });
    // Atomic rename
    fs.renameSync(USERS_TEMP_FILE, USERS_FILE);
    return true;
  } catch (error) {
    console.error('Error writing users file:', error);
    // Clean up temp file if rename failed
    if (fs.existsSync(USERS_TEMP_FILE)) {
      fs.unlinkSync(USERS_TEMP_FILE);
    }
    return false;
  }
};

// Find user by username
const findUser = (username) => {
  const users = readUsers();
  return users.find(u => u.username === username);
};

// Authenticate user
const authenticateUser = async (username, password) => {
  const user = findUser(username);
  if (!user) {
    return null;
  }
  
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }
  
  // Return user without password hash
  return {
    username: user.username,
    role: user.role,
    createdAt: user.createdAt
  };
};

// Create new user
const createUser = async (username, password, role) => {
  const users = readUsers();
  
  // Check if user already exists
  if (users.find(u => u.username === username)) {
    throw new Error('Username already exists');
  }
  
  // Validate role
  if (role !== 'Admin' && role !== 'Regular') {
    throw new Error('Invalid role. Must be Admin or Regular');
  }
  
  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Create user object
  const newUser = {
    username,
    passwordHash,
    role,
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  
  if (!writeUsers(users)) {
    throw new Error('Failed to save user');
  }
  
  return {
    username: newUser.username,
    role: newUser.role,
    createdAt: newUser.createdAt
  };
};

// Update user
const updateUser = async (username, updates) => {
  const users = readUsers();
  const userIndex = users.findIndex(u => u.username === username);
  
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  // Update password if provided
  if (updates.password) {
    users[userIndex].passwordHash = await bcrypt.hash(updates.password, 10);
  }
  
  // Update role if provided
  if (updates.role) {
    if (updates.role !== 'Admin' && updates.role !== 'Regular') {
      throw new Error('Invalid role. Must be Admin or Regular');
    }
    users[userIndex].role = updates.role;
  }
  
  if (!writeUsers(users)) {
    throw new Error('Failed to update user');
  }
  
  return {
    username: users[userIndex].username,
    role: users[userIndex].role,
    createdAt: users[userIndex].createdAt
  };
};

// Delete user
const deleteUser = (username) => {
  const users = readUsers();
  const filteredUsers = users.filter(u => u.username !== username);
  
  if (filteredUsers.length === users.length) {
    throw new Error('User not found');
  }
  
  // Check if this is the last admin
  const adminCount = filteredUsers.filter(u => u.role === 'Admin').length;
  if (adminCount === 0) {
    throw new Error('Cannot delete last admin user');
  }
  
  if (!writeUsers(filteredUsers)) {
    throw new Error('Failed to delete user');
  }
  
  return true;
};

// List all users (without password hashes)
const listUsers = () => {
  const users = readUsers();
  return users.map(u => ({
    username: u.username,
    role: u.role,
    createdAt: u.createdAt
  }));
};

// Count admins
const countAdmins = () => {
  const users = readUsers();
  return users.filter(u => u.role === 'Admin').length;
};

module.exports = {
  findUser,
  authenticateUser,
  createUser,
  updateUser,
  deleteUser,
  listUsers,
  countAdmins
};


