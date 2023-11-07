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
 1. is calculateAverage() required in this .js file?
 */

function calculateRecommendationPercentage(score) {
	let percent = 0;
	score = Math.round(score);
	// console.log( '-->Rounded score',score);
	if (score >= 0 && score <= 29) {
		percent = 0;
	} else if (score >= 30 && score <= 45) {
		percent = 60;
	} else if (score >= 46 && score <= 60) {
		percent = 75;
	} else if (score >= 60 && score <= 80) {
		percent = 90;
	} else if (score >= 80 && score <= 100) {
		percent = 100;
	}
	return percent;
}

// Function to calculate average.
function calculateAverage(numbers) {
	if (numbers.length === 0) {
		return 0;
	} // Handle division by zero if the array is empty
	var sum = 0;
	for (var i = 0; i < numbers.length; i++) {
		sum += numbers[i];
	}

	return Number(sum / numbers.length);
}

// async function updateMinusLowestPercentage(ulbArr, indicator) {
// 	const sortedArr = ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
// const len = sortedArr.length;
// 	ulbArr.forEach(async (ulb) => {
// 		const percentage =
// 			(ulb[indicator].score - sortedArr[len - 1][indicator].score) /
// 			(sortedArr[0][indicator].score - sortedArr[len - 1][indicator].score) /
// 			100;
// 		await ScoringFiscalRanking.findOneAndUpdate(
// 			{
// 				_id: ObjectId(ulb._id),
// 			},
// 			{
// 				$set: {
// 					[`${indicator}.percentage`]: percentage,
// 				},
// 			}
// 		);
// 	});
// }

function updatePercentage_formula1(ulb, ulbArr, indicator, percent = 100) {
	const sortedArr = ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
	return (ulb[indicator].score / sortedArr[0][indicator].score) * percent;
}

function updatePercentage_formula2(ulb, ulbArr, indicator) {
	const sortedArr = ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
	const len = sortedArr.length;
	const percentage = ((ulb[indicator].score - sortedArr[len - 1][indicator].score) /
		(sortedArr[0][indicator].score - sortedArr[len - 1][indicator].score)) *
		100;
	return percentage;
}
function updatePercentage_formula3(ulb, indicator) {
	let percentage = 0;
	if (ulb[indicator].score <= 20 && ulb[indicator].score > -10) percentage = 50;
	else if (ulb[indicator].score > 20) percentage = 45;
	else if (ulb[indicator].score <= -10 && ulb[indicator].score > -25) percentage = 40;
	else if (ulb[indicator].score <= -25) percentage = 37.5;
	else percentage = 0;
	return percentage;
}
function updatePercentage_formula4(ulb, ulbArr, indicator) {
	const sortedArr = ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
	const len = sortedArr.length;
	const percentage =
		((sortedArr[0][indicator].score - ulb[indicator].score) /
			(sortedArr[0][indicator].score - sortedArr[len - 1][indicator].score)) *
		50;

	return percentage;
}

async function calculateFRPercentage(populationBucket) {
	// const condition = { populationBucket };
	const condition = {};
	const ulbArr = await ScoringFiscalRanking.find(condition).lean();

	ulbArr.forEach(async (ulb) => {
		const updateData = {
			'totalBudgetDataPC_1.percentage': updatePercentage_formula1(ulb, ulbArr, 'totalBudgetDataPC_1'),
			'ownRevenuePC_2.percentage': updatePercentage_formula1(ulb, ulbArr, 'ownRevenuePC_2'),
			'pTaxPC_3.percentage': updatePercentage_formula1(ulb, ulbArr, 'pTaxPC_3'),
			'cagrInTotalBud_4.percentage': updatePercentage_formula2(ulb, ulbArr, 'cagrInTotalBud_4'),
			'cagrInOwnRevPC_5.percentage': updatePercentage_formula2(ulb, ulbArr, 'cagrInOwnRevPC_5'),
			'cagrInPropTax_6.percentage': updatePercentage_formula2(ulb, ulbArr, 'cagrInPropTax_6'),
			'capExPCAvg_7.percentage': updatePercentage_formula1(ulb, ulbArr, 'capExPCAvg_7'),
			'cagrInCapExpen_8.percentage': updatePercentage_formula2(ulb, ulbArr, 'cagrInCapExpen_8'),
			'omExpTotalRevExpen_9.percentage': updatePercentage_formula1(ulb, ulbArr, 'omExpTotalRevExpen_9'),
			'avgMonthsForULBAuditMarks_10a.percentage': ulb['avgMonthsForULBAuditMarks_10a'].score,
			'aaPushishedMarks_10b.percentage': ulb['aaPushishedMarks_10b'].score,
			'gisBasedPTaxMarks_11a.percentage': ulb['gisBasedPTaxMarks_11a'].score,
			'accSoftwareMarks_11b.percentage': ulb['accSoftwareMarks_11b'].score,
			'receiptsVariance_12.percentage': updatePercentage_formula3(ulb, 'receiptsVariance_12'),
			'ownRevRecOutStanding_13.percentage': updatePercentage_formula4(ulb, ulbArr, 'ownRevRecOutStanding_13'),
			'digitalToTotalOwnRev_14.percentage': updatePercentage_formula1(ulb, ulbArr, 'digitalToTotalOwnRev_14', 50),
			'propUnderTaxCollNet_15.percentage': updatePercentage_formula1(ulb, ulbArr, 'propUnderTaxCollNet_15', 50),
		};
		await ScoringFiscalRanking.findByIdAndUpdate(ulb._id, {
			$set: updateData,
		});
	});
}
module.exports.calculateFRPercentage = async (req, res) => {
	try {
		const censusCode = 802814;
		const condition = { isActive: true };
		// for (let i = 1; i <= 4; i++) {
		//     await calculateFRPercentage(i);
		// }
		const data = await calculateFRPercentage(1);
		return res.status(200).json({ message: 'Done' });

	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
