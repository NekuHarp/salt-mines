// Must be .cjs because the project uses "type": "module" in package.json.
// Usage: pm2 start ecosystem.config.cjs --env production

module.exports = {
    apps: [
        {
            name: "salt-mines",
            script: "index.js",
            cwd: "/home/opc/salt-mines",
            watch: false,
            autorestart: true,
            max_memory_restart: "200M",
            env_production: {
                NODE_ENV: "production",
                PORT: "3000",
            },
        },
    ],
};
