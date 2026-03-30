// Render deployment - redirect to backend
// This file is required by Render's default start command
// Actual server runs from backend/server.js via render.yaml startCommand

const path = require('path');

// Change to backend directory
process.chdir(path.join(__dirname, 'backend'));

// Start the backend server
require('./server.js');