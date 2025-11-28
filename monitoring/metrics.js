// monitoring/metrics.js
const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const uploadDuration = new client.Histogram({
    name: 'document_upload_duration_seconds',
    help: 'Duration of document uploads in seconds',
    labelNames: ['status', 'store'],
    buckets: [1, 5, 10, 30, 60, 120, 300] // Buckets in seconds
});

const uploadCounter = new client.Counter({
    name: 'document_uploads_total',
    help: 'Total number of document uploads',
    labelNames: ['status', 'store', 'mime_type']
});

const uploadSizeHistogram = new client.Histogram({
    name: 'document_upload_size_bytes',
    help: 'Size of uploaded documents in bytes',
    labelNames: ['mime_type'],
    buckets: [1024, 10240, 102400, 1024000, 10240000, 52428800] // 1KB to 50MB
});

const queueSize = new client.Gauge({
    name: 'upload_queue_size',
    help: 'Current number of jobs in upload queue',
    labelNames: ['state'] // waiting, active, completed, failed
});

const activeUploads = new client.Gauge({
    name: 'active_uploads',
    help: 'Number of currently active uploads'
});

const cacheHitCounter = new client.Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_key_type']
});

const cacheMissCounter = new client.Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_key_type']
});

// Register metrics
register.registerMetric(uploadDuration);
register.registerMetric(uploadCounter);
register.registerMetric(uploadSizeHistogram);
register.registerMetric(queueSize);
register.registerMetric(activeUploads);
register.registerMetric(cacheHitCounter);
register.registerMetric(cacheMissCounter);

module.exports = {
    register,
    uploadDuration,
    uploadCounter,
    uploadSizeHistogram,
    queueSize,
    activeUploads,
    cacheHitCounter,
    cacheMissCounter
};

