const ObjectId = require('mongoose').Types.ObjectId;
const Ulb = require('../../../models/Ulb');

module.exports.bsIs = async (req, res) => {
	try {
		// Validated ulbId.
		const { ulbId } = req.query;
		if (!ulbId || !ObjectId.isValid(ulbId))
			return res.status(400).json({ error: 'Invalid or missing ulbId' });

		// Fetch data from ledgerLogs.
		const ledgerData = await Ulb.aggregate(query(ulbId)).exec();

		// Create response.
		const response = createResponseStructure(ledgerData);

		return res.status(200).json({
			success: true,
			data: response,
		});
	} catch (err) {
		console.error('[ULB Fetch Error]', err);
		return res
			.status(500)
			.json({ error: `Internal server error: ${err.message}.` });
	}
};

function query(ulbId) {
	return [
		{ $match: { _id: ObjectId(ulbId) } },
		{
			$lookup: {
				from: 'ledgerlogs',
				let: { ulbId: '$_id' },
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{ $eq: ['$ulb_id', '$$ulbId'] },
									{ $ne: ['$isStandardizable', 'No'] },
								],
							},
						},
					},
					{ $project: { lineItems: 1, year: 1, audit_status: 1 } },
				],
				as: 'ledgerLogData',
			},
		},
		{
			$unwind: {
				path: '$ledgerLogData',
				preserveNullAndEmptyArrays: false,
			},
		},
		{
			$project: {
				population: 1,
				ledgerLogData: 1,
			},
		},
	];
}

function createResponseStructure(yearWiseLedgerData) {
	// Deep clone ELEMENTDATA to avoid mutating shared reference
	const responseStructure = JSON.parse(JSON.stringify(ELEMENTDATA));

	for (const yearEntry of yearWiseLedgerData) {
		const ledgerLog = yearEntry.ledgerLogData;
		if (!ledgerLog || !ledgerLog.year || !ledgerLog.lineItems) continue;

		const yearKey = ledgerLog.year.replace('-', '');

		for (const item of responseStructure) {
			const lineItemCode = item.code;
			if (lineItemCode && ledgerLog.lineItems[lineItemCode] !== null)
				item[yearKey] = ledgerLog.lineItems[lineItemCode];
		}
	}

	return responseStructure;
}

const ELEMENTDATA = [
	{
		code: null,
		lineItem: 'A.Income',
		class: 'fw-bold',
	},
	{
		code: 110,
		lineItem: 'Tax Revenue',
	},
	{
		code: 120,
		reportType: 'detailed',
		lineItem: 'Assigned Revenues & Compensation',
	},
	{
		code: 130,
		reportType: 'detailed',
		lineItem: 'Rental Income from Municipal Properties',
	},
	{
		code: 140,
		reportType: 'detailed',
		lineItem: 'Fee & User Charges',
	},
	{
		code: 150,
		reportType: 'detailed',
		lineItem: 'Sale & Hire charges',
	},
	{
		code: '120-150',
		reportType: 'summary',
		lineItem: 'Non-Tax Revenue',
	},
	{
		code: 160,
		lineItem: 'Revenue Grants, Contributions & Subsidies',
	},
	{
		code: 170,
		reportType: 'detailed',
		lineItem: 'Income from Investment',
	},
	{
		code: 171,
		reportType: 'detailed',
		lineItem: 'Interest earned',
	},
	{
		code: 180,
		reportType: 'detailed',
		lineItem: 'Other Income',
	},
	{
		code: '170-180',
		reportType: 'summary',
		lineItem: 'Other Income',
	},
	{
		code: 100,
		lineItem: 'Others',
	},
	{
		code: null,
		key: 'totalIncome',
		lineItem: 'Total Income (A)',
		info: 'Calculation: (110 + 120 + 130 + 140 + 150 + 160 + 170 + 171 + 180 + 100)',
		class: 'fw-bold',
	},
	{
		code: null,
		lineItem: 'B.Expenditure',
		class: 'fw-bold',
	},
	{
		code: 210,
		lineItem: 'Establishment Expenses',
	},
	{
		code: 220,
		lineItem: 'Administrative Expenses',
	},
	{
		code: 230,
		lineItem: 'Operation & Maintenance',
	},
	{
		code: 240,
		lineItem: 'Interest & Finance Charges',
	},
	{
		code: 250,
		reportType: 'detailed',
		lineItem: 'Programme Expenses',
	},
	{
		code: 260,
		lineItem: 'Revenue Grants, Contributions & Subsidies (Exp)',
	},
	{
		code: 270,
		reportType: 'detailed',
		lineItem: 'Provisions and Write Off',
	},
	{
		code: 271,
		lineItem: 'Miscellaneous Expenses',
	},
	{
		code: 272,
		reportType: 'detailed',
		lineItem: 'Depreciation on Fixed Assets',
	},
	{
		code: '250, 270-272',
		reportType: 'summary',
		lineItem: 'Other Income',
	},
	{
		code: 200,
		lineItem: 'Others',
	},
	{
		code: null,
		lineItem: 'Total Expenditure(B)',
		info: 'Calculation: (210 + 220 + 230 + 240 + 250 + 260 + 270 + 271 + 272 + 200)',
		class: 'fw-bold',
	},
	{
		code: null,
		lineItem:
			'Gross Surplus/(Deficit) of Income over Expenditure before Prior Period Items (C) (A-B)',
		class: 'fw-bold',
	},
	{
		code: 280,
		lineItem: 'Prior Period items',
	},
	{
		code: null,
		lineItem:
			'Gross Surplus/(Deficit) of Income over Expenditure after Prior Period Items item(D) (C+280)',
		class: 'fw-bold',
	},
	{
		code: 290,
		lineItem: 'Transfer to Reserve Funds',
	},
	{
		code: null,
		lineItem: 'Net Surplus/(Deficit) carried over (E) (D+290)',
		class: 'fw-bold',
	},
];
