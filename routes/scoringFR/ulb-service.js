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
		const conditionFs = {
			ulb: ObjectId(ulb.ulb),
			design_year: ObjectId(design_year2022_23),
		};
		let fsData = await FiscalRanking.findOne(conditionFs).lean();
		const data = { ulb, fsData }
		return res.status(200).json({ data });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
