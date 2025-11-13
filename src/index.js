const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');


const config = require('./config');
const db = require('./db');
const apiRoutes = require('./routes/apiRoutes');
const scheduler = require('./jobs/scheduler');


const app = express();
app.use(bodyParser.json());
app.use(morgan('dev'));


// Ensure data directory exists
if (!fs.existsSync(config.DATA_DIR)) fs.mkdirSync(config.DATA_DIR, { recursive: true });


// API routes - register before static files to ensure they're matched first
app.use('/api', apiRoutes);


// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));


// Serve frontend on root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


const server = app.listen(config.PORT, () => {
    console.log(`API Exporter listening on port ${config.PORT}`);
    scheduler.start();
});


process.on('SIGINT', () => {
    console.log('Shutting down...');
    scheduler.stop();
    server.close(() => process.exit(0));
});