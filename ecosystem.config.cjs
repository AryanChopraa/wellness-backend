/** PM2 config. Use: pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: 'wellness-api',
      script: 'dist/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
