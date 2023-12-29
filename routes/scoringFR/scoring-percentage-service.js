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

participatedUlbs - 8, 9, 10, 11
rankedUlbs - 11

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

let decimalPlace = 2; 

function updatePercentage_formula1(ulb, ulbArr, indicator, percent = 100) {
	const sortedArr = ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
	const percentage = ulb[indicator].score === 0 || sortedArr[0][indicator].score === 0 ? 0 : (ulb[indicator].score / sortedArr[0][indicator].score) * percent;
	return parseFloat(percentage.toFixed(decimalPlace)); 
}

function updatePercentage_formula2(ulb, ulbArr, indicator) {
	const sortedArr = ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
	const len = sortedArr.length;
	const numerator = (ulb[indicator].score - sortedArr[len - 1][indicator].score);
	const denominator = (sortedArr[0][indicator].score - sortedArr[len - 1][indicator].score);
	const percentage = numerator === 0 || denominator === 0 ? 0 : (numerator / denominator) * 100;
	return parseFloat(percentage.toFixed(decimalPlace));
}

function updatePercentage_formula3(ulb, indicator) {
	let percentage = 0;
	if (ulb[indicator].score <= 20 && ulb[indicator].score > -10) percentage = 50;
	else if (ulb[indicator].score > 20) percentage = 45;
	else if (ulb[indicator].score <= -10 && ulb[indicator].score > -25) percentage = 40;
	else if (ulb[indicator].score <= -25) percentage = 37.5;
	else percentage = 0;
	return parseFloat(percentage.toFixed(decimalPlace));
}
function updatePercentage_formula4(ulb, ulbArr, indicator) {
	const sortedArr = ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
	const len = sortedArr.length;
	const numerator = (sortedArr[0][indicator].score - ulb[indicator].score);
	const denominator = (sortedArr[0][indicator].score - sortedArr[len - 1][indicator].score);
 	const percentage = numerator === 0 || denominator === 0 ? 0 : (numerator /denominator) * 50;
	return parseFloat(percentage.toFixed(decimalPlace));
}

async function calculateFRPercentage(populationBucket) {
	// const censusCode = 802787;
	// Submission Acknowledged by PMU - 11
	const condition = { populationBucket, currentFormStatus: { $in: [11]}};
	// const condition = {};
	const ulbArr = await ScoringFiscalRanking.find(condition).lean();

	ulbArr.forEach(async (ulb) => {
		const totalBudgetDataPC_1 = updatePercentage_formula1(ulb, ulbArr, 'totalBudgetDataPC_1');
		const ownRevenuePC_2 = updatePercentage_formula1(ulb, ulbArr, 'ownRevenuePC_2');
		const pTaxPC_3 = updatePercentage_formula1(ulb, ulbArr, 'pTaxPC_3');
		const cagrInTotalBud_4 = updatePercentage_formula2(ulb, ulbArr, 'cagrInTotalBud_4');
		const cagrInOwnRevPC_5 = updatePercentage_formula2(ulb, ulbArr, 'cagrInOwnRevPC_5');
		const cagrInPropTax_6 = updatePercentage_formula2(ulb, ulbArr, 'cagrInPropTax_6');
		const capExPCAvg_7 = updatePercentage_formula1(ulb, ulbArr, 'capExPCAvg_7');
		const cagrInCapExpen_8 = updatePercentage_formula2(ulb, ulbArr, 'cagrInCapExpen_8');
		const omExpTotalRevExpen_9 = updatePercentage_formula1(ulb, ulbArr, 'omExpTotalRevExpen_9');
		const receiptsVariance_12 = updatePercentage_formula3(ulb, 'receiptsVariance_12');
		const ownRevRecOutStanding_13 = updatePercentage_formula4(ulb, ulbArr, 'ownRevRecOutStanding_13');
		const digitalToTotalOwnRev_14 = updatePercentage_formula1(ulb, ulbArr, 'digitalToTotalOwnRev_14', 50);
		const propUnderTaxCollNet_15 = updatePercentage_formula1(ulb, ulbArr, 'propUnderTaxCollNet_15', 50);

		const resourceMobilization = parseFloat((totalBudgetDataPC_1 + ownRevenuePC_2 + pTaxPC_3 + cagrInTotalBud_4 + cagrInOwnRevPC_5 + cagrInPropTax_6).toFixed(decimalPlace));
		const expenditurePerformance = parseFloat((capExPCAvg_7 + cagrInCapExpen_8 + omExpTotalRevExpen_9).toFixed(decimalPlace));
		const fiscalGovernance = parseFloat((ulb['avgMonthsForULBAuditMarks_10a'].score + ulb['aaPushishedMarks_10b'].score + ulb['gisBasedPTaxMarks_11a'].score + ulb['accSoftwareMarks_11b'].score +
			receiptsVariance_12 + ownRevRecOutStanding_13 + digitalToTotalOwnRev_14 + propUnderTaxCollNet_15).toFixed(decimalPlace));

		const overAll = parseFloat((resourceMobilization + expenditurePerformance + fiscalGovernance).toFixed(decimalPlace));
		
		const updateData = {
			'totalBudgetDataPC_1.percentage': totalBudgetDataPC_1,
			'ownRevenuePC_2.percentage': ownRevenuePC_2,
			'pTaxPC_3.percentage': pTaxPC_3,
			'cagrInTotalBud_4.percentage': cagrInTotalBud_4,
			'cagrInOwnRevPC_5.percentage': cagrInOwnRevPC_5,
			'cagrInPropTax_6.percentage': cagrInPropTax_6,
			'capExPCAvg_7.percentage': capExPCAvg_7,
			'cagrInCapExpen_8.percentage': cagrInCapExpen_8,
			'omExpTotalRevExpen_9.percentage': omExpTotalRevExpen_9,
			'avgMonthsForULBAuditMarks_10a.percentage': ulb['avgMonthsForULBAuditMarks_10a'].score,
			'aaPushishedMarks_10b.percentage': ulb['aaPushishedMarks_10b'].score,
			'gisBasedPTaxMarks_11a.percentage': ulb['gisBasedPTaxMarks_11a'].score,
			'accSoftwareMarks_11b.percentage': ulb['accSoftwareMarks_11b'].score,
			'receiptsVariance_12.percentage': receiptsVariance_12,
			'ownRevRecOutStanding_13.percentage': ownRevRecOutStanding_13,
			'digitalToTotalOwnRev_14.percentage': digitalToTotalOwnRev_14,
			'propUnderTaxCollNet_15.percentage': propUnderTaxCollNet_15,
			'resourceMobilization.score': resourceMobilization,
			'expenditurePerformance.score': expenditurePerformance,
			'fiscalGovernance.score': fiscalGovernance,
			'overAll.score': overAll,
		};

		await ScoringFiscalRanking.findByIdAndUpdate(ulb._id, {
			$set: updateData,
		});
	});
}


module.exports.calculateFRPercentage = async (req, res) => {
	try {
		for (let i = 1; i <= 4; i++) {
		    await calculateFRPercentage(i);
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

async function setIndicatorRank(ulbArr, indicator) {
	ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
    for (let i = 0; i < ulbArr.length; i++) {
		let rank = 1;
		if(i===0) {
			rank = 1;
		} else if(ulbArr[i-1][indicator].score === ulbArr[i][indicator].score) {
			ulbArr[i][indicator].rank = ulbArr[i-1][indicator].rank;
		} else {
			ulbArr[i][indicator].rank = ulbArr[i-1][indicator].rank +1;
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
	const condition = { isActive: true, populationBucket, currentFormStatus: { $in: [11]} };
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

