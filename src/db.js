const Database = require('better-sqlite3');
const config = require('./config');
const fs = require('fs');


// Ensure DB folder exists
const dbDir = require('path').dirname(config.DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });


const db = new Database(config.DB_PATH);


// Initialize tables if not present
db.exec(`
CREATE TABLE IF NOT EXISTS endpoints (
id TEXT PRIMARY KEY,
name TEXT,
url TEXT,
method TEXT,
headers TEXT,
schedule TEXT,
saveFormat TEXT,
savePath TEXT,
notifyOnChange INTEGER DEFAULT 0,
maxFileAgeDays INTEGER,
createdAt TEXT
);


CREATE TABLE IF NOT EXISTS logs (
id TEXT PRIMARY KEY,
endpointId TEXT,
status TEXT,
filePath TEXT,
runTime TEXT,
diffDetected INTEGER DEFAULT 0,
errorMessage TEXT
);
`);


module.exports = db;