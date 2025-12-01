// routes/health.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
    const cacheManager = require('../utils/cacheManager');
    const uploadQueue = require('../queue/uploadQueue');

    const checks = {
        server: { status: 'ok', timestamp: new Date().toISOString() },
        database: mongoose.connection.readyState === 1
            ? { status: 'ok', message: 'Connected' }
            : { status: 'error', message: 'Disconnected' },
        redis: cacheManager && cacheManager.isEnabled()
            ? { status: 'ok', message: 'Connected' }
            : { status: 'disabled', message: 'Not configured' },
        queue: uploadQueue
            ? { status: 'ok', message: 'Available' }
            : { status: 'disabled', message: 'Not configured' }
    };

    const healthy = Object.values(checks)
        .filter(c => c.status)
        .every(c => c.status === 'ok' || c.status === 'disabled');

    res.status(healthy ? 200 : 503).json(checks);
});

router.get('/metrics', async (req, res) => {
    try {
        const { register } = require('../monitoring/metrics');
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).json({ error: 'Metrics not available' });
    }
});

module.exports = router;