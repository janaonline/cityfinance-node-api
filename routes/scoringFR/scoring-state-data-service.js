const ObjectId = require('mongoose').Types.ObjectId;
const Ulb = require('../../models/Ulb');
const State = require('../../models/State');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');

// Get total number of ULBs in a state.
async function getTotalULB(state_id) {
	const condition = { isActive: true, state: ObjectId(state_id) };
	return await Ulb.countDocuments(condition);
}

// Get participated, ranked and non-ranked ULBs count.
async function getScoredUlbsCount(state_id, type) {
	let condition = { isActive: true, state: ObjectId(state_id) };

	if (type === 'ranked') {
		condition = { ...condition, currentFormStatus: 11 };
	} else if (type === 'participated') {
		condition = { ...condition, currentFormStatus: { $in: [8, 9, 10, 11] } };
	} else if (type === 'nonRanked') {
		condition = { ...condition, currentFormStatus: { $in: [8, 9, 10] } };
	}

	return await ScoringFiscalRanking.countDocuments(condition);
}

// Helper for setUlbParticipatedData();
async function getParticipatedData(stateEle) {
	const totalUlbs = await getTotalULB(stateEle._id);
	const participatedUlbs = await getScoredUlbsCount(stateEle._id, 'participated');
	const participatedUlbsPercentage = participatedUlbs && totalUlbs ? parseFloat(((participatedUlbs / totalUlbs) * 100).toFixed(2)) : 0;
	const fiscalRanking = {
		rankingYear: '2022-23',
		totalUlbs,
		participatedUlbs,
		participatedUlbsPercentage,
	};
	return fiscalRanking;
}

// Helper for setUlbParticipatedData(): return (high || low ||  hilly).
async function getSateParticipationCategory(participatedUlbsPercentage = 0, isHilly = false) {
	let type = 'low';
	if (isHilly) type = 'hilly';
	else if (participatedUlbsPercentage >= 75) type = 'high';

	return type;
}

// 01. Set ULB participation data in State collection.
module.exports.setUlbParticipatedData = async (req, res) => {
	try {
		const condition = { isActive: true };
		const states = await State.find(condition).lean();

		states.forEach(async (stateEle) => {
			const fiscalRanking = await getParticipatedData(stateEle);

			// Delete existing field.
			await State.findByIdAndUpdate(stateEle._id, {
				$unset: { fiscalRanking: 1 },
			});

			// Push new field.
			await State.findByIdAndUpdate(stateEle._id, {
				$push: { fiscalRanking },
			});

			// // Get Audited and Budget docs.
			// const auditedAccounts = await getYearwiseDocCount(stateEle._id, 'auditedAccounts');
			// const annualBudgets = await getYearwiseDocCount(stateEle._id, 'annualBudgets');

			// await State.findByIdAndUpdate(stateEle._id, {
			// 	$set: { auditedAccounts, annualBudgets },
			// });

			// Updated "stateParticipationCategory" in Scoring Collection.
			const stateParticipationCategory = await getSateParticipationCategory(fiscalRanking.participatedUlbsPercentage, stateEle.isHilly);
			await ScoringFiscalRanking.updateMany({ state: ObjectId(stateEle._id) }, { $set: { stateParticipationCategory } });
		});
		return res.status(200).json({ message: 'done' });
	} catch (error) {
		console.error('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};

// Helper for setStateData();
async function getFsData(stateEle) {
	const rankedUlbs = await getScoredUlbsCount(stateEle._id, 'ranked');
	const fiscalRanking = {
		rankingYear: '2022-23',
		rankedUlbs,
		nonRankedUlbs: await getScoredUlbsCount(stateEle._id, 'nonRanked'),
	};
	return fiscalRanking;
}

// 02. Set ULB's ranking data in State collection.
module.exports.setStateData = async (req, res) => {
	try {
		const condition = { isActive: true };
		const states = await State.find(condition).lean();

		states.forEach(async (stateEle) => {
			const fiscalRanking = await getFsData(stateEle);

			// Update data in fiscalRanking[]
			await State.updateOne({ _id: stateEle._id },
				{
					$set: {
						"fiscalRanking.$[i].rankedUlbs": fiscalRanking.rankedUlbs,
						"fiscalRanking.$[i].nonRankedUlbs": fiscalRanking.nonRankedUlbs,
					}
				},
				{ arrayFilters: [{ "i.rankingYear": "2022-23" }] }
			);
		});
		return res.status(200).json({ message: 'done' });
	} catch (error) {
		console.error('Error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};

// Get Audited and Budget docs.
// async function getYearwiseDocCount(stateId, indicator) {
// 	return await ScoringFiscalRanking.aggregate([
// 		{ $match: { state: ObjectId(stateId) } },
// 		{ $unwind: `$${indicator}` },
// 		{
// 			$match: {
// 				$or: [
// 					{ [`${indicator}.url`]: { $ne: '' } },
// 					{ [`${indicator}.modelName`]: 'ULBLedger' }
// 				]
// 			}
// 		},
// 		{

// 			'$group': {
// 				_id: `$${indicator}.year`,
// 				total: { $sum: 1 }
// 			}
// 		},
// 		{
// 			$project: {
// 				_id: 0,
// 				year: '$_id',
// 				total: 1,
// 			}
// 		}
// 	]);
// }