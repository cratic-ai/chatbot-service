const Queue = require('bull');

let uploadQueue = null;

const redisOptions = {
    host: 'redis-15826.crce179.ap-south-1-1.ec2.cloud.redislabs.com',
    port: 15826,
    password: 'GxaA803A4uEeVkeyUbbuhKnEpuigqDAI',
    tls: {}
};

try {
    uploadQueue = new Queue('document-upload', redisOptions, {
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000
            },
            removeOnComplete: {
                age: 86400,
                count: 1000
            },
            removeOnFail: false
        }
    });

    uploadQueue.on('ready', () => {
        console.log('✅ Upload queue ready and connected to Redis Cloud');
    });

    uploadQueue.on('completed', (job, result) => {
        console.log(`✅ Job ${job.id} completed`);  // Fixed: added () after console.log
    });

    uploadQueue.on('failed', (job, err) => {
        console.error(`❌ Job ${job.id} failed:`, err.message);  // Fixed: added () after console.error
    });

    uploadQueue.on('error', (error) => {
        console.error('❌ Queue error:', error.message);
    });

    setInterval(async () => {
        try {
            await uploadQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed');
            await uploadQueue.clean(24 * 60 * 60 * 1000, 'completed');
        } catch (error) {
            console.error('Error cleaning jobs:', error);
        }
    }, 60 * 60 * 1000);

    console.log('✅ Upload queue initialized');
} catch (error) {
    console.error('❌ Failed to initialize queue:', error);
    uploadQueue = null;
}
module.exports = uploadQueue;