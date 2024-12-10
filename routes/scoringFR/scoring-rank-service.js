const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');

async function setIndicatorRank(ulbArr, indicator) {
	ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
	for (let i = 0; i < ulbArr.length; i++) {
		// let rank = 1;
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


async function calculateFRRank(stateParticipationCategory, populationBucket) {
	// Submission Acknowledged by PMU - 11
	const condition = { isActive: true, populationBucket, currentFormStatus: { $in: [11] }, stateParticipationCategory };
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
		const stateParticipationCategories = ['high', 'low', 'hilly'];
		for (const stateParticipationCategory of stateParticipationCategories) {
			for (let populationBucket = 1; populationBucket <= 4; populationBucket++) {
				await calculateFRRank(stateParticipationCategory, populationBucket);
			}
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