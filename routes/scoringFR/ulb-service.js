const ObjectId = require('mongoose').Types.ObjectId;
const ObjectID = require('mongodb').ObjectID;
const moongose = require('mongoose');
const Response = require('../../service').response;
const { years } = require('../../service/years');
const Ulb = require('../../models/Ulb');
const State = require('../../models/State');
const FiscalRanking = require('../../models/FiscalRanking');
const FiscalRankingMapper = require('../../models/FiscalRankingMapper');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');
const { registerCustomQueryHandler } = require('puppeteer');
const { tableResponse } = require('../../service/common');
async function getScoreFR(populationBucket, indicator, sortOrder = -1) {
	const condition = { isActive: true, populationBucket };
	const ulb = await ScoringFiscalRanking.findOne(condition)
		.sort({ [`${indicator}.score`]: sortOrder })
		.lean();
}

function isValidObjectId(id) {
	if (ObjectId.isValid(id)) {
		if ((String)(new ObjectId(id)) === id) {
			return true;
		}
		return false;
	}
	return false;
}
module.exports.getUlbDetails = async (req, res) => {
	try {
		moongose.set('debug', true);
		// const censusCode = req.params.censusCode;
		const searchId = req.params.searchId;
		let condition = {
			$and: [{ 'isActive': true }, { $or: [{ 'censusCode': searchId }, { 'sbCode': searchId }] }],
		};
		if (isValidObjectId(searchId)) {
			condition = { isActive: true, ulb: ObjectId(searchId) };
		}
		const ulb = await ScoringFiscalRanking.findOne(condition).lean();

		if (!ulb) {
			return res.status(404).json({
				status: false,
				message: 'ULB not found',
			});
		}
		const design_year2022_23 = '606aafb14dff55e6c075d3ae';

		const condition1 = { isActive: true, populationBucket: ulb.populationBucket };
		const populationBucketUlbCount = await ScoringFiscalRanking.countDocuments(condition1).lean();

		const conditionFs = {
			ulb: ObjectId(ulb.ulb),
			design_year: ObjectId(design_year2022_23),
		};

		let fsData = await FiscalRanking.findOne(conditionFs)
			.select('waterSupply sanitationService propertyWaterTax propertySanitationTax registerGis accountStwre')
			.lean();
		const assessmentParameter = {
			resourceMobilization: getTableData(ulb, 'resourceMobilization'),
			expenditurePerformance: getTableData(ulb, 'expenditurePerformance'),
			fiscalGovernance: getTableData(ulb, 'fiscalGovernance'),
		};
		const ulbData = {
			name: ulb.name,
			ulb: ulb.ulb,
			sbCode: ulb.sbCode,
			censusCode: ulb.censusCode,
			population: ulb.population,
			populationBucket: ulb.populationBucket,
			state: ulb.state,
			overAll: ulb.overAll,
			resourceMobilization: ulb.resourceMobilization,
			expenditurePerformance: ulb.expenditurePerformance,
			fiscalGovernance: ulb.fiscalGovernance,
		};

		const data = { populationBucketUlbCount, ulb: ulbData, fsData, assessmentParameter };
		return res.status(200).json({ data });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};

module.exports.getUlbsBySate = async (req, res) => {
	try {
		moongose.set('debug', true);
		const state = ObjectId(req.params.stateId);
		const condition = { isActive: true, state };
		const ulbs = await ScoringFiscalRanking.find(condition).lean();
		const data = tableResponse(ulbs);
		return res.status(200).json({ data });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};

module.exports.getSearchedUlbDetails = async (req, res) => {
	try {
		moongose.set('debug', true);
		const ulbIds = req.query.ulb;
		console.log('ulbIds', ulbIds);
		// const censusCode = 802989;
		const condition = { isActive: true, ulb: { $in: ulbIds } };
		const ulbs = await ScoringFiscalRanking.find(condition)
			.select('name ulb location resourceMobilization expenditurePerformance fiscalGovernance overAll')
			.limit(5);

		return res.status(200).json({ ulbs });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};

//<<-- ULB details - Assessment parameter score -->>
function getTableHeader(type) {
	let score = '300';
	if (type === 'resourceMobilization') {
		score = 600;
	}
	const columns = [
		{
			'label': 'S. No',
			'key': 'sNo',
		},
		{
			'label': 'Indicator',
			'key': 'indicator',
		},
		{
			'label': 'Units',
			'key': 'unit',
		},
		{
			'label': 'Ulb performance',
			'key': 'ulbPerformance',
		},
		{
			'label': 'Highest performance',
			'info': 'In population category',
			'key': 'highPerformance',
		},
		{
			'label': 'Lowest performance',
			'info': 'In population category',
			'key': 'lowPerformance',
		},
		{
			'label': 'Ulb Score',
			'info': `Out of ${score}`,
			'key': 'ulbScore',
		},
	];
	return { columns, 'lastRow': ['', '', '', '', '', 'Total', '$sum'] };
}
function getTableData(ulb, type) {
	let indicators = [
		{
			units: 'Rs.',
			sno: '1',
			key: 'totalBudgetDataPC_1',
			type: 'resourceMobilization',
			title: 'Total Budget size per capita (Actual Total Reciepts)',
		},
		{ units: 'Rs.', sno: '2', key: 'ownRevenuePC_2', type: 'resourceMobilization', title: 'Own Revenue per capita' },
		{ units: 'Rs.', sno: '3', key: 'pTaxPC_3', type: 'resourceMobilization', title: 'Property Tax per capita' },
		{
			units: '%.',
			sno: '4',
			key: 'cagrInTotalBud_4',
			type: 'resourceMobilization',
			title: 'Growth (3 Year CAGR) in Total Budget Size (Total actual reciept)',
		},
		{ units: '%.', sno: '5', key: 'cagrInOwnRevPC_5', type: 'resourceMobilization', title: 'Growth (3 Year CAGR) in Own Revenue per capita' },
		{ units: '%.', sno: '6', key: 'cagrInPropTax_6', type: 'expenditurePerformance', title: 'Growth (3 Year CAGR) in Property Tax per capita' },
		{ units: 'Rs.', sno: '7', key: 'capExPCAvg_7', type: 'expenditurePerformance', title: 'Capital Expenditure per capita (3-year average)' },
		{ units: '%', sno: '8', key: 'cagrInCapExpen_8', type: 'expenditurePerformance', title: 'Growth (3-Year CAGR) in Capex per capita' },
		{
			units: 'Rs.',
			sno: '9',
			key: 'omExpTotalRevExpen_9',
			type: 'fiscalGovernance',
			title: 'O&M expenses to Total Revenue Expenditure (TRE) (3- year average)',
		},
		{
			units: '',
			sno: '10a',
			key: 'avgMonthsForULBAuditMarks_10a',
			type: 'fiscalGovernance',
			title:
				'For Timely Audit - Average number of months taken by ULB in closing audit (i.e. Date of audit report minus date of FY close), average of 3 year period',
		},
		{
			units: 'Yes/ No',
			sno: '10b',
			key: 'aaPushishedMarks_10b',
			type: 'fiscalGovernance',
			title: 'For Publication of Annual Accounts - Availability for last 3 years on Cityfinance/ Own website (Yes/ No)',
		},
		{
			units: 'Yes/ No',
			sno: '10a',
			key: 'gisBasedPTaxMarks_11a',
			type: 'fiscalGovernance',
			title: 'For Property-tax - whether property tax records are linked to GIS-based system? (Yes/ No)',
		},
		{
			units: 'Yes/ No',
			sno: '11b',
			key: 'accSoftwareMarks_11b',
			type: 'fiscalGovernance',
			title:
				'For Accounting - whether accounting is done on either standalone software like Tally, e-biz etc, or a state-level centralized system like ERP, Digit etc. (Yes/ No)',
		},
		{
			units: '%',
			sno: '12',
			key: 'receiptsVariance_12',
			type: 'fiscalGovernance',
			title: 'Budget vs. Actual (Variance %) for Total Receipts (3-year average)',
		},
		{ units: 'No. of days', sno: '13', key: 'ownRevRecOutStanding_13', type: 'fiscalGovernance', title: 'Own Revenue Receivables Outstanding' },
		{
			units: '%',
			sno: '14',
			key: 'digitalToTotalOwnRev_14',
			type: 'fiscalGovernance',
			title: 'Digital Own Revenue Collection (DORC) to Total Own Revenue Collection (TORC)',
		},
		{ units: '%', sno: '15', key: 'propUnderTaxCollNet_15', type: 'fiscalGovernance', title: 'Properties under Tax Collection net' },
	];

	const filteredIndicators = indicators.filter((e) => e.type === type);
	// console.log('filteredIndicators', filteredIndicators);
	let data = [];
	for (const indicator of filteredIndicators) {
		const ele = {
			'sNo': indicator.sno,
			'indicator': indicator.title,
			'unit': indicator.units,
			'ulbPerformance': ulb[indicator.key].percentage,
			'highPerformance': ulb[indicator.key].highestScore,
			'lowPerformance': ulb[indicator.key].lowestScore,
			'ulbScore': ulb[indicator.key].score,
		};
		data.push(ele);
	}
	// console.log('data',data);
	const header = getTableHeader(type);
	return { ...header, data };
}
