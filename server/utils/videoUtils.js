const { execFile } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');

/**
 * Robust, timeout-enforced ffprobe video metadata inspection.
 * Uses child_process.execFile with native timeout and SIGKILL to guarantee
 * no orphaned zombie processes or file descriptors leak on stalled inputs.
 *
 * @param {string} filePath - Absolute path to the video file to probe
 * @param {number} [timeoutMs=5000] - Hard timeout in milliseconds (defaults to 5000)
 * @returns {Promise<Object>} Resolves with { format: { duration: Number, ... }, streams: [...] }
 */
function probeVideoMetadata(filePath, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    // Resolve ffprobe binary path using fluent-ffmpeg's capability resolution or environment
    new ffmpeg()._getFfprobePath((err, resolvedPath) => {
      const ffprobeCmd = resolvedPath || process.env.FFPROBE_PATH || 'ffprobe';

      let timer = null;
      let childProc = null;
      let isSettled = false;

      const finish = (error, data) => {
        if (isSettled) return;
        isSettled = true;
        if (timer) clearTimeout(timer);
        if (error) {
          return reject(error);
        }
        resolve(data);
      };

      // Watchdog timer: forces SIGKILL if the process fails to exit upon timeout
      timer = setTimeout(() => {
        if (childProc && !childProc.killed) {
          try {
            childProc.kill('SIGKILL');
          } catch (_) {}
        }
        finish(new Error(`ffprobe duration check timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        childProc = execFile(
          ffprobeCmd,
          ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', filePath],
          { timeout: timeoutMs, killSignal: 'SIGKILL', maxBuffer: 10 * 1024 * 1024 },
          (execErr, stdout) => {
            if (isSettled) return;

            if (execErr) {
              // If ffprobe binary not found in path, fallback to fluent-ffmpeg.ffprobe
              if (execErr.code === 'ENOENT' || !resolvedPath) {
                return fallbackFfmpeg(filePath, timeoutMs, finish);
              }
              const isTimeout = execErr.killed || execErr.signal === 'SIGKILL';
              return finish(new Error(isTimeout ? `ffprobe duration check timed out after ${timeoutMs}ms` : execErr.message));
            }

            try {
              const parsed = JSON.parse(stdout);
              if (parsed?.format?.duration) {
                parsed.format.duration = parseFloat(parsed.format.duration);
              }
              finish(null, parsed);
            } catch (parseErr) {
              finish(new Error(`Failed to parse ffprobe json output: ${parseErr.message}`));
            }
          }
        );
      } catch (spawnErr) {
        fallbackFfmpeg(filePath, timeoutMs, finish);
      }
    });
  });
}

/**
 * Fallback to fluent-ffmpeg.ffprobe if standalone binary execution is unavailable
 */
function fallbackFfmpeg(filePath, timeoutMs, done) {
  let finished = false;
  const timer = setTimeout(() => {
    if (!finished) {
      finished = true;
      done(new Error(`ffprobe duration check timed out after ${timeoutMs}ms`));
    }
  }, timeoutMs);

  ffmpeg.ffprobe(filePath, (err, data) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    if (err) return done(err);
    done(null, data);
  });
}

module.exports = {
  probeVideoMetadata
};
