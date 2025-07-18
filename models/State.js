require('./dbConnect');

const fiscalRanking = {
	rankingYear: { type: String, required: true, index: true, enum: ['2022-23', '2023-24'] },
	totalUlbs: { type: Number, default: 0 },
	participatedUlbsPercentage: { type: Number, default: 0 },
	participatedUlbs: { type: Number, default: 0 },
	rankedUlbs: { type: Number, default: 0 },
	nonRankedUlbs: { type: Number, default: 0 },
	auditedAccountsCount: { type: Number, default: 0 },
	annualBudgetsCount: { type: Number, default: 0 },
};

const yearCount = {
	year: { type: String, required: true, index: true },
	total: { type: Number, default: 0 },
};
const StateSchema = new Schema(
	{
		name: { type: String, required: true },
		slug: {
			type: String,
			unique: true,
			index: true
		},
		code: { type: String, required: true },
		regionalName: { type: String, required: true, default: '' },
		censusCode: { type: String, default: null },
		fiscalRanking: [fiscalRanking],
		// auditedAccounts: [yearCount],
		// annualBudgets: [yearCount],
		stateType: { type: String, enum: ['Large', 'Small', 'UT'] },
		gsdpGrowthRate: { type: Number },
		modifiedAt: { type: Date },
		createdAt: { type: Date },
		isActive: { type: Boolean, default: 1 },
		isPublish: { type: Boolean, default: 1 },
		isUT: { type: Boolean, default: 0 },
		isHilly: { type: Boolean },
	},
	{ timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
);

StateSchema.index(
	{
		code: 1,
		isActive: 1,
	},
	{
		unique: true,
	}
);
StateSchema.index(
	{
		isPublsih: 1,
		isActive: 1,
	},
	{
		unique: true,
	}
);
StateSchema.index(
	{
		name: 1,
		isActive: 1,
	},
	{
		unique: true,
	}
);
module.exports = mongoose.model('State', StateSchema);
