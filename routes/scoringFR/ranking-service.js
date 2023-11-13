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

async function getParticipatedUlbCount() {
	const condition = { isActive: true, currentFormStatus: { $in: [8, 9, 10, 11] } };
	return await FiscalRanking.countDocuments(condition);
}
async function topCategoryUlb(populationBucket) {
	const condition = { populationBucket };
	return await ScoringFiscalRanking.find(condition).select('name').limit(2);
}
async function getParticipatedState(limit, select = 'name') {
	const condition = { isActive: true, 'fiscalRanking.participatedUlbsPercentage': { $ne: 0 } };
	return await State.find(condition).select(select).sort({ 'fiscalRanking.participatedUlbsPercentage': -1 }).limit(limit).lean();
}
async function getAuditedUlbCount() {
	const condition = { isActive: true };
	return await Ulb.countDocuments(condition);
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
		const auditedUlbCount = await getAuditedUlbCount();
		const budgetUlbCount = await getBudgetUlbCount();

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

module.exports.participatedState = async (req, res) => {
	try {
		const data = req.body;
		const condition = { isActive: true };
		const states = await getParticipatedState(5, 'name fiscalRanking stateType');
		return res.status(200).json({ states });
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
		const data = req.body;
		const condition = { isActive: true };
		const states = await State.find(condition).select('name').exec();
		return res.status(200).json({ states });
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
		return res.status(200).json({ ulbs: ulbRes });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
