#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up AI Dungeon Master Backend...\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 16) {
  console.error('❌ Node.js version 16 or higher is required');
  console.error(`   Current version: ${nodeVersion}`);
  process.exit(1);
}

console.log(`✅ Node.js version: ${nodeVersion}`);

// Create necessary directories
const directories = [
  'server/logs',
  'server/dist',
  'server/node_modules'
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Copy environment file if it doesn't exist
const envPath = 'server/.env';
const envExamplePath = 'server/.env.example';

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('📄 Created .env file from .env.example');
  console.log('⚠️  Please update the .env file with your configuration');
}

// Install server dependencies
console.log('\n📦 Installing server dependencies...');
try {
  execSync('npm install', { 
    cwd: 'server', 
    stdio: 'inherit' 
  });
  console.log('✅ Server dependencies installed');
} catch (error) {
  console.error('❌ Failed to install server dependencies');
  console.error(error.message);
  process.exit(1);
}

// Install client dependencies for socket.io-client
console.log('\n📦 Installing client WebSocket dependencies...');
try {
  execSync('npm install socket.io-client', { 
    stdio: 'inherit' 
  });
  console.log('✅ Client WebSocket dependencies installed');
} catch (error) {
  console.error('❌ Failed to install client dependencies');
  console.error(error.message);
  process.exit(1);
}

// Check for required services
console.log('\n🔍 Checking required services...');

// Check MongoDB
try {
  execSync('mongod --version', { stdio: 'pipe' });
  console.log('✅ MongoDB is available');
} catch (error) {
  console.log('⚠️  MongoDB not found - please install MongoDB');
  console.log('   Visit: https://docs.mongodb.com/manual/installation/');
}

// Check Redis
try {
  execSync('redis-server --version', { stdio: 'pipe' });
  console.log('✅ Redis is available');
} catch (error) {
  console.log('⚠️  Redis not found - please install Redis');
  console.log('   Visit: https://redis.io/download');
}

console.log('\n🎉 Backend setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Update server/.env with your configuration');
console.log('2. Start MongoDB: mongod');
console.log('3. Start Redis: redis-server');
console.log('4. Start the backend server: npm run server:dev');
console.log('5. Start the frontend: npm run dev');
console.log('\n🎮 Happy gaming!');