const path = require('path');

module.exports = {
  apps: [
    {
      name: 'digiads-backend',
      cwd: path.join(__dirname, 'server'),
      script: 'server.js',
      args: '--env-file=config/.env.prod',
      node_args: '--max-old-space-size=1024',
      max_memory_restart: '1300M',
      wait_ready: true,
      listen_timeout: 8000,
      kill_timeout: 5000,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      exp_backoff_restart_delay: 100,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      error_file: path.join(__dirname, 'server/logs/pm2-backend-error.log'),
      out_file: path.join(__dirname, 'server/logs/pm2-backend-out.log'),
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    },
    {
      name: 'digiads-landing',
      cwd: path.join(__dirname, 'landing-page'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4100',
      max_memory_restart: '250M',
      kill_timeout: 5000,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      exp_backoff_restart_delay: 100,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      error_file: path.join(__dirname, 'landing-page/.next/logs/pm2-error.log'),
      out_file: path.join(__dirname, 'landing-page/.next/logs/pm2-out.log'),
      env: {
        NODE_ENV: 'production',
        PORT: 4100
      }
    },
    {
      name: 'digiads-user',
      cwd: path.join(__dirname, 'user-portal'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4200',
      max_memory_restart: '400M',
      kill_timeout: 5000,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      exp_backoff_restart_delay: 100,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      error_file: path.join(__dirname, 'user-portal/.next/logs/pm2-error.log'),
      out_file: path.join(__dirname, 'user-portal/.next/logs/pm2-out.log'),
      env: {
        NODE_ENV: 'production',
        PORT: 4200
      }
    },
    {
      name: 'digiads-admin',
      cwd: path.join(__dirname, 'admin-portal'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4300',
      max_memory_restart: '350M',
      kill_timeout: 5000,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      exp_backoff_restart_delay: 100,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      error_file: path.join(__dirname, 'admin-portal/.next/logs/pm2-error.log'),
      out_file: path.join(__dirname, 'admin-portal/.next/logs/pm2-out.log'),
      env: {
        NODE_ENV: 'production',
        PORT: 4300
      }
    }
  ]
};
