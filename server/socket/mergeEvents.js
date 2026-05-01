const { logger } = require('../utils/logger');
const mergeService = require('../services/mergeService');

class MergeEvents {
  handle(socket, socketManager) {
    const userId = socket.user.id;

    // Handle merge start
    socket.on('merge_start', async (data) => {
      const { jobId, fileIds, outputFormat, options } = data;
      
      logger.info(`Merge started: ${jobId} for user ${userId}`);
      
      socket.emit('merge_started', {
        jobId,
        status: 'processing',
        timestamp: Date.now()
      });
      
      // Simulate merge progress (in production, this would come from actual processing)
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        
        socketManager.sendMergeProgress(userId, jobId, progress, 'processing', `Processing... ${progress}%`);
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // Merge complete
          socketManager.sendMergeComplete(userId, jobId, {
            outputUrl: `/api/merge/download/${jobId}`,
            outputFormat,
            fileCount: fileIds.length
          });
        }
      }, 1000);
    });

    // Handle merge progress request
    socket.on('merge_progress_request', async (data) => {
      const { jobId } = data;
      
      // In production, fetch actual progress from database
      socket.emit('merge_progress_response', {
        jobId,
        progress: 0,
        status: 'processing',
        timestamp: Date.now()
      });
    });

    // Handle merge cancel
    socket.on('merge_cancel', async (data) => {
      const { jobId } = data;
      
      logger.info(`Merge cancelled: ${jobId} for user ${userId}`);
      
      socket.emit('merge_cancelled', {
        jobId,
        timestamp: Date.now()
      });
      
      // Notify room
      socket.to(`merge_${jobId}`).emit('merge_cancelled', {
        jobId,
        timestamp: Date.now()
      });
    });

    // Handle merge pause
    socket.on('merge_pause', (data) => {
      const { jobId } = data;
      logger.info(`Merge paused: ${jobId}`);
      
      socket.emit('merge_paused', {
        jobId,
        timestamp: Date.now()
      });
    });

    // Handle merge resume
    socket.on('merge_resume', (data) => {
      const { jobId } = data;
      logger.info(`Merge resumed: ${jobId}`);
      
      socket.emit('merge_resumed', {
        jobId,
        timestamp: Date.now()
      });
    });

    // Join merge room to listen to progress
    socket.on('join_merge_room', (data) => {
      const { jobId } = data;
      socket.join(`merge_${jobId}`);
      logger.info(`User ${userId} joined merge room for ${jobId}`);
    });

    // Leave merge room
    socket.on('leave_merge_room', (data) => {
      const { jobId } = data;
      socket.leave(`merge_${jobId}`);
    });

    // Handle merge options update
    socket.on('merge_options_update', (data) => {
      const { jobId, options } = data;
      logger.info(`Merge options updated for ${jobId}:`, options);
      
      socket.emit('merge_options_updated', {
        jobId,
        options,
        timestamp: Date.now()
      });
    });

    // Handle merge preview request
    socket.on('merge_preview_request', async (data) => {
      const { jobId, page } = data;
      
      // In production, generate preview
      socket.emit('merge_preview_response', {
        jobId,
        page,
        previewUrl: `/api/merge/preview/${jobId}?page=${page}`,
        timestamp: Date.now()
      });
    });
  }
}

module.exports = new MergeEvents();