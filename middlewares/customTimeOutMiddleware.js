/**
 * Middleware to apply a timeout to specific routes
 * @param ms timeout in milliseconds
 */
const withTimeout = (ms) => {
    return (req, res, next) => {
        const timeoutId = setTimeout(() => {
            if (!res.headersSent) {
                res.status(503).json({ message: 'Request timed out' });
            }
        }, ms);

        res.on('finish', () => clearTimeout(timeoutId));
        res.on('close', () => clearTimeout(timeoutId));

        next();
    };
}

module.exports = withTimeout;