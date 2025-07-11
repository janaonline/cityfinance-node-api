const express = require('express');
const router = express.Router();
const Redis = require('../../service/redis');
const cacheMiddleware = require('../../middlewares/cacheMiddleware');
const { clearCacheByType } = require('../../service/cacheService.js')
const {
	getLatestAfsYear,
	getLastModifiedDate,
	getLatestStandardizedYear,
	getLatestBudgetYear,
	getLatestSlbYear,
	getLatestBorrwoingsYear,
} = require('./common.js');

// Get the latest AFS years.
router.get('/get-latest-aa-year', getLatestAfsYear);

// Get the latest Ledger years.
router.get('/get-latest-standardized-year', getLatestStandardizedYear);

// Get the latest Budget years.
router.get('/get-latest-budget-year', getLatestBudgetYear);

// Get the latest SLBs years.
router.get('/get-latest-slbs-year', getLatestSlbYear);

// Get the latest bond-issuer-items years.
router.get('/get-latest-borrowings-year', getLatestBorrwoingsYear);

// Get the last modified date - ledgers
router.get(
	'/get-last-modified-date',
	cacheMiddleware('dashboard'),
	getLastModifiedDate
);

// Delete redis key
router.get('/delete-redis-key', (req, res) => {
	// Redis.del(req.query.key);
	if (!req.query.key) 
		return res.send({ message: `Key is not provided!` });
	
	clearCacheByType(req.query.key);
	return res.send({ message: `'${req.query.key}' deleted successfully!` });
});

// check if the server is in maintenance mode
router.get('/maintenance', (req, res) => {
	const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
	res.status(maintenanceMode ? 503 : 200).json({
		maintenance: maintenanceMode,
	});
});

module.exports = router;
