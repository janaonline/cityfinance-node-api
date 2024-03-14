const ObjectId = require('mongoose').Types.ObjectId;
const moongose = require('mongoose');
const Response = require('../../service').response;
const { years } = require('../../service/years');
const Ulb = require('../../models/Ulb');
const FiscalRanking = require('../../models/FiscalRanking');
const FiscalRankingMapper = require('../../models/FiscalRankingMapper');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');
const { registerCustomQueryHandler } = require('puppeteer');
const { initParams } = require('request');

/*
 Not started - 1
 In progress - 2
 Verificaion not started - 8
 Verification in progress - 9
 Returned by PMU - 10
 Submission Acknowledged by PMU - 11
 */

async function setIndicatorRank(ulbArr, indicator) {
	ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
	for (let i = 0; i < ulbArr.length; i++) {
		let rank = 1;
		if (i === 0) {
			ulbArr[i][indicator].rank = 1;
		} else if (ulbArr[i - 1][indicator].score === ulbArr[i][indicator].score) {
			ulbArr[i][indicator].rank = ulbArr[i - 1][indicator].rank;
		} else {
			ulbArr[i][indicator].rank = ulbArr[i - 1][indicator].rank + 1;
		}

		await ScoringFiscalRanking.findByIdAndUpdate(ulbArr[i]._id, {
			$set: {
				[`${indicator}.rank`]: ulbArr[i][indicator].rank
			},
		});

	}
}


async function calculateFRRank(populationBucket) {
	// Submission Acknowledged by PMU - 11
	const condition = { isActive: true, populationBucket, currentFormStatus: { $in: [11] } };
	const ulbArr = await ScoringFiscalRanking.find(condition)
		.select('resourceMobilization expenditurePerformance fiscalGovernance overAll')
		.lean();
	await setIndicatorRank(ulbArr, 'resourceMobilization');
	await setIndicatorRank(ulbArr, 'expenditurePerformance');
	await setIndicatorRank(ulbArr, 'fiscalGovernance');
	await setIndicatorRank(ulbArr, 'overAll');

}
module.exports.calculateFRRank = async (req, res) => {
	try {
		for (let i = 1; i <= 4; i++) {
			await calculateFRRank(i);
		}
		// const data = await calculateFRRank(1);
		return res.status(200).json({ message: 'Done' });

	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};