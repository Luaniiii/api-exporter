const path = require('path');
require('dotenv').config();


module.exports = {
    PORT: process.env.PORT || 3000,
    DATA_DIR: process.env.DATA_DIR || path.join(process.cwd(), 'data'),
    DB_PATH: process.env.DB_PATH || path.join(process.cwd(), 'data', 'database.sqlite'),
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};