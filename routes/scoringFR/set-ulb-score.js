const ObjectId = require('mongoose').Types.ObjectId;
const moongose = require('mongoose');
const Response = require('../../service').response;
const { years } = require('../../service/years');
const Ulb = require('../../models/Ulb');
const FiscalRanking = require('../../models/FiscalRanking');
const FiscalRankingMapper = require('../../models/FiscalRankingMapper');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');

/*
 Not started - 1
 In progress - 2
 Verificaion not started - 8
 Verification in progress - 9
 Returned by PMU - 10
 Submission Acknowledged by PMU - 11
 */

function getIndicatorScore(ulb, ulbArr, indicator) {
	const sortedArr = ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
	const len = sortedArr.length;
	const ulbIn = ulb[indicator];
	ulbIn.highestScore = sortedArr[0][indicator].score;
	ulbIn.lowestScore = sortedArr[len - 1][indicator].score;
	return ulbIn;
}

async function setScore(populationBucket) {
	// const censusCode = 802787;
	// Submission Acknowledged by PMU - 11
	const condition = {
		populationBucket,
		currentFormStatus: { $nin: [1, 2] },
		// currentFormStatus: { $in: [11] }, // TODO: how to calculate score ? based on submitted or all
	};
	// const condition = {};
	const ulbArr = await ScoringFiscalRanking.find(condition).lean();

	ulbArr.forEach(async (ulb) => {
		const updateData = {
			'totalBudgetDataPC_1': getIndicatorScore(ulb, ulbArr, 'totalBudgetDataPC_1'),
			'ownRevenuePC_2': getIndicatorScore(ulb, ulbArr, 'ownRevenuePC_2'),
			'pTaxPC_3': getIndicatorScore(ulb, ulbArr, 'pTaxPC_3'),
			'cagrInTotalBud_4': getIndicatorScore(ulb, ulbArr, 'cagrInTotalBud_4'),
			'cagrInOwnRevPC_5': getIndicatorScore(ulb, ulbArr, 'cagrInOwnRevPC_5'),
			'cagrInPropTax_6': getIndicatorScore(ulb, ulbArr, 'cagrInPropTax_6'),
			'capExPCAvg_7': getIndicatorScore(ulb, ulbArr, 'capExPCAvg_7'),
			'cagrInCapExpen_8': getIndicatorScore(ulb, ulbArr, 'cagrInCapExpen_8'),
			'omExpTotalRevExpen_9': getIndicatorScore(ulb, ulbArr, 'omExpTotalRevExpen_9'),
			'avgMonthsForULBAuditMarks_10a': getIndicatorScore(ulb, ulbArr, 'avgMonthsForULBAuditMarks_10a'),
			'aaPushishedMarks_10b': getIndicatorScore(ulb, ulbArr, 'aaPushishedMarks_10b'),
			'gisBasedPTaxMarks_11a': getIndicatorScore(ulb, ulbArr, 'gisBasedPTaxMarks_11a'),
			'accSoftwareMarks_11b': getIndicatorScore(ulb, ulbArr, 'accSoftwareMarks_11b'),
			'receiptsVariance_12': getIndicatorScore(ulb, ulbArr, 'receiptsVariance_12'),
			'ownRevRecOutStanding_13': getIndicatorScore(ulb, ulbArr, 'ownRevRecOutStanding_13'),
			'digitalToTotalOwnRev_14': getIndicatorScore(ulb, ulbArr, 'digitalToTotalOwnRev_14'),
			'propUnderTaxCollNet_15': getIndicatorScore(ulb, ulbArr, 'propUnderTaxCollNet_15'),
		};

		await ScoringFiscalRanking.findByIdAndUpdate(ulb._id, {
			$set: updateData,
		});
	});
}

module.exports.setUlbScore = async (req, res) => {
	try {
		for (let i = 1; i <= 4; i++) {
			await setScore(i);
		}
		// const data = await calculateFRPercentage(1);
		return res.status(200).json({ message: 'Done' });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
