const LedgerLog = require('../../../models/LedgerLog');
const Ulb = require('../../../models/Ulb');
const ObjectId = require('mongoose').Types.ObjectId;
const { getLastModifiedDateHelper } = require('../../common/common');

module.exports.getData = async (req, res) => {
	try {
		const { stateCode, stateId } = req.query;
		const ledgerCondition = {
			isStandardizable: { $ne: 'No' },
		};
		const ulbsCondition = {
			isActive: true,
			isPublish: true,
		};

		if (stateCode && stateId) {
			ledgerCondition['state_code'] = stateCode;
			ulbsCondition['state'] = ObjectId(stateId);
		}

		// Card 1 - ULBs with at least one year of data
		const atleastOneYearData = getAtleastOneYearData(ledgerCondition);

		// Card 2 - Financial statements and highest availability
		const financialStatements = getAvaiablityYearWise(ledgerCondition);

		// Card 3 - Total ULB count
		const ulbCount = getTotalUlbCount(ulbsCondition);

		// Last modified date.
		const lastModifiedDate = getLastModifiedDateHelper(ledgerCondition);

		// Await all data in parallel
		const [oneYearCount, fsData, totUlbCount, lastModifiedAt] =
			await Promise.all([
				atleastOneYearData,
				financialStatements,
				ulbCount,
				lastModifiedDate,
			]);

		// Final response
		const exploreData = createResponseStructure(
			oneYearCount,
			fsData,
			totUlbCount
		);

		res.status(200).json({
			success: true,
			gridDetails: exploreData,
			lastModifiedAt: lastModifiedAt?.[0]?.lastModifiedAt || null,
		});
	} catch (error) {
		console.error('Failed to get home page data:', error);
		res.status(500).json({
			success: false,
			message: `Failed to get home page data: ${error.message}`,
		});
	}
};

// Get ULBs count whose have atleast one year data - Card 1.
const getAtleastOneYearData = (ledgerCondition) => {
	return LedgerLog.distinct('ulb_id', ledgerCondition).then(
		(ulbIds) => ulbIds.length
	);
};

// Get standardized data availability - year wise - Card 2.
const getAvaiablityYearWise = (ledgerCondition) => {
	return LedgerLog.aggregate([
		{ $match: ledgerCondition },
		{
			$group: {
				_id: '$year',
				count: { $sum: 1 },
			},
		},
		{ $sort: { _id: 1 } },
	]).then((result) => {
		const total = result.reduce((acc, curr) => acc + curr.count, 0);
		const info = result
			.map((item) => `${item._id}: ${item.count.toLocaleString()}`)
			.join('\n');
		const highestFy = result.reduce(
			(a, b) => (a.count > b.count ? a : b),
			{}
		);

		return {
			total,
			info,
			highestFy,
			years: result.map((yearObj) => yearObj['_id']),
		};
	});
};

// Get total count of ulbs - Denominator for card 5.
const getTotalUlbCount = (ulbsCondition) => {
	return Ulb.countDocuments(ulbsCondition);
};

// Based on data fetched create response structure.
const createResponseStructure = (oneYearCount, fsData, totUlbCount) => {
	// Card 4 - Calculate highest availability %
	const highestFy = fsData.highestFy._id;
	const highestPerc = ((fsData.highestFy.count / totUlbCount) * 100).toFixed(
		0
	);

	// Card 5 - Determine range of years (FYs)
	const years = fsData.years.sort();
	const startYear = years[0];
	const endYear = years[years.length - 1];

	return [
		{
			sequence: 1,
			label: 'ULBs with at least 1 Year of Financial Data',
			value: oneYearCount.toLocaleString(),
			info: '',
		},
		{
			sequence: 2,
			label: `Financial Statements for FYs ${startYear} to ${endYear}`,
			value: fsData.total.toLocaleString(),
			info: fsData.info,
		},
		// {
		// 	sequence: 3,
		// 	label: 'ULBs Credit Rating Reports',
		// 	value: '',
		// 	info: '',
		// },
		// {
		// 	sequence: 4,
		// 	label: 'ULBs With Investment Grade Rating',
		// 	value: '',
		// 	info: '',
		// },
		{
			sequence: 5,
			label: `Highest Financial Data Availability is in FY ${highestFy}`,
			value: `${highestPerc}%`,
			info: '',
		},
		// {
		// 	sequenct: 6,
		// 	label: 'Municipal Bond Issuances Of Rs. 6,833 Cr With Details',
		// 	value: '',
		// 	info: '',
		// },
	];
};
