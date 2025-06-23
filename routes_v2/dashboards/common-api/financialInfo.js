const LedgerLog = require('../../../models/LedgerLog');
const Ulb = require('../../../models/Ulb');
const ObjectId = require('mongoose').Types.ObjectId;
const { getLastModifiedDateHelper } = require('../../common/common');
const {
	totOwnRevenueArr,
	totRevenueArr,
	totExpenditureArr,
	bsSizeArr,
} = require('../../utils/ledgerFormulas');

module.exports.getData = async (req, res) => {
	try {
		const { year, stateId, ulbId } = req.query;
		const ulbCondition = { isPublish: true };
		const ledgerCondition = {
			$expr: { $eq: ['$ulb_id', '$$ulbId'] },
			isStandardizable: { $ne: 'No' },
		};

		// For state and national page, include only active ULBs.
		// For the city page, display a denotification message if the ULB is inactive.
		if (!ulbId) ulbCondition['isActive'] = true;

		if (ulbId) ulbCondition['_id'] = ObjectId(ulbId);
		if (stateId) ulbCondition['state'] = ObjectId(stateId);

		if (!year) throw new Error('Please provide year!');
		else ledgerCondition['year'] = year;

		const query = getQuery(ulbCondition, ledgerCondition);
		const ledgerLogsData = await Ulb.aggregate(query).exec();
		const result = createResponseStructure(ledgerLogsData);

		res.status(200).json({
			success: true,
			result,
			year,
			isActive: ledgerLogsData[0]?.isActive,
			audit_status: ledgerLogsData[0]?.audit_status || null,
		});
	} catch (error) {
		console.error('Failed to get home page data:', error);
		res.status(500).json({
			success: false,
			message: `Failed to get home page data: ${error.message}`,
		});
	}
};

// Helper: Create query structure.
function getQuery(ulbCondition, ledgerCondition) {
	const query = [
		{ $match: ulbCondition },
		{
			$lookup: {
				from: 'ledgerlogs',
				let: { ulbId: '$_id' },
				pipeline: [
					{ $match: ledgerCondition },
					{
						$project: {
							_id: 0,
							lineItems: 1,
							audit_status: 1,
						},
					},
					{ $limit: 1 },
				],
				as: 'ledgerLog',
			},
		},
		{
			$addFields: {
				lineItems: { $arrayElemAt: ['$ledgerLog.lineItems', 0] },
				audit_status: { $arrayElemAt: ['$ledgerLog.audit_status', 0] },
			},
		},
		{
			$project: {
				_id: 1,
				population: 1,
				// lineItems: 1,
				audit_status: 1,
				isActive: 1,
				totTaxRevenue: '$lineItems.110',
				totOwnRevenue: { $sum: addNullCheck(totOwnRevenueArr) },
				totGrants: '$lineItems.160',
				totRevenue: { $sum: addNullCheck(totRevenueArr) },
				totExpenditure: { $sum: addNullCheck(totExpenditureArr) },
				totBsSize: { $sum: addNullCheck(bsSizeArr) },
			},
		},
		{
			$group: {
				_id: null,
				totTaxRevenue: { $sum: '$totTaxRevenue' },
				totOwnRevenue: { $sum: '$totOwnRevenue' },
				totGrants: { $sum: '$totGrants' },
				totRevenue: { $sum: '$totRevenue' },
				totExpenditure: { $sum: '$totExpenditure' },
				totBsSize: { $sum: '$totBsSize' },
			},
		},
	];

	if ('_id' in ulbCondition) query.pop();
	return query;
}

// Helper: If null then take 0. eg: { $ifNull: ['$lineItems.110', 0] }
function addNullCheck(arr) {
	return arr.map((item) => {
		return { $ifNull: [item, 0] };
	});
}

// Create response structure.
function createResponseStructure(ledgerLogsData) {
	const ledgerLogsDataObj = ledgerLogsData[0];
	return [
		{
			sequence: '1',
			key: 'totTaxRevenue',
			label: 'Total Tax Revenue',
			value: `${ledgerLogsDataObj['totTaxRevenue'] || '-'}`,
			info: '',
			src: './assets/file.svg',
		},
		{
			sequence: '2',
			key: 'totOwnRevenue',
			label: 'Total Own Revenue',
			value: `${ledgerLogsDataObj['totOwnRevenue'] || '-'}`,
			info: '',
			src: './assets/file.svg',
		},
		{
			sequence: '3',
			key: 'totGrants',
			label: 'Total Grant',
			value: `${ledgerLogsDataObj['totGrants'] || '-'}`,
			info: '',
			src: './assets/coinCuren.svg',
		},
		{
			sequence: '4',
			key: 'totRevenue',
			label: 'Total Revenue',
			value: `${ledgerLogsDataObj['totRevenue'] || '-'}`,
			info: '',
			src: './assets/coinCuren.svg',
		},
		{
			sequence: '5',
			key: 'totExpenditure',
			label: 'Total Expenditure',
			value: `${ledgerLogsDataObj['totExpenditure'] || '-'}`,
			info: '',
			src: './assets/coinCuren.svg',
		},
		{
			sequence: '6',
			key: 'totBsSize',
			label: 'Total Balance Sheet Size',
			value: `${ledgerLogsDataObj['totBsSize'] || '-'}`,
			info: '',
			src: './assets/Group 15967.svg',
		},
	];
}
