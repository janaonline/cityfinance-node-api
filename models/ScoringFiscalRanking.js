require('./dbConnect');

const scoreFields = {
	score: {
		type: Number,
		default: 0,
	},
	percentage: {
		type: Number,
		default: 0,
	},
	// highestScore: {
	// 	type: Number,
	// 	default: 0,
	// },
	// lowestScore: {
	// 	type: Number,
	// 	default: 0,
	// }
};

const sumScoreFields = {
	score: {
		type: Number,
		default: 0,
	},
	rank: {
		type: Number,
		default: 0,
	},
	stateAvg: {
		type: Number,
		// default: 0,
	},
	nationalAvg: {
		type: Number,
		// default: 0,
	},
	populationBucketAvg: {
		type: Number,
		// default: 0,
	},
};

const yearFile = {
	year: { type: String, required: true, index: true },
	fileName: { type: String },
	url: { type: String, default: null },
	modelName: { type: String },
};

const ScoringFiscalRankingSchema = new Schema(
	{
		name: { type: String, required: true },
		regionalName: { type: String, default: '' },
		// code: { type: String, required: true, index: { unique: true } },
		state: { type: Schema.Types.ObjectId, ref: 'State', required: true },
		ulb: { type: Schema.Types.ObjectId, ref: 'ulb', required: true },
		population: { type: Number, default: 0 },
		populationBucket: { type: Number, default: 0 },
		currentFormStatus: { type: Number, default: 0 },
		censusCode: { type: String, default: null },
		sbCode: { type: String, default: null },
		isMillionPlus: { type: String, enum: ['Yes', 'No'], default: 'No' },
		location: {
			type: {
				lat: { type: String },
				lng: { type: String },
			},
			default: {
				lat: "0.0",
				lng: "0.0"
			}
		},

		totalBudgetDataPC_1: scoreFields,
		ownRevenuePC_2: scoreFields,
		pTaxPC_3: scoreFields,
		cagrInTotalBud_4: {
			...scoreFields,
			infinity: {
				type: Boolean
			},
		},
		cagrInOwnRevPC_5: {
			...scoreFields,
			infinity: { // divide by 0
				type: Boolean
			},
		},
		cagrInPropTax_6: {
			...scoreFields,
			infinity: { // divide by 0
				type: Boolean
			},
		},
		capExPCAvg_7: scoreFields,
		cagrInCapExpen_8: {
			...scoreFields,
			infinity: { // divide by 0
				type: Boolean
			},
		},
		omExpTotalRevExpen_9: scoreFields,
		avgMonthsForULBAuditMarks_10a: {
			...scoreFields,
			values: {
				type: Number,
				default: 0,
			},
		},
		aaPushishedMarks_10b: scoreFields,
		gisBasedPTaxMarks_11a: scoreFields,
		accSoftwareMarks_11b: scoreFields,
		receiptsVariance_12: {
			...scoreFields,
			infinity: { // divide by 0
				type: Boolean
			},
		},
		ownRevRecOutStanding_13: {
			...scoreFields,
			infinity: { // divide by 0
				type: Boolean
			},
		},
		digitalToTotalOwnRev_14: scoreFields,
		propUnderTaxCollNet_15: scoreFields,
		resourceMobilization: sumScoreFields,
		expenditurePerformance: sumScoreFields,
		fiscalGovernance: sumScoreFields,
		overAll: sumScoreFields,

		auditedAccounts: [yearFile],
		annualBudgets: [yearFile],

		modifiedAt: { type: Date, default: Date.now() },
		createdAt: { type: Date, default: Date.now() },
		isActive: { type: Boolean, default: 1 },
		// isProvisional: { type: String, enum: ['Yes', 'No'], default: 'No' } //If the data is taken from Provisional a/c x% will be subtracted from final_score. (Dump to provided with Yes/ No values.)
	},
	{ timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
);
module.exports = mongoose.model('ScoringFiscalRanking', ScoringFiscalRankingSchema);
