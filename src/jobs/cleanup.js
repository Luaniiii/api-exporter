const fs = require('fs');
const path = require('path');
const models = require('../models');
const config = require('../config');

/**
 * Cleanup old files based on retention policy
 * Deletes files older than maxFileAgeDays for each endpoint
 */
async function cleanupOldFiles() {
    try {
        const endpoints = models.getAllEndpoints();
        let totalDeleted = 0;
        let totalErrors = 0;

        for (const endpoint of endpoints) {
            // Skip if no retention policy is set
            if (!endpoint.maxFileAgeDays || endpoint.maxFileAgeDays <= 0) {
                continue;
            }

            try {
                const deleted = await cleanupEndpointFiles(endpoint);
                totalDeleted += deleted;
                if (deleted > 0) {
                    console.log(`Cleanup: Deleted ${deleted} old file(s) for endpoint "${endpoint.name}"`);
                }
            } catch (err) {
                console.error(`Cleanup error for endpoint "${endpoint.name}":`, err.message);
                totalErrors++;
            }
        }

        if (totalDeleted > 0 || totalErrors > 0) {
            console.log(`Cleanup completed: ${totalDeleted} file(s) deleted, ${totalErrors} error(s)`);
        }
    } catch (err) {
        console.error('Cleanup job error:', err);
    }
}

/**
 * Cleanup files for a specific endpoint
 */
async function cleanupEndpointFiles(endpoint) {
    const savePath = path.resolve(endpoint.savePath || config.DATA_DIR);
    
    // Ensure the path exists
    if (!fs.existsSync(savePath)) {
        return 0;
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - endpoint.maxFileAgeDays);
    
    let deletedCount = 0;
    
    // Get all files in the directory
    const files = fs.readdirSync(savePath);
    
    // Filter files that match this endpoint's naming pattern
    // Files are named like: {endpoint_name}-{timestamp}.{ext}
    // We need to match files based on the endpoint name pattern
    const endpointNameForFile = endpoint.name.toLowerCase().replace(/\s+/g, '_');
    
    for (const file of files) {
        // Check if file belongs to this endpoint by checking if it starts with the endpoint name pattern
        const fileNameLower = file.toLowerCase();
        if (!fileNameLower.startsWith(endpointNameForFile + '-') && !fileNameLower.startsWith(endpointNameForFile + '_')) {
            continue;
        }
        
        const filePath = path.join(savePath, file);
        
        try {
            // Get file stats
            const stats = fs.statSync(filePath);
            
            // Check if file is older than cutoff date
            if (stats.mtime < cutoffDate) {
                // Also check logs to see if we should delete the log entry
                const logs = models.getLogsForEndpoint(endpoint.id);
                const logEntry = logs.find(log => log.filePath === filePath);
                
                // Delete the file
                fs.unlinkSync(filePath);
                deletedCount++;
                
                // Delete log entry if it exists
                if (logEntry) {
                    models.deleteLog(logEntry.id);
                }
            }
        } catch (err) {
            // Skip files that can't be accessed
            console.warn(`Could not process file ${filePath}:`, err.message);
        }
    }
    
    return deletedCount;
}

module.exports = {
    cleanupOldFiles,
    cleanupEndpointFiles
};

