const { getCache, setCache } = require('../service/cacheService');
const EXPIRATION_IN_SEC = 60 * 60 * 24 * 90; // 3 months

// Generalized cache middleware for different data types (e.g., dashboard)
const cacheMiddleware = (cacheType, expirationInSeconds = EXPIRATION_IN_SEC) => {
    return async (req, res, next) => {
        const key = `${cacheType}:${req.path}:${JSON.stringify(req.query)}:${JSON.stringify(req.body)}`;
        
        try {
            const cachedData = await getCache(key);
            if (cachedData) {
                parsedData = JSON.parse(cachedData);
                parsedData['fromCache'] = true;
                return res.json(parsedData);
            }

            // Intercept res.json and cache the response
            const originalJson = res.json.bind(res);
            res.json = async (data) => {
                await setCache(key, data, expirationInSeconds);
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

// Cache key info: 
// dashboard: LedgerLogs collection (All financial nos. on portal).
// Municipal_Bonds: BondIssuerItem collection.