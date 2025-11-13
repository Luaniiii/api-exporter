const db = require('./src/db');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function showMenu() {
    console.log('\n📊 DATABASE QUERY TOOL\n');
    console.log('1. View all endpoints');
    console.log('2. View all logs');
    console.log('3. View logs for specific endpoint');
    console.log('4. Run custom SQL query');
    console.log('5. Exit');
    console.log('\n');
}

function queryEndpoints() {
    const endpoints = db.prepare('SELECT * FROM endpoints').all();
    console.log('\n📋 ENDPOINTS:');
    console.log(JSON.stringify(endpoints, null, 2));
}

function queryLogs() {
    const logs = db.prepare('SELECT * FROM logs ORDER BY runTime DESC LIMIT 50').all();
    console.log('\n📝 LOGS:');
    console.log(JSON.stringify(logs, null, 2));
}

function queryLogsForEndpoint(endpointId) {
    const logs = db.prepare('SELECT * FROM logs WHERE endpointId = ? ORDER BY runTime DESC').all(endpointId);
    console.log(`\n📝 LOGS FOR ENDPOINT ${endpointId}:`);
    console.log(JSON.stringify(logs, null, 2));
}

function runCustomQuery(sql) {
    try {
        const result = db.prepare(sql).all();
        console.log('\n✅ QUERY RESULT:');
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.log('\n❌ ERROR:', err.message);
    }
}

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function main() {
    while (true) {
        showMenu();
        const choice = await askQuestion('Select an option (1-5): ');

        switch (choice.trim()) {
            case '1':
                queryEndpoints();
                break;
            case '2':
                queryLogs();
                break;
            case '3':
                const endpointId = await askQuestion('Enter endpoint ID: ');
                queryLogsForEndpoint(endpointId.trim());
                break;
            case '4':
                const sql = await askQuestion('Enter SQL query: ');
                runCustomQuery(sql.trim());
                break;
            case '5':
                console.log('\n👋 Goodbye!');
                db.close();
                rl.close();
                process.exit(0);
            default:
                console.log('\n❌ Invalid option. Please try again.');
        }
    }
}

main().catch(err => {
    console.error('Error:', err);
    db.close();
    rl.close();
    process.exit(1);
});


