const ObjectId = require('mongoose').Types.ObjectId;

/**
 * isHeader: Boolean - Indicates whether the item is a header. Used by the front-end to skip rendering a dash ("-") in the table.
 * reportType: 'detailed' | 'summary' - Specifies the type of report. Helps the front-end filter content based on the selected report type.
 * calculation: Boolean - Flags whether the item requires back-end calculation based on grouped line items.
 * formula: { add: [], sub: [] } - Defines the calculation logic using lists of line item keys to add and subtract.
 * info: Used on front-end to add info icon.
 */

const INCOME_STATEMENT_STRUCTURE = [
	{
		code: null,
		isHeader: true,
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
		calculation: true,
		formula: { add: [120, 130, 140, 150] },
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
		calculation: true,
		formula: { add: [170, 171, 180] },
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
		calculation: true,
		formula: {
			add: [
				'110',
				'120',
				'130',
				'140',
				'150',
				'160',
				'170',
				'171',
				'180',
				'100',
			],
		},
		info: 'Calculation: (110 + 120 + 130 + 140 + 150 + 160 + 170 + 171 + 180 + 100)',
		class: 'fw-bold',
	},
	{
		code: null,
		isHeader: true,
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
		calculation: true,
		formula: { add: ['250', '270', '271', '272'] },
		lineItem: 'Other Income',
	},
	{
		code: 200,
		lineItem: 'Others',
	},
	{
		code: null,
		lineItem: 'Total Expenditure(B)',
		calculation: true,
		formula: {
			add: [
				'210',
				'220',
				'230',
				'240',
				'250',
				'260',
				'270',
				'271',
				'272',
				'200',
			],
		},
		info: 'Calculation: (210 + 220 + 230 + 240 + 250 + 260 + 270 + 271 + 272 + 200)',
		class: 'fw-bold',
	},
	{
		code: null,
		calculation: true,
		formula: {
			add: [
				'110',
				'120',
				'130',
				'140',
				'150',
				'160',
				'170',
				'171',
				'180',
				'100',
			],
			sub: [
				'210',
				'220',
				'230',
				'240',
				'250',
				'260',
				'270',
				'271',
				'272',
				'200',
			],
		},
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
		calculation: true,
		formula: {
			add: [
				'110',
				'120',
				'130',
				'140',
				'150',
				'160',
				'170',
				'171',
				'180',
				'100',
				'280',
			],
			sub: [
				'210',
				'220',
				'230',
				'240',
				'250',
				'260',
				'270',
				'271',
				'272',
				'200',
			],
		},
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
		calculation: true,
		formula: {
			add: [
				'110',
				'120',
				'130',
				'140',
				'150',
				'160',
				'170',
				'171',
				'180',
				'100',
				'280',
				'290',
			],
			sub: [
				'210',
				'220',
				'230',
				'240',
				'250',
				'260',
				'270',
				'271',
				'272',
				'200',
			],
		},
		lineItem: 'Net Surplus/(Deficit) carried over (E) (D+290)',
		class: 'fw-bold',
	},
];

const BALANCE_SHEET_STRUCTURE = [
	{
		code: null,
		isHeader: true,
		lineItem: 'A. Liabilities',
		class: 'fw-bold',
	},
	{
		code: null,
		isHeader: true,
		reportType: 'detailed',
		lineItem: 'I. Reserves & Surplus',
		class: 'fw-bold',
	},
	{
		code: 310,
		lineItem: 'Municipal (General) Fund',
		reportType: 'detailed',
	},
	{
		code: 311,
		lineItem: 'Earmarked Funds',
		reportType: 'detailed',
	},
	{
		code: 312,
		lineItem: 'Reserves',
		reportType: 'detailed',
	},
	{
		code: '310-312',
		lineItem: 'Reserves & Surplus',
		reportType: 'summary',
		calculation: true,
		formula: { add: ['310', '311', '312'] },
	},
	{
		code: null,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'Total Reserves & Surplus (I)',
		calculation: true,
		formula: { add: ['310', '311', '312'] },
		info: 'Calculation: (310 + 311 + 312)',
	},
	{
		code: null,
		isHeader: true,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'II. Grants , Contribution for specific purposes',
	},
	{
		code: 320,
		lineItem: 'Grants, Contribution for Specific purposes',
	},
	{
		code: null,
		class: 'fw-bold',
		lineItem: 'Total Grants , Contribution for specific purposes (II)',
		reportType: 'detailed',
		info: 'Calculation: (320)',
		calculation: true,
		formula: { add: ['320'] },
	},
	{
		code: null,
		isHeader: true,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'III. Loans',
	},
	{
		code: 330,
		reportType: 'detailed',
		lineItem: 'Secured Loans',
	},
	{
		code: 331,
		reportType: 'detailed',
		lineItem: 'Unsecured Loans',
	},
	{
		code: null,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'Total Loans (III)',
		info: 'Calculation: (330 + 331)',
		calculation: true,
		formula: { add: ['330', '331'] },
	},
	{
		code: '330-331',
		reportType: 'summary',
		lineItem: 'Loans',
		calculation: true,
		formula: { add: ['330', '331'] },
	},
	{
		code: null,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'IV. Current Liabilities and Provisions',
		isHeader: true,
	},
	{
		code: 340,
		reportType: 'detailed',
		lineItem: 'Deposits received',
	},
	{
		code: 341,
		reportType: 'detailed',
		lineItem: 'Deposit Works',
	},
	{
		code: 350,
		reportType: 'detailed',
		lineItem: 'Other Liabilities (Sundry Creditors)',
	},
	{
		code: 360,
		reportType: 'detailed',
		lineItem: 'Provisions',
	},
	{
		code: '340-360',
		reportType: 'summary',
		lineItem: 'Current Liabilities and Provisions',
		calculation: true,
		formula: { add: ['340', '341', '350', '360'] },
	},
	{
		code: 300,
		lineItem: 'Others',
	},
	{
		code: null,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'Total Current Liabilities and Provisions (IV)',
		info: 'Calculation: (340 + 341 + 350 + 360 + 300)',
		calculation: true,
		formula: { add: ['340', '341', '350', '360', '300'] },
	},
	{
		code: null,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'Total Liabilities',
		info: 'Calculation: (I + II + III + IV)',
		calculation: true,
		formula: {
			add: [
				'310',
				'311',
				'312',
				'320',
				'330',
				'331',
				'340',
				'341',
				'350',
				'360',
				'300',
			],
		},
	},
	{
		code: null,
		reportType: 'summary',
		lineItem: 'Total Liabilities (A)',
		info: 'Calculation: (310 + 311 + 312 + 320 + 330 + 331 + 340 + 341 + 350 + 360 + 300)',
		class: 'fw-bold',
		calculation: true,
		formula: {
			add: [
				'310',
				'311',
				'312',
				'320',
				'330',
				'331',
				'340',
				'341',
				'350',
				'360',
				'300',
			],
		},
	},
	{
		code: null,
		lineItem: 'B. Assets',
		isHeader: true,
		class: 'fw-bold',
	},
	{
		code: null,
		class: 'fw-bold',
		lineItem: 'I. Fixed Assets',
		reportType: 'detailed',
		isHeader: true,
	},
	{
		code: 410,
		reportType: 'detailed',
		lineItem: 'Gross Block',
	},
	{
		code: 411,
		reportType: 'detailed',
		lineItem: 'Accumulated Depreciation',
	},
	{
		code: null,
		class: 'fw-bold',
		lineItem: 'Net Block',
		reportType: 'detailed',
		info: 'Calculation: (410 + 411)',
		calculation: true,
		// formula: { sub: ['410', '411'] },
		formula: { add: ['410', '411'] },
	},
	{
		code: 412,
		reportType: 'detailed',
		lineItem: 'Capital Work-in-progress',
	},
	{
		code: '410-412',
		reportType: 'summary',
		lineItem: 'Fixed Assets',
		info: 'Calculation: (410 + 411 + 412)',
		calculation: true,
		formula: {
			add: ['410', '411', '412'],
			// add: ['410', '412'],
			// sub: ['411'],
		},
	},
	{
		code: null,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'Total Fixed Assets (I)',
		info: 'Calculation: (410 + 411 + 412)',
		calculation: true,
		formula: {
			add: ['410', '411', '412'],
			// add: ['410', '412'],
			// sub: ['411'],
		},
	},
	{
		code: null,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'II. Investments',
		isHeader: true,
	},
	{
		code: 420,
		reportType: 'detailed',
		lineItem: 'Investment - General Fund',
	},
	{
		code: 421,
		reportType: 'detailed',
		lineItem: 'Investment - Other Funds',
	},
	{
		code: '420-421',
		reportType: 'summary',
		lineItem: 'Investments',
		calculation: true,
		formula: { add: ['420', '421'] },
	},
	{
		code: null,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'Total Investments (II)',
		info: 'Calculation: (420 + 421)',
		calculation: true,
		formula: { add: ['420', '421'] },
	},
	{
		code: null,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'III. Current Assets, Loans and Advances',
		isHeader: true,
	},
	{
		code: 430,
		reportType: 'detailed',
		lineItem: 'Stock in Hand (Inventories)',
	},
	{
		code: 431,
		reportType: 'detailed',
		lineItem: 'Sundry Debtors (Receivables)',
	},
	{
		code: 432,
		reportType: 'detailed',
		lineItem: 'Accumulated Provisions against Bad and Doubtful Receivables',
	},
	{
		code: null,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'Net amount outstanding (i)',
		info: 'Calculation: (430 + 431 + 432)',
		calculation: true,
		formula: {
			add: ['430', '431', '432'],
			// add: ['430', '431'],
			// sub: ['432'],
		},
	},
	{
		code: 440,
		reportType: 'detailed',
		lineItem: 'Prepaid Expenses',
	},
	{
		code: 450,
		reportType: 'detailed',
		lineItem: 'Cash and Bank Balance',
	},
	{
		code: 460,
		reportType: 'detailed',
		lineItem: 'Loans, Advances and Deposits',
	},
	{
		code: null,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'Net amount outstanding (ii)',
		info: 'Calculation: (440 + 450 + 460)',
		calculation: true,
		formula: { add: ['440', '450', '460'] },
	},
	{
		code: null,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'Total Current Assets, Loans and Advances (III)',
		info: 'Calculation: i + ii',
		calculation: true,
		formula: {
			add: ['430', '431', '432', '440', '450', '460',],
			// add: ['430', '431', '440', '450', '460', '420', '421'],
			// sub: ['432'],
		},
	},
	{
		code: '430-461',
		reportType: 'summary',
		lineItem: 'Current Assets, Loans and Advances',
		calculation: true,
		formula: {
			add: ['430', '431', '432', '440', '450', '460',]
		}
	},
	{
		code: null,
		isHeader: true,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'IV. Other Assets',
	},
	{
		code: 470,
		reportType: 'detailed',
		lineItem: 'Other Assets',
	},
	{
		code: 480,
		reportType: 'detailed',
		lineItem: 'Miscellaneous Expenditure (to the extent not written off)',
	},
	{
		code: '470-480',
		reportType: 'summary',
		lineItem: 'Other Assets',
		calculation: true,
		formula: { add: ['470', '480'] },
	},
	{
		code: 400,
		lineItem: 'Others',
	},
	{
		code: null,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'Total Other Assets (IV)',
		info: 'Calculation: (470 + 480 + 400)',
		calculation: true,
		formula: { add: ['470', '480', '400'] },
	},
	{
		code: null,
		class: 'fw-bold',
		reportType: 'detailed',
		lineItem: 'Total Assets',
		info: 'Calculation: (I + II + III + IV)',
		calculation: true,
		formula: {
			add: [
				'470',
				'480',
				'400',
				'430',
				'431',
				'440',
				'450',
				'460',
				'410',
				'412',
				'411',
				'432'
			],
			// sub: ['432', '411'],
		},
	},
	{
		code: null,
		reportType: 'summary',
		lineItem: 'Total Assets (B)',
		class: 'fw-bold',
		calculation: true,
		formula: {
			add: [
				'410',
				'412',
				'420',
				'421',
				'430',
				'431',
				'440',
				'450',
				'460',
				'470',
				'480',
				'400',
				'411',
				'432'
			],
			// sub: ['411', '432'],
		},
	},
];

module.exports.getStructure = (btnKey = 'balanceSheet') => {
	let STRUCTURE = BALANCE_SHEET_STRUCTURE;
	if (btnKey === 'incomeStatement') STRUCTURE = INCOME_STATEMENT_STRUCTURE;

	return STRUCTURE;
};

module.exports.getQuery = (ulbId) => {
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
					{
						$project: {
							lineItems: 1,
							year: 1,
							audit_status: 1,
						},
					},
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
};
