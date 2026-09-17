/**
 * DigiAds Core Server Orchestrator
 * Bootstraps runtime environment, database connections, REST/WebSocket app, gRPC services, and background tasks.
 */
const mongoose = require('mongoose');
const config = require('./config/config');
const logger = require('./utils/logger');
const { initApp } = require('./config/initApp');
const { ensureRedisRunning } = require('./utils/redisRunner');
const { createFastifyApp } = require('./app');
const { startGrpc } = require('./grpc');
const { startHeartbeatMonitor } = require('./tasks/heartbeatMonitor');
const { startBackgroundCleanupTasks } = require('./tasks/cleanupTasks');
const { runDatabaseMigrations } = require('./utils/dbMigrations');
const { cleanupOldMediaLogs } = require('./utils/mediaCleanup');
const adController = require('./controllers/adController');

// Initialize WebSocket maps, capacity guards, and global broadcast helpers
require('./websocket/wsManager');

async function main() {
  try {
    // 1. Initialize sharp pool and runtime storage directories
    initApp();

    // 2. Ensure Redis is reachable (or alert in-memory fallback)
    const redisRunning = await ensureRedisRunning(config.redisPort || 6379, config.redisHost || '127.0.0.1');
    if (!redisRunning) {
      logger.warn('[Redis Warning] Redis is unavailable. Video processing queue will operate in in-memory fallback mode.');
    }

    // 3. Connect to MongoDB with tuned connection pool bounds (optimizes 1 vCPU RAM & Atlas limits)
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000
    });
    console.log('[Database] Connected to MongoDB');

    // 4. Startup reconciliation & database maintenance
    try {
      adController.reconcilePendingTransactions();
    } catch (reconcileErr) {
      console.warn('[Startup] Transaction reconciler warning:', reconcileErr.message);
    }
    await runDatabaseMigrations();
    cleanupOldMediaLogs().catch(err => console.error('[CLEANUP] Boot cleanup failed:', err.message));

    // 5. Start Fastify REST & WebSocket server
    const fastify = await createFastifyApp();
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`[REST/WS Server] Listening on port ${config.port}`);

    // 6. Start gRPC services
    startGrpc();

    // 7. Start background maintenance tasks
    startHeartbeatMonitor();
    startBackgroundCleanupTasks();

    // 8. Signal PM2 that application is fully booted for zero-downtime rolling reload
    if (typeof process.send === 'function') {
      process.send('ready');
      console.log('\x1b[32m[PM2]\x1b[0m Sent ready signal for zero-downtime rolling reload.');
    }
  } catch (err) {
    logger.error(`Server Startup Failed: ${err.message}`);
    process.exit(1);
  }
}

main();
