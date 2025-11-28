// models/UserDocument.js
const mongoose = require('mongoose');

const userDocumentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    documentName: String, // Full Gemini path
    storeName: {
        type: String,
        required: true,
        index: true
    },
    storeDisplayName: String,
    originalFilename: {
        type: String,
        required: true
    },
    mimeType: String,
    fileSize: Number,
    uploadStatus: {
        type: String,
        enum: ['queued', 'uploading', 'processing', 'ready', 'failed'],
        default: 'queued',
        index: true
    },
    operationId: String, // Gemini operation ID
    jobId: String, // Bull job ID

    // Progress tracking
    progress: { type: Number, default: 0, min: 0, max: 100 },

    // Retry tracking
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },

    // Timestamps
    queuedAt: { type: Date, default: Date.now },
    uploadStartedAt: Date,
    processedAt: Date,

    // Error handling
    error: String,
    errorStack: String,
    lastErrorAt: Date,

    // Metadata for additional info
    metadata: { type: Map, of: String },

    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date

}, {
    timestamps: true
});

// Compound indexes for efficient queries
userDocumentSchema.index({ userId: 1, uploadStatus: 1 });
userDocumentSchema.index({ storeName: 1, isDeleted: 1 });
userDocumentSchema.index({ userId: 1, storeName: 1, isDeleted: 1 });
userDocumentSchema.index({ createdAt: -1 });
userDocumentSchema.index({ jobId: 1 });

// TTL index - auto-delete failed documents after 30 days
userDocumentSchema.index(
    { createdAt: 1 },
    {
        expireAfterSeconds: 2592000, // 30 days
        partialFilterExpression: { uploadStatus: 'failed' }
    }
);

// Virtual for status message
userDocumentSchema.virtual('statusMessage').get(function() {
    const messages = {
        queued: 'Waiting in queue...',
        uploading: `Uploading... ${this.progress}%`,
        processing: `Processing document... ${this.progress}%`,
        ready: 'Ready to use',
        failed: this.error || 'Upload failed'
    };
    return messages[this.uploadStatus];
});

// Methods
userDocumentSchema.methods.markAsFailed = async function(error) {
    this.uploadStatus = 'failed';
    this.error = error.message;
    this.errorStack = error.stack;
    this.lastErrorAt = new Date();
    this.retryCount += 1;
    await this.save();
};

userDocumentSchema.methods.updateProgress = async function(progress, status) {
    this.progress = Math.min(progress, 100);
    if (status) this.uploadStatus = status;
    await this.save();
};

userDocumentSchema.set('toJSON', { virtuals: true });
userDocumentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('UserDocument', userDocumentSchema);