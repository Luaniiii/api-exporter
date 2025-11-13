const cron = require('cron');
const models = require('../models');
const runner = require('./runner');
const cleanup = require('./cleanup');


let jobs = [];
let cleanupJob = null;


function start() {
    stop();
    const endpoints = models.getAllEndpoints();
    endpoints.forEach(ep => {
        try {
            const job = new cron.CronJob(ep.schedule, async () => {
                console.log(`Running job for ${ep.name} (${ep.id})`);
                await runner.runJob(ep);
            }, null, true);
            jobs.push({ id: ep.id, job });
        } catch (err) {
            console.error('Failed to schedule', ep.id, err.message);
        }
    });
    
    // Start cleanup job - runs daily at 2 AM
    if (!cleanupJob) {
        cleanupJob = new cron.CronJob('0 2 * * *', async () => {
            console.log('Running cleanup job for old files...');
            await cleanup.cleanupOldFiles();
        }, null, true);
    }
    
    console.log(`Scheduler started with ${jobs.length} endpoint jobs and cleanup job`);
}


function stop() {
    jobs.forEach(j => {
        try { j.job.stop(); } catch(e){}
    });
    jobs = [];
    
    if (cleanupJob) {
        try { cleanupJob.stop(); } catch(e){}
        cleanupJob = null;
    }
}


module.exports = { start, stop };