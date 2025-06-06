const ObjectId = require('mongoose').Types.ObjectId;
const State = require('../../models/State');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');
const { rankedUlbPdf } = require('./data-dump');
const { getMultipleRandomElements } = require('../../service/common');
const { getPaginationParams, isValidObjectId, getPageNo, getPopulationBucket } = require('../../service/common');
const { assesmentParamLabels, abYears, afsYears, getTableHeaderDocs, rmEpFGHeader } = require('./response-data');

// const abYears = ['2020-21', '2021-22', '2022-23', '2023-24'];
// const afsYears = ['2018-19', '2019-20', '2020-21', '2021-22'];

// async function getScoreFR(populationBucket, indicator, order = -1) {
// 	const condition = { isActive: true, populationBucket };
// 	const ulb = await ScoringFiscalRanking.findOne(condition)
// 		.sort({ [`${indicator}.score`]: order })
// 		.lean();
// }
const mainIndicators = ['resourceMobilization', 'expenditurePerformance', 'fiscalGovernance', 'overAll'];

module.exports.getUlbDetails = async (req, res) => {
	try {
		// moongose.set('debug', true);
		// const censusCode = req.params.censusCode;
		const searchId = req.params.searchId;
		const downloadPdf = req.query.downloadPdf;

		let condition = {
			$and: [{ 'isActive': true }, { $or: [{ 'censusCode': searchId }, { 'sbCode': searchId }] }],
		};
		if (isValidObjectId(searchId)) {
			condition = { isActive: true, ulb: ObjectId(searchId) };
		}

		const ulb = await ScoringFiscalRanking.findOne(condition).lean();

		if (!ulb) {
			return res.status(404).json({
				status: false,
				message: 'ULB not found',
			});
		}
		const state = await State.findById(ulb.state).select('name code').lean();

		const design_year2022_23 = '606aafb14dff55e6c075d3ae';

		const condition1 = {
			isActive: true, populationBucket: ulb.populationBucket, currentFormStatus: { $in: [8, 9, 10, 11] }
		};
		const populationBucketUlbCount = await ScoringFiscalRanking.countDocuments(condition1).lean();

		const condition2 = { isActive: true, populationBucket: ulb.populationBucket, currentFormStatus: 11, ulb: { $ne: ObjectId(searchId) }, stateParticipationCategory: ulb.stateParticipationCategory };
		const topUlbs = await ScoringFiscalRanking.find(condition2, { name: 1, ulb: 1, populationBucket: 1, censusCode: 1, sbCode: 1, _id: 0, stateParticipationCategory: 1 }).sort({ 'overAll.rank': 1 }).limit(10).lean();

		const conditionFs = {
			ulb: ObjectId(ulb.ulb),
			design_year: ObjectId(design_year2022_23),
		};

		// let fsData = await FiscalRanking.findOne(conditionFs)
		// 	.select('waterSupply sanitationService propertyWaterTax propertySanitationTax registerGis accountStwre')
		// 	.lean();
		const assessmentParameter = {
			resourceMobilization: await getTableData(ulb, 'resourceMobilization'),
			expenditurePerformance: await getTableData(ulb, 'expenditurePerformance'),
			fiscalGovernance: await getTableData(ulb, 'fiscalGovernance'),
		};
		let statePartCat = '';
		switch (ulb.stateParticipationCategory) {
			case 'high': statePartCat = "High Participation"; break;
			case 'low': statePartCat = "Low Participation"; break;
			case 'hilly': statePartCat = "Hilly/North Eastern States"; break;
		}
		const ulbData = {
			statePartCat,
			name: ulb.name,
			ulb: ulb.ulb,
			sbCode: ulb.sbCode,
			censusCode: ulb.censusCode,
			population: ulb.population,
			populationBucket: ulb.populationBucket,
			stateParticipationCategory: ulb.stateParticipationCategory,
			stateId: ulb.state,
			stateName: state.name,
			stateCode: state.code,
			overAll: { ...ulb.overAll, score: Number(ulb.overAll.score.toFixed(2)) },
			resourceMobilization: { ...ulb.resourceMobilization, score: Number(ulb.resourceMobilization.score.toFixed(2)) },
			expenditurePerformance: { ...ulb.expenditurePerformance, score: Number(ulb.expenditurePerformance.score.toFixed(2)) },
			fiscalGovernance: { ...ulb.fiscalGovernance, score: Number(ulb.fiscalGovernance.score.toFixed(2)) },
			location: ulb.location,
		};
		const shuffledTopUlbs = getMultipleRandomElements(topUlbs, 4);
		const data = {
			populationBucketUlbCount,
			ulb: ulbData,
			// fsData,
			assessmentParameter,
			topUlbs: shuffledTopUlbs
		};

		// Change response struture if downloadPdf is true.
		if (downloadPdf == 'true')
			return res.status(200).json(rankedUlbPdf(data));
		else
			return res.status(200).json({ data });

	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};

// <<-- Get all the ULBs of a state - Document details. -->>
module.exports.getUlbsBySate = async (req, res) => {
	try {
		// moongose.set('debug', true);
		const stateId = ObjectId(req.params.stateId);
		const { order, sortBy, populationBucket, ulbParticipationFilter, ulbRankingStatusFilter } = req.query;
		let condition = {
			isActive: true,
			state: stateId,
			...(req.query.ulbName && {
				name: {
					$regex: req.query.ulbName,
					$options: 'i'
				}
			})
		};

		const sortArr = { participated: 'currentFormStatus', ranked: 'overAll.rank', populationBucket: 'populationBucket' }
		let sort = { name: 1 };
		if (sortBy) {
			const by = sortArr[sortBy] || 'name'
			sort = { [by]: order };
		}
		if ([1, 2, 3, 4].includes(parseInt(populationBucket))) {
			condition = { ...condition, populationBucket };
		}
		if (['participated', 'nonParticipated'].includes(ulbParticipationFilter)) {
			//TODO: check participated form status
			const participateCond = ulbParticipationFilter === 'participated' ? { $in: [8, 9, 10, 11] } : { $in: [1] };
			condition = { ...condition, 'currentFormStatus': participateCond };
		}
		if (['ranked', 'nonRanked'].includes(ulbRankingStatusFilter)) {
			const rankedCond = ulbRankingStatusFilter === 'ranked' ? { '$ne': 0 } : 0;
			condition = { ...condition, 'overAll.rank': rankedCond };
		}

		const { limit, skip } = getPaginationParams(req.query);
		const ulbs = await ScoringFiscalRanking.find(condition)
			.select('ulb name populationBucket currentFormStatus auditedAccounts annualBudgets overAll state ')
			.sort(sort)
			.skip(skip)
			.limit(limit)
			.lean();
		const total = await ScoringFiscalRanking.countDocuments(condition);
		const state = await State.findById(stateId).select('fiscalRanking name annualBudgets auditedAccounts').lean();
		const data = getUlbData(ulbs, req.query);
		const header = getTableHeaderDocs;
		const footer = ['', '', '', '', ''];
		state.annualBudgets?.forEach(y => {
			footer.push(y.total);
		})
		state.auditedAccounts?.forEach(y => {
			footer.push(y.total);
		})

		return res.status(200).json({
			'status': true,
			'message': 'Successfully saved data!',
			'data': { ...header, data, total, state, footer },
		});
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};

// Table data
function getUlbData(ulbs, query) {

	// console.log(ulbs);

	const tableData = [];
	let j = getPageNo(query);
	ulbs.forEach((ulb) => {
		const populationCategory = getPopulationBucket(ulb.populationBucket);
		const data = {
			'_id': ulb._id,
			'sNo': j++,
			'ulbName': ulb.name,
			'ulbNameLink': `/cfr/ulb/${ulb.censusCode ? ulb.censusCode : ulb.sbCode ? ulb.sbCode : ulb.ulb}`,
			populationCategory,
			'isUlbParticipated': [8, 9, 10, 11].includes(ulb.currentFormStatus) ? 'Yes' : 'No',
			'isUlbRanked': ulb.overAll.rank ? 'Yes' : 'No',
		};
		ulb.annualBudgets.forEach((year) => {
			data[`annualBudgets${year.year}`] = year.url;
		});
		//if no data for year add -
		abYears.forEach((year) => {
			if (!data[`annualBudgets${year}`]) {
				data[`annualBudgets${year}`] = '-';
			}
		});
		ulb.auditedAccounts.forEach((year) => {
			let filename = year.url;
			if (year.modelName === 'ULBLedger') {
				filename = `/resources-dashboard/data-sets/balanceSheet?year=${year.year}&type=Raw%20Data%20PDF&category=balance&state=${ulb.state}&ulbName=${ulb.name}`;
				data[`auditedAccounts${year.year}`] = 'Click here';
				data[`auditedAccounts${year.year}Config`] = {
					icon: 'pdf',
					title: '',
					link: filename
				};
			} else {
				data[`auditedAccounts${year.year}`] = filename;
			}
		});
		//if no data for year add -
		afsYears.forEach((year) => {
			if (!data[`auditedAccounts${year}`]) {
				data[`auditedAccounts${year}`] = '-';
			}
		});
		tableData.push(data);
	});
	return tableData;
}


async function getMaxMinScore(populationBucket, indicator, order) {
	// mongoose.set('debug',true);
	const condition = { isActive: true, populationBucket, currentFormStatus: { $in: [11] } };
	const res = await ScoringFiscalRanking.findOne(condition).select(`name ${indicator}`).sort({ [`${indicator}.score`]: order }).limit(1).lean();
	return res;
}
async function getTableData(ulb, type) {
	let indicators = assesmentParamLabels;

	const filteredIndicators = indicators.filter((e) => e.type === type);
	// console.log('filteredIndicators', filteredIndicators);
	let data = [];
	for (const indicator of filteredIndicators) {
		// TODO: to be removed
		// const highest = await getMaxMinScore(ulb.populationBucket, indicator.key, -1);
		// const lowest = await getMaxMinScore(ulb.populationBucket, indicator.key, 1);
		let ulbPerformance = Number(ulb[indicator.key]?.score.toFixed(2));

		let ele = {
			'sNo': indicator.sno,
			'indicator': indicator.title,
			'unit': indicator.units,
			'ulbScore': (ulb[indicator.key]?.percentage)?.toFixed(2),
			'highPerformance': '-',
			'highPerformanceConfig': {
				title: '-'
			},
			'lowPerformance': '-',
			'lowPerformanceConfig': {
				title: '-'
			},
		};
		if (['aaPushishedMarks_10b', 'gisBasedPTaxMarks_11a', 'accSoftwareMarks_11b'].includes(indicator.key)) {
			ulbPerformance = ulb[indicator.key].score ? 'Yes' : 'No';
		} else if (indicator.key === 'avgMonthsForULBAuditMarks_10a') {
			ulbPerformance = Number(ulb[indicator.key].values.toFixed(2));
		} else {
			const highest = await getMaxMinScore(ulb.populationBucket, indicator.key, -1);
			const lowest = await getMaxMinScore(ulb.populationBucket, indicator.key, 1);
			ele = {
				...ele,
				'highPerformance': Number(highest[indicator.key]?.score.toFixed(2)),
				'highPerformanceConfig': {
					title: highest.name
				},
				'lowPerformance': Number(lowest[indicator.key]?.score.toFixed(2)),
				'lowPerformanceConfig': {
					title: lowest.name
				},
			}
		}
		ele = {
			...ele,
			ulbPerformance,
		};
		data.push(ele);
	}
	// console.log('data',data);
	const header = rmEpFGHeader(type, ulb);
	return { ...header, data };
}

//<<-- ULB details - Filter -->>
function getSearchedUlb(ulbs, indicator, selectedUlbPopBucket, stateParticipationCategory) {
	const indicatorData = [];
	const populationAvgData = [];
	const nationalAvgData = [];
	const stateAvgData = [];

	for (const ulb of ulbs) {
		indicatorData.push(Number(ulb[indicator].score?.toFixed(2)));
		populationAvgData.push(Number(ulb[indicator].populationBucketAvg?.toFixed(2)));
		nationalAvgData.push(Number(ulb[indicator].nationalAvg?.toFixed(2)));
		stateAvgData.push(Number(ulb[indicator].stateAvg?.toFixed(2)));
	}

	// function to convert camelCase into proper case.
	function toProperCase(indicator) {
		return indicator.replace(/([A-Z])/g, ' $1').replace(/^./, function (str) {
			return str.toUpperCase();
		});
	}
	const indicatorName = toProperCase(indicator);
	const backgroundColorArr = [];

	const graphData = [
		// {
		// 	'label': 'State Average',
		// 	'data': stateAvgData,
		// 	'fill': false,
		// 	'borderColor': 'rgb(229, 125, 21)',
		// 	'type': 'line',
		// 	'lineTension': 0.2,
		// },
		// {
		// 	'label': 'National Average',
		// 	'data': nationalAvgData,
		// 	'fill': false,
		// 	'borderColor': 'rgba(155, 155, 155, 1)',
		// 	'type': 'line',
		// 	'lineTension': 0.2,
		// },
		{
			'label': 'Population Average',
			'data': populationAvgData,
			'fill': false,
			'borderColor': 'rgba(254, 203, 23, 1)',
			'type': 'line',
			'lineTension': 0.2,
		},
		{
			'label': indicatorName,
			'data': indicatorData,
			'backgroundColor': backgroundColorArr,
			'borderWidth': 1,
			'type': 'bar',
			'barPercentage': 0.5,
			'categoryPercentage': 1,
		},
	];

	const ulbName = [];
	// Loop to get ULBs names in an array.
	for (const ulb of ulbs) {
		ulbName.push(ulb.name);

		if (selectedUlbPopBucket != ulb.populationBucket || stateParticipationCategory != ulb.stateParticipationCategory) {
			backgroundColorArr.push('red');
		} else {
			backgroundColorArr.push('rgba(11, 90, 207, 1)');
		}
	}
	const data = {
		'labels': ulbName,
		'datasets': graphData,
	};
	return data;
}

// ULB details - graph section.
module.exports.getSearchedUlbDetailsGraph = async (req, res) => {
	try {
		// moongose.set('debug', true);
		const ulbIds = req.query.ulb;
		const selectedUlbPopBucket = req.query.populationBucket;
		const stateParticipationCategory = req.query.stateParticipationCategory;
		// const indicator = req.query.indicator;

		const condition = {
			isActive: true,
			ulb: { $in: ulbIds },
			// currentFormStatus: { $in: [11] }
		};
		let ulbs = await ScoringFiscalRanking.find(condition)
			.select('name ulb location resourceMobilization expenditurePerformance fiscalGovernance overAll populationBucket stateParticipationCategory')
			.limit(5)
			.lean();

		const graphData = {};
		for (const indicator of mainIndicators) {
			graphData[indicator] = getSearchedUlb(ulbs, indicator, selectedUlbPopBucket, stateParticipationCategory);
		}

		return res.status(200).json({
			graphData,
		});
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};

// <<-- Auto suggest ulbs -->>>>
module.exports.autoSuggestUlbs = async (req, res) => {
	try {
		// moongose.set('debug', true);
		const q = req.query.q;
		const limit = req.query.limit ? parseInt(req.query.limit) : 5;
		const populationBucket = req.query.populationBucket;
		const condition = {
			isActive: true,
			name: new RegExp(`.*${q}.*`, 'i'),
			...(populationBucket && {
				populationBucket,
			}),

			// currentFormStatus: { $in: [11] }
		};
		let ulbs = await ScoringFiscalRanking.find(condition, { name: 1, ulb: 1, populationBucket: 1, censusCode: 1, sbCode: 1, _id: 0, currentFormStatus: 1, stateParticipationCategory: 1 })
			.sort({ name: 1 })
			.limit(limit)
			.lean();

		return res.status(200).json({
			ulbs,
		});
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
