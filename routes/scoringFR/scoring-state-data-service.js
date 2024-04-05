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

/*
 Not started - 1
 In progress - 2
 Verificaion not started - 8
 Verification in progress - 9
 Returned by PMU - 10
 Submission Acknowledged by PMU - 11
 */

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

async function getFsData(stateEle) {
	const totalUlbs = await getTotalULB(stateEle._id);
	const participatedUlbs = await getScoredUlbsCount(stateEle._id, 'participated');
	const rankedUlbs = await getScoredUlbsCount(stateEle._id, 'ranked');
	const participatedUlbsPercentage = participatedUlbs && totalUlbs ? parseFloat(((participatedUlbs / totalUlbs) * 100).toFixed(2)) : 0;
	const fiscalRanking = {
		rankingYear: '2022-23',
		totalUlbs,
		participatedUlbs,
		rankedUlbs,
		nonRankedUlbs: await getScoredUlbsCount(stateEle._id, 'nonRanked'),
		participatedUlbsPercentage,
	};
	return fiscalRanking;
}

async function getYearwiseDocCount(stateId, indicator) {
	return await ScoringFiscalRanking.aggregate([
		{
			$match: {
				state: ObjectId(stateId)
			}
		},
		{
			$unwind: `$${indicator}`
		},
		{
			$match: {
				$or: [
					{
						[`${indicator}.url`]: {
							$ne: ''
						}
					},
					{
						[`${indicator}.modelName`]: 'ULBLedger'
					}
				]
			}
		},
		{

			'$group': {
				_id: `$${indicator}.year`,
				total: {
					$sum: 1
				}
			}
		},
		{
			$project: {
				_id: 0,
				year: '$_id',
				total: 1,

			}
		}
	]);
}
module.exports.setStateData = async (req, res) => {
	try {
		const condition = { isActive: true };
		const states = await State.find(condition).lean();
		// console.log(states);

		states.forEach(async (stateEle) => {
			const fiscalRanking = await getFsData(stateEle);
			// delete the field
			await State.findByIdAndUpdate(stateEle._id, {
				$unset: { fiscalRanking: 1 },
			});

			//push the data
			await State.findByIdAndUpdate(stateEle._id, {
				$push: { fiscalRanking },
			});
			const auditedAccounts = await getYearwiseDocCount(stateEle._id, 'auditedAccounts');
			const annualBudgets = await getYearwiseDocCount(stateEle._id, 'annualBudgets');
			// console.log('annualBudgets', annualBudgets)
			//push the data
			await State.findByIdAndUpdate(stateEle._id, {
				$set: { auditedAccounts, annualBudgets },
			});
		});
		return res.status(200).json({ message: 'done' });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
