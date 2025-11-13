const db = require('./db');
const { v4: uuidv4 } = require('uuid');


module.exports = {
    createEndpoint(endpoint) {
        const id = uuidv4();
        const stmt = db.prepare(`INSERT INTO endpoints (id,name,url,method,headers,schedule,saveFormat,savePath,notifyOnChange,maxFileAgeDays,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
        stmt.run(id, endpoint.name, endpoint.url, endpoint.method || 'GET', JSON.stringify(endpoint.headers || {}), endpoint.schedule || '*/5 * * * *', endpoint.saveFormat || 'json', endpoint.savePath || './data', endpoint.notifyOnChange ? 1 : 0, endpoint.maxFileAgeDays || null, new Date().toISOString());
        return this.getEndpointById(id);
    },


    getAllEndpoints() {
        return db.prepare('SELECT * FROM endpoints').all().map(r => ({...r, headers: JSON.parse(r.headers || '{}')}));
    },


    getEndpointById(id) {
        const row = db.prepare('SELECT * FROM endpoints WHERE id = ?').get(id);
        if (!row) return null;
        row.headers = JSON.parse(row.headers || '{}');
        return row;
    },


    updateEndpoint(id, endpoint) {
        console.log('updateEndpoint called with:', { id, endpoint });
        
        // First check if endpoint exists
        const existing = this.getEndpointById(id);
        if (!existing) {
            console.error('Endpoint not found:', id);
            return null;
        }
        
        // Use provided values (even if empty string), fallback to existing values, then defaults
        const name = endpoint.name !== undefined ? endpoint.name : existing.name;
        const url = endpoint.url !== undefined ? endpoint.url : existing.url;
        const method = endpoint.method !== undefined ? endpoint.method : (existing.method || 'GET');
        const headers = endpoint.headers !== undefined ? endpoint.headers : existing.headers;
        const schedule = endpoint.schedule !== undefined && endpoint.schedule !== '' ? endpoint.schedule : (existing.schedule || '*/5 * * * *');
        const saveFormat = endpoint.saveFormat !== undefined ? endpoint.saveFormat : (existing.saveFormat || 'json');
        const savePath = endpoint.savePath !== undefined && endpoint.savePath !== '' ? endpoint.savePath : (existing.savePath || './data');
        const notifyOnChange = endpoint.notifyOnChange !== undefined ? (endpoint.notifyOnChange ? 1 : 0) : (existing.notifyOnChange || 0);
        const maxFileAgeDays = endpoint.maxFileAgeDays !== undefined ? (endpoint.maxFileAgeDays || null) : (existing.maxFileAgeDays || null);
        
        const stmt = db.prepare(`UPDATE endpoints SET name=?, url=?, method=?, headers=?, schedule=?, saveFormat=?, savePath=?, notifyOnChange=?, maxFileAgeDays=? WHERE id=?`);
        const result = stmt.run(
            name,
            url,
            method,
            JSON.stringify(headers || {}),
            schedule,
            saveFormat,
            savePath,
            notifyOnChange,
            maxFileAgeDays,
            id
        );
        
        console.log('Update result:', { changes: result.changes });
        console.log('Updated values:', { name, url, method, schedule, saveFormat, savePath, notifyOnChange });
        
        // Check if update actually affected a row
        if (result.changes === 0) {
            console.error('No rows were updated for endpoint:', id);
            return null; // No rows were updated
        }
        
        const updated = this.getEndpointById(id);
        console.log('Updated endpoint from DB:', updated);
        return updated;
    },

    deleteEndpoint(id) {
        db.prepare('DELETE FROM endpoints WHERE id = ?').run(id);
        return true;
    },


    createLog(log) {
        const id = uuidv4();
        db.prepare('INSERT INTO logs (id,endpointId,status,filePath,runTime,diffDetected,errorMessage) VALUES (?,?,?,?,?,?,?)').run(id, log.endpointId, log.status, log.filePath || null, log.runTime || new Date().toISOString(), log.diffDetected ? 1 : 0, log.errorMessage || null);
        return db.prepare('SELECT * FROM logs WHERE id = ?').get(id);
    },


    getLogsForEndpoint(endpointId) {
        return db.prepare('SELECT * FROM logs WHERE endpointId = ? ORDER BY runTime DESC LIMIT 100').all(endpointId);
    },

    deleteLog(logId) {
        db.prepare('DELETE FROM logs WHERE id = ?').run(logId);
        return true;
    }
};