const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');

let redisProcess = null;

/**
 * Checks if Redis is already running on the configured host & port.
 */
function isRedisRunning(port = 6379, host = '127.0.0.1', timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Finds the local redis-server.exe binary in the project.
 */
function findRedisBinary() {
  const candidatePaths = [
    path.resolve(__dirname, '../../Redis/redis-server.exe'),
    path.resolve(__dirname, '../Redis/redis-server.exe'),
    path.resolve(process.cwd(), '../Redis/redis-server.exe'),
    path.resolve(process.cwd(), 'Redis/redis-server.exe'),
    path.resolve(process.cwd(), 'redis-server.exe')
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Automatically starts the embedded redis-server.exe if Redis is offline.
 */
async function ensureRedisRunning(port = 6379, host = '127.0.0.1') {
  const alreadyRunning = await isRedisRunning(port, host);
  if (alreadyRunning) {
    console.log(`\x1b[32m[Redis Runner]\x1b[0m Redis is already running on ${host}:${port}.`);
    return true;
  }

  // Redis is only run locally via .exe on Windows
  if (process.platform !== 'win32') {
    console.log('\x1b[33m[Redis Runner]\x1b[0m Non-Windows environment detected. Expecting external/system Redis service.');
    return false;
  }

  const binaryPath = findRedisBinary();
  if (!binaryPath) {
    console.warn('\x1b[33m[Redis Runner Warning]\x1b[0m redis-server.exe not found in workspace. Using in-memory fallback.');
    return false;
  }

  const redisDir = path.dirname(binaryPath);
  const confPath = path.join(redisDir, 'redis.windows.conf');
  const args = fs.existsSync(confPath) ? [confPath] : [];

  try {
    console.log(`\x1b[36m[Redis Runner]\x1b[0m Launching embedded Redis server: ${binaryPath}...`);
    redisProcess = spawn(binaryPath, args, {
      cwd: redisDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      windowsHide: true
    });

    redisProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('The server is now ready to accept connections')) {
        console.log(`\x1b[32m[Redis Runner]\x1b[0m Redis server ready on ${host}:${port} (PID: ${redisProcess.pid})`);
      }
    });

    redisProcess.stderr.on('data', (data) => {
      const errStr = data.toString().trim();
      if (errStr) {
        console.warn(`[Redis Runner Stderr] ${errStr}`);
      }
    });

    redisProcess.on('error', (err) => {
      console.error(`\x1b[31m[Redis Runner Error]\x1b[0m Failed to spawn redis-server: ${err.message}`);
    });

    redisProcess.on('exit', (code, signal) => {
      if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGINT') {
        console.warn(`[Redis Runner] redis-server process exited with code ${code || signal}`);
      }
    });

    // Gracefully terminate Redis child process on Node exit
    const cleanup = () => {
      if (redisProcess && !redisProcess.killed) {
        try {
          redisProcess.kill();
        } catch (_) {}
      }
    };

    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit();
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit();
    });

    // Give Redis up to 1 second to bind to port
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 100));
      if (await isRedisRunning(port, host)) {
        return true;
      }
    }

    return true;
  } catch (err) {
    console.error('\x1b[31m[Redis Runner Error]\x1b[0m Failed starting Redis process:', err.message);
    return false;
  }
}

module.exports = {
  isRedisRunning,
  findRedisBinary,
  ensureRedisRunning
};
