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

// Indicator 1, 2, 3, 7, 9 >> (ulb/ high)*100 >> function 1
async function updatePercentage_fun1(ulbArr, indicator) {
	// Array with sorted values.
	const sortByTotalBudgetArr = ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
	ulbArr.forEach(async (ulb) => {
		const percentage = (ulb[indicator].score / sortByTotalBudgetArr[0][indicator].score) * 100;

		await ScoringFiscalRanking.findByIdAndUpdate(ulb._id, {
			$set: {
				[`${indicator}.percentage`]: percentage,
			},
		});
	});
}

// Indicator 4, 5, 6, 8 >> ((ulb - low)/(high - low))*100 >> function 2
async function updatePercentage_fun2(ulbArr, indicator) {
	// Array with sorted values.
	const sortByTotalBudgetArr = ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
    const len = sortByTotalBudgetArr.length;

	ulbArr.forEach(async (ulb) => {
		const percentage =
			((ulb[indicator].score - sortByTotalBudgetArr[len - 1][indicator].score) /
				(sortByTotalBudgetArr[0][indicator].score - sortByTotalBudgetArr[len - 1][indicator].score)) *
			100;

		await ScoringFiscalRanking.findByIdAndUpdate(ulb._id, {
			$set: {
				[`${indicator}.percentage`]: percentage,
			},
		});
	});
}
// Indicator 10A, 10B, 11A, 11B >> same as score >> function 6
async function updatePercentage_fun6(ulbArr, indicator) {
	ulbArr.forEach(async (ulb) => {
		const percentage = ulb[indicator].score;

		await ScoringFiscalRanking.findByIdAndUpdate(ulb._id, {
			$set: {
				[`${indicator}.percentage`]: percentage,
			},
		});
	});
}

// Indicator 12  >> function 3 >>
/* 
(Score <= -25%) --> 37.5
(Score > -25% && Score <= -10%) --> 40
(Score > 20%) --> 45
(Score > -10% && Score <= 20%) --> 50
*/
async function updatePercentage_fun3(ulbArr, indicator) {
	ulbArr.forEach(async (ulb) => {
		let percentage = 0;
		if (ulb[indicator].score <= 20 && ulb[indicator].score > -10) percentage = 50;
		else if (ulb[indicator].score > 20) percentage = 45;
		else if (ulb[indicator].score <= -10 && ulb[indicator].score > -25) percentage = 40;
		else if (ulb[indicator].score <= -25) percentage = 37.5;
		else percentage = 0;

		await ScoringFiscalRanking.findByIdAndUpdate(ulb._id, {
			$set: {
				[`${indicator}.percentage`]: percentage,
			},
		});
	});
}

// Indicator 13 >> ((high - ulb)/(high-low))*50 >> function 4
async function updatePercentage_fun4(ulbArr, indicator) {
	// Array with sorted values.
	const sortByTotalBudgetArr = ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
    const len = sortByTotalBudgetArr.length;

	ulbArr.forEach(async (ulb) => {
		const percentage =
			((sortByTotalBudgetArr[0][indicator].score - ulb[indicator].score) /
				(sortByTotalBudgetArr[0][indicator].score - sortByTotalBudgetArr[len - 1][indicator].score)) *
			50;

		await ScoringFiscalRanking.findByIdAndUpdate(ulb._id, {
			$set: {
				[`${indicator}.percentage`]: percentage,
			},
		});
	});
}

// Indicator 14, 15 >> (ulb/ high)*50 >> function 5
async function updatePercentage_fun5(ulbArr, indicator) {
	// Array with sorted values.
	const sortByTotalBudgetArr = ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);

	ulbArr.forEach(async (ulb) => {
		const percentage = (ulb[indicator].score / sortByTotalBudgetArr[0][indicator].score) * 50;

		await ScoringFiscalRanking.findByIdAndUpdate(ulb._id, {
			$set: {
				[`${indicator}.percentage`]: percentage,
			},
		});
	});
}

// async function updateMinusLowestPercentage(ulbArr, indicator) {
// 	const sortByTotalBudgetArr = ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
// const len = sortByTotalBudgetArr.length;
// 	ulbArr.forEach(async (ulb) => {
// 		const percentage =
// 			(ulb[indicator].score - sortByTotalBudgetArr[len - 1][indicator].score) /
// 			(sortByTotalBudgetArr[0][indicator].score - sortByTotalBudgetArr[len - 1][indicator].score) /
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
async function calculateFRPercentage(populationBucket) {
	// const condition = { populationBucket };
	const condition = {};
	const ulbArr = await ScoringFiscalRanking.find(condition).lean();

	await updatePercentage_fun1(ulbArr, 'totalBudgetDataPC_1');
	await updatePercentage_fun1(ulbArr, 'ownRevenuePC_2');
	await updatePercentage_fun1(ulbArr, 'pTaxPC_3');
	await updatePercentage_fun2(ulbArr, 'cagrInTotalBud_4');
	await updatePercentage_fun2(ulbArr, 'cagrInOwnRevPC_5');
	await updatePercentage_fun2(ulbArr, 'cagrInPropTax_6');
	await updatePercentage_fun1(ulbArr, 'capExPCAvg_7');
	await updatePercentage_fun2(ulbArr, 'cagrInCapExpen_8');
	await updatePercentage_fun1(ulbArr, 'omExpTotalRevExpen_9');
	await updatePercentage_fun6(ulbArr, 'avgMonthsForULBAuditMarks_10a');
	await updatePercentage_fun6(ulbArr, 'aaPushishedMarks_10b');
	await updatePercentage_fun6(ulbArr, 'gisBasedPTaxMarks_11a');
	await updatePercentage_fun6(ulbArr, 'accSoftwareMarks_11b');
	await updatePercentage_fun3(ulbArr, 'receiptsVariance_12');
	await updatePercentage_fun4(ulbArr, 'ownRevRecOutStanding_13');
	await updatePercentage_fun5(ulbArr, 'digitalToTotalOwnRev_14');
	await updatePercentage_fun5(ulbArr, 'propUnderTaxCollNet_15');

	// await updateMinusLowestPercentage(ulbArr, 'cagrInTotalBud_4');
	// return ulbArr;
	// const sortByTotalBudgetArr = ulbArr.sort((a, b) => b.totalBudgetDataPC_1.score - a.totalBudgetDataPC_1.score);

	// return sortByTotalBudgetArr;
	// ulbRes.forEach(async (ulb) => {
	//     console.log('ulb', ulb._id);
	//     await calculateFRPercentage(ulb);
	// });
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
