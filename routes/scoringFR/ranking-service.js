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
const { tableResponse } = require('../../service/common');

async function getParticipatedUlbCount() {
	const condition = { isActive: true, currentFormStatus: { $in: [8, 9, 10, 11] } };
	return await FiscalRanking.countDocuments(condition);
}
async function topCategoryUlb(populationBucket) {
	const condition = { populationBucket };
	return await ScoringFiscalRanking.find(condition).select('name').limit(2);
}
async function getParticipatedState(limit, query = false, select = 'name') {
	mongoose.set('debug', true);
	const { stateType, ulbParticipationFilter, ulbRankingStatusFilter } = query;
	let condition = { isActive: true, 'fiscalRanking.participatedUlbsPercentage': { $ne: 0 } };
	if (['Large', 'Small', 'UT'].includes(stateType)) {
		condition = { ...condition, stateType }
	}
	if (['participated', 'nonParticipated'].includes(ulbParticipationFilter)) {
		const participateCond = ulbParticipationFilter === 'participated' ? { '$ne': 0 } : 0;
		condition = { ...condition, 'fiscalRanking.participatedUlbs': participateCond }
	}
	if (['ranked', 'nonRanked'].includes(ulbRankingStatusFilter)) {
		const rankedCond = ulbRankingStatusFilter === 'ranked' ? { '$ne': 0 } : 0;
		condition = { ...condition, 'fiscalRanking.rankedUlbs': rankedCond }
	}
	return await State.find(condition).select(select).sort({ 'fiscalRanking.participatedUlbsPercentage': -1 }).limit(limit).lean();
}

async function getAuditedUlbCount() {
	const condition = { isActive: true };
	return await Ulb.countDocuments(condition);
}
async function getDocCount(indicator) {
	const condition = {
		$and: [{
			"type": indicator
		}, {
			$or: [{
				"file.url": {
					$ne: ""
				}
			}, {
				"modelName": {
					$ne: ""
				}
			}]
		}]
	};
	return await FiscalRankingMapper.countDocuments(condition);
}
async function getBudgetUlbCount() {
	const condition = { isActive: true };
	return await Ulb.countDocuments(condition);
}
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

function tableRes(states) {
	let table = {
		"columns": [
			{
				"label": "S.No",
				"key": "sNo",
				"sort": 0,
				"sortable": false,
				"class": "th-common-cls",
				"width": "3"
			},
			{
				"label": "State Name",
				"key": "stateName",
				"sort": 1,
				"sortable": true,
				"class": "th-common-cls",
				"width": "8"
			},
			{
				"label": "State Type",
				"key": "stateType",
				"sortable": false,
				"sort": 1,
				"class": "th-common-cls",
				"width": "6"
			},
			{
				"label": "Total ULBs",
				"key": "totalULBs",
				"sortable": false,
				"sort": 0,
				"class": "th-common-cls",
				"width": "6"
			},
			{
				"label": "Participated ULBs",
				"key": "participatedULBs",
				"sortable": true,
				"sort": 1,
				"class": "th-common-cls",
				"width": "7"
			},
			{
				"label": "Participated ULBs",
				"key": "participatedULBs",
				"sortable": true,
				"sort": 1,
				"class": "th-common-cls",
				"width": "7"
			},
			{
				"label": "Ranked ULBs",
				"key": "rankedULBs",
				"sortable": true,
				"sort": 1,
				"class": "th-common-cls",
				"width": "6"
			},
			{
				"label": "Non Ranked ULBs",
				"key": "nonRankedULBs",
				"sortable": true,
				"sort": 1,
				"class": "th-common-cls",
				"width": "7"
			},
			{
				"label": "Ranked to Total(%)",
				"key": "rankedtoTotal",
				"sortable": true,
				"sort": 1,
				"class": "th-color-cls",
				"width": "7"
			}
		],
		"name": "",
		"data": [],
		"lastRow": [
			"",
			"",
			"Total",
			"$sum",
			"$sum",
			"$sum",
			"$sum",
			"$sum",
			"$sum"
		]
	};
	let i = 1;
	for (const state of states) {
		const ele = {
			"_id": state._id,
			"sNo": i++,
			"stateType": state.stateType,
			"totalULBs": state.fiscalRanking[0].totalUlbs,
			"participatedULBs": state.fiscalRanking[0].participatedUlbs,
			"rankedULBs": state.fiscalRanking[0].rankedUlbs,
			"nonRankedULBs": state.fiscalRanking[0].nonRankedUlbs,
			"stateName": state.name,
			"rankedtoTotal": 2,
			"stateNameLink": "/rankings/participated-ulbs"
		};
		table.data.push(ele);
	}
	return table;
}
module.exports.participatedState = async (req, res) => {
	try {
		const query = req.query;
		const condition = { isActive: true };
		const states = await getParticipatedState(5, query, 'name fiscalRanking stateType');
		return res.status(200).json({ data: tableRes(states) });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
module.exports.states = async (req, res) => {
	try {
		let select = req.params.select ? `name fiscalRanking ${req.params.select}` : 'name';
		const condition = { isActive: true };
		const states = await State.find(condition).select(select).exec();
		return res.status(200).json({ data: tableResponse(states) });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
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
		sortOrder = sortOrder === 'desc' ? -1 : 1;
		const ulbRes = await ScoringFiscalRanking.find(condition)
			.select('name ulb location resourceMobilization expenditurePerformance fiscalGovernance overAll')
			.limit(5)
			.sort({ [sortBy]: sortOrder })
			.exec();
		return res.status(200).json({ data: tableResponse(ulbRes) });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
