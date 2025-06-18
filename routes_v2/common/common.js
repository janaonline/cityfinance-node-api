const ObjectId = require('mongoose').Types.ObjectId;
const Year = require('../../models/Year');
const AnnualAccountData = require('../../models/AnnualAccounts');
const LedgerLog = require('../../models/LedgerLog');

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

// eg: {606aadac4dff55e6c075c507: '2020-21', 606aaf854dff55e6c075d219: '2021-22', ...}
async function getYearsList() {
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
}

// Returns last modified date from ledgerLogs.
module.exports.getLastModifiedDate = async (req, res) => {
	try {
		const { state_code, ulb_id, year } = req.query;
		const findCondition = {};
		if (state_code) findCondition['state_code'] = state_code;
		if (ulb_id) findCondition['ulb_id'] = ObjectId(ulb_id);
		if (year) findCondition['year'] = year;

		const result = await LedgerLog.find(findCondition, {
			lastModifiedAt: 1,
			_id: 0,
		})
			.sort({ lastModifiedAt: -1 })
			.limit(1)
			.lean();

		res.status(200).json({
			lastModifiedAt: result?.[0]?.lastModifiedAt || null,
		});
	} catch (error) {
		console.error('Error fetching last modified date:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
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
