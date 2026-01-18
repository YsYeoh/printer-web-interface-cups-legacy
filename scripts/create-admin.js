const userManager = require('../utils/userManager');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  console.log('=== Create Admin User ===\n');
  
  const username = await question('Username: ');
  if (!username || username.length < 3) {
    console.error('Username must be at least 3 characters');
    rl.close();
    process.exit(1);
  }
  
  const password = await question('Password: ');
  if (!password || password.length < 8) {
    console.error('Password must be at least 8 characters');
    rl.close();
    process.exit(1);
  }
  
  try {
    const user = await userManager.createUser(username, password, 'Admin');
    console.log('\n✓ Admin user created successfully!');
    console.log(`Username: ${user.username}`);
    console.log(`Role: ${user.role}`);
    rl.close();
  } catch (error) {
    console.error('\n✗ Error creating admin user:', error.message);
    rl.close();
    process.exit(1);
  }
}

createAdmin();


