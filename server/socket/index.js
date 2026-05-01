const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../utils/logger');

class SocketManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> { socketId, socket }
    this.userSockets = new Map(); // socketId -> userId
    this.rooms = new Map(); // roomId -> Set of socketIds
    
    // Event handlers
    this.uploadEvents = require('./uploadEvents');
    this.mergeEvents = require('./mergeEvents');
    this.notificationEvents = require('./notificationEvents');
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
      transports: ['websocket', 'polling'],
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || 
                      socket.handshake.headers.authorization?.split(' ')[1];
        
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
    const socketId = socket.id;
    
    // Store connection
    this.connectedUsers.set(userId, { socketId, socket });
    this.userSockets.set(socketId, userId);
    
    logger.info(`User ${userId} connected with socket ${socketId}`);
    logger.info(`Total connected users: ${this.connectedUsers.size}`);
    
    // Join user's personal room
    socket.join(`user_${userId}`);
    
    // Emit connection confirmed
    socket.emit('connected', { 
      userId, 
      socketId,
      timestamp: new Date().toISOString()
    });
    
    // Broadcast user online status
    socket.broadcast.emit('user_online', { 
      userId, 
      name: socket.user.name,
      timestamp: new Date().toISOString()
    });
    
    // Initialize event handlers
    this.uploadEvents.handle(socket, this);
    this.mergeEvents.handle(socket, this);
    this.notificationEvents.handle(socket, this);
    
    // Handle joining rooms
    socket.on('join_room', (data) => {
      const { roomId } = data;
      socket.join(roomId);
      
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Set());
      }
      this.rooms.get(roomId).add(socketId);
      
      logger.info(`User ${userId} joined room ${roomId}`);
      socket.emit('room_joined', { roomId });
    });
    
    // Handle leaving rooms
    socket.on('leave_room', (data) => {
      const { roomId } = data;
      socket.leave(roomId);
      
      if (this.rooms.has(roomId)) {
        this.rooms.get(roomId).delete(socketId);
        if (this.rooms.get(roomId).size === 0) {
          this.rooms.delete(roomId);
        }
      }
      
      logger.info(`User ${userId} left room ${roomId}`);
      socket.emit('room_left', { roomId });
    });
    
    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      this.handleDisconnect(socketId, userId);
    });
    
    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  }

  handleDisconnect(socketId, userId) {
    this.connectedUsers.delete(userId);
    this.userSockets.delete(socketId);
    
    // Remove from rooms
    for (const [roomId, sockets] of this.rooms) {
      if (sockets.has(socketId)) {
        sockets.delete(socketId);
        if (sockets.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    }
    
    logger.info(`User ${userId} disconnected`);
    logger.info(`Total connected users: ${this.connectedUsers.size}`);
    
    // Broadcast user offline status
    this.io.emit('user_offline', { 
      userId, 
      timestamp: new Date().toISOString()
    });
  }

  // ==================== EMIT METHODS ====================
  
  emitToUser(userId, event, data) {
    const user = this.connectedUsers.get(userId);
    if (user && user.socket) {
      user.socket.emit(event, data);
      return true;
    }
    return false;
  }

  emitToUsers(userIds, event, data) {
    let sent = 0;
    for (const userId of userIds) {
      if (this.emitToUser(userId, event, data)) {
        sent++;
      }
    }
    return sent;
  }

  emitToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  emitToAll(event, data) {
    this.io.emit(event, data);
  }

  emitToAdmins(event, data) {
    const adminUsers = Array.from(this.connectedUsers.values())
      .filter(user => user.socket.user?.role === 'admin');
    
    for (const admin of adminUsers) {
      admin.socket.emit(event, data);
    }
  }

  // ==================== UTILITY METHODS ====================
  
  getUserSocketId(userId) {
    return this.connectedUsers.get(userId)?.socketId || null;
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  getOnlineUsersCount() {
    return this.connectedUsers.size;
  }

  getOnlineUsersWithDetails() {
    return Array.from(this.connectedUsers.entries()).map(([userId, data]) => ({
      userId,
      socketId: data.socketId,
      name: data.socket.user?.name,
      email: data.socket.user?.email,
    }));
  }

  getRoomMembers(roomId) {
    const sockets = this.rooms.get(roomId);
    if (!sockets) return [];
    
    return Array.from(sockets)
      .map(socketId => this.userSockets.get(socketId))
      .filter(userId => userId);
  }

  getRoomSize(roomId) {
    return this.rooms.get(roomId)?.size || 0;
  }

  // ==================== BROADCAST METHODS ====================
  
  broadcastToRoom(roomId, event, data, excludeSocketId = null) {
    if (excludeSocketId) {
      this.io.to(roomId).except(excludeSocketId).emit(event, data);
    } else {
      this.io.to(roomId).emit(event, data);
    }
  }

  broadcastToAll(event, data, excludeSocketId = null) {
    if (excludeSocketId) {
      this.io.except(excludeSocketId).emit(event, data);
    } else {
      this.io.emit(event, data);
    }
  }

  // ==================== SPECIFIC EVENT EMITTERS ====================
  
  sendNotification(userId, notification) {
    return this.emitToUser(userId, 'new_notification', notification);
  }

  sendUploadProgress(userId, fileId, progress, uploadedBytes, totalBytes, speed) {
    return this.emitToUser(userId, 'upload_progress', {
      fileId,
      progress,
      uploadedBytes,
      totalBytes,
      speed,
      timestamp: Date.now()
    });
  }

  sendUploadComplete(userId, fileId, fileData) {
    return this.emitToUser(userId, 'upload_complete', {
      fileId,
      file: fileData,
      timestamp: Date.now()
    });
  }

  sendMergeProgress(userId, jobId, progress, status, currentOperation) {
    return this.emitToUser(userId, 'merge_progress', {
      jobId,
      progress,
      status,
      currentOperation,
      timestamp: Date.now()
    });
  }

  sendMergeComplete(userId, jobId, result) {
    return this.emitToUser(userId, 'merge_complete', {
      jobId,
      result,
      timestamp: Date.now()
    });
  }

  sendShareNotification(userId, sharedBy, fileInfo) {
    return this.emitToUser(userId, 'file_shared', {
      sharedBy: {
        id: sharedBy.id,
        name: sharedBy.name
      },
      file: fileInfo,
      timestamp: Date.now()
    });
  }

  // ==================== ADMIN METHODS ====================
  
  getServerStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      activeRooms: this.rooms.size,
      totalConnections: this.userSockets.size,
      timestamp: new Date().toISOString()
    };
  }

  disconnectUser(userId) {
    const user = this.connectedUsers.get(userId);
    if (user && user.socket) {
      user.socket.disconnect();
      return true;
    }
    return false;
  }
}

module.exports = new SocketManager();