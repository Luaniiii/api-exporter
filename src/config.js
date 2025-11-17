const path = require('path');
require('dotenv').config();

// Construct app URL from environment or default to localhost
const getAppUrl = () => {
    if (process.env.APP_URL) {
        return process.env.APP_URL;
    }
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || 'localhost';
    return `http://${host}:${port}`;
};

module.exports = {
    PORT: process.env.PORT || 3000,
    DATA_DIR: process.env.DATA_DIR || path.join(process.cwd(), 'data'),
    DB_PATH: process.env.DB_PATH || path.join(process.cwd(), 'data', 'database.sqlite'),
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    APP_URL: getAppUrl()
};