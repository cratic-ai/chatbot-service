// routes/health.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const cacheManager = require('../utils/cacheManager');
const uploadQueue = require('../queue/uploadQueue');
const { register } = require('../monitoring/metrics');

// Health check
router.get('/health', async (req, res) => {
    const checks = {
        database: await checkDatabase(),
        redis: await checkRedis(),
        queue: await checkQueue(),
        timestamp: new Date().toISOString()
    };

    const healthy = Object.values(checks)
        .filter(c => typeof c === 'object' && c.status)
        .every(c => c.status === 'ok');

    res.status(healthy ? 200 : 503).json(checks);
});

// Prometheus metrics
router.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Detailed system info
router.get('/system', async (req, res) => {
    const [waiting, active, completed, failed] = await Promise.all([
        uploadQueue.getWaitingCount(),
        uploadQueue.getActiveCount(),
        uploadQueue.getCompletedCount(),
        uploadQueue.getFailedCount()
    ]);

    res.json({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        queue: { waiting, active, completed, failed },
        database: {
            connected: mongoose.connection.readyState === 1,
            collections: mongoose.connection.collections
        }
    });
});

async function checkDatabase() {
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.db.admin().ping();
            return { status: 'ok', message: 'Database connected' };
        }
        return { status: 'error', message: 'Database not connected' };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

async function checkRedis() {
    try {
        await cacheManager.redis.ping();
        return { status: 'ok', message: 'Redis connected' };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

async function checkQueue() {
    try {
        const active = await uploadQueue.getActiveCount();
        return { status: 'ok', message: 'Queue operational', activeJobs: active };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

module.exports = router;