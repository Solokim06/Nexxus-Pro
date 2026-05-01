const { logger } = require('../utils/logger');
const fileService = require('../services/fileService');

class UploadEvents {
  handle(socket, socketManager) {
    const userId = socket.user.id;

    // Handle file upload start
    socket.on('upload_start', async (data) => {
      const { fileId, fileName, fileSize, mimeType } = data;
      
      logger.info(`Upload started: ${fileName} (${fileId}) for user ${userId}`);
      
      socket.emit('upload_ready', {
        fileId,
        status: 'ready',
        chunkSize: 1024 * 1024, // 1MB chunks
        maxConcurrent: 3
      });
    });

    // Handle chunk upload
    socket.on('upload_chunk', async (data) => {
      const { fileId, chunkIndex, totalChunks, chunkData, fileName } = data;
      
      try {
        // Store chunk (in production, save to temp storage)
        const progress = ((chunkIndex + 1) / totalChunks) * 100;
        
        // Send progress update
        socket.emit('upload_progress', {
          fileId,
          chunkIndex,
          totalChunks,
          progress,
          uploadedBytes: (chunkIndex + 1) * (chunkData?.length || 1024 * 1024),
          totalBytes: totalChunks * (1024 * 1024),
          timestamp: Date.now()
        });
        
        // Also send to other clients watching this upload
        socket.to(`upload_${fileId}`).emit('upload_progress', {
          fileId,
          progress,
          timestamp: Date.now()
        });
        
        // If last chunk, complete upload
        if (chunkIndex === totalChunks - 1) {
          socket.emit('upload_complete', {
            fileId,
            fileName,
            status: 'completed',
            timestamp: Date.now()
          });
          
          // Notify listeners
          socket.to(`upload_${fileId}`).emit('upload_complete', {
            fileId,
            fileName,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        logger.error(`Upload chunk error for ${fileId}:`, error);
        socket.emit('upload_error', {
          fileId,
          error: error.message,
          chunkIndex
        });
      }
    });

    // Handle upload pause
    socket.on('upload_pause', (data) => {
      const { fileId } = data;
      logger.info(`Upload paused: ${fileId}`);
      
      socket.emit('upload_paused', {
        fileId,
        timestamp: Date.now()
      });
    });

    // Handle upload resume
    socket.on('upload_resume', (data) => {
      const { fileId, uploadedChunks } = data;
      logger.info(`Upload resumed: ${fileId} from chunk ${uploadedChunks}`);
      
      socket.emit('upload_resumed', {
        fileId,
        resumeFromChunk: uploadedChunks,
        timestamp: Date.now()
      });
    });

    // Handle upload cancel
    socket.on('upload_cancel', (data) => {
      const { fileId } = data;
      logger.info(`Upload cancelled: ${fileId}`);
      
      socket.emit('upload_cancelled', {
        fileId,
        timestamp: Date.now()
      });
    });

    // Handle upload error
    socket.on('upload_error_report', (data) => {
      const { fileId, error } = data;
      logger.error(`Upload error reported for ${fileId}:`, error);
      
      socket.emit('upload_error_ack', {
        fileId,
        acknowledged: true
      });
    });

    // Join upload room to listen to progress
    socket.on('join_upload_room', (data) => {
      const { fileId } = data;
      socket.join(`upload_${fileId}`);
      logger.info(`User ${userId} joined upload room for ${fileId}`);
    });

    // Leave upload room
    socket.on('leave_upload_room', (data) => {
      const { fileId } = data;
      socket.leave(`upload_${fileId}`);
    });
  }
}

module.exports = new UploadEvents();