const path = require('path');

module.exports = {
  apps: [
    {
      name: 'digiads-backend',
      cwd: path.join(__dirname, 'server'),
      script: 'server.js',
      args: '--env-file=config/.env.prod',
      node_args: '--max-old-space-size=2048',
      max_memory_restart: '2200M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'digiads-landing',
      cwd: path.join(__dirname, 'landing-page'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4100',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'digiads-user',
      cwd: path.join(__dirname, 'user-portal'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4200',
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'digiads-admin',
      cwd: path.join(__dirname, 'admin-portal'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4300',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
