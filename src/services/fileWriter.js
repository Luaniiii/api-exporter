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


function flattenObject(obj, prefix = '', result = {}) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];
            
            if (value === null || value === undefined) {
                result[newKey] = '';
            } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                flattenObject(value, newKey, result);
            } else {
                result[newKey] = value;
            }
        }
    }
    return result;
}

async function writeCSV(saveDir, baseName, data) {
    ensureDir(saveDir);
    if (!Array.isArray(data)) throw new Error('CSV export expects array data');
    if (data.length === 0) {
        const emptyF = path.join(saveDir, `${baseName}-${isoFilename()}.csv`);
        await fs.promises.writeFile(emptyF, '');
        return emptyF;
    }
    
    const isPrimitiveArray = data.every(item => {
        if (item === null || item === undefined) return true;
        if (Array.isArray(item)) return true;
        return typeof item !== 'object';
    });
    
    let processedData;
    let header;
    
    if (isPrimitiveArray) {
        processedData = data.map((item, index) => {
            const processed = { index: index + 1 };
            if (item === null || item === undefined) {
                processed.value = '';
            } else if (typeof item === 'object' && Array.isArray(item)) {
                processed.value = JSON.stringify(item);
            } else {
                processed.value = String(item);
            }
            return processed;
        });
        header = [
            { id: 'index', title: 'index' },
            { id: 'value', title: 'value' }
        ];
    } else {
        const flattenedData = data.map(item => {
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                return flattenObject(item);
            }
            return { value: item };
        });
        
        const allKeys = new Set();
        flattenedData.forEach(item => {
            if (typeof item === 'object' && item !== null) {
                Object.keys(item).forEach(key => allKeys.add(key));
            }
        });
        
        header = Array.from(allKeys).sort().map(k => ({ id: k, title: k }));
        
        processedData = flattenedData.map(item => {
            const processed = {};
            for (const key in item) {
                const value = item[key];
                if (value === null || value === undefined) {
                    processed[key] = '';
                } else if (typeof value === 'object') {
                    processed[key] = JSON.stringify(value);
                } else {
                    processed[key] = value;
                }
            }
            return processed;
        });
    }
    
    const filename = path.join(saveDir, `${baseName}-${isoFilename()}.csv`);
    const csvWriter = createObjectCsvWriter({ path: filename, header });
    await csvWriter.writeRecords(processedData);
    return filename;
}


module.exports = { writeJSON, writeCSV };