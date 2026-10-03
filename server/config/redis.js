const IORedis = require('ioredis');
const config = require('./config');
const logger = require('../utils/logger');

function getRedisConfig(overrides = {}) {
  return {
    host: config.redisHost || '127.0.0.1',
    port: parseInt(config.redisPort, 10) || 6379,
    ...overrides
  };
}

/**
 * Factory for creating standardized IORedis client instances.
 * @param {'bullmq'|'ratelimit'|'general'} purpose 
 * @param {object} customOptions 
 * @returns {IORedis}
 */
function createRedisClient(purpose = 'general', customOptions = {}) {
  let defaultOptions = {};

  if (purpose === 'bullmq') {
    defaultOptions = {
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      lazyConnect: false,
      retryStrategy: (times) => (times > 20 ? null : Math.min(times * 200, 3000))
    };
  } else if (purpose === 'ratelimit') {
    defaultOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000))
    };
  } else {
    defaultOptions = {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      retryStrategy: (times) => (times > 10 ? null : Math.min(times * 300, 2000))
    };
  }

  const client = new IORedis({
    ...getRedisConfig(),
    ...defaultOptions,
    ...customOptions
  });

  let lastWarnTime = 0;
  client.on('error', (err) => {
    const now = Date.now();
    if (now - lastWarnTime > 30000) {
      lastWarnTime = now;
      logger.warn({ err: (err && err.message) || 'Unknown error', purpose }, `[Redis:${purpose}] Connection issue or unavailable`);
    }
  });

  return client;
}

module.exports = {
  getRedisConfig,
  createRedisClient
};
