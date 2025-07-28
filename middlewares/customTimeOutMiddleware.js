const withTimeout = (ms) => {
    return (req, res, next) => {
        const onTimeout = () => {
            if (!res.headersSent) {
                res.status(503).json({ message: 'Request timed out' });
            }
        };

        res.setTimeout(ms, onTimeout);

        // Clean up listener when done
        res.on('finish', () => res.removeListener('timeout', onTimeout));
        res.on('close', () => res.removeListener('timeout', onTimeout));

        next();
    };
};

module.exports = withTimeout;
