const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true'; // or use config

const maintenanceMiddleware = (req, res, next) => {
  if (MAINTENANCE_MODE) {
    res.setHeader('Retry-After', '3600'); // optional: client should retry after 1 hour
    return res.status(503).json({
      success: false,
      message: '🔧 The system is currently under maintenance. Please try again later.',
      maintenance: true,
    });
  }

  next(); // continue to normal processing
};

module.exports = maintenanceMiddleware;
