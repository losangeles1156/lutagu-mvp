const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
// This ensures the Rust services get the same config as the Next.js app
const envConfig = dotenv.config({ path: path.resolve(__dirname, '.env.local') }).parsed || {};

// Explicitly set the ports if not in env
envConfig.L2_PORT = envConfig.L2_PORT || 8081;
envConfig.L4_PORT = envConfig.L4_PORT || 8787;

module.exports = {
    apps: [
        {
            name: "l2-status",
            cwd: "./services/l2-status-rs",
            script: "./target/release/l2-status-rs",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '200M',
            env: {
                ...envConfig, // Inject all vars from .env.local
                PORT: 8081    // Ensure PORT is set correctly for Axum
            }
        },
        {
            name: "l4-routing",
            cwd: "./services/l4-routing-rs",
            script: "./target/release/l4-routing-rs",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                ...envConfig,
                PORT: 8787,
                // L4 service needs to find routing_graph.json relative to its CWD
                // or via absolute path. By setting CWD above, relative path works.
            }
        }
    ]
};
