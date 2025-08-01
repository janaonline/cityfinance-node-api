const ObjectId = require('mongoose').Types.ObjectId;
const Year = require('../../models/Year');
const AnnualAccountData = require('../../models/AnnualAccounts');
const LedgerLog = require('../../models/LedgerLog');
const BudgetDocument = require('../../models/budgetDocument');
const Indicator = require('../../models/indicators');
const BondIssuerItem = require('../../models/BondIssuerItem');

// Returns latest audited/ unAudited year with data.
module.exports.getLatestAfsYear = async (req, res) => {
	try {
		const auditType = req.query.auditType;
		const key = `${auditType}.year`;
		const afsDistinctYearKeys = await AnnualAccountData.distinct(key);
		const yearsObj = await getYearsList();

		// reduce() is performing lexicographical comparison (works correctly only if values have the same format and length)
		const afsYears = afsDistinctYearKeys.map((id) => yearsObj[id]);
		// .reduce((max, year) => (year > max ? year : max));

		res.status(200).json({
			success: true,
			afsYears,
		});
	} catch (error) {
		console.error('Error in getLatestAfsYear(): ', error);
		res.status(500).json({
			success: false,
			message: `Error in getLatestAfsYear(): ${error.message}`,
		});
	}
};

// Returns latest standardized/ ledger year with data.
module.exports.getLatestStandardizedYear = async (req, res) => {
	try {
		const years = await getStandardizedYears(req.query);
		years.sort((a, b) => b.localeCompare(a));

		res.status(200).json({
			success: true,
			ledgerYears: years,
		});
	} catch (error) {
		console.error('Error in getLatestStandardizedYear(): ', error);
		res.status(500).json({
			success: false,
			message: `Error in getLatestStandardizedYear(): ${error.message}`,
		});
	}
};

// Helper: Get distinct standardized years
const getStandardizedYears = ({ stateCode, ulbId, auditStatus }) => {
	const condition = { isStandardizable: { $ne: 'No' } };

	if (stateCode) condition.state_code = stateCode;
	if (ulbId && ObjectId.isValid(ulbId))
		condition.ulb_id = new ObjectId(ulbId);
	if (auditStatus) condition.audit_status = auditStatus;

	return LedgerLog.distinct('year', condition);
};

module.exports.getStandardizedYears = getStandardizedYears;

// Returns latest budget year with data.
module.exports.getLatestBudgetYear = async (req, res) => {
	try {
		const years = await getBudgetYears(req.query);
		years.sort((a, b) => b.localeCompare(a));

		res.status(200).json({
			success: true,
			budgetYears: years,
		});
	} catch (error) {
		console.error('Error in getLatestBudgetYear(): ', error);
		res.status(500).json({
			success: false,
			message: `Error in getLatestBudgetYear(): ${error.message}`,
		});
	}
};

// Helper: Get distinct budget years
const getBudgetYears = ({ ulbId: ulb }) => {
	const condition = {};
	if (ulb && ObjectId.isValid(ulb)) condition.ulb = new ObjectId(ulb);

	return BudgetDocument.distinct('yearsData.designYear', condition);
};

// Returns latest slb year with data.
module.exports.getLatestSlbYear = async (req, res) => {
	try {
		const years = await getSlbYears(req.query);
		years.sort((a, b) => b.localeCompare(a));

		res.status(200).json({
			success: true,
			slbYears: years,
		});
	} catch (error) {
		console.error('Error in getLatestSlbYear(): ', error);
		res.status(500).json({
			success: false,
			message: `Error in getLatestSlbYear(): ${error.message}`,
		});
	}
};

// Helper: Get distinct slb years
const getSlbYears = ({ ulb }) => {
	const condition = {};
	if (ulb && ObjectId.isValid(ulb)) condition.ulb = new ObjectId(ulb);

	return Indicator.distinct('year', condition);
};

// Returns latest bond issuer year with data.
module.exports.getLatestBorrwoingsYear = async (req, res) => {
	try {
		const years = await getBorrowingYears(req.query);
		years.sort((a, b) => b.localeCompare(a));

		res.status(200).json({
			success: true,
			borrowingYears: years,
		});
	} catch (error) {
		console.error('Error in getLatestBorrwoingsYear(): ', error);
		res.status(500).json({
			success: false,
			message: `Error in getLatestBorrwoingsYear(): ${error.message}`,
		});
	}
};

// Helper: Get distinct slb years
const getBorrowingYears = ({ ulbId, stateId: state }) => {
	const condition = {};
	if (ulbId && ObjectId.isValid(ulbId)) condition.ulbId = new ObjectId(ulbId);
	if (state && ObjectId.isValid(state)) condition.state = new ObjectId(state);

	return BondIssuerItem.distinct('yearOfBondIssued', condition);
};

// eg: {606aadac4dff55e6c075c507: '2020-21', 606aaf854dff55e6c075d219: '2021-22', ...}
const getYearsList = async () => {
	try {
		const yearsObj = await Year.aggregate([
			{
				$group: {
					_id: null,
					keyValuePairs: {
						$push: {
							k: { $toString: '$_id' },
							v: '$year',
						},
					},
				},
			},
			{
				$project: {
					_id: 0,
					result: { $arrayToObject: '$keyValuePairs' },
				},
			},
		]);

		return yearsObj[0].result || {};
	} catch (error) {
		console.error('Error in getYearsList(): ', error);
		return error.message;
	}
};

// Returns last modified date from ledgerLogs.
module.exports.getLastModifiedDate = async (req, res) => {
	try {
		const { state_code, ulb_id, year } = req.query;
		const findCondition = {};
		if (state_code) findCondition['state_code'] = state_code;
		if (ulb_id) findCondition['ulb_id'] = ObjectId(ulb_id);
		if (year) findCondition['year'] = year;

		const result = await getLastModifiedDateHelper(findCondition);

		res.status(200).json({
			lastModifiedAt: result?.[0]?.lastModifiedAt || null,
		});
	} catch (error) {
		console.error('Error fetching last modified date:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};

// Helper: function to find last modified date based on find condition.
module.exports.getLastModifiedDateHelper = (findCondition) => {
	return LedgerLog.find(findCondition, {
		lastModifiedAt: 1,
		_id: 0,
	})
		.sort({ lastModifiedAt: -1 })
		.limit(1)
		.lean();
};

// eg: Input: 750000, Output: '500K-1M'
module.exports.getPopulationCategory = (population) => {
	if (population < 100000) return '<100K';
	else if (population >= 100000 && population < 500000) return '100K-500K';
	else if (population >= 500000 && population < 1000000) return '500K-1M';
	else if (population >= 1000000 && population < 4000000) return '1M-4M';
	else if (population >= 4000000) return '4M+';
	else return 'NA';
};

// `Intl.NumberFormat` API to format the number with commas (use: Indian locale "en-IN").
module.exports.formatNumberWithCommas = (num) => {
	const formatter = new Intl.NumberFormat('en-IN');
	return formatter.format(num);
};
