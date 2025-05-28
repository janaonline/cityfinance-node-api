const { getCache, setCache } = require('../service/cacheService');

// Generalized cache middleware for different data types (e.g., dashboard)
const cacheMiddleware = (cacheType) => {
    return async (req, res, next) => {
        const key = `${cacheType}:${req.path}:${JSON.stringify(req.query)}`;

        try {
            const cachedData = await getCache(key);
            if (cachedData) {
                return res.json(JSON.parse(cachedData));
            }

            // Intercept res.json and cache the response
            const originalJson = res.json.bind(res);
            res.json = async (data) => {
                await setCache(key, data);
                return originalJson(data);
            };

            next();
        } catch (err) {
            console.error('Cache middleware error:', err);
            next();
        }
    };
};

module.exports = cacheMiddleware;
