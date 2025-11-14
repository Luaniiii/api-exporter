const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const models = require('../models');
const runner = require('../jobs/runner');
const config = require('../config');
const scheduler = require('../jobs/scheduler');

// Get all endpoints
router.get('/endpoints', (req, res) => {
    try {
        const endpoints = models.getAllEndpoints();
        res.json({ ok: true, endpoints });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Get files for endpoint
router.get('/endpoints/:id/files', (req, res) => {
    try {
        const endpoint = models.getEndpointById(req.params.id);
        if (!endpoint) return res.status(404).json({ ok: false, error: 'Endpoint not found' });
        
        // Get all logs with file paths for this endpoint
        const logs = models.getLogsForEndpoint(req.params.id);
        const files = logs
            .filter(log => log.filePath && log.status === 'success')
            .map(log => {
                const filePath = log.filePath;
                const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
                return {
                    path: filePath,
                    name: path.basename(filePath),
                    size: stats ? stats.size : 0,
                    created: stats ? stats.birthtime.toISOString() : log.runTime,
                    runTime: log.runTime,
                    diffDetected: log.diffDetected === 1
                };
            })
            .filter(file => fs.existsSync(file.path))
            .sort((a, b) => new Date(b.runTime) - new Date(a.runTime));
        
        res.json({ ok: true, files });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Get trend data for endpoint
router.get('/endpoints/:id/trends', (req, res) => {
    try {
        const endpoint = models.getEndpointById(req.params.id);
        if (!endpoint) return res.status(404).json({ ok: false, error: 'Endpoint not found' });
        
        // Get all logs with file paths for this endpoint
        const logs = models.getLogsForEndpoint(req.params.id);
        const files = logs
            .filter(log => log.filePath && log.status === 'success')
            .map(log => {
                const filePath = log.filePath;
                if (!fs.existsSync(filePath)) return null;
                
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    let parsedData = null;
                    
                    if (filePath.endsWith('.json')) {
                        parsedData = JSON.parse(content);
                    } else if (filePath.endsWith('.csv')) {
                        // Simple CSV parsing - get first numeric column
                        const lines = content.split('\n').filter(l => l.trim());
                        if (lines.length > 1) {
                            const headers = lines[0].split(',');
                            parsedData = { csv: { headers, rows: lines.slice(1).map(l => l.split(',')) } };
                        }
                    }
                    
                    return {
                        path: filePath,
                        name: path.basename(filePath),
                        runTime: log.runTime,
                        content: parsedData,
                        rawContent: content
                    };
                } catch (err) {
                    console.error(`Error reading file ${filePath}:`, err.message);
                    return null;
                }
            })
            .filter(file => file !== null)
            .sort((a, b) => new Date(a.runTime) - new Date(b.runTime));
        
        res.json({ ok: true, files, endpoint });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Get logs for endpoint
router.get('/endpoints/:id/logs', (req, res) => {
    try {
        const logs = models.getLogsForEndpoint(req.params.id);
        res.json({ ok: true, logs });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Download all files for an endpoint as ZIP
router.get('/endpoints/:id/download-all', (req, res) => {
    try {
        const endpoint = models.getEndpointById(req.params.id);
        if (!endpoint) return res.status(404).json({ ok: false, error: 'Endpoint not found' });
        
        // Get all logs with file paths for this endpoint
        const logs = models.getLogsForEndpoint(req.params.id);
        const files = logs
            .filter(log => log.filePath && log.status === 'success')
            .map(log => log.filePath)
            .filter(filePath => fs.existsSync(filePath));
        
        if (files.length === 0) {
            return res.status(404).json({ ok: false, error: 'No files found for this endpoint' });
        }
        
        const zipFileName = `${endpoint.name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase()}-all-files.zip`;
        res.setHeader('Content-Type', 'application/zip');
        const encodedFileName = encodeURIComponent(zipFileName);
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"; filename*=UTF-8''${encodedFileName}`);
        
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        archive.on('error', (err) => {
            console.error('Archive error:', err);
            if (!res.headersSent) {
                res.status(500).json({ ok: false, error: 'Failed to create archive' });
            }
        });
        
        archive.pipe(res);
        
        files.forEach((filePath) => {
            const fileName = path.basename(filePath);
            archive.file(filePath, { name: fileName });
        });
        
        archive.finalize();
    } catch (err) {
        console.error('Download all files error:', err);
        if (!res.headersSent) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
});

// Download aggregated data file
router.get('/endpoints/:id/aggregate', (req, res) => {
    try {
        const endpoint = models.getEndpointById(req.params.id);
        if (!endpoint) return res.status(404).json({ ok: false, error: 'Endpoint not found' });
        
        const fieldsParam = req.query.fields || req.query.field || '';
        const fieldsToExtract = fieldsParam ? fieldsParam.split(',').map(f => f.trim()).filter(f => f) : null;
        const format = req.query.format || 'json';
        
        const logs = models.getLogsForEndpoint(req.params.id);
        const files = logs
            .filter(log => log.filePath && log.status === 'success')
            .map(log => ({ path: log.filePath, runTime: log.runTime }))
            .filter(file => fs.existsSync(file.path))
            .sort((a, b) => new Date(a.runTime) - new Date(b.runTime));
        
        if (files.length === 0) {
            return res.status(404).json({ ok: false, error: 'No files found for this endpoint' });
        }
        
        const aggregatedData = [];
        
        files.forEach((file) => {
            try {
                const content = fs.readFileSync(file.path, 'utf8');
                let data = null;
                
                if (file.path.endsWith('.json')) {
                    data = JSON.parse(content);
                } else if (file.path.endsWith('.csv')) {
                    const lines = content.split('\n').filter(l => l.trim());
                    if (lines.length > 1) {
                        const headers = lines[0].split(',').map(h => h.trim());
                        data = lines.slice(1).map(line => {
                            const values = line.split(',').map(v => v.trim());
                            const obj = {};
                            headers.forEach((header, idx) => {
                                obj[header] = values[idx] || '';
                            });
                            return obj;
                        });
                    }
                }
                
                if (data) {
                    const items = Array.isArray(data) ? data : [data];
                    
                    items.forEach(item => {
                        if (typeof item === 'object' && item !== null) {
                            const extracted = {};
                            
                            if (fieldsToExtract && fieldsToExtract.length > 0) {
                                fieldsToExtract.forEach(field => {
                                    if (item.hasOwnProperty(field)) {
                                        extracted[field] = item[field];
                                    }
                                });
                            } else {
                                Object.assign(extracted, item);
                            }
                            
                            extracted._fileTime = file.runTime;
                            extracted._fileName = path.basename(file.path);
                            
                            aggregatedData.push(extracted);
                        }
                    });
                }
            } catch (err) {
                console.error(`Error processing file ${file.path}:`, err.message);
            }
        });
        
        if (aggregatedData.length === 0) {
            return res.status(400).json({ ok: false, error: 'No data could be extracted from files' });
        }
        
        const baseName = endpoint.name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const extension = format === 'csv' ? 'csv' : 'json';
        const fileName = `${baseName}-aggregated-${timestamp}.${extension}`;
        
        const encodedFileName = encodeURIComponent(fileName);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`);
        
        if (format === 'csv') {
            if (aggregatedData.length === 0) {
                return res.status(400).json({ ok: false, error: 'No data to export' });
            }
            
            const flattenedData = aggregatedData.map(item => flattenObject(item));
            
            const allKeys = new Set();
            flattenedData.forEach(item => {
                Object.keys(item).forEach(key => allKeys.add(key));
            });
            const headers = Array.from(allKeys).sort();
            
            let csvContent = headers.join(',') + '\n';
            flattenedData.forEach(item => {
                const row = headers.map(header => {
                    const value = item[header] !== undefined && item[header] !== null ? item[header] : '';
                    let stringValue;
                    if (typeof value === 'object') {
                        stringValue = JSON.stringify(value);
                    } else {
                        stringValue = String(value);
                    }
                    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                        return `"${stringValue.replace(/"/g, '""')}"`;
                    }
                    return stringValue;
                });
                csvContent += row.join(',') + '\n';
            });
            
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.send(csvContent);
        } else {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.send(JSON.stringify(aggregatedData, null, 2));
        }
    } catch (err) {
        console.error('Aggregate data error:', err);
        if (!res.headersSent) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
});

// Get single endpoint
router.get('/endpoints/:id', (req, res) => {
    try {
        const endpoint = models.getEndpointById(req.params.id);
        if (!endpoint) return res.status(404).json({ ok: false, error: 'Endpoint not found' });
        res.json({ ok: true, endpoint });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Create endpoint
router.post('/endpoints', async (req, res) => {
    try {
        const { name, url, method, headers, schedule, saveFormat, savePath, notifyOnChange, maxFileAgeDays } = req.body;
        if (!name || !url) {
            return res.status(400).json({ ok: false, error: 'name and url are required' });
        }
        const endpoint = models.createEndpoint({ name, url, method, headers, schedule, saveFormat, savePath, notifyOnChange, maxFileAgeDays });
        res.status(201).json({ ok: true, endpoint });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Update endpoint
router.put('/endpoints/:id', (req, res) => {
    try {
        const { name, url, method, headers, schedule, saveFormat, savePath, notifyOnChange, maxFileAgeDays } = req.body;
        if (!name || !url) {
            return res.status(400).json({ ok: false, error: 'name and url are required' });
        }
        
        const endpointId = req.params.id;
        console.log('Updating endpoint:', endpointId, { name, url, method, schedule, saveFormat, maxFileAgeDays });
        
        const endpoint = models.updateEndpoint(endpointId, { 
            name, 
            url, 
            method, 
            headers: headers || {}, 
            schedule, 
            saveFormat, 
            savePath, 
            notifyOnChange,
            maxFileAgeDays
        });
        
        if (!endpoint) {
            console.error('Endpoint not found or update failed:', endpointId);
            return res.status(404).json({ ok: false, error: 'Endpoint not found or update failed' });
        }
        
        console.log('Endpoint updated successfully:', endpoint.id);
        
        // Restart scheduler to pick up the changes
        scheduler.start();
        res.json({ ok: true, endpoint });
    } catch (err) {
        console.error('Update endpoint error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Delete endpoint
router.delete('/endpoints/:id', (req, res) => {
    try {
        models.deleteEndpoint(req.params.id);
        res.json({ ok: true, message: 'Endpoint deleted' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Trigger manual run
router.post('/endpoints/:id/run', async (req, res) => {
    try {
        const endpoint = models.getEndpointById(req.params.id);
        if (!endpoint) return res.status(404).json({ ok: false, error: 'Endpoint not found' });
        const result = await runner.runJob(endpoint);
        res.json(result);
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Get file content
router.get('/files/content', (req, res) => {
    try {
        let filePath = req.query.path;
        if (!filePath) {
            return res.status(400).json({ ok: false, error: 'File path is required' });
        }
        
        try {
            filePath = decodeURIComponent(filePath);
            if (filePath.includes('%')) {
                filePath = decodeURIComponent(filePath);
            }
        } catch (e) {
            // use as-is
        }
        
        const resolvedPath = path.resolve(filePath);
        const dataDir = path.resolve(config.DATA_DIR);
        const projectRoot = path.resolve(process.cwd());
        
        if (!resolvedPath.startsWith(dataDir) && !resolvedPath.startsWith(projectRoot)) {
            return res.status(403).json({ ok: false, error: 'Access denied' });
        }
        
        if (!fs.existsSync(resolvedPath)) {
            return res.status(404).json({ ok: false, error: 'File not found' });
        }
        
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
        const fileName = path.basename(resolvedPath);
        const isJSON = fileName.endsWith('.json');
        const isCSV = fileName.endsWith('.csv');
        
        let parsedContent = fileContent;
        let contentType = 'text/plain';
        
        if (isJSON) {
            try {
                parsedContent = JSON.parse(fileContent);
                contentType = 'application/json';
            } catch (e) {
                // If JSON parsing fails, return raw content
            }
        }
        
        res.json({ 
            ok: true, 
            content: parsedContent,
            rawContent: fileContent,
            fileName,
            isJSON,
            isCSV,
            contentType
        });
    } catch (err) {
        console.error('Get file content error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Compare two files
router.get('/files/compare', (req, res) => {
    try {
        let filePath1 = req.query.path1;
        let filePath2 = req.query.path2;
        
        if (!filePath1 || !filePath2) {
            return res.status(400).json({ ok: false, error: 'Both file paths are required' });
        }
        
        try {
            filePath1 = decodeURIComponent(filePath1);
            filePath2 = decodeURIComponent(filePath2);
            if (filePath1.includes('%')) {
                filePath1 = decodeURIComponent(filePath1);
            }
            if (filePath2.includes('%')) {
                filePath2 = decodeURIComponent(filePath2);
            }
        } catch (e) {
            // use as-is
        }
        
        const resolvedPath1 = path.resolve(filePath1);
        const resolvedPath2 = path.resolve(filePath2);
        const dataDir = path.resolve(config.DATA_DIR);
        const projectRoot = path.resolve(process.cwd());
        
        if ((!resolvedPath1.startsWith(dataDir) && !resolvedPath1.startsWith(projectRoot)) ||
            (!resolvedPath2.startsWith(dataDir) && !resolvedPath2.startsWith(projectRoot))) {
            return res.status(403).json({ ok: false, error: 'Access denied' });
        }
        
        if (!fs.existsSync(resolvedPath1) || !fs.existsSync(resolvedPath2)) {
            return res.status(404).json({ ok: false, error: 'One or both files not found' });
        }
        
        const content1 = fs.readFileSync(resolvedPath1, 'utf8');
        const content2 = fs.readFileSync(resolvedPath2, 'utf8');
        
        const diff = computeDiff(content1, content2);
        
        res.json({ 
            ok: true, 
            diff,
            file1: { path: filePath1, name: path.basename(filePath1), content: content1 },
            file2: { path: filePath2, name: path.basename(filePath2), content: content2 }
        });
    } catch (err) {
        console.error('Compare files error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

function flattenObject(obj, prefix = '', result = {}) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];
            
            if (value === null || value === undefined) {
                result[newKey] = '';
            } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                // Recursively flatten nested objects
                flattenObject(value, newKey, result);
            } else {
                // Keep arrays and primitives as-is (will be JSON stringified in CSV)
                result[newKey] = value;
            }
        }
    }
    return result;
}

function computeDiff(text1, text2) {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    const diff = [];
    const maxLen = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLen; i++) {
        const line1 = lines1[i] || '';
        const line2 = lines2[i] || '';
        
        if (line1 === line2) {
            diff.push({ type: 'unchanged', line: i + 1, content: line1 });
        } else if (!line1) {
            diff.push({ type: 'added', line: i + 1, content: line2 });
        } else if (!line2) {
            diff.push({ type: 'removed', line: i + 1, content: line1 });
        } else {
            diff.push({ type: 'removed', line: i + 1, content: line1 });
            diff.push({ type: 'added', line: i + 1, content: line2 });
        }
    }
    
    return diff;
}

// Download file
router.get('/files/download', (req, res) => {
    try {
        let filePath = req.query.path;
        if (!filePath) {
            return res.status(400).json({ ok: false, error: 'File path is required' });
        }
        
        filePath = decodeURIComponent(filePath);
        
        const resolvedPath = path.resolve(filePath);
        const dataDir = path.resolve(config.DATA_DIR);
        const projectRoot = path.resolve(process.cwd());
        
        if (!resolvedPath.startsWith(dataDir) && !resolvedPath.startsWith(projectRoot)) {
            console.error('Access denied:', { resolvedPath, dataDir, projectRoot });
            return res.status(403).json({ ok: false, error: 'Access denied' });
        }
        
        if (!fs.existsSync(resolvedPath)) {
            console.error('File not found:', resolvedPath);
            return res.status(404).json({ ok: false, error: 'File not found' });
        }
        
        const fileName = path.basename(resolvedPath);
        
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        
        res.download(resolvedPath, fileName, (err) => {
            if (err) {
                console.error('Download error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ ok: false, error: 'Failed to download file' });
                }
            }
        });
    } catch (err) {
        console.error('Download route error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
