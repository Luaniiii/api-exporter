const path = require('path');
const fs = require('fs');
const models = require('../models');
const { fetchEndpoint } = require('../services/fetcher');
const { writeJSON, writeCSV } = require('../services/fileWriter');


function hashString(str) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(str).digest('hex');
}


// Extract array from nested object for CSV export
function extractArrayForCSV(data) {
    // If already an array, return it
    if (Array.isArray(data)) {
        return data;
    }
    
    // If it's an object, try to find an array property
    if (typeof data === 'object' && data !== null) {
        // Common property names that contain arrays
        const arrayKeys = ['data', 'results', 'items', 'records', 'list', 'array', 'values'];
        
        for (const key of arrayKeys) {
            if (Array.isArray(data[key])) {
                return data[key];
            }
        }
        
        // If no array found, check all values
        for (const key in data) {
            if (Array.isArray(data[key])) {
                return data[key];
            }
        }
        
        // If it's a single object, convert to array with one item
        // Flatten nested objects for CSV
        return [flattenObject(data)];
    }
    
    // Fallback: wrap in array
    return [data];
}


// Flatten nested objects for CSV (handles objects like { id: 1, attributes: { name: 'test' } })
function flattenObject(obj, prefix = '', result = {}) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                // Recursively flatten nested objects
                flattenObject(obj[key], newKey, result);
            } else {
                // For arrays, convert to JSON string for CSV
                if (Array.isArray(obj[key])) {
                    result[newKey] = JSON.stringify(obj[key]);
                } else {
                    result[newKey] = obj[key];
                }
            }
        }
    }
    return result;
}


async function runJob(endpoint) {
    try {
        const data = await fetchEndpoint(endpoint);
        const saveDir = path.isAbsolute(endpoint.savePath) ? endpoint.savePath : path.join(process.cwd(), endpoint.savePath || 'data');
        const baseName = (endpoint.name || 'endpoint').replace(/[^a-z0-9-_]/gi, '_').toLowerCase();


// Determine format
        let filePath;
        if (endpoint.saveFormat === 'csv') {
            try {
                const arrayData = extractArrayForCSV(data);
                filePath = await writeCSV(saveDir, baseName, arrayData);
            } catch (csvError) {
                // If CSV export fails, fallback to JSON
                console.warn(`CSV export failed for ${endpoint.name}, falling back to JSON:`, csvError.message);
                filePath = await writeJSON(saveDir, baseName, data);
            }
        } else {
            filePath = await writeJSON(saveDir, baseName, data);
        }


// Diff detection: compare hash of latest file vs previous run for same endpoint
        const previous = models.getLogsForEndpoint(endpoint.id).find(l => l.filePath);
        let diffDetected = false;
        if (previous && previous.filePath && fs.existsSync(previous.filePath)) {
            const prev = await fs.promises.readFile(previous.filePath, 'utf8');
            const curr = await fs.promises.readFile(filePath, 'utf8');
            diffDetected = hashString(prev) !== hashString(curr);
        } else {
            diffDetected = true; // first run
        }


        const log = models.createLog({ endpointId: endpoint.id, status: 'success', filePath, diffDetected });
        return { ok: true, log };
    } catch (err) {
        const log = models.createLog({ endpointId: endpoint.id, status: 'error', errorMessage: err.message });
        return { ok: false, error: err.message, log };
    }
}


module.exports = { runJob };