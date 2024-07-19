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

async function getMaxMinScore(populationBucket, indicator, order) {
	// mongoose.set('debug',true);
	const condition = { isActive: true, populationBucket, currentFormStatus: { $in: [11] } };
	const res = await ScoringFiscalRanking.findOne(condition).select(indicator).sort({ [`${indicator}.score`]: order }).limit(1).lean();
	return res[indicator].score;
}

function getIndicatorScore(ulb, indicator, percentage) {
	const ulbIn = ulb[indicator];
	ulbIn.percentage = percentage;
	return ulbIn;
}

async function updatePercentage_formula1(ulb, indicator, percent = 100) {
	const highScore = await getMaxMinScore(ulb.populationBucket, indicator, -1);
	const percentage = ulb[indicator].score === 0 || highScore === 0 ? 0 : (ulb[indicator].score / highScore) * percent;
	return getIndicatorScore(ulb, indicator, percentage);
}

async function updatePercentage_formula2(ulb, indicator) {
	const highScore = await getMaxMinScore(ulb.populationBucket, indicator, -1);
	const lowScore = await getMaxMinScore(ulb.populationBucket, indicator, 1);
	let percentage = 0;
	if (!ulb[indicator].infinity) {
		const numerator = (ulb[indicator].score - lowScore);
		const denominator = (highScore - lowScore);
		percentage = numerator === 0 || denominator === 0 ? 0 : (numerator / denominator) * 100;
	}
	return getIndicatorScore(ulb, indicator, percentage);
}

async function updatePercentage_formula3(ulb, indicator) {

	const lowScore = await getMaxMinScore(ulb.populationBucket, indicator, 1);
	let percentage = 0;
	if (!ulb[indicator].infinity) {
		if (ulb[indicator].score <= 20 && ulb[indicator].score >= -10) percentage = 50;
		else if (ulb[indicator].score > 20) percentage = 45;
		else if (ulb[indicator].score <= -10 && ulb[indicator].score >= -25) percentage = 40;
		else if (ulb[indicator].score < -25) percentage =
			((ulb[indicator].score - (lowScore)) / ((-25 - (lowScore)))) * (0.75 * 50);
		else percentage = 0;
	}
	return getIndicatorScore(ulb, indicator, percentage);

}
async function updatePercentage_formula4(ulb, indicator) {
	const highScore = await getMaxMinScore(ulb.populationBucket, indicator, -1);
	const lowScore = await getMaxMinScore(ulb.populationBucket, indicator, 1);
	let percentage = 0;
	if (!ulb[indicator].infinity) {
		const numerator = (highScore - ulb[indicator].score);
		const denominator = (highScore - lowScore);
		percentage = numerator === 0 || denominator === 0 ? 0 : (numerator / denominator) * 50;
	}
	// return parseFloat(percentage.toFixed(decimalPlace));
	return getIndicatorScore(ulb, indicator, percentage);
}

async function updatePercentage_formula5(ulb, indicator) {
	const percentage = ulb[indicator].score;
	return getIndicatorScore(ulb, indicator, percentage);
}

async function calculateFRPercentage(populationBucket) {
	// Submission Acknowledged by PMU - 11
	const condition = { populationBucket, currentFormStatus: { $in: [11] } };
	// const condition = { $and: [ {populationBucket},{ 'currentFormStatus': 11 }, { 'totalBudgetDataPC_1.percentage': 0 }, { 'totalBudgetDataPC_1.score': { $ne: 0 } } ] }
	// const condition = {};
	const ulbArr = await ScoringFiscalRanking.find(condition).select('populationBucket totalBudgetDataPC_1 ownRevenuePC_2 pTaxPC_3 cagrInTotalBud_4 cagrInOwnRevPC_5 cagrInPropTax_6 capExPCAvg_7 cagrInCapExpen_8 omExpTotalRevExpen_9 avgMonthsForULBAuditMarks_10a aaPushishedMarks_10b gisBasedPTaxMarks_11a accSoftwareMarks_11b receiptsVariance_12 ownRevRecOutStanding_13 digitalToTotalOwnRev_14 propUnderTaxCollNet_15').lean();

	ulbArr.forEach(async (ulb) => {
		const totalBudgetDataPC_1 = await updatePercentage_formula1(ulb, 'totalBudgetDataPC_1');
		const ownRevenuePC_2 = await updatePercentage_formula1(ulb, 'ownRevenuePC_2');
		const pTaxPC_3 = await updatePercentage_formula1(ulb, 'pTaxPC_3');
		const cagrInTotalBud_4 = await updatePercentage_formula2(ulb, 'cagrInTotalBud_4');
		const cagrInOwnRevPC_5 = await updatePercentage_formula2(ulb, 'cagrInOwnRevPC_5');
		const cagrInPropTax_6 = await updatePercentage_formula2(ulb, 'cagrInPropTax_6');
		const capExPCAvg_7 = await updatePercentage_formula1(ulb, 'capExPCAvg_7');
		const cagrInCapExpen_8 = await updatePercentage_formula2(ulb, 'cagrInCapExpen_8');
		const omExpTotalRevExpen_9 = await updatePercentage_formula1(ulb, 'omExpTotalRevExpen_9');
		const avgMonthsForULBAuditMarks_10a = await updatePercentage_formula5(ulb, 'avgMonthsForULBAuditMarks_10a');
		const aaPushishedMarks_10b = await updatePercentage_formula5(ulb, 'aaPushishedMarks_10b');
		const gisBasedPTaxMarks_11a = await updatePercentage_formula5(ulb, 'gisBasedPTaxMarks_11a');
		const accSoftwareMarks_11b = await updatePercentage_formula5(ulb, 'accSoftwareMarks_11b');
		const receiptsVariance_12 = await updatePercentage_formula3(ulb, 'receiptsVariance_12');
		const ownRevRecOutStanding_13 = await updatePercentage_formula4(ulb, 'ownRevRecOutStanding_13');
		const digitalToTotalOwnRev_14 = await updatePercentage_formula1(ulb, 'digitalToTotalOwnRev_14', 50);
		const propUnderTaxCollNet_15 = await updatePercentage_formula1(ulb, 'propUnderTaxCollNet_15', 50);

		const resourceMobilization = Number(totalBudgetDataPC_1.percentage + ownRevenuePC_2.percentage + pTaxPC_3.percentage + cagrInTotalBud_4.percentage + cagrInOwnRevPC_5.percentage + cagrInPropTax_6.percentage);
		const expenditurePerformance = Number(capExPCAvg_7.percentage + cagrInCapExpen_8.percentage + omExpTotalRevExpen_9.percentage);
		const fiscalGovernance = Number(avgMonthsForULBAuditMarks_10a.percentage + aaPushishedMarks_10b.percentage + gisBasedPTaxMarks_11a.percentage + accSoftwareMarks_11b.percentage + receiptsVariance_12.percentage + ownRevRecOutStanding_13.percentage + digitalToTotalOwnRev_14.percentage + propUnderTaxCollNet_15.percentage);

		const overAll = Number(resourceMobilization + expenditurePerformance + fiscalGovernance);
		const updateData = {
			'totalBudgetDataPC_1': totalBudgetDataPC_1,
			'ownRevenuePC_2': ownRevenuePC_2,
			'pTaxPC_3': pTaxPC_3,
			'cagrInTotalBud_4': cagrInTotalBud_4,
			'cagrInOwnRevPC_5': cagrInOwnRevPC_5,
			'cagrInPropTax_6': cagrInPropTax_6,
			'capExPCAvg_7': capExPCAvg_7,
			'cagrInCapExpen_8': cagrInCapExpen_8,
			'omExpTotalRevExpen_9': omExpTotalRevExpen_9,
			'avgMonthsForULBAuditMarks_10a': avgMonthsForULBAuditMarks_10a,
			'aaPushishedMarks_10b': aaPushishedMarks_10b,
			'gisBasedPTaxMarks_11a': gisBasedPTaxMarks_11a,
			'accSoftwareMarks_11b': accSoftwareMarks_11b,
			'receiptsVariance_12': receiptsVariance_12,
			'ownRevRecOutStanding_13': ownRevRecOutStanding_13,
			'digitalToTotalOwnRev_14': digitalToTotalOwnRev_14,
			'propUnderTaxCollNet_15': propUnderTaxCollNet_15,
			'resourceMobilization.score': resourceMobilization,
			'expenditurePerformance.score': expenditurePerformance,
			'fiscalGovernance.score': fiscalGovernance,
			'overAll.score': overAll,
		};
		// console.log('updateData',updateData);

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
		if (i === 0) {
			rank = 1;
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

