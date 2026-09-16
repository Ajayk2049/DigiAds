const pino = require('pino');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 20MB Log Rotation to prevent disk exhaustion (ENOSPC on VPS)
const MAX_LOG_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_LOG_BACKUPS = 3;

function rotateLogFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const stat = fs.statSync(filePath);
    if (stat.size < MAX_LOG_SIZE_BYTES) return;

    // Shift older log backups: .2 -> .3, .1 -> .2, file -> .1
    for (let i = MAX_LOG_BACKUPS - 1; i >= 1; i--) {
      const oldFile = `${filePath}.${i}`;
      const newFile = `${filePath}.${i + 1}`;
      if (fs.existsSync(oldFile)) {
        if (i === MAX_LOG_BACKUPS - 1 && fs.existsSync(newFile)) {
          try { fs.unlinkSync(newFile); } catch (_) {}
        }
        try { fs.renameSync(oldFile, newFile); } catch (_) {}
      }
    }
    const backupOne = `${filePath}.1`;
    try { fs.renameSync(filePath, backupOne); } catch (_) {}
  } catch (err) {
    console.warn('[Logger] Log rotation warning:', err.message);
  }
}

// Rotate on boot if existing log files exceed 20MB
rotateLogFile(path.join(logsDir, 'combined.log'));
rotateLogFile(path.join(logsDir, 'error.log'));

// Periodic background check every 6 hours (unref'd so it never keeps process alive)
const logRotateTimer = setInterval(() => {
  rotateLogFile(path.join(logsDir, 'combined.log'));
  rotateLogFile(path.join(logsDir, 'error.log'));
}, 6 * 60 * 60 * 1000);
if (typeof logRotateTimer.unref === 'function') {
  logRotateTimer.unref();
}

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = config.logLevel || (isProduction ? 'warn' : 'debug');

// Configure transport streams (Console + Log Files)
const targets = [];

// Stream 1: Console Output
if (!isProduction) {
  targets.push({
    target: 'pino-pretty',
    level: logLevel,
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname'
    }
  });
} else {
  targets.push({
    target: 'pino/file',
    level: logLevel,
    options: { destination: 1 } // Standard output (stdout)
  });
}

// Stream 2: Combined Log File
targets.push({
  target: 'pino/file',
  level: logLevel,
  options: {
    destination: path.join(logsDir, 'combined.log'),
    mkdir: true
  }
});

// Stream 3: Dedicated Error Log File
targets.push({
  target: 'pino/file',
  level: 'warn', // Captures warn, error, and fatal
  options: {
    destination: path.join(logsDir, 'error.log'),
    mkdir: true
  }
});

const transport = pino.transport({ targets });

const logger = pino(
  {
    level: logLevel,
    base: { env: config.env },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.Authorization',
        '*.password',
        '*.token',
        '*.otp',
        '*.clientSecret'
      ],
      censor: '[REDACTED]'
    }
  },
  transport
);

module.exports = logger;
