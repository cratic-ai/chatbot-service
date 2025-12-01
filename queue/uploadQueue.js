const { Queue, Worker } = require('bullmq');
const { createClient } = require('redis');

let uploadQueue = null;

// Create Redis connection for BullMQ
const connection = createClient({
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD,

    socket: {
        host: 'redis-15826.crce179.ap-south-1-1.ec2.cloud.redislabs.com',
        port: 15826
    }
});

connection.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

// Connect to Redis
connection.connect().then(() => {
    console.log('✅ Redis connected');

    try {
        // Initialize BullMQ Queue
        uploadQueue = new Queue('document-upload', {
            connection,
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

        console.log('✅ Upload queue initialized');

        // Optional: Add queue events
        uploadQueue.on('error', (error) => {
            console.error('❌ Queue error:', error.message);
        });

    } catch (error) {
        console.error('❌ Failed to initialize queue:', error);
        uploadQueue = null;
    }
}).catch((err) => {
    console.error('❌ Failed to connect to Redis:', err);
});

// Cleanup old jobs periodically
setInterval(async () => {
    if (uploadQueue) {
        try {
            await uploadQueue.clean(7 * 24 * 60 * 60 * 1000, 100, 'failed');
            await uploadQueue.clean(24 * 60 * 60 * 1000, 100, 'completed');
        } catch (error) {
            console.error('Error cleaning jobs:', error);
        }
    }
}, 60 * 60 * 1000);

module.exports = uploadQueue;