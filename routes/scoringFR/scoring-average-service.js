const ObjectId = require('mongoose').Types.ObjectId;
const moongose = require('mongoose');
const Response = require('../../service').response;
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');
const State = require('../../models/State');

/*
 Not started - 1
 In progress - 2
 Verificaion not started - 8
 Verification in progress - 9
 Returned by PMU - 10
 Submission Acknowledged by PMU - 11
 */
const indicators = ['resourceMobilization', 'expenditurePerformance', 'fiscalGovernance', 'overAll'];
const currentFormStatus = { $in: [8, 9, 10, 11] };

function getCondition(type = false, value = '') {
	let cond = {
		isActive: true,
		currentFormStatus
	}
	if (type) {
		cond[type] = value;
	}

	return cond;
}
async function getFRAverage(indicator, type = false, value = '') {
	let match = getCondition(type, value);

	const res = await ScoringFiscalRanking.aggregate([
		{
			$match: match
		},
		{
			$group: {
				_id: null,
				average: {
					$avg: `$${indicator}.score`
				}
			}
		}
	]);
	// console.log('res', res);
	return res && res[0] ? (res[0].average).toFixed(2) : 0;
}
async function updateAverage(avgKey, type = '', value = '') {
	const condition = getCondition(type, value);
	const ulbArr = await ScoringFiscalRanking.find(condition)
		.select(indicators.join(' '))
		.lean();
	let updateAvg = {};

	for (const indicator of indicators) {
		updateAvg[indicator] = { [avgKey]: await getFRAverage(indicator, type, value) };
	}

	ulbArr.forEach(async (ulb) => {
		let updateData = {};
		for (const indicator of indicators) {
			updateData[indicator] = Object.assign({}, ulb[indicator], updateAvg[indicator]);
		}
		await ScoringFiscalRanking.findByIdAndUpdate(ulb._id, {
			$set: updateData,
		});
	});
}

async function calculateFRBucketAverage() {
	for (let i = 1; i <= 4; i++) {
		await updateAverage('populationBucketAvg', 'populationBucket', i)
	}
}
async function calculateFRNationalAverage() {
	await updateAverage('nationalAvg')
}

async function calculateFRStateAverage() {
	const condition = { isActive: true };
	const states = await State.find(condition).select('name').lean();
	// console.log('states', states);
	states.forEach(async (stateEle) => {
		await updateAverage('stateAvg', 'state', ObjectId(stateEle._id));
	});

}
module.exports.calculateFRAverage = async (req, res) => {
	try {
		// mongoose.set('debug', true)
		await calculateFRNationalAverage();
		await calculateFRBucketAverage();
		await calculateFRStateAverage();
		return res.status(200).json({ message: 'Done' });

	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};