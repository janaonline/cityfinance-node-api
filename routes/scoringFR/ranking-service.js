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
const { getPaginationParams } = require('../../service/common');

const mainIndicators = ['resourceMobilization', 'expenditurePerformance', 'fiscalGovernance', 'overAll'];

async function getParticipatedUlbCount() {
	const condition = { isActive: true, currentFormStatus: { $in: [8, 9, 10, 11] } };
	return await FiscalRanking.countDocuments(condition);
}
async function topCategoryUlb(populationBucket) {
	const condition = { populationBucket };
	return await ScoringFiscalRanking.find(condition).select('name').sort({ 'overAll.rank': -1 }).limit(2);
}
async function getParticipatedState(limit, query = false, select = 'name') {
	// let sort = { 'fiscalRanking.participatedUlbsPercentage': -1 };
	mongoose.set('debug', true);
	// const sortArr = {totalUlbs: 'fiscalRanking.totalUlbs'}
	const { stateType, ulbParticipationFilter, ulbRankingStatusFilter, sortBy, sortOrder } = query;
	let condition = { isActive: true, 'fiscalRanking.participatedUlbsPercentage': { $ne: 0 } };
	if (sortBy) {
		sort = { [sortBy]: sortOrder };
	} 
	if (['Large', 'Small', 'UT'].includes(stateType)) {
		condition = { ...condition, stateType };
	}
	if (['participated', 'nonParticipated'].includes(ulbParticipationFilter)) {
		const participateCond = ulbParticipationFilter === 'participated' ? { '$ne': 0 } : 0;
		condition = { ...condition, 'fiscalRanking.participatedUlbs': participateCond };
	}
	if (['ranked', 'nonRanked'].includes(ulbRankingStatusFilter)) {
		const rankedCond = ulbRankingStatusFilter === 'ranked' ? { '$ne': 0 } : 0;
		condition = { ...condition, 'fiscalRanking.rankedUlbs': rankedCond };
	}
	return await State.find(condition).select(select).sort(sort).limit(limit).lean();
}

async function getAuditedUlbCount() {
	const condition = { isActive: true };
	return await Ulb.countDocuments(condition);
}
async function getDocCount(indicator) {
	const condition = {
		$and: [
			{
				'type': indicator,
			},
			{
				$or: [
					{
						'file.url': {
							$ne: '',
						},
					},
					{
						'modelName': {
							$ne: '',
						},
					},
				],
			},
		],
	};
	return await FiscalRankingMapper.countDocuments(condition);
}
async function getBudgetUlbCount() {
	const condition = { isActive: true };
	return await Ulb.countDocuments(condition);
}

//<<-- Dashboard -->>
module.exports.dashboard = async (req, res) => {
	try {
		const reqData = req.body;
		const top3ParticipatedState = await getParticipatedState(3);
		const populationBucket1 = await topCategoryUlb(1);
		const populationBucket2 = await topCategoryUlb(2);
		const populationBucket3 = await topCategoryUlb(3);
		const populationBucket4 = await topCategoryUlb(4);
		const auditedUlbCount = await getDocCount('auditedAnnualFySt');
		const budgetUlbCount = await getDocCount('appAnnualBudget');

		const data = {
			participatedUlbCount: await getParticipatedUlbCount(),
			top3ParticipatedState,
			bucketWiseUlb: { populationBucket1, populationBucket2, populationBucket3, populationBucket4 },
			auditedUlbCount,
			budgetUlbCount,
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

// <<-- Participated State Table -->>
module.exports.participatedState = async (req, res) => {
	try {
		const query = req.query;
		const condition = { isActive: true };
		const states = await getParticipatedState(5, query, 'name code fiscalRanking stateType');
		return res.status(200).json({ data: tableRes(states) });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
// Find participated ULB count state wise.
function tableRes(states) {
	let tableData = {
		'columns': [
			{
				'label': 'S.No',
				'key': 'sNo',
				'sort': 0,
				'sortable': false,
				'class': 'th-common-cls',
				'width': '3',
			},
			{
				'label': 'State Name',
				'key': 'stateName',
				'sort': 1,
				'sortable': true,
				'class': 'th-common-cls',
				'width': '8',
			},
			{
				'label': 'State Type',
				'key': 'stateType',
				'sortable': false,
				'sort': 1,
				'class': 'th-common-cls',
				'width': '6',
			},
			{
				'label': 'Total ULBs',
				'key': 'totalULBs',
				'sortable': false,
				'sort': 0,
				'class': 'th-common-cls',
				'width': '6',
			},
			{
				'label': 'Participated ULBs',
				'key': 'participatedULBs',
				'sortable': true,
				'sort': 1,
				'class': 'th-common-cls',
				'width': '7',
			},
			{
				'label': 'Participated ULBs',
				'key': 'participatedULBs',
				'sortable': true,
				'sort': 1,
				'class': 'th-common-cls',
				'width': '7',
			},
			{
				'label': 'Ranked ULBs',
				'key': 'rankedULBs',
				'sortable': true,
				'sort': 1,
				'class': 'th-common-cls',
				'width': '6',
			},
			{
				'label': 'Non Ranked ULBs',
				'key': 'nonRankedULBs',
				'sortable': true,
				'sort': 1,
				'class': 'th-common-cls',
				'width': '7',
			},
			{
				'label': 'Ranked to Total(%)',
				'key': 'rankedtoTotal',
				'sortable': true,
				'sort': 1,
				'class': 'th-color-cls',
				'width': '7',
			},
		],
		'name': '',
		'data': [],
		'lastRow': ['', '', 'Total', '$x', '$sum', '$sum', '$sum', '$sum', '$sum'],
	};
	let i = 1;
	let mapData = [];
	for (const state of states) {
		const ele = {
			'_id': state._id,
			'sNo': i++,
			'stateType': state.stateType,
			'totalULBs': state.fiscalRanking[0].totalUlbs,
			'participatedULBs': state.fiscalRanking[0].participatedUlbs,
			'rankedULBs': state.fiscalRanking[0].rankedUlbs,
			'nonRankedULBs': state.fiscalRanking[0].nonRankedUlbs,
			'stateName': state.name,
			'rankedtoTotal': 2,
			'stateNameLink': `/rankings/participated-ulbs/${state._id}`,
		};
		const participatedCount = {
			'percentage': state.fiscalRanking[0].participatedUlbsPercentage,
			'code': state.code,
			'_id': state.name,
			'stateId': state._id,
		};
		tableData.data.push(ele);
		mapData.push(participatedCount);
	}
	return { tableData, mapData };
}

//<<-- Participated states - Filter -->>
module.exports.filterApi = async (req, res) => {
	try {
		const data = filterApi();
		return res.status(200).json({
			'status': true,
			'message': 'Successfully saved data!',
			data,
		});

		// return res.status(200).json({ data: tableResponse(states) });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};

// Participated State - filter.
function filterApi() {
	const filters = {
		//State type.
		stateTypeFilter: [
			{
				label: 'All',
				id: '1',
				key: 'all',
				value: 'All', //for score type filter
			},
			{
				label: 'Large state',
				id: '2',
				key: 'largeState',
				value: 'Large', //for score type filter
			},
			{
				label: 'Small state',
				id: '3',
				key: 'smallState',
				value: 'Small', //for score type filter
			},
			{
				label: 'Union territory',
				id: '4',
				key: 'unionTerritory',
				value: 'UT', //for score type filter
			},
		],
		// ULB Participation
		ulbParticipationFilter: [
			{
				label: 'All',
				id: '1',
				key: 'all',
				value: 'All', //for score type filter
			},
			{
				label: 'Participated',
				id: '2',
				key: 'participated',
				value: 'participated', //for score type filter
			},
			{
				label: 'Non Participated',
				id: '3',
				key: 'nonParticipated',
				value: 'nonParticipated', //for score type filter
			},
		],
		// ULB ranking status
		ulbRankingStatusFilter: [
			{
				label: 'All',
				id: '1',
				key: 'all',
				value: 'All', //for score type filter
			},
			{
				label: 'Ranked',
				id: '2',
				key: 'ranked',
				value: 'ranked', //for score type filter
			},
			{
				label: 'Non Ranked',
				id: '3',
				key: 'nonRanked',
				value: 'nonRanked', //for score type filter
			},
		],
		// Population category
		populationBucketFilter: [
			{
				label: 'All',
				id: '1',
				key: 'all',
				value: 'All', //for score type filter
			},
			{
				label: '4M+',
				id: '2',
				key: '1',
				value: 1, //for score type filter
			},
			{
				label: '1M-4M',
				id: '2',
				key: '2',
				value: 2, //for score type filter
			},
			{
				label: '100K-1M',
				id: '2',
				key: '3',
				value: 3, //for score type filter
			},
			{
				label: '<100K',
				id: '2',
				key: '4',
				value: 4, //for score type filter
			},
		],
	};
	return filters;
}

// <<-- Get state wise documents count ??-->>
module.exports.states = async (req, res) => {
	try {
		// mongoose.set('debug', true);
		const { sortOrder, sortBy } = req.query;
		const select = req.params.select
		let selected = select ? `name fiscalRanking ${select}` : 'name';
		const condition = { isActive: true };
		const { limit, skip } = getPaginationParams(req.query);
		const states = await State.find(condition)
			.select(selected)
			.sort({ [sortBy]: sortOrder })
			.skip(skip)
			.limit(limit)
			.exec();

		let data = states;
		if (select) {
			data = stateTable(select, states, req.query);
		}
		return res.status(200).json({
			data,
		});

		// return res.status(200).json({ data: tableResponse(states) });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
// Get documetns count - as per state.
function stateTable(indicator, states, query) {
	const table = {
		'status': true,
		'message': 'Successfully saved data!',
		'columns': [
			{
				'label': 'S. No',
				'key': 'sNo',
			},
			{
				'label': 'State Name',
				'key': 'stateName',
				'sort': 1,
				'sortable': true,
			},
			{
				'label': 'No of ulbs',
				'key': 'totalULBs',
			},
		],
		'subHeaders': [],
		'name': '',
		'data': [],
	};
	let years = [];
	if (indicator === 'annualBudgets') {
		const cols = [
			{
				'label': 'Annual Budget Available',
				'key': '2020-21',
				'colspan': 4,
			},
			{
				'label': '',
				'key': '2021-22',
				'hidden': true,
			},
			{
				'label': '',
				'key': '2022-23',
				'hidden': true,
			},
			{
				'label': '',
				'key': '2023-24',
				'hidden': true,
			},
		];
		table.columns = [...table.columns, ...cols];
		years = ['2020-21', '2021-22', '2022-23', '2023-24'];
		table.subHeaders = ['', '', '', ...years];
	} else {
		const cols = [
			{
				'label': 'Annual Financial Statements Available',
				'key': '2018-19',
				'colspan': 4,
			},
			{
				'label': '',
				'key': '2019-20',
				'hidden': true,
			},
			{
				'label': '',
				'key': '2020-21',
				'hidden': true,
			},
			{
				'label': '',
				'key': '2021-22',
				'hidden': true,
			},
		];
		table.columns = [...table.columns, ...cols];
		years = ['2018-19', '2019-20', '2020-21', '2021-22'];
		table.subHeaders = ['', '', '', ...years];
	}
	let i = ((query.page - 1) * query.limit) + 1;
	for (const state of states) {
		const ele = {
			'sNo': i++,
			'totalULBs': state.fiscalRanking[0].totalUlbs,
			'stateName': state.name,
			'stateNameLink': `/rankings/participated-ulbs/${state._id}`,
		};
		years.forEach((year) => {
			ele[year] = getDocYearCount(state, indicator, year);
		});
		table.data.push(ele);
	}
	return table;
}
function getDocYearCount(state, indicator, year) {
	const yearData = state[indicator].find((e) => e.year === year);
	let total = 0;
	if (yearData) {
		total = yearData.total;
	}
	return total;
}
function getMapData() { }

//<<-- Top Ranked ULBs -->>
module.exports.topRankedUlbs = async (req, res) => {
	try {
		// moongose.set('debug', true);
		let { sortBy, sortOrder, state, populationBucket } = req.query;
		let condition = { isActive: true };
		if (state) {
			condition = { ...condition, state: ObjectId(state) };
		}
		if (populationBucket) {
			condition = { ...condition, populationBucket };
		}

		sortBy = sortBy ? sortBy : 'overAll';
		// sortOrder = sortOrder === 'desc' ? -1 : 1;
		const ulbRes = await ScoringFiscalRanking.find(condition)
			.select('name ulb location resourceMobilization expenditurePerformance fiscalGovernance overAll state')
			.limit(5)
			.sort({ [`${sortBy}.rank`]: sortOrder })
			.exec();
		// console.log(ulbRes)

		fetchFiveUlbs(ulbRes, sortBy);
		var assessmentParameter = findassessmentParameter(sortBy);

		return res.status(200).json({
			'status': true,
			'message': 'Successfully fetched data!',
			'tableData': { 'columns': assessmentParameter, 'data': [...ulbScore] },
			'mapDataTopUlbs': [...map1Data],
			// 'mapDataRankHolders': top-ranked-states API

		});
		// return res.status(200).json({ data: tableResponse(ulbRes) });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
async function getTopUlbs(sortBy, sortOrder) {
	let condition = { isActive: true };
	const ulbRes = await ScoringFiscalRanking.find(condition, { state: 1, _id: 0 })
		.select('state')
		.limit(5)
		.sort({ [`${sortBy}.rank`]: sortOrder })
		.lean();
	return ulbRes;
}
function countEle() {

}
//<<-- Top Ranked ULBs -->>
module.exports.topRankedStates = async (req, res) => {
	moongose.set('debug', true);
	try {
		let ulbs = [];
		for (const indicator of mainIndicators) {
			ulbs = [...ulbs, ...await getTopUlbs(indicator, -1)];
		}

		let counter = {};
		for (const ulb of ulbs) {
			counter[ulb.state] = (counter[ulb.state] || 0) + 1
		}

		const condition = { _id: { $in: Object.keys(counter) } };
		const states = await State.find(condition).select('code name').lean();

		states.map(e => {
			e.count = counter[e._id];
			return e;
		});

		return res.status(200).json({
			'status': true,
			'message': 'Successfully fetched data!',
			states
		});
		// return res.status(200).json({ data: tableResponse(ulbRes) });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
// Function to fetch 5 ULBs Score - Top ranked ulbs.
var ulbScore = [];
var map1Data = []; // map1 - top ulbs
var map2Data = []; // map 2 - rank holders
function fetchFiveUlbs(ulbRes, sortBy) {
	if (sortBy === 'overAll') {
		map1Data = [];
		ulbScore = [];
		for (ulb of ulbRes) {
			const ulbData = {
				'overallRank': ulb.overAll.rank,
				'ulbName': ulb.name,
				'ulbNameLink': `/rankings/ulb/${ulb.censusCode ? ulb.censusCode : ulb.sbCode ? ulb.sbCode : ulb.ulb}`,
				'overallScore': ulb.overAll.score,
				'resourceMobilizationScore': ulb.resourceMobilization.score,
				'expenditurePerformanceScore': ulb.expenditurePerformance.score,
				'fiscalGovernanceScore': ulb.fiscalGovernance.score,
			};
			const ulbLocation = { ...ulb.location, name: ulb.name };
			ulbScore.push(ulbData);
			map1Data.push(ulbLocation); // map1 - top ulbs
		}
	} else {
		findassessmentParameterScore(ulbRes, sortBy);
	}
	return { ulbScore, map1Data };
}
// API - topRankedULBs
function findassessmentParameterScore(ulbRes, key) {
	ulbScore = [];
	map1Data = [];
	for (ulb of ulbRes) {
		var ulbData = {
			[`${key}Score`]: ulb[key].score,
			[`${key}Rank`]: ulb[key].rank,
			'ulbName': ulb.name,
			'ulbNameLink': `/rankings/ulb/${ulb.censusCode ? ulb.censusCode : ulb.sbCode ? ulb.sbCode : ulb.ulb}`,
			'overallScore': ulb.overAll.score,
			'overallRank': ulb.overAll.rank,
		};
		const ulbLocation = { ...ulb.location, name: ulb.name };
		ulbScore.push(ulbData);
		map1Data.push(ulbLocation); // map1 - top ulbs
	}
	return { ulbScore, map1Data };
}

// Table headers for top ranked ulbs table.
function findassessmentParameter(sortBy) {
	function findParameter(label, score) {
		assessmentParameter = [
			{
				'label': `${label} Rank`,
				'key': `${sortBy}Rank`,
				'sort': 1,
				'sortable': true,
			},
			{
				'label': 'ULB Name',
				'key': 'ulbName',
			},
			{
				'label': `${label} Score`,
				'info': `Max Score: ${score}`,
				'key': `${sortBy}Score`,
			},
			{
				'label': 'Total ULB Score',
				'info': 'Max Score: 1200',
				'key': 'overallScore',
			},
			{
				'label': 'Rank',
				'key': 'overallRank',
				'sort': 1,
				'sortable': true,
			},
		];
		return assessmentParameter;
	}

	let assessmentParameter = [];
	if (sortBy === 'overAll') {
		assessmentParameter = [
			{
				'label': 'Rank',
				'key': 'overallRank',
				'sort': 1,
				'sortable': true,
			},
			{
				'label': 'ULB Name',
				'key': 'ulbName',
			},
			{
				'label': 'Total Ulb Score',
				'info': 'Max Score: 1200',
				'key': 'overallScore',
			},
			{
				'label': 'RM Score',
				'info': 'Max Score: 600',
				'key': 'resourceMobilizationScore',
			},
			{
				'label': 'EP Score',
				'info': 'Max Score: 300',
				'key': 'expenditurePerformanceScore',
			},
			{
				'label': 'FG Score',
				'info': 'Max Score: 300',
				'key': 'fiscalGovernanceScore',
			},
		];
	} else if (sortBy === 'resourceMobilization') {
		findParameter('RM', 600);
	} else if (sortBy === 'expenditurePerformance') {
		findParameter('EP', 300);
	} else if (sortBy === 'fiscalGovernance') {
		findParameter('FG', 300);
	}
	return assessmentParameter;
}
