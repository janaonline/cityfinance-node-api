const ObjectId = require('mongoose').Types.ObjectId;
const moongose = require('mongoose');
const Response = require('../../service').response;
const { years } = require('../../service/years');
const Ulb = require('../../models/Ulb');
const State = require('../../models/State');
const FiscalRanking = require('../../models/FiscalRanking');
const FiscalRankingMapper = require('../../models/FiscalRankingMapper');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');
const { registerCustomQueryHandler } = require('puppeteer');
const { getMultipleRandomElements } = require('../../service/common');
const { getPaginationParams, isValidObjectId, getPageNo, getPopulationBucket } = require('../../service/common');
const e = require('express');

const abYears = ['2020-21', '2021-22', '2022-23', '2023-24'];
const afsYears = ['2018-19', '2019-20', '2020-21', '2021-22'];

async function getScoreFR(populationBucket, indicator, order = -1) {
	const condition = { isActive: true, populationBucket };
	const ulb = await ScoringFiscalRanking.findOne(condition)
		.sort({ [`${indicator}.score`]: order })
		.lean();
}
const mainIndicators = ['resourceMobilization', 'expenditurePerformance', 'fiscalGovernance', 'overAll'];

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
		const state = await State.findById(ulb.state).select('name code').lean();

		if (!ulb) {
			return res.status(404).json({
				status: false,
				message: 'ULB not found',
			});
		}
		const design_year2022_23 = '606aafb14dff55e6c075d3ae';

		const condition1 = { isActive: true, populationBucket: ulb.populationBucket };
		const populationBucketUlbCount = await ScoringFiscalRanking.countDocuments(condition1).lean();

		const condition2 = { isActive: true, populationBucket: ulb.populationBucket };
		const topUlbs = await ScoringFiscalRanking.find(condition2).select('_id').sort({ 'overAll.rank': 1 }).limit(10).lean();

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
			stateId: ulb.state,
			stateName: state.name,
			stateCode: state.code,
			overAll: ulb.overAll,
			resourceMobilization: ulb.resourceMobilization,
			expenditurePerformance: ulb.expenditurePerformance,
			fiscalGovernance: ulb.fiscalGovernance,
			location: ulb.location,
		};
		const topUlbIds = getMultipleRandomElements(topUlbs, 4).map(e => e._id);
		const data = {
			populationBucketUlbCount, ulb: ulbData, fsData, assessmentParameter,
			topUlbIds
		};
		return res.status(200).json({ data });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};

// <<-- Get all the ULBs of a state - Document details. -->>
module.exports.getUlbsBySate = async (req, res) => {
	try {
		// moongose.set('debug', true);
		const stateId = ObjectId(req.params.stateId);
		let condition = { isActive: true, state: stateId };
		const { order, sortBy, populationBucket, ulbParticipationFilter,ulbRankingStatusFilter } = req.query;

		const sortArr = {participated:'currentFormStatus',ranked: 'overAll.rank', populationBucket: 'populationBucket'}
		let sort = {name:1};
		if (sortBy) {
			const by = sortArr[sortBy] || 'name'
			sort = { [by]: order };
		}
		if ([1, 2, 3, 4].includes(parseInt(populationBucket))) {
			condition = { ...condition, populationBucket };
		}
		if (['participated', 'nonParticipated'].includes(ulbParticipationFilter)) {
			//TODO: check participated form status
			const participateCond = ulbParticipationFilter === 'participated' ? {$in:[8,9,10,11]} : {$in:[1]};
			condition = { ...condition, 'currentFormStatus': participateCond };
		}
		if (['ranked', 'nonRanked'].includes(ulbRankingStatusFilter)) {
			const rankedCond = ulbRankingStatusFilter === 'ranked' ? { '$ne': 0 } : 0;
			condition = { ...condition, 'overAll.rank': rankedCond };
		}

		const { limit, skip } = getPaginationParams(req.query);
		const ulbs = await ScoringFiscalRanking.find(condition)
			.select('ulb name populationBucket currentFormStatus auditedAccounts annualBudgets overAll ')
			.sort(sort)
			.skip(skip)
			.limit(limit)
			.lean();
		const total = await ScoringFiscalRanking.countDocuments(condition);
		const state = await State.findById(stateId).select('fiscalRanking name annualBudgets auditedAccounts').lean();
		const data = getUlbData(ulbs, req.query);
		const header = getTableHeaderDocs();
		const footer = ['', '', '', '', ''];
		state.annualBudgets.forEach(y => {
			footer.push(y.total);
		})
		state.auditedAccounts.forEach(y => {
			footer.push(y.total);
		})

		return res.status(200).json({
			'status': true,
			'message': 'Successfully saved data!',
			'data': { ...header, data, total, state, footer },
		});
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
// Table header
function getTableHeaderDocs() {
	const data = {
		'columns': [
			{
				'label': 'S.No',
				'key': 'sNo',
				'class': 'th-common-cls',
				'width': '2',
			},
			{
				'label': 'ULB Name',
				'key': 'ulbName',
				'sort': 1,
				'sortable': true,
				'class': 'th-color-cls',
			},
			{
				'label': 'Population Category',
				'key': 'populationCategory',
				'sortable': true,
				'sort': 1,
				'class': 'th-common-cls',
			},
			{
				'label': 'ULB Participated',
				'key': 'isUlbParticipated',
				'sortable': true,
				'sort': 1,
				'class': 'th-common-cls',
			},
			{
				'label': 'CFR Ranked',
				'key': 'isUlbRanked',
				'sortable': true,
				'sort': 1,
				'class': 'th-common-cls',
			},
			{
				'label': 'Annual Financial Statement Available',
				'key': 'auditedAccounts2018-19',
				'colspan': 4,
				'class': 'th-common-cls',
			},
			{
				'label': '',
				'key': 'auditedAccounts2019-20',
				'hidden': true,
			},
			{
				'label': '',
				'key': 'auditedAccounts2020-21',
				'hidden': true,
			},
			{
				'label': '',
				'key': 'auditedAccounts2021-22',
				'hidden': true,
			},
			{
				'label': 'Annual Budget Available',
				'key': 'annualBudgets2020-21',
				'colspan': 4,
				'class': 'th-common-cls',
			},
			{
				'label': '',
				'key': 'annualBudgets2021-22',
				'hidden': true,
			},
			{
				'label': '',
				'key': 'annualBudgets2022-23',
				'hidden': true,
			},
			{
				'label': '',
				'key': 'annualBudgets2023-24',
				'hidden': true,
			},
		],
		'subHeaders': ['', '', '', '', '', ...abYears, ...afsYears],
		'name': '',
	};
	return data;
}

// Table data
function getUlbData(ulbs, query) {

	const tableData = [];
	let j = getPageNo(query);
	ulbs.forEach((ulb) => {
		const populationCategory = getPopulationBucket(ulb.populationBucket);
		const data = {
			'_id': ulb._id,
			'sNo': j++,
			'ulbName': ulb.name,
			populationCategory,
			'isUlbParticipated': [8, 9, 10, 11].includes(ulb.currentFormStatus) ? 'Yes' : 'No',
			'isUlbRanked': ulb.overAll.rank ? 'Yes' : 'No',
		};
		ulb.annualBudgets.forEach((year) => {
			data[`annualBudgets${year.year}`] = year.url;
		});
		//if no data for year add -
		abYears.forEach((year) => {
			if (!data[`annualBudgets${year}`]) {
				data[`annualBudgets${year}`] = '-';
			}
		});
		ulb.auditedAccounts.forEach((year) => {
			data[`auditedAccounts${year.year}`] = year.modelName === 'ULBLedger' ? 'Available in 15th FC' : year.url;
		});
		//if no data for year add -
		afsYears.forEach((year) => {
			if (!data[`auditedAccounts${year}`]) {
				data[`auditedAccounts${year}`] = '-';
			}
		});
		tableData.push(data);
	});
	return tableData;
}

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
			'label': 'ULB performance',
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
			units: '%',
			sno: '4',
			key: 'cagrInTotalBud_4',
			type: 'resourceMobilization',
			title: 'Growth (3 Year CAGR) in Total Budget Size (Total actual reciept)',
		},
		{ units: '%', sno: '5', key: 'cagrInOwnRevPC_5', type: 'resourceMobilization', title: 'Growth (3 Year CAGR) in Own Revenue per capita' },
		{ units: '%', sno: '6', key: 'cagrInPropTax_6', type: 'expenditurePerformance', title: 'Growth (3 Year CAGR) in Property Tax per capita' },
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
			sno: '11a',
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

//<<-- ULB details - Filter -->>
function getSearchedUlb(ulbs, indicator) {
	const indicatorData = [];
	const populationAvgData = [];
	const nationalAvgData = [];
	const stateAvgData = [];

	for (const ulb of ulbs) {
		indicatorData.push(ulb[indicator].score);
		populationAvgData.push(ulb[indicator].populationBucketAvg);
		nationalAvgData.push(ulb[indicator].nationalAvg);
		stateAvgData.push(ulb[indicator].stateAvg);
	}

	// function to convert camelCase into proper case.
	function toProperCase(indicator) {
		return indicator.replace(/([A-Z])/g, ' $1').replace(/^./, function (str) {
			return str.toUpperCase();
		});
	}
	const indicatorName = toProperCase(indicator);

	const graphData = [
		{
			'label': 'State Average',
			'data': stateAvgData,
			'fill': false,
			'borderColor': 'orange',
			'type': 'line',
			'lineTension': 0,
		},
		{
			'label': 'National Average',
			'data': nationalAvgData,
			'fill': false,
			'borderColor': 'gray',
			'type': 'line',
			'lineTension': 0,
		},
		{
			'label': 'Population Average',
			'data': populationAvgData,
			'fill': false,
			'borderColor': 'yellow',
			'type': 'line',
			'lineTension': 0,
		},
		{
			'label': indicatorName,
			'data': indicatorData,
			'backgroundColor': '#0B5ACF',
			'borderWidth': 1,
			'type': 'bar',
			'barPercentage': 0.5,
			'categoryPercentage': 1,
		},
	];

	const ulbName = [];
	// Loop to get ULBs names in an array.
	for (const ulb of ulbs) {
		ulbName.push(ulb.name);
	}
	const data = {
		'labels': ulbName,
		'datasets': graphData,
	};
	return data;
}

// ULB details - graph section.
module.exports.getSearchedUlbDetailsGraph = async (req, res) => {
	try {
		// moongose.set('debug', true);
		const ulbIds = req.query.ulb;
		// const indicator = req.query.indicator;

		const condition = {
			isActive: true,
			ulb: { $in: ulbIds },
			// currentFormStatus: { $in: [11] }
		};
		let ulbs = await ScoringFiscalRanking.find(condition)
			.select('name ulb location resourceMobilization expenditurePerformance fiscalGovernance overAll')
			.limit(5)
			.lean();

		const graphData = {};
		for (const indicator of mainIndicators) {
			graphData[indicator] = getSearchedUlb(ulbs, indicator);
		}

		return res.status(200).json({
			graphData,
		});
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};

// <<-- Auto suggest ulbs -->>>>
module.exports.autoSuggestUlbs = async (req, res) => {
	try {
		// moongose.set('debug', true);
		const q = req.query.q;
		const condition = {
			isActive: true,
			name: new RegExp(`.*${q}.*`, 'i'),
			// currentFormStatus: { $in: [11] }
		};
		let ulbs = await ScoringFiscalRanking.find(condition, { name: 1, ulb: 1, populationBucket: 1, censusCode: 1, sbCode: 1, _id: 0 })
			.sort({ name: 1 })
			.limit(5)
			.lean();

		return res.status(200).json({
			ulbs,
		});
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
