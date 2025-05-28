const redis = require('redis');
const CONFIG = require("../config/app_config");

// Determine the Redis URL based on the environment (dev, prod, etc.)
let url;

// Check if Redis configuration exists for the current environment.
// If yes assign Redis URL for the current environment.
if (CONFIG.REDIS && CONFIG.REDIS.hasOwnProperty(process.env.ENV)) {
    url = CONFIG.REDIS[process.env.ENV];
} else {
    // If the environment is not supported, log an error and stop the application
    console.info(`Env is not supported: ${process.env.ENV}`);
    process.exit(1);
}

// Create a Redis client with the URL from the configuration
const Client = redis.createClient({ url });

// Event listeners.
Client.on("connect", () => console.log(`${process.env.ENV} Redis Server Connected`));
Client.on("disconnect", () => console.log("Redis client disconnected. Please check if the server is still running."));
Client.on("error", (err) => console.error("Redis error occurred:", err));
Client.on("end", () => console.log("Redis connection closed. No further Redis commands will work."));

// Cleanup when Redis ends:
process.on('SIGINT', () => {
    console.log('Shutting down Redis...');
    Client.quit();
    process.exit(0);
});

module.exports = Client;
