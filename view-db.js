const db = require('./src/db');

console.log('\n📊 DATABASE CONTENTS\n');
console.log('='.repeat(60));

// View endpoints table
console.log('\n🔗 ENDPOINTS TABLE:');
console.log('-'.repeat(60));
const endpoints = db.prepare('SELECT * FROM endpoints').all();
if (endpoints.length === 0) {
    console.log('  (No endpoints found)');
} else {
    endpoints.forEach((ep, i) => {
        console.log(`\n  [${i + 1}] ${ep.name || 'Unnamed'}`);
        console.log(`      ID: ${ep.id}`);
        console.log(`      URL: ${ep.url}`);
        console.log(`      Method: ${ep.method || 'GET'}`);
        console.log(`      Schedule: ${ep.schedule || 'N/A'}`);
        console.log(`      Format: ${ep.saveFormat || 'json'}`);
        console.log(`      Created: ${ep.createdAt || 'N/A'}`);
    });
}

// View logs table
console.log('\n\n📝 LOGS TABLE:');
console.log('-'.repeat(60));
const logs = db.prepare('SELECT * FROM logs ORDER BY runTime DESC LIMIT 20').all();
if (logs.length === 0) {
    console.log('  (No logs found)');
} else {
    logs.forEach((log, i) => {
        console.log(`\n  [${i + 1}] ${log.status.toUpperCase()} - ${log.runTime || 'N/A'}`);
        console.log(`      Endpoint ID: ${log.endpointId}`);
        if (log.filePath) console.log(`      File: ${log.filePath}`);
        if (log.diffDetected) console.log(`      ⚠️  Changes detected`);
        if (log.errorMessage) console.log(`      ❌ Error: ${log.errorMessage}`);
    });
}

// Summary
console.log('\n\n📈 SUMMARY:');
console.log('-'.repeat(60));
const endpointCount = db.prepare('SELECT COUNT(*) as count FROM endpoints').get();
const logCount = db.prepare('SELECT COUNT(*) as count FROM logs').get();
const successCount = db.prepare('SELECT COUNT(*) as count FROM logs WHERE status = ?').get('success');
const errorCount = db.prepare('SELECT COUNT(*) as count FROM logs WHERE status = ?').get('error');

console.log(`  Total Endpoints: ${endpointCount.count}`);
console.log(`  Total Logs: ${logCount.count}`);
console.log(`  Successful Runs: ${successCount.count}`);
console.log(`  Failed Runs: ${errorCount.count}`);

console.log('\n' + '='.repeat(60) + '\n');

db.close();


