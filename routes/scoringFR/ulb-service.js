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
async function getScoreFR(populationBucket, indicator, sortOrder = -1) {
	const condition = { isActive: true, populationBucket };
	const ulb = await ScoringFiscalRanking.findOne(condition)
		.sort({ [`${indicator}.score`]: sortOrder }).lean();
}

module.exports.getUlbDetails = async (req, res) => {
	try {
		moongose.set('debug', true);
		const censusCode = req.params.censusCode;
		// const censusCode = 802989;
		const condition = { isActive: true, censusCode };
		const ulb = await ScoringFiscalRanking.findOne(condition).lean();

		const design_year2022_23 = '606aafb14dff55e6c075d3ae';

		const condition1 = { isActive: true, populationBucket: ulb.populationBucket };
		const populationBucketUlbCount = await ScoringFiscalRanking.countDocuments(condition1).lean();

		const conditionFs = {
			ulb: ObjectId(ulb.ulb),
			design_year: ObjectId(design_year2022_23),
		};

		let fsData = await FiscalRanking.findOne(conditionFs).lean();
		const data = { populationBucketUlbCount, ulb, fsData }
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
			.select('name ulb location resourceMobilization expenditurePerformance fiscalGovernance overAll').limit(5);

		return res.status(200).json({ ulbs });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};