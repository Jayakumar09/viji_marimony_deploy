// Render deployment entry point - redirects to backend server.js
const path = require('path');

// Change to backend directory
process.chdir(path.join(__dirname, 'backend'));

// Require the actual server
require('./backend/server.js');