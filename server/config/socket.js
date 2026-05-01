const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

class SocketManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> userId
    this.rooms = new Map(); // roomId -> Set of socketIds
  }

  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.user = user;
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', this.handleConnection.bind(this));
    
    logger.info('Socket.IO server initialized');
    return this.io;
  }

  handleConnection(socket) {
    const userId = socket.user.id;
    
    // Store connection
    this.connectedUsers.set(userId, socket.id);
    this.userSockets.set(socket.id, userId);
    
    logger.info(`User ${userId} connected with socket ${socket.id}`);
    
    // Join user's personal room
    socket.join(`user_${userId}`);
    
    // Emit connection event
    socket.emit('connected', { userId, socketId: socket.id });
    
    // Notify others that user is online
    socket.broadcast.emit('user_online', { userId });
    
    // Handle joining rooms
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Set());
      }
      this.rooms.get(roomId).add(socket.id);
      logger.info(`User ${userId} joined room ${roomId}`);
    });
    
    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      if (this.rooms.has(roomId)) {
        this.rooms.get(roomId).delete(socket.id);
      }
      logger.info(`User ${userId} left room ${roomId}`);
    });
    
    // Handle file upload progress
    socket.on('upload_progress', (data) => {
      const { fileId, progress, uploadedBytes, totalBytes } = data;
      socket.to(`user_${userId}`).emit('upload_update', {
        fileId,
        progress,
        uploadedBytes,
        totalBytes,
      });
    });
    
    // Handle merge progress
    socket.on('merge_progress', (data) => {
      const { jobId, progress, status } = data;
      socket.to(`user_${userId}`).emit('merge_update', {
        jobId,
        progress,
        status,
      });
    });
    
    // Handle notification read
    socket.on('notification_read', (notificationId) => {
      socket.to(`user_${userId}`).emit('notification_updated', {
        notificationId,
        read: true,
      });
    });
    
    // Handle typing indicator
    socket.on('typing', (data) => {
      const { roomId, isTyping } = data;
      socket.to(roomId).emit('user_typing', {
        userId,
        name: socket.user.name,
        isTyping,
      });
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      this.connectedUsers.delete(userId);
      this.userSockets.delete(socket.id);
      
      // Remove from rooms
      for (const [roomId, sockets] of this.rooms) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.rooms.delete(roomId);
          }
        }
      }
      
      logger.info(`User ${userId} disconnected`);
      socket.broadcast.emit('user_offline', { userId });
    });
    
    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  }

  // Emit to specific user
  emitToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Emit to multiple users
  emitToUsers(userIds, event, data) {
    const socketIds = userIds
      .map(id => this.connectedUsers.get(id))
      .filter(id => id);
    
    if (socketIds.length > 0) {
      this.io.to(socketIds).emit(event, data);
      return true;
    }
    return false;
  }

  // Emit to room
  emitToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  // Emit to all connected clients
  emitToAll(event, data) {
    this.io.emit(event, data);
  }

  // Send notification to user
  sendNotification(userId, notification) {
    return this.emitToUser(userId, 'new_notification', notification);
  }

  // Send file upload progress
  sendUploadProgress(userId, fileId, progress, uploadedBytes, totalBytes) {
    return this.emitToUser(userId, 'upload_progress', {
      fileId,
      progress,
      uploadedBytes,
      totalBytes,
    });
  }

  // Send merge progress
  sendMergeProgress(userId, jobId, progress, status) {
    return this.emitToUser(userId, 'merge_progress', {
      jobId,
      progress,
      status,
    });
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.connectedUsers.size;
  }

  // Get online users list
  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  // Get user's socket id
  getUserSocketId(userId) {
    return this.connectedUsers.get(userId);
  }
}

module.exports = new SocketManager();