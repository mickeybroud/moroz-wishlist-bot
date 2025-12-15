require('dotenv').config({ path: '/home/dev/moroz-wishlist-bot/.env' });

module.exports = {
  apps: [{
    name: 'moroz-wishlist-bot',
    script: 'index.js',
    cwd: '/var/www/moroz-wishlist-bot',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: process.env,
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};