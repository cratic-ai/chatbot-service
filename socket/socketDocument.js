// socket/documentSocket.js
const socketIO = require('socket.io');

class SocketManager {
    constructor() {
        this.io = null;
    }

    initialize(server) {
        this.io = socketIO(server, {
            cors: {
                origin: process.env.CLIENT_URL,
                methods: ['GET', 'POST']
            },
            transports: ['websocket', 'polling']
        });

        this.io.on('connection', (socket) => {
            console.log(`🔌 Client connected: ${socket.id}`);

            // Subscribe to document updates
            socket.on('subscribe-document', (documentId) => {
                socket.join(`document:${documentId}`);
                console.log(`📡 Socket ${socket.id} subscribed to document:${documentId}`);
            });

            // Unsubscribe from document updates
            socket.on('unsubscribe-document', (documentId) => {
                socket.leave(`document:${documentId}`);
                console.log(`📡 Socket ${socket.id} unsubscribed from document:${documentId}`);
            });

            // Subscribe to user's all documents
            socket.on('subscribe-user', (userId) => {
                socket.join(`user:${userId}`);
                console.log(`📡 Socket ${socket.id} subscribed to user:${userId}`);
            });

            socket.on('disconnect', () => {
                console.log(`🔌 Client disconnected: ${socket.id}`);
            });
        });

        console.log('✅ WebSocket initialized');
    }

    /**
     * Emit document status update
     */
    emitDocumentUpdate(documentId, data) {
        if (this.io) {
            this.io.to(`document:${documentId}`).emit('document-status', {
                documentId,
                timestamp: new Date().toISOString(),
                ...data
            });
        }
    }

    /**
     * Emit update to all user's documents
     */
    emitUserUpdate(userId, data) {
        if (this.io) {
            this.io.to(`user:${userId}`).emit('user-documents-update', {
                userId,
                timestamp: new Date().toISOString(),
                ...data
            });
        }
    }

    /**
     * Emit to specific socket
     */
    emitToSocket(socketId, event, data) {
        if (this.io) {
            this.io.to(socketId).emit(event, data);
        }
    }

    /**
     * Get IO instance
     */
    getIO() {
        return this.io;
    }
}

module.exports = new SocketManager();