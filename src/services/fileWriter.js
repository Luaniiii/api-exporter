const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');


function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}


function isoFilename(prefix = '') {
    return new Date().toISOString().replace(/[:.]/g, '-') + (prefix ? `-${prefix}` : '');
}


async function writeJSON(saveDir, baseName, data) {
    ensureDir(saveDir);
    const filename = path.join(saveDir, `${baseName}-${isoFilename()}.json`);
    await fs.promises.writeFile(filename, JSON.stringify(data, null, 2), 'utf8');
    return filename;
}


async function writeCSV(saveDir, baseName, data) {
    ensureDir(saveDir);
    if (!Array.isArray(data)) throw new Error('CSV export expects array data');
    if (data.length === 0) {
        const emptyF = path.join(saveDir, `${baseName}-${isoFilename()}.csv`);
        await fs.promises.writeFile(emptyF, '');
        return emptyF;
    }
    
    // Collect all possible keys from all objects to handle varying structures
    const allKeys = new Set();
    data.forEach(item => {
        if (typeof item === 'object' && item !== null) {
            Object.keys(item).forEach(key => allKeys.add(key));
        }
    });
    
    // Convert Set to sorted array for consistent column order
    const header = Array.from(allKeys).sort().map(k => ({ id: k, title: k }));
    const filename = path.join(saveDir, `${baseName}-${isoFilename()}.csv`);
    const csvWriter = createObjectCsvWriter({ path: filename, header });
    await csvWriter.writeRecords(data);
    return filename;
}


module.exports = { writeJSON, writeCSV };