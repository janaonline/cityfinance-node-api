const ObjectId = require('mongoose').Types.ObjectId;
const State = require('../../models/State');
const FiscalRanking = require('../../models/FiscalRanking');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');
const { getTableHeaderParticipatedStates, getFilterOptions, overallHeader } = require('./response-data');
const { getPaginationParams, getPageNo, getPopulationBucket } = require('../../service/common');
const helper = require('./helper.js');

const mainIndicators = ['resourceMobilization', 'expenditurePerformance', 'fiscalGovernance', 'overAll'];
const currentFormStatus = { $in: [11] };

async function getParticipatedUlbCount() {
	const condition = { isActive: true, currentFormStatus: { $in: [8, 9, 10, 11] } };
	return await FiscalRanking.countDocuments(condition);
}
async function getRankedUlbCount() {
	const condition = { "overAll.rank": { $ne: 0 } };
	return await ScoringFiscalRanking.countDocuments(condition);
}
async function getParticipatedStateCount() {
	const condition = { isActive: true, 'fiscalRanking.participatedUlbs': { $ne: 0 } };
	return await State.countDocuments(condition);
}
// async function topCategoryUlb(populationBucket) {
// 	const condition = { populationBucket };
// 	return await ScoringFiscalRanking.find(condition).select('name').sort({ 'overAll.rank': -1 }).limit(5);
// }
// async function getAuditedUlbCount() {
// 	const condition = { isActive: true };
// 	return await Ulb.countDocuments(condition);
// }
// async function getDocCount(indicator) {
// 	const condition = {
// 		$and: [
// 			{
// 				'type': indicator,
// 			},
// 			{
// 				$or: [
// 					{
// 						'file.url': {
// 							$ne: '',
// 						},
// 					},
// 					{
// 						'modelName': {
// 							$ne: '',
// 						},
// 					},
// 				],
// 			},
// 		],
// 	};
// 	return await FiscalRankingMapper.countDocuments(condition);
// }
// async function getBudgetUlbCount() {
// 	const condition = { isActive: true };
// 	return await Ulb.countDocuments(condition);
// }
// async function getTopParticipatedState(limit = 10) {
// 	return await State.find({ isActive: true }).select('name')
// 		.sort({ 'fiscalRanking.participatedUlbsPercentage': -1 }).limit(limit).lean();
// }

async function getBucketWiseTopUlbs(limit = 3) {
	try {
		const bucketWiseTopUlbsArr = [];
		const query = await helper.getBucketWiseTopUlbsQuery(limit);
		const queryRes = await ScoringFiscalRanking.aggregate(query);

		for (let i = 0; i < queryRes.length; i++) {
			const startIdxOfBucket = (queryRes[i]._id.popBucket - 1) * limit;

			for (const topUlb of queryRes[i].topScores) {
				const idx = startIdxOfBucket + topUlb.rank - 1;
				const partType = queryRes[i]._id.stateParticipationCategory;

				if (!bucketWiseTopUlbsArr[idx]) {
					bucketWiseTopUlbsArr[idx] = {
						popCat: getPopulationBucket(queryRes[i]._id.popBucket),
						cat_high: 'Zero participation of ULBs from high-participation States',
						cat_low: 'Zero participation of ULBs from low-participation States',
						cat_hilly: 'Zero participation of ULBs from hilly-participation States',
					};
				}

				bucketWiseTopUlbsArr[idx] = Object.assign(
					bucketWiseTopUlbsArr[idx],
					{
						[`cat_${partType}`]: topUlb.ulbName,
						// bgColor: helper.getStateColor(0, partType, true)
					}
				)
			}
		}

		return { columns: helper.getBucketWiseTopUlbsColumns, bucketWiseTopUlbsArr };
	} catch (error) {
		console.error('BucketWiseTop10Ulbs: ', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
}

//<<-- Dashboard -->>
module.exports.dashboard = async (req, res) => {
	try {
		const reqData = req.body;
		// const top3ParticipatedState = await getTopParticipatedState();
		// const populationBucket1 = await topCategoryUlb(1);
		// const populationBucket2 = await topCategoryUlb(2);
		// const populationBucket3 = await topCategoryUlb(3);
		// const populationBucket4 = await topCategoryUlb(4);
		// const auditedUlbCount = await getDocCount('auditedAnnualFySt');
		// const budgetUlbCount = await getDocCount('appAnnualBudget');

		const data = {
			totalUlbCount: 4700, //Static number.
			participatedUlbCount: await getParticipatedUlbCount(),
			rankedUlbCount: await getRankedUlbCount(),
			participatedStateCount: await getParticipatedStateCount(),
			bucketWiseTopUlbs: await getBucketWiseTopUlbs(),
			// top3ParticipatedState,
			// bucketWiseUlb: { populationBucket1, populationBucket2, populationBucket3, populationBucket4 },
			// auditedUlbCount,
			// budgetUlbCount,
		};
		return res.status(200).json({ data });
	} catch (error) {
		console.error('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
async function getParticipatedState(limit, skip = 0, query = false, select = 'name') {
	let sort = { 'fiscalRanking.participatedUlbsPercentage': -1, 'name': 1 };
	const sortArr = { totalUlbs: 'fiscalRanking.totalUlbs', participatedUlbs: 'fiscalRanking.participatedUlbs', rankedUlbs: 'fiscalRanking.rankedUlbs', nonRankedUlbs: 'fiscalRanking.nonRankedUlbs', stateName: 'name', }
	const { stateType, ulbParticipationFilter, ulbRankingStatusFilter, sortBy, order } = query;
	let condition = { isActive: true };

	if (sortBy) {
		const by = sortArr[sortBy] || 'name'
		sort = { [by]: order };
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
	condition = { ...condition, 'fiscalRanking.participatedUlbs': { $ne: 0 } };

	const states = await State.find(condition).select(select).sort(sort).limit(limit).skip(skip).lean();
	const total = await State.countDocuments(condition);
	return { data: tableRes(states, query, total) }
}
// <<-- Participated State Table -->>
module.exports.participatedState = async (req, res) => {
	try {
		// mongoose.set('debug', true);
		const query = req.query;
		// const condition = { isActive: true };
		let { limit, skip } = getPaginationParams(req.query);
		const data = await getParticipatedState(limit, skip, query, 'name code fiscalRanking stateType isUT isHilly');

		return res.status(200).json({ ...data });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
// Find participated ULB count state wise.
function tableRes(states, query, total) {
	let tableData = getTableHeaderParticipatedStates;
	// let mapData = [];
	tableData['total'] = total;
	tableData['data'] = [];
	const tempObj = { 'high': [], 'low': [], 'hilly': [] };

	// let i = getPageNo(query);
	for (const state of states) {
		const rankedtoTotal = state.fiscalRanking[0].totalUlbs && state.fiscalRanking[0].rankedUlbs ?
			parseFloat(((state.fiscalRanking[0].rankedUlbs / state.fiscalRanking[0].totalUlbs) * 100)) : 0;
		const participatedPercent = state.fiscalRanking[0].participatedUlbsPercentage;
		const partType = helper.getSateParticipationCategory(participatedPercent, state.isHilly);
		const ele = {
			_id: state._id,
			// sNo: i++,
			name: state.name,
			stateType: state.stateType,
			isUt: state.isUT == true ? 'UT' : 'State',
			totalULBs: state.fiscalRanking[0].totalUlbs ?? 0,
			participatedUlbs: state.fiscalRanking[0].participatedUlbs ?? 0,
			participatedUlbsPercentage: state.fiscalRanking[0].participatedUlbsPercentage.toFixed(2) ?? 0,
			rankedUlbs: state.fiscalRanking[0].rankedUlbs ?? 0,
			nonRankedUlbs: state.fiscalRanking[0].nonRankedUlbs ?? 0,
			rankedtoTotal: rankedtoTotal.toFixed(2),
			nameLink: `/cfr/participated-ulbs/${state._id}`,
			bgColor: helper.getStateColor(participatedPercent, partType, true)
		};
		tempObj[partType].push(ele);

		// const participatedCount = {
		// 	'percentage': state.fiscalRanking ? state.fiscalRanking[0].participatedUlbsPercentage : 0,
		// 	'code': state.code,
		// 	'_id': state.name,
		// 	'stateId': state._id,
		// };

		// tableData.data.push(ele);
		// mapData.push(participatedCount);
	}
	tableData.data = [...tempObj['high'], ...tempObj['low'], ...tempObj['hilly']].map((ele, i) => {
		ele.sNo = i + 1;
		return ele;
	});

	return { tableData };
}

// <<-- Participated State Map -->>
module.exports.participatedStateMap = async (req, res) => {
	try {
		// mongoose.set('debug', true);
		const query = req.query;
		// const condition = { isActive: true };
		let { limit, skip } = getPaginationParams(req.query);
		const data = await getParticipatedStateMap(limit, skip, query, 'name code fiscalRanking stateType isHilly');

		return res.status(200).json({ ...data });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
async function getParticipatedStateMap(limit = 40, skip = 0, query = false, select = 'name') {
	const { stateType, ulbParticipationFilter, ulbRankingStatusFilter } = query;
	let condition = { isActive: true };
	// if (sortBy) {
	// 	const by = sortArr[sortBy] || 'name'
	// 	sort = { [by]: order };
	// }
	if (['Large', 'Small', 'UT'].includes(stateType)) {
		condition = { ...condition, stateType };
	}
	if (['participated', 'nonParticipated'].includes(ulbParticipationFilter)) {
		const participateCond =
			ulbParticipationFilter === 'participated' ? { $ne: 0 } : 0;
		condition = {
			...condition,
			'fiscalRanking.participatedUlbs': participateCond,
		};
	}
	if (['ranked', 'nonRanked'].includes(ulbRankingStatusFilter)) {
		const rankedCond = ulbRankingStatusFilter === 'ranked' ? { $ne: 0 } : 0;
		condition = { ...condition, 'fiscalRanking.rankedUlbs': rankedCond };
	}
	condition = { ...condition, 'fiscalRanking.rankedUlbs': { $ne: 0 } };

	// const states = await State.find(condition).select(select).sort(sort).limit(limit).skip(skip).lean();
	const states = await State.find(condition)
		.select(select)
		.limit(limit)
		.skip(skip)
		.lean();
	const total = await State.countDocuments(condition);
	return { data: mapRes(states, query, total) };
}
// Find participated ULB count state wise - Map
function mapRes(states, query, total) {
	let mapData = [];
	for (const state of states) {
		let rankedPercentage = 0;
		const participatedPercent = state.fiscalRanking[0].participatedUlbsPercentage;
		rankedPercentage = state.fiscalRanking[0].totalUlbs &&
			state.fiscalRanking[0].rankedUlbs
			? parseFloat(
				(
					(state.fiscalRanking[0].rankedUlbs /
						state.fiscalRanking[0].totalUlbs) *
					100
				).toFixed(2)
			)
			: 0
		const partType = helper.getSateParticipationCategory(participatedPercent, state.isHilly);
		const rankedtoTotal = {
			rankedPercentage,
			participatedPercentage: state.fiscalRanking[0].participatedUlbsPercentage,
			color: helper.getStateColor(participatedPercent, partType),
			code: state.code,
			_id: state.name,
			stateId: state._id,
		};
		mapData.push(rankedtoTotal);
	}
	return { mapData };
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
	const filters = getFilterOptions;
	return filters;
}

// <<-- Get state wise documents count ??-->>
module.exports.states = async (req, res) => {
	try {
		// mongoose.set('debug', true);
		let { order, sortBy } = req.query;

		order = order || 1;
		sortBy = sortBy || 'name';
		const select = req.params.select
		let selected = select ? `name fiscalRanking ${select}` : 'name';
		const condition = { isActive: true, "fiscalRanking.participatedUlbs": { $gt: 0 } };
		const { limit, skip } = getPaginationParams(req.query);
		const states = await State.find(condition)
			.select(selected)
			.sort({ [sortBy]: order })
			.skip(skip)
			.limit(limit)
			.exec();

		let data = states;
		if (select) {
			const total = await State.countDocuments(condition);
			data = stateTable(select, states, req.query, total);
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
function stateTable(indicator, states, query, total) {
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
				'key': 'name',
				'sort': 1,
				'sortable': true,
				'width': '30%'
			},
			{
				'label': 'No of ULBs',
				'key': 'totalUlbs',
			},
		],
		'subHeaders': [],
		'name': '',
		'data': [],
		total,
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
	let i = getPageNo(query);
	for (const state of states) {
		const ele = {
			'sNo': i++,
			'totalUlbs': state.fiscalRanking[0] ? state.fiscalRanking[0].totalUlbs : 0,
			'name': state.name,
			'nameLink': `/cfr/participated-ulbs/${state._id}`,
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

//<<-- Top Ranked ULBs -->>
module.exports.topRankedUlbs = async (req, res) => {
	try {
		// moongose.set('debug', true);
		let { category, sortBy, order, state, populationBucket, stateParticipationCategory } = req.query;
		let condition = { isActive: true, currentFormStatus };
		const { limit, skip } = getPaginationParams(req.query);

		if (state) {
			condition = { ...condition, state: ObjectId(state) };
		}
		if (populationBucket) {
			condition = { ...condition, populationBucket };
		}
		if (stateParticipationCategory) {
			condition = { ...condition, stateParticipationCategory };
		}

		const sortArr = { overAllRank: 'overAll', resourceMobilizationRank: 'resourceMobilization', expenditurePerformanceRank: 'expenditurePerformance', fiscalGovernanceRank: 'fiscalGovernance' }
		let sort = {};
		let by = 'overAll';
		sortBy = category || sortBy;
		if (sortBy && sortArr[sortBy]) {
			by = sortArr[sortBy];
			sort[`${by}.rank`] = order;
		} else {
			sort[`overAll.rank`] = 1;
		}

		sort['populationBucket'] = 1;

		// order = order === 'desc' ? -1 : 1;
		const ulbRes = await ScoringFiscalRanking.find(condition)
			.select('name ulb location resourceMobilization expenditurePerformance fiscalGovernance overAll state populationBucket')
			.sort(sort)
			.skip(skip)
			.limit(limit)
			.exec();

		const total = await ScoringFiscalRanking.countDocuments(condition);

		await fetchFiveUlbs(ulbRes, by, state);
		var assessmentParameter = findassessmentParameter(by);

		return res.status(200).json({
			'status': true,
			'message': 'Successfully fetched data!',
			total,
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
async function getTopUlbs(sortBy, order) {
	let condition = { isActive: true };
	const ulbRes = await ScoringFiscalRanking.find(condition, { state: 1, _id: 0 })
		.select('state')
		.limit(5)
		.sort({ [`${sortBy}.rank`]: order })
		.lean();
	return ulbRes;
}

//<<-- Top Ranked ULBs -->>
module.exports.topRankedStates = async (req, res) => {
	// moongose.set('debug', true);
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
async function fetchFiveUlbs(ulbRes, sortBy, state) {
	let stateRes = [];
	if (!state) {
		stateRes = await State.find({ isActive: true });
	}
	if (sortBy === 'overAll') {
		map1Data = [];
		ulbScore = [];
		for (const ulb of ulbRes) {
			const ulbData = {
				'overallRank': ulb.overAll.rank,
				'ulbName': ulb.name,
				'ulbNameConfig': {
					title: `${ulb.name} (${getPopulationBucket(ulb.populationBucket)})`
				},
				ulb,
				'ulbNameLink': `/cfr/ulb/${ulb.censusCode ? ulb.censusCode : ulb.sbCode ? ulb.sbCode : ulb.ulb}`,
				'overallScore': ulb.overAll.score.toFixed(2),
				'resourceMobilizationScore': ulb.resourceMobilization.score.toFixed(2),
				'expenditurePerformanceScore': ulb.expenditurePerformance.score.toFixed(2),
				'fiscalGovernanceScore': ulb.fiscalGovernance.score.toFixed(2),
			};

			ulbScore.push(ulbData);
			setOneUlb(ulb, 'overAll', state, stateRes);
		}
	} else {
		findassessmentParameterScore(ulbRes, sortBy, state, stateRes);
	}
	return { ulbScore, map1Data };
}

// If state does not exist return count of ranked ULB.
function setOneUlb(ulb, key, state, stateRes) {

	let ulbLocation = { ...ulb.location, ulbName: ulb.name, [`${key}Rank`]: ulb[key].rank, populationBucket: ulb.populationBucket };
	if (!state) { // for all states
		const index = map1Data.findIndex(e => e.state.equals(ulb.state));
		const { name, code } = stateRes.find(e => e._id.equals(ulb.state));
		ulbLocation = { ...ulbLocation, state: ulb.state, ulbCount: 1, stateName: name, stateCode: code }
		if (index !== -1) { map1Data[index].ulbCount = map1Data[index].ulbCount + 1; }

		map1Data.push(ulbLocation);
	} else {
		map1Data.push(ulbLocation); // map1 - top ulbs
	}

}
// API - topRankedULBs
function findassessmentParameterScore(ulbRes, key, state, stateRes) {
	ulbScore = [];
	map1Data = [];
	for (const ulb of ulbRes) {
		var ulbData = {
			[`${key}Score`]: ulb[key].score.toFixed(2),
			[`${key}Rank`]: ulb[key].rank,
			'ulbName': ulb.name,
			'ulbNameLink': `/cfr/ulb/${ulb.censusCode ? ulb.censusCode : ulb.sbCode ? ulb.sbCode : ulb.ulb}`,
			'overallScore': ulb.overAll.score.toFixed(2),
			'overallRank': ulb.overAll.rank,
		};
		const ulbLocation = { ...ulb.location, name: ulb.name };
		ulbScore.push(ulbData);
		setOneUlb(ulb, key, state, stateRes);
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
				'class': 'text-center',
			},
			{
				'label': 'ULB Name',
				'key': 'ulbName',
				'link': 'ulbNameLink',
				'class': 'text-start',
			},
			{
				'label': `${label} Score`,
				'info': `Max Score: ${score}`,
				'key': `${sortBy}Score`,
				'class': 'text-end',
			},
			{
				'label': 'Total ULB Score',
				'info': 'Max Score: 1200',
				'key': 'overallScore',
				'class': 'text-end',
			},
			{
				'label': 'Overall Rank',
				'key': 'overallRank',
				'sort': 1,
				'sortable': true,
				'class': 'text-center',
			},
		];
		return assessmentParameter;
	}

	let assessmentParameter = [];
	if (sortBy === 'overAll') {
		assessmentParameter = overallHeader;
	} else if (sortBy === 'resourceMobilization') {
		findParameter('RM', 600);
	} else if (sortBy === 'expenditurePerformance') {
		findParameter('EP', 300);
	} else if (sortBy === 'fiscalGovernance') {
		findParameter('FG', 300);
	}
	return assessmentParameter;
}
