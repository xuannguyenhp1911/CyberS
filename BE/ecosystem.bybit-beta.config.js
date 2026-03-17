module.exports = {
  apps: [
    {
      name: 'server.js',
      script: 'server.js',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      time: true,
    },
    {
      name: 'balanceWalletByTime.js',
      script: 'balanceWalletByTime.js',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      time: true,
    },
    {
      // Keep the PM2 name equal to the filename because the worker self-restarts by filename.
      name: 'runTrade-V3-ByBit-Beta.js',
      script: 'Trader/ByBit/V3/runTrade-V3-ByBit-Beta.js',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      time: true,
    },
  ],
};
