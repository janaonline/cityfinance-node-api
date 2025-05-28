const { Client } = require('../service/redis');

// Set cache data
const setCache = async (key, value, ttl = 3600) => {
    try {
        await Client.setex(key, ttl, JSON.stringify(value));
        console.log(`Cache set for ${key} with TTL of ${ttl} seconds.`);
    } catch (err) {
        console.error("Error setting cache", err);
    }
};

// Get cache data
const getCache = async (key) => {
    return new Promise((resolve, reject) => {
        Client.get(key, (err, value) => {
            if (err) reject(err);
            resolve(value);
        });
    });
};

// Clear cache by key
const clearCacheByKey = async (key) => {
    try {
        await Client.del(key);
        console.log(`Cache cleared for ${key}`);
    } catch (err) {
        console.error("Error clearing cache", err);
    }
};

// Clear all cache by type (e.g., dashboard)
const clearCacheByType = async (cacheType) => {
    try {
        const result = await deleteKeysByPattern(`${cacheType}:*`);
        console.log("Clear redis cache:", result);
    } catch (error) { console.error('Error clearing cache:', error) }
};

// Helper to clear cache based on cacheType (eg: 'dashboad:*')
const deleteKeysByPattern = async (pattern) => {
    return new Promise((resolve, reject) => {
        Client.keys(pattern, (error, keys) => {
            if (error) {
                reject(err);
                return;
            }

            if (keys.length === 0) {
                resolve('No keys found!');
                return;
            }

            Client.del(keys, (delError, response) => {
                if (delError) reject(delError);
                else resolve(`${response} keys deleted.`);
            });
        });
    });
}


module.exports = { setCache, getCache, clearCacheByKey, clearCacheByType };
