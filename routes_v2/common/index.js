const express = require('express');
const router = express.Router();
const { getLatestAfsYear } = require('./common.js')
const Redis = require('../../service/redis');

// Get the latest AFS year. @params
router.get('/get-latest-aa-year', getLatestAfsYear);

// Delete redis key
router.get('/delete-redis-key', (req, res) => {
    Redis.del(req.query.key);
    return res.send({ message: `'${req.query.key}' deleted successfully!` });
});

// check if the server is in maintenance mode
router.get('/maintenance', (req, res) => {
    const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
    res.status(maintenanceMode ? 503 : 200).json({ maintenance: maintenanceMode });
});

module.exports = router;
